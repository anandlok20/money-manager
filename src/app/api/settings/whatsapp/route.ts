import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).select('whatsappNotifications');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return default values if not set
    const preferences = user.whatsappNotifications || {
      enabled: false,
      phoneNumber: undefined,
      verifiedAt: undefined,
      dailyExpenseSummary: true,
      dailySummaryTime: '21:00',
      weeklyNetWorthSummary: true,
      monthlySummary: true,
      dueDateAlerts: true,
      scheduledPaymentAlerts: true,
      lowBalanceAlerts: true,
      spendingLimitAlerts: true,
      budgetExceededAlerts: true,
      vehicleAlerts: true,
    };

    return NextResponse.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Error fetching WhatsApp preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    
    // Build update object for nested fields
    const updateFields: Record<string, unknown> = {};
    const allowedFields = [
      'enabled',
      'phoneNumber',
      'dailyExpenseSummary',
      'dailySummaryTime',
      'weeklyNetWorthSummary',
      'monthlySummary',
      'dueDateAlerts',
      'scheduledPaymentAlerts',
      'lowBalanceAlerts',
      'spendingLimitAlerts',
      'budgetExceededAlerts',
      'vehicleAlerts',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields[`whatsappNotifications.${field}`] = body[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updateFields },
      { new: true }
    ).select('whatsappNotifications');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user.whatsappNotifications });
  } catch (error) {
    console.error('Error updating WhatsApp preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
