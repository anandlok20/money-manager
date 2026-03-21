import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Loan from '@/lib/mongodb/models/Loan';

const createLoanSchema = z.object({
  lender: z.string().min(1, 'Lender is required').max(200),
  loanType: z.enum(['home', 'car', 'personal', 'education', 'gold', 'other']),
  principalAmount: z.number().positive('Principal must be positive'),
  interestRate: z.number().min(0).max(100),
  tenureMonths: z.number().int().min(1),
  emiAmount: z.number().min(0),
  disbursementDate: z.string().transform((v) => new Date(v)),
  startDate: z.string().transform((v) => new Date(v)),
  endDate: z.string().transform((v) => new Date(v)).optional(),
  outstandingBalance: z.number().min(0),
  accountNumber: z.string().max(50).optional(),
  linkedVehicleId: z.string().optional(),
  status: z.enum(['active', 'closed', 'defaulted']).default('active'),
  notes: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const query: Record<string, unknown> = { userId: session.user.id };
    if (status) query.status = status;

    const loans = await Loan.find(query)
      .populate('linkedVehicleId', 'make model registrationNumber')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: loans.map((l) => ({ ...l, _id: l._id.toString() })),
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch loans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createLoanSchema.parse(body);

    await connectToDatabase();

    const loan = await Loan.create({
      userId: session.user.id,
      ...validatedData,
    });

    return NextResponse.json({ success: true, data: loan }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating loan:', error);
    return NextResponse.json({ success: false, error: 'Failed to create loan' }, { status: 500 });
  }
}
