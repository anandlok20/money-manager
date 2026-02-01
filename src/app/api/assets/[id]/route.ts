import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Asset, { AssetType, AssetStatus } from '@/lib/mongodb/models/Asset';
import { z } from 'zod';

const updateAssetSchema = z.object({
  type: z.nativeEnum(AssetType).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  purchaseDate: z.string().or(z.date()).optional(),
  purchaseValue: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  maturityDate: z.string().or(z.date()).optional().nullable(),
  maturityValue: z.number().optional(),
  isRecurring: z.boolean().optional(),
  recurringAmount: z.number().optional(),
  recurringFrequency: z.string().optional(),
  nextPaymentDate: z.string().or(z.date()).optional().nullable(),
  interestRate: z.number().optional(),
  expectedReturn: z.number().optional(),
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    area: z.number().optional(),
    areaUnit: z.string().optional(),
  }).optional(),
  insuranceDetails: z.object({
    policyNumber: z.string().optional(),
    sumAssured: z.number().optional(),
    premiumAmount: z.number().optional(),
    premiumFrequency: z.string().optional(),
    nominee: z.string().optional(),
    rider: z.array(z.string()).optional(),
  }).optional(),
  accountNumber: z.string().optional(),
  folioNumber: z.string().optional(),
  policyNumber: z.string().optional(),
  institution: z.string().optional(),
  branch: z.string().optional(),
  documents: z.array(z.string()).optional(),
  taxSection: z.string().optional(),
  taxBenefitAmount: z.number().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectToDatabase();

    const asset = await Asset.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...asset, _id: asset._id.toString() },
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateAssetSchema.parse(body);

    await connectToDatabase();

    const updateData: Record<string, unknown> = { ...validatedData };
    if (validatedData.purchaseDate) {
      updateData.purchaseDate = new Date(validatedData.purchaseDate);
    }
    if (validatedData.maturityDate) {
      updateData.maturityDate = new Date(validatedData.maturityDate);
    }
    if (validatedData.nextPaymentDate) {
      updateData.nextPaymentDate = new Date(validatedData.nextPaymentDate);
    }

    const asset = await Asset.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: updateData },
      { new: true }
    ).lean();

    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...asset, _id: asset._id.toString() },
      message: 'Asset updated successfully',
    });
  } catch (error) {
    console.error('Error updating asset:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update asset' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectToDatabase();

    const result = await Asset.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
