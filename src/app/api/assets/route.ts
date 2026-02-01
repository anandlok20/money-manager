import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Asset, { AssetType, AssetStatus } from '@/lib/mongodb/models/Asset';
import { z } from 'zod';

const assetSchema = z.object({
  type: z.nativeEnum(AssetType),
  name: z.string().min(1),
  description: z.string().optional(),
  purchaseDate: z.string().or(z.date()),
  purchaseValue: z.number().min(0),
  currentValue: z.number().min(0),
  maturityDate: z.string().or(z.date()).optional(),
  maturityValue: z.number().optional(),
  isRecurring: z.boolean().optional(),
  recurringAmount: z.number().optional(),
  recurringFrequency: z.string().optional(),
  nextPaymentDate: z.string().or(z.date()).optional(),
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
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const category = searchParams.get('category'); // property, postoffice, insurance, etc.

    const query: Record<string, unknown> = { userId: session.user.id };
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }

    // Category filters
    if (category === 'property') {
      query.type = { $in: [
        AssetType.RESIDENTIAL_PROPERTY,
        AssetType.COMMERCIAL_PROPERTY,
        AssetType.LAND,
        AssetType.PLOT,
        AssetType.FARM_LAND,
      ]};
    } else if (category === 'postoffice') {
      query.type = { $in: [
        AssetType.PPF,
        AssetType.NSC,
        AssetType.KVP,
        AssetType.SSY,
        AssetType.SCSS,
        AssetType.POST_OFFICE_RD,
        AssetType.POST_OFFICE_TD,
        AssetType.POST_OFFICE_MIS,
      ]};
    } else if (category === 'insurance') {
      query.type = { $in: [
        AssetType.TERM_INSURANCE,
        AssetType.LIFE_INSURANCE,
        AssetType.ENDOWMENT_PLAN,
        AssetType.ULIP,
        AssetType.HEALTH_INSURANCE,
      ]};
    } else if (category === 'government') {
      query.type = { $in: [
        AssetType.NPS,
        AssetType.EPF,
        AssetType.ATAL_PENSION,
        AssetType.PM_VAYA_VANDANA,
      ]};
    } else if (category === 'fixedincome') {
      query.type = { $in: [
        AssetType.FIXED_DEPOSIT,
        AssetType.RECURRING_DEPOSIT,
        AssetType.CORPORATE_FD,
        AssetType.BONDS,
        AssetType.GOVERNMENT_BONDS,
      ]};
    }

    const assets = await Asset.find(query)
      .sort({ type: 1, name: 1 })
      .lean();

    // Calculate totals
    const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const totalInvested = assets.reduce((sum, a) => sum + a.purchaseValue, 0);
    const totalGain = totalValue - totalInvested;
    const gainPercentage = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    // Group by category/type
    const byCategory: Record<string, { count: number; value: number }> = {};
    assets.forEach((a) => {
      if (!byCategory[a.type]) {
        byCategory[a.type] = { count: 0, value: 0 };
      }
      byCategory[a.type].count++;
      byCategory[a.type].value += a.currentValue;
    });

    return NextResponse.json({
      success: true,
      data: assets.map((a) => ({ ...a, _id: a._id.toString() })),
      summary: {
        totalAssets: assets.length,
        totalValue,
        totalInvested,
        totalGain,
        gainPercentage,
        byCategory,
      },
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assets' },
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
    const validatedData = assetSchema.parse(body);

    await connectToDatabase();

    const asset = await Asset.create({
      ...validatedData,
      userId: session.user.id,
      purchaseDate: new Date(validatedData.purchaseDate),
      maturityDate: validatedData.maturityDate ? new Date(validatedData.maturityDate) : undefined,
      nextPaymentDate: validatedData.nextPaymentDate ? new Date(validatedData.nextPaymentDate) : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: { ...asset.toObject(), _id: asset._id.toString() },
        message: 'Asset created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating asset:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create asset' },
      { status: 500 }
    );
  }
}
