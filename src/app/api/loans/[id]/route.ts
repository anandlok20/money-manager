import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Loan from '@/lib/mongodb/models/Loan';

const updateLoanSchema = z.object({
  lender: z.string().min(1).max(200).optional(),
  loanType: z.enum(['home', 'car', 'personal', 'education', 'gold', 'other']).optional(),
  principalAmount: z.number().positive().optional(),
  interestRate: z.number().min(0).max(100).optional(),
  tenureMonths: z.number().int().min(1).optional(),
  emiAmount: z.number().min(0).optional(),
  disbursementDate: z.string().transform((v) => new Date(v)).optional(),
  startDate: z.string().transform((v) => new Date(v)).optional(),
  endDate: z.string().transform((v) => new Date(v)).optional(),
  outstandingBalance: z.number().min(0).optional(),
  accountNumber: z.string().max(50).nullable().optional(),
  linkedVehicleId: z.string().nullable().optional(),
  status: z.enum(['active', 'closed', 'defaulted']).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const loan = await Loan.findOne({ _id: id, userId: session.user.id })
      .populate('linkedVehicleId', 'make model registrationNumber')
      .lean();

    if (!loan) {
      return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { ...loan, _id: loan._id.toString() } });
  } catch (error) {
    console.error('Error fetching loan:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch loan' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateLoanSchema.parse(body);

    await connectToDatabase();

    const loan = await Loan.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: validatedData },
      { new: true }
    ).populate('linkedVehicleId', 'make model registrationNumber');

    if (!loan) {
      return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: loan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating loan:', error);
    return NextResponse.json({ success: false, error: 'Failed to update loan' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const loan = await Loan.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: { status: 'closed' } },
      { new: true }
    );

    if (!loan) {
      return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Loan closed' });
  } catch (error) {
    console.error('Error deleting loan:', error);
    return NextResponse.json({ success: false, error: 'Failed to close loan' }, { status: 500 });
  }
}
