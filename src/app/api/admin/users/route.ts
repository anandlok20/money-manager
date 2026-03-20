import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';
import Subscription from '@/lib/mongodb/models/Subscription';
import { withErrorHandler } from '@/lib/utils/api';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid userId format');

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('update-role'), userId: objectIdSchema, role: z.enum(['user', 'admin']) }),
  z.object({ action: z.literal('update-plan'), userId: objectIdSchema, plan: z.enum(['free', 'premium']) }),
  z.object({ action: z.literal('add-addon'), userId: objectIdSchema, addonId: z.string().min(1), quantity: z.number().int().min(1).optional() }),
  z.object({ action: z.literal('remove-addon'), userId: objectIdSchema, addonId: z.string().min(1) }),
  z.object({ action: z.literal('update-addon-quantity'), userId: objectIdSchema, addonId: z.string().min(1), quantity: z.number().int().min(0) }),
]);

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') return null;
  return session;
}

async function logAdminAction(adminId: string, action: string, targetUserId: string, details?: Record<string, unknown>) {
  try {
    // Simple console audit trail — replace with a dedicated audit_log collection for production
    console.info('[AUDIT]', JSON.stringify({ ts: new Date().toISOString(), adminId, action, targetUserId, ...details }));
  } catch {
    // Never let audit logging crash the main request
  }
}

// GET /api/admin/users — List all users with their subscriptions
export async function GET() {
  return withErrorHandler(async () => {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    const users = await User.find({}).select('-passwordHash').sort({ createdAt: -1 }).lean();
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
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const { action, userId } = data;

    switch (action) {
      case 'update-role': {
        await User.findByIdAndUpdate(userId, { role: data.role });
        await logAdminAction(session.user.id, action, userId, { role: data.role });
        break;
      }

      case 'update-plan': {
        await Subscription.findOneAndUpdate(
          { userId },
          { plan: data.plan, startDate: new Date() },
          { upsert: true }
        );
        await logAdminAction(session.user.id, action, userId, { plan: data.plan });
        break;
      }

      case 'add-addon': {
        const sub = await Subscription.findOne({ userId });
        if (!sub) {
          return NextResponse.json({ success: false, error: 'No subscription found' }, { status: 404 });
        }
        const existing = sub.addons.find((a) => a.addonId === data.addonId);
        if (existing) {
          existing.quantity += data.quantity ?? 1;
        } else {
          sub.addons.push({ addonId: data.addonId, quantity: data.quantity ?? 1, activatedAt: new Date() });
        }
        await sub.save();
        await logAdminAction(session.user.id, action, userId, { addonId: data.addonId, quantity: data.quantity });
        break;
      }

      case 'remove-addon': {
        await Subscription.findOneAndUpdate({ userId }, { $pull: { addons: { addonId: data.addonId } } });
        await logAdminAction(session.user.id, action, userId, { addonId: data.addonId });
        break;
      }

      case 'update-addon-quantity': {
        if (data.quantity <= 0) {
          await Subscription.findOneAndUpdate({ userId }, { $pull: { addons: { addonId: data.addonId } } });
        } else {
          await Subscription.findOneAndUpdate(
            { userId, 'addons.addonId': data.addonId },
            { $set: { 'addons.$.quantity': data.quantity } }
          );
        }
        await logAdminAction(session.user.id, action, userId, { addonId: data.addonId, quantity: data.quantity });
        break;
      }
    }

    const updatedUser = await User.findById(userId).select('-passwordHash').lean();
    const updatedSub = await Subscription.findOne({ userId }).lean();

    return NextResponse.json({
      success: true,
      data: { ...updatedUser, _id: updatedUser?._id?.toString(), subscription: updatedSub },
    });
  });
}
