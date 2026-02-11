import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Goal, { GoalStatus } from '@/lib/mongodb/models/Goal';
import { goalUpdateSchema, goalContributionSchema } from '@/lib/validations/goal';
import { sanitizeTextFields, validateObjectId } from '@/lib/utils/api';

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

    const goal = await Goal.findOne({
      _id: id,
      userId: session.user.id,
    })
      .populate('linkedAccountId', 'bankName accountHolderName currentBalance')
      .lean();

    if (!goal) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 }
      );
    }

    const progress = Math.min(
      Math.round((goal.currentAmount / goal.targetAmount) * 100),
      100
    );
    const remaining = goal.targetAmount - goal.currentAmount;

    return NextResponse.json({
      success: true,
      data: {
        ...goal,
        _id: goal._id.toString(),
        progress,
        remaining,
      },
    });
  } catch (error) {
    console.error('Error fetching goal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch goal' },
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

    await connectToDatabase();

    const body = await request.json();
    const validation = goalUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const sanitizedData = sanitizeTextFields(validation.data as Record<string, unknown>);

    const updateData = {
      ...sanitizedData,
      deadline: (sanitizedData as typeof validation.data).deadline
        ? new Date((sanitizedData as typeof validation.data).deadline!)
        : undefined,
    };

    const goal = await Goal.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!goal) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 }
      );
    }

    // Check if goal is completed
    if (goal.currentAmount >= goal.targetAmount && goal.status === GoalStatus.ACTIVE) {
      goal.status = GoalStatus.COMPLETED;
      await goal.save();
    }

    return NextResponse.json({
      success: true,
      data: {
        ...goal.toObject(),
        _id: goal._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update goal' },
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
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    await connectToDatabase();

    const goal = await Goal.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!goal) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Goal deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
}

// PATCH - Add/remove contribution to goal
export async function PATCH(
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

    const body = await request.json();
    const validation = goalContributionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const goal = await Goal.findOneAndUpdate(
      {
        _id: id,
        userId: session.user.id,
        status: GoalStatus.ACTIVE,
      },
      {
        $inc: { currentAmount: validation.data.amount },
      },
      { new: true, runValidators: true }
    );

    if (!goal) {
      // Check if it exists but is not active
      const existingGoal = await Goal.findOne({ _id: id, userId: session.user.id });
      if (!existingGoal) {
        return NextResponse.json(
          { success: false, error: 'Goal not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Cannot add contribution to inactive goal' },
        { status: 400 }
      );
    }

    // Ensure currentAmount doesn't go below 0
    if (goal.currentAmount < 0) {
      goal.currentAmount = 0;
      await goal.save();
    }

    // Check if goal is completed
    if (goal.currentAmount >= goal.targetAmount && goal.status === GoalStatus.ACTIVE) {
      goal.status = GoalStatus.COMPLETED;
      await goal.save();
    }

    return NextResponse.json({
      success: true,
      data: {
        ...goal.toObject(),
        _id: goal._id.toString(),
        progress: Math.min(
          Math.round((goal.currentAmount / goal.targetAmount) * 100),
          100
        ),
        remaining: goal.targetAmount - goal.currentAmount,
      },
    });
  } catch (error) {
    console.error('Error updating goal contribution:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update contribution' },
      { status: 500 }
    );
  }
}
