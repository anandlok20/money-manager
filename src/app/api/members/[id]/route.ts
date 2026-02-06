import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Member from '@/lib/mongodb/models/Member';
import Transaction from '@/lib/mongodb/models/Transaction';
import ScheduledPayment from '@/lib/mongodb/models/ScheduledPayment';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import Card from '@/lib/mongodb/models/Card';
import { updateMemberSchema } from '@/lib/validations/member';
import { membersCache } from '@/lib/cache/lru-cache';
import { sanitizeTextFields, validateObjectId, handleApiError } from '@/lib/utils/api';

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
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    await connectToDatabase();

    const member = await Member.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...member, _id: member._id.toString() },
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch member' },
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
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);
    const sanitizedData = sanitizeTextFields(validatedData as Record<string, unknown>);

    await connectToDatabase();

    const member = await Member.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: sanitizedData },
      { new: true }
    ).lean();

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    // Invalidate user's members cache
    membersCache.invalidatePattern(session.user.id);

    return NextResponse.json({
      success: true,
      data: { ...member, _id: member._id.toString() },
      message: 'Member updated successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Failed to update member');
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
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    await connectToDatabase();

    if (permanent) {
      // Permanent delete - remove from database
      const member = await Member.findOneAndDelete({
        _id: id,
        userId: session.user.id,
      });

      if (!member) {
        return NextResponse.json(
          { success: false, error: 'Member not found' },
          { status: 404 }
        );
      }

      // Clean up orphaned references
      await Promise.all([
        Transaction.updateMany(
          { userId: session.user.id, memberId: id },
          { $unset: { memberId: 1 } }
        ),
        ScheduledPayment.updateMany(
          { userId: session.user.id, memberId: id },
          { $unset: { memberId: 1 } }
        ),
        BankAccount.updateMany(
          { userId: session.user.id, linkedMemberIds: id },
          { $pull: { linkedMemberIds: id } }
        ),
        Card.updateMany(
          { userId: session.user.id, linkedMemberId: id },
          { $unset: { linkedMemberId: 1 } }
        ),
      ]);

      // Invalidate user's members cache
      membersCache.invalidatePattern(session.user.id);

      return NextResponse.json({
        success: true,
        message: 'Member permanently deleted',
      });
    } else {
      // Soft delete - set isActive to false
      const member = await Member.findOneAndUpdate(
        { _id: id, userId: session.user.id },
        { $set: { isActive: false } },
        { new: true }
      ).lean();

      if (!member) {
        return NextResponse.json(
          { success: false, error: 'Member not found' },
          { status: 404 }
        );
      }

      // Invalidate user's members cache
      membersCache.invalidatePattern(session.user.id);

      return NextResponse.json({
        success: true,
        message: 'Member deactivated successfully',
      });
    }
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete member' },
      { status: 500 }
    );
  }
}
