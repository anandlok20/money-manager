import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';
import { sendWhatsAppMessage } from '@/services/whatsappService';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).select('whatsappNotifications name');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { whatsappNotifications } = user;

    if (!whatsappNotifications?.phoneNumber || !whatsappNotifications?.verifiedAt) {
      return NextResponse.json(
        { error: 'WhatsApp number not verified' },
        { status: 400 }
      );
    }

    // Send test message
    const testMessage = `🔔 *Money Manager Test Notification*\n\nHello ${user.name}!\n\nThis is a test message to confirm your WhatsApp notifications are working correctly.\n\n✅ Your setup is complete!\n\n_You can now receive:_\n• Daily expense summaries\n• Net worth updates\n• Due date reminders\n• Low balance alerts\n• And more!\n\n_Sent from Money Manager app_`;

    const result = await sendWhatsAppMessage({
      to: whatsappNotifications.phoneNumber,
      message: testMessage,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test message' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test message sent successfully',
    });
  } catch (error) {
    console.error('Error sending test message:', error);
    return NextResponse.json(
      { error: 'Failed to send test message' },
      { status: 500 }
    );
  }
}
