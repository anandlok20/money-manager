import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Goal from '@/lib/mongodb/models/Goal';
import { goalSchema } from '@/lib/validations/goal';
import { GoalStatus } from '@/lib/mongodb/models/Goal';
import { canCreateResource } from '@/lib/utils/subscription';
import { buildPrivacyFilter } from '@/lib/utils/privacy';

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
    const status = searchParams.get('status');

    const query: Record<string, unknown> = { userId: session.user.id };
    if (status && Object.values(GoalStatus).includes(status as GoalStatus)) {
      query.status = status;
    }
    Object.assign(query, buildPrivacyFilter(session.user));

    const goals = await Goal.find(query)
      .populate('linkedAccountId', 'bankName accountHolderName')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate progress for each goal
    const goalsWithProgress = goals.map((goal) => {
      const progress = Math.min(
        Math.round((goal.currentAmount / goal.targetAmount) * 100),
        100
      );
      const remaining = goal.targetAmount - goal.currentAmount;
      
      // Calculate monthly savings needed if deadline exists
      let monthlyNeeded = null;
      if (goal.deadline && goal.status === GoalStatus.ACTIVE) {
        const now = new Date();
        const deadline = new Date(goal.deadline);
        const monthsLeft = Math.max(
          1,
          (deadline.getFullYear() - now.getFullYear()) * 12 +
            (deadline.getMonth() - now.getMonth())
        );
        monthlyNeeded = Math.ceil(remaining / monthsLeft);
      }

      return {
        ...goal,
        _id: goal._id.toString(),
        linkedAccountId: goal.linkedAccountId
          ? {
              ...goal.linkedAccountId,
              _id: goal.linkedAccountId._id?.toString(),
            }
          : null,
        progress,
        remaining,
        monthlyNeeded,
      };
    });

    return NextResponse.json({
      success: true,
      data: goalsWithProgress,
    });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch goals' },
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

    await connectToDatabase();

    const currentCount = await Goal.countDocuments({ userId: session.user.id });
    const limitCheck = await canCreateResource(session.user.id, 'goals', currentCount);
    if (!limitCheck.allowed) {
      return NextResponse.json({ success: false, error: limitCheck.message }, { status: 403 });
    }

    const body = await request.json();
    const validation = goalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const goalData = {
      ...validation.data,
      userId: session.user.id,
      currentAmount: validation.data.currentAmount || 0,
      deadline: validation.data.deadline ? new Date(validation.data.deadline) : undefined,
      privateMemberId: validation.data.isPrivate ? session.user.memberId || undefined : undefined,
    };

    const goal = await Goal.create(goalData);

    return NextResponse.json({
      success: true,
      data: {
        ...goal.toObject(),
        _id: goal._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}
