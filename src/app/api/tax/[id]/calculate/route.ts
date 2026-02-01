import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import TaxProfile, { TaxRegime, ITaxDeduction } from '@/lib/mongodb/models/TaxProfile';
import Transaction from '@/lib/mongodb/models/Transaction';
import { TransactionType } from '@/types';

// Tax calculation functions
function calculateTaxOldRegime(taxableIncome: number): number {
  if (taxableIncome <= 250000) return 0;
  if (taxableIncome <= 500000) return (taxableIncome - 250000) * 0.05;
  if (taxableIncome <= 1000000) return 12500 + (taxableIncome - 500000) * 0.20;
  return 12500 + 100000 + (taxableIncome - 1000000) * 0.30;
}

function calculateTaxNewRegime(taxableIncome: number): number {
  // FY 2025-26 New Regime Slabs
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

export async function POST(
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
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Tax profile not found' },
        { status: 404 }
      );
    }

    // Fetch income from transactions if autoCalculate is enabled
    if (profile.autoCalculate) {
      const [startYear] = profile.financialYear.split('-').map(Number);
      const fyStart = new Date(startYear, 3, 1);
      const fyEnd = new Date(startYear + 1, 2, 31);

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

      profile.salaryIncome = incomeTransactions[0]?.total || profile.salaryIncome || 0;
    }

    // Calculate Gross Total Income
    const grossTotalIncome =
      profile.salaryIncome +
      profile.housePropertyIncome +
      (profile.capitalGains?.shortTerm || 0) +
      (profile.capitalGains?.longTerm || 0) +
      profile.businessIncome +
      profile.otherIncome;

    // Calculate Total Deductions (only for Old Regime)
    let totalDeductions = 0;
    if (profile.regime === TaxRegime.OLD) {
      totalDeductions = profile.standardDeduction + profile.hraExemption;
      
      // Add section-wise deductions with limits
      profile.deductions.forEach((ded: ITaxDeduction) => {
        const deductionAmount = ded.maxLimit 
          ? Math.min(ded.amount, ded.maxLimit)
          : ded.amount;
        totalDeductions += deductionAmount;
      });
    } else {
      // New regime - only standard deduction of 75000 allowed
      totalDeductions = 75000;
    }

    // Taxable Income
    const taxableIncome = Math.max(0, grossTotalIncome - totalDeductions);

    // Calculate Tax
    const taxBeforeRebate = profile.regime === TaxRegime.NEW
      ? calculateTaxNewRegime(taxableIncome)
      : calculateTaxOldRegime(taxableIncome);

    // Rebate
    const rebate87A = calculateRebate87A(taxableIncome, profile.regime);
    const taxAfterRebate = Math.max(0, taxBeforeRebate - rebate87A);

    // Surcharge
    const surcharge = calculateSurcharge(taxAfterRebate, grossTotalIncome);

    // Health & Education Cess (4%)
    const healthEducationCess = (taxAfterRebate + surcharge) * 0.04;

    // Total Tax Liability
    const totalTaxLiability = taxAfterRebate + surcharge + healthEducationCess;

    // Tax Payable / Refund
    const totalTaxPaid = profile.tdsPaid + profile.advanceTaxPaid + profile.selfAssessmentTax;
    const taxPayable = Math.max(0, totalTaxLiability - totalTaxPaid);
    const refundDue = Math.max(0, totalTaxPaid - totalTaxLiability);

    // Update profile with calculated values
    const updatedProfile = await TaxProfile.findByIdAndUpdate(
      id,
      {
        $set: {
          grossTotalIncome,
          totalDeductions,
          taxableIncome,
          taxBeforeRebate,
          rebate87A,
          taxAfterRebate,
          surcharge,
          healthEducationCess,
          totalTaxLiability,
          taxPayable,
          refundDue,
          lastCalculatedAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    return NextResponse.json({
      success: true,
      data: { ...updatedProfile, _id: updatedProfile!._id.toString() },
      message: 'Tax calculated successfully',
      calculation: {
        grossTotalIncome,
        totalDeductions,
        taxableIncome,
        taxBeforeRebate,
        rebate87A,
        taxAfterRebate,
        surcharge,
        healthEducationCess,
        totalTaxLiability,
        taxPayable,
        refundDue,
      },
    });
  } catch (error) {
    console.error('Error calculating tax:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate tax' },
      { status: 500 }
    );
  }
}
