import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb/client';
import { getUserId } from '@/lib/auth/session';
import { getSubscriptionSummary } from '@/lib/utils/subscription';
import Subscription from '@/lib/mongodb/models/Subscription';
import User from '@/lib/mongodb/models/User';
import PricingConfig from '@/lib/mongodb/models/PricingConfig';
import { withErrorHandler } from '@/lib/utils/api';

// GET /api/subscription — Get current user's subscription summary
export async function GET() {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    await connectToDatabase();

    const summary = await getSubscriptionSummary(userId);

    if (!summary) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: summary });
  });
}

// PATCH /api/subscription — Update plan or add-ons
export async function PATCH(request: NextRequest) {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    await connectToDatabase();

    const body = await request.json();
    const { action, plan, addonId, quantity } = body;

    const subscription = await Subscription.findOne({ userId, status: 'active' });
    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const pricingConfig = await PricingConfig.findOne({ isActive: true });
    if (!pricingConfig) {
      return NextResponse.json(
        { success: false, error: 'Pricing configuration not found' },
        { status: 500 }
      );
    }

    switch (action) {
      case 'upgrade': {
        if (plan === 'premium') {
          subscription.plan = 'premium';
          subscription.startDate = new Date();
        }
        break;
      }

      case 'downgrade': {
        if (plan === 'free') {
          subscription.plan = 'free';
        }
        break;
      }

      case 'add-addon': {
        if (!addonId) {
          return NextResponse.json(
            { success: false, error: 'addonId is required' },
            { status: 400 }
          );
        }

        const addonDef = pricingConfig.addons.find((a) => a.id === addonId);
        if (!addonDef) {
          return NextResponse.json(
            { success: false, error: 'Invalid add-on' },
            { status: 400 }
          );
        }

        const existingAddon = subscription.addons.find((a) => a.addonId === addonId);
        if (existingAddon) {
          if (addonDef.type === 'stackable') {
            existingAddon.quantity += quantity || 1;
          }
          // feature add-ons already active — no-op
        } else {
          subscription.addons.push({
            addonId,
            quantity: addonDef.type === 'stackable' ? (quantity || 1) : 1,
            activatedAt: new Date(),
          });
        }
        break;
      }

      case 'remove-addon': {
        if (!addonId) {
          return NextResponse.json(
            { success: false, error: 'addonId is required' },
            { status: 400 }
          );
        }

        subscription.addons = subscription.addons.filter(
          (a) => a.addonId !== addonId
        );
        break;
      }

      case 'update-addon-quantity': {
        if (!addonId || !quantity) {
          return NextResponse.json(
            { success: false, error: 'addonId and quantity are required' },
            { status: 400 }
          );
        }

        const addon = subscription.addons.find((a) => a.addonId === addonId);
        if (addon) {
          if (quantity <= 0) {
            subscription.addons = subscription.addons.filter(
              (a) => a.addonId !== addonId
            );
          } else {
            addon.quantity = quantity;
          }
        }
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: upgrade, downgrade, add-addon, remove-addon, update-addon-quantity' },
          { status: 400 }
        );
    }

    await subscription.save();

    const summary = await getSubscriptionSummary(userId);
    return NextResponse.json({ success: true, data: summary });
  });
}

// POST /api/subscription — Select initial plan (after registration)
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    await connectToDatabase();

    const body = await request.json();
    const { plan } = body;

    if (!plan || !['free', 'premium'].includes(plan)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan. Use: free or premium' },
        { status: 400 }
      );
    }

    // Update subscription
    await Subscription.findOneAndUpdate(
      { userId },
      { plan, status: 'active', startDate: new Date() },
      { upsert: true, new: true }
    );

    // Mark user as having selected a plan
    await User.findByIdAndUpdate(userId, { hasSelectedPlan: true });

    const summary = await getSubscriptionSummary(userId);
    return NextResponse.json({ success: true, data: summary });
  });
}
