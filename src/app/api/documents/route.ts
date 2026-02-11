import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import StoredDocument, { DocumentType } from '@/lib/mongodb/models/StoredDocument';
import { z } from 'zod';
import { checkFeatureAccess } from '@/lib/utils/apiFeatureGate';

const documentSchema = z.object({
  type: z.nativeEnum(DocumentType),
  name: z.string().min(1),
  documentNumber: z.string().optional(),
  issuedBy: z.string().optional(),
  issuedTo: z.string().optional(),
  issueDate: z.string().or(z.date()).optional(),
  expiryDate: z.string().or(z.date()).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  images: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  reminderDays: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check feature access
    const featureBlock = await checkFeatureAccess(session.user.id, 'documents');
    if (featureBlock) return featureBlock;

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const expiringSoon = searchParams.get('expiringSoon') === 'true';

    const query: Record<string, unknown> = { userId: session.user.id };
    
    if (type) {
      query.type = type;
    }
    
    if (!includeInactive) {
      query.isActive = true;
    }

    if (expiringSoon) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query.expiryDate = { $lte: thirtyDaysFromNow, $gte: new Date() };
    }

    const documents = await StoredDocument.find(query)
      .sort({ type: 1, name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: documents.map((d) => ({ ...d, _id: d._id.toString() })),
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check feature access
    const featureBlock = await checkFeatureAccess(session.user.id, 'documents');
    if (featureBlock) return featureBlock;

    const body = await request.json();
    const validatedData = documentSchema.parse(body);

    await connectToDatabase();

    const doc = await StoredDocument.create({
      ...validatedData,
      userId: session.user.id,
      issueDate: validatedData.issueDate ? new Date(validatedData.issueDate) : undefined,
      expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: { ...doc.toObject(), _id: doc._id.toString() },
        message: 'Document created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating document:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
