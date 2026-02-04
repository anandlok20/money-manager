import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Member from '@/lib/mongodb/models/Member';
import { updateMemberSchema } from '@/lib/validations/member';
import { membersCache } from '@/lib/cache/lru-cache';

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
    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);

    await connectToDatabase();

    const member = await Member.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: validatedData },
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
    console.error('Error updating member:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update member' },
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
