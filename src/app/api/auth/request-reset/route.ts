import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb/client';
import Member from '@/lib/mongodb/models/Member';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body as { code?: string };

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 });
    }

    await connectToDatabase();

    const member = await Member.findOne({
      accessCode: code.toUpperCase().trim(),
      accessCodeEnabled: true,
      accessSetupComplete: true,
    });

    if (!member) {
      return NextResponse.json({ error: 'Invalid or disabled access code' }, { status: 404 });
    }

    member.passwordResetRequested = true;
    await member.save();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
