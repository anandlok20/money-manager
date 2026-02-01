import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import TaxProfile, { TaxRegime, TaxStatus, ResidentialStatus } from '@/lib/mongodb/models/TaxProfile';
import Transaction from '@/lib/mongodb/models/Transaction';
import { TransactionType } from '@/types';
import { z } from 'zod';

const taxProfileSchema = z.object({
  financialYear: z.string().regex(/^\d{4}-\d{2}$/),
  assessmentYear: z.string().regex(/^\d{4}-\d{2}$/),
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
  // FY 2025-26 Old Regime Slabs
  if (taxableIncome <= 250000) return 0;
  if (taxableIncome <= 500000) return (taxableIncome - 250000) * 0.05;
  if (taxableIncome <= 1000000) return 12500 + (taxableIncome - 500000) * 0.20;
  return 12500 + 100000 + (taxableIncome - 1000000) * 0.30;
}

function calculateTaxNewRegime(taxableIncome: number): number {
  // FY 2025-26 New Regime Slabs (Budget 2025)
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
  // FY 2025-26 Rebate
  if (regime === TaxRegime.NEW && taxableIncome <= 1200000) {
    return Math.min(calculateTaxNewRegime(taxableIncome), 60000);
  }
  if (regime === TaxRegime.OLD && taxableIncome <= 500000) {
    return Math.min(calculateTaxOldRegime(taxableIncome), 12500);
  }
  return 0;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const financialYear = searchParams.get('financialYear');

    const query: Record<string, unknown> = { userId: session.user.id };
    if (financialYear) {
      query.financialYear = financialYear;
    }

    const profiles = await TaxProfile.find(query)
      .sort({ financialYear: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: profiles.map((p) => ({ ...p, _id: p._id.toString() })),
    });
  } catch (error) {
    console.error('Error fetching tax profiles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tax profiles' },
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

    const body = await request.json();
    const validatedData = taxProfileSchema.parse(body);

    await connectToDatabase();

    // Check if profile already exists for this FY
    const existing = await TaxProfile.findOne({
      userId: session.user.id,
      financialYear: validatedData.financialYear,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Tax profile already exists for this financial year' },
        { status: 400 }
      );
    }

    // If autoCalculate, fetch income from transactions
    let calculatedIncome = 0;
    if (validatedData.autoCalculate !== false) {
      const [startYear] = validatedData.financialYear.split('-').map(Number);
      const fyStart = new Date(startYear, 3, 1); // April 1
      const fyEnd = new Date(startYear + 1, 2, 31); // March 31

      const incomeTransactions = await Transaction.aggregate([
        {
          $match: {
            userId: { $eq: session.user.id },
            type: TransactionType.INCOME,
            dateTime: { $gte: fyStart, $lte: fyEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);

      calculatedIncome = incomeTransactions[0]?.total || 0;
    }

    const profile = await TaxProfile.create({
      ...validatedData,
      userId: session.user.id,
      salaryIncome: validatedData.salaryIncome || calculatedIncome,
    });

    return NextResponse.json(
      {
        success: true,
        data: { ...profile.toObject(), _id: profile._id.toString() },
        message: 'Tax profile created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tax profile:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create tax profile' },
      { status: 500 }
    );
  }
}
