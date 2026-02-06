import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';
import Subscription from '@/lib/mongodb/models/Subscription';
import { withErrorHandler } from '@/lib/utils/api';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return null;
  }
  return session;
}

// GET /api/admin/users — List all users with their subscriptions
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

    const users = await User.find({})
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    const subscriptions = await Subscription.find({}).lean();
    const subMap = new Map(subscriptions.map((s) => [s.userId.toString(), s]));

    const usersWithSubs = users.map((u) => ({
      ...u,
      _id: u._id.toString(),
      subscription: subMap.get(u._id.toString()) || null,
    }));

    return NextResponse.json({ success: true, data: usersWithSubs });
  });
}

// PATCH /api/admin/users — Update a user's role or subscription
export async function PATCH(request: NextRequest) {
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
    const { userId, action, plan, role, addonId, quantity } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'update-role': {
        if (!role || !['user', 'admin'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Invalid role' },
            { status: 400 }
          );
        }
        await User.findByIdAndUpdate(userId, { role });
        break;
      }

      case 'update-plan': {
        if (!plan || !['free', 'premium'].includes(plan)) {
          return NextResponse.json(
            { success: false, error: 'Invalid plan' },
            { status: 400 }
          );
        }
        await Subscription.findOneAndUpdate(
          { userId },
          { plan, startDate: new Date() },
          { upsert: true }
        );
        break;
      }

      case 'add-addon': {
        if (!addonId) {
          return NextResponse.json(
            { success: false, error: 'addonId is required' },
            { status: 400 }
          );
        }
        const sub = await Subscription.findOne({ userId });
        if (!sub) {
          return NextResponse.json(
            { success: false, error: 'No subscription found' },
            { status: 404 }
          );
        }
        const existing = sub.addons.find((a) => a.addonId === addonId);
        if (existing) {
          existing.quantity += quantity || 1;
        } else {
          sub.addons.push({
            addonId,
            quantity: quantity || 1,
            activatedAt: new Date(),
          });
        }
        await sub.save();
        break;
      }

      case 'remove-addon': {
        if (!addonId) {
          return NextResponse.json(
            { success: false, error: 'addonId is required' },
            { status: 400 }
          );
        }
        await Subscription.findOneAndUpdate(
          { userId },
          { $pull: { addons: { addonId } } }
        );
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Return updated user with subscription
    const updatedUser = await User.findById(userId).select('-passwordHash').lean();
    const updatedSub = await Subscription.findOne({ userId }).lean();

    return NextResponse.json({
      success: true,
      data: {
        ...updatedUser,
        _id: updatedUser?._id?.toString(),
        subscription: updatedSub,
      },
    });
  });
}
