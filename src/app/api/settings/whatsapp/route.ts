import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();

  const user = await User.findById(session.user.id)
    .select('whatsappPhone timezone')
    .lean();

  return NextResponse.json({
    whatsappPhone: user?.whatsappPhone ?? '',
    timezone: user?.timezone ?? 'Asia/Kolkata',
    configured: !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { whatsappPhone, timezone } = await req.json();

  if (!whatsappPhone || typeof whatsappPhone !== 'string') {
    return NextResponse.json({ error: 'whatsappPhone is required' }, { status: 400 });
  }

  // Normalize — strip spaces, dashes, parens, and leading +
  const normalized = whatsappPhone.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  // E.164: country code starts with 1-9, then 7-14 more digits (8-15 total)
  if (!/^[1-9]\d{7,14}$/.test(normalized)) {
    return NextResponse.json(
      { error: 'Invalid phone number — use international E.164 format, e.g. 919876543210 (no leading 0)' },
      { status: 400 }
    );
  }

  await connectToDatabase();

  await User.updateOne(
    { _id: session.user.id },
    { whatsappPhone: normalized, timezone: timezone ?? 'Asia/Kolkata' }
  );

  return NextResponse.json({ success: true, whatsappPhone: normalized });
}
