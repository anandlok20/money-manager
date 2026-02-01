import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import TaxProfile, { TaxRegime, TaxStatus, ResidentialStatus } from '@/lib/mongodb/models/TaxProfile';
import Transaction from '@/lib/mongodb/models/Transaction';
import { TransactionType } from '@/types';
import { z } from 'zod';

const updateTaxProfileSchema = z.object({
  regime: z.nativeEnum(TaxRegime).optional(),
  status: z.nativeEnum(TaxStatus).optional(),
  residentialStatus: z.nativeEnum(ResidentialStatus).optional(),
  salaryIncome: z.number().optional(),
  housePropertyIncome: z.number().optional(),
  capitalGains: z.object({
    shortTerm: z.number().optional(),
    longTerm: z.number().optional(),
  }).optional(),
  businessIncome: z.number().optional(),
  otherIncome: z.number().optional(),
  exemptIncome: z.number().optional(),
  deductions: z.array(z.object({
    section: z.string(),
    description: z.string().optional(),
    amount: z.number(),
    maxLimit: z.number().optional(),
  })).optional(),
  standardDeduction: z.number().optional(),
  hraExemption: z.number().optional(),
  tdsPaid: z.number().optional(),
  advanceTaxPaid: z.number().optional(),
  selfAssessmentTax: z.number().optional(),
  autoCalculate: z.boolean().optional(),
  notes: z.string().optional(),
});

// Tax calculation functions
function calculateTaxOldRegime(taxableIncome: number): number {
  if (taxableIncome <= 250000) return 0;
  if (taxableIncome <= 500000) return (taxableIncome - 250000) * 0.05;
  if (taxableIncome <= 1000000) return 12500 + (taxableIncome - 500000) * 0.20;
  return 12500 + 100000 + (taxableIncome - 1000000) * 0.30;
}

function calculateTaxNewRegime(taxableIncome: number): number {
  if (taxableIncome <= 400000) return 0;
  if (taxableIncome <= 800000) return (taxableIncome - 400000) * 0.05;
  if (taxableIncome <= 1200000) return 20000 + (taxableIncome - 800000) * 0.10;
  if (taxableIncome <= 1600000) return 20000 + 40000 + (taxableIncome - 1200000) * 0.15;
  if (taxableIncome <= 2000000) return 20000 + 40000 + 60000 + (taxableIncome - 1600000) * 0.20;
  if (taxableIncome <= 2400000) return 20000 + 40000 + 60000 + 80000 + (taxableIncome - 2000000) * 0.25;
  return 20000 + 40000 + 60000 + 80000 + 100000 + (taxableIncome - 2400000) * 0.30;
}

function calculateSurcharge(tax: number, income: number): number {
  if (income <= 5000000) return 0;
  if (income <= 10000000) return tax * 0.10;
  if (income <= 20000000) return tax * 0.15;
  if (income <= 50000000) return tax * 0.25;
  return tax * 0.37;
}

function calculateRebate87A(taxableIncome: number, regime: TaxRegime): number {
  if (regime === TaxRegime.NEW && taxableIncome <= 1200000) {
    return Math.min(calculateTaxNewRegime(taxableIncome), 60000);
  }
  if (regime === TaxRegime.OLD && taxableIncome <= 500000) {
    return Math.min(calculateTaxOldRegime(taxableIncome), 12500);
  }
  return 0;
}

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

    const profile = await TaxProfile.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Tax profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...profile, _id: profile._id.toString() },
    });
  } catch (error) {
    console.error('Error fetching tax profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tax profile' },
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
    const validatedData = updateTaxProfileSchema.parse(body);

    await connectToDatabase();

    const profile = await TaxProfile.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: validatedData },
      { new: true }
    ).lean();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Tax profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...profile, _id: profile._id.toString() },
      message: 'Tax profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating tax profile:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update tax profile' },
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

    const result = await TaxProfile.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Tax profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tax profile deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting tax profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tax profile' },
      { status: 500 }
    );
  }
}
