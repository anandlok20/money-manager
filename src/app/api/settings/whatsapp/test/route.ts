import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';
import { sendWhatsAppMessage } from '@/lib/utils/whatsapp';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: 'WhatsApp API not configured — add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to your environment' },
      { status: 503 }
    );
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).select('whatsappPhone name').lean();
  if (!user?.whatsappPhone) {
    return NextResponse.json({ error: 'No WhatsApp number saved yet' }, { status: 400 });
  }

  const message = [
    `👋 Hello ${user.name}!`,
    '',
    'This is a test message from your *Family Expense Manager* habit tracker.',
    '',
    '✅ WhatsApp reminders are working correctly.',
    "You'll receive a reminder like this one whenever a habit's reminder time arrives.",
  ].join('\n');

  try {
    await sendWhatsAppMessage(user.whatsappPhone, message);
    return NextResponse.json({ success: true, sentTo: user.whatsappPhone });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
