import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';
import { sendWhatsAppMessage } from '@/services/whatsappService';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Clean phone number
    let cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (cleanedPhone.length === 10) {
      cleanedPhone = '91' + cleanedPhone;
    }

    // Send verification message
    const verificationMessage = `✅ *Money Manager Verification*\n\nHello ${session.user.name}!\n\nYour WhatsApp number has been verified successfully.\n\nYou will now receive financial alerts and summaries on this number.\n\n_This is an automated message from Money Manager app._`;

    const result = await sendWhatsAppMessage({
      to: cleanedPhone,
      message: verificationMessage,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send verification message' },
        { status: 400 }
      );
    }

    // Update user with verified phone number
    await User.findByIdAndUpdate(session.user.id, {
      $set: {
        'whatsappNotifications.phoneNumber': cleanedPhone,
        'whatsappNotifications.verifiedAt': new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Verification message sent successfully',
    });
  } catch (error) {
    console.error('Error verifying WhatsApp number:', error);
    return NextResponse.json(
      { error: 'Failed to verify phone number' },
      { status: 500 }
    );
  }
}
