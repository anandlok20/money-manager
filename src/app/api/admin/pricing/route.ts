import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import PricingConfig from '@/lib/mongodb/models/PricingConfig';
import { withErrorHandler } from '@/lib/utils/api';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return null;
  }
  return session;
}

// GET /api/admin/pricing — Get current pricing config
export async function GET() {
  return withErrorHandler(async () => {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const config = await PricingConfig.findOne({ isActive: true }).lean();
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'No pricing config found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: config });
  });
}

// PUT /api/admin/pricing — Update pricing config
export async function PUT(request: NextRequest) {
  return withErrorHandler(async () => {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const body = await request.json();
    const {
      premiumPlanPrice,
      freeLimits,
      premiumLimits,
      addons,
    } = body;

    const config = await PricingConfig.findOne({ isActive: true });
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'No pricing config found' },
        { status: 404 }
      );
    }

    if (premiumPlanPrice !== undefined) config.premiumPlanPrice = premiumPlanPrice;
    if (freeLimits) config.freeLimits = { ...config.freeLimits, ...freeLimits };
    if (premiumLimits) config.premiumLimits = { ...config.premiumLimits, ...premiumLimits };
    if (addons) config.addons = addons;

    await config.save();

    return NextResponse.json({
      success: true,
      data: config.toObject(),
      message: 'Pricing config updated',
    });
  });
}
