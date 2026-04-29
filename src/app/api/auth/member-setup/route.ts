import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb/client';
import Member from '@/lib/mongodb/models/Member';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name, password } = body as { code?: string; name?: string; password?: string };

    if (!code || !password) {
      return NextResponse.json({ error: 'Code and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    await connectToDatabase();

    const member = await Member.findOne({
      accessCode: code.toUpperCase().trim(),
      accessCodeEnabled: true,
    });

    if (!member) {
      return NextResponse.json({ error: 'Invalid or disabled access code' }, { status: 404 });
    }

    if (member.accessSetupComplete) {
      return NextResponse.json({ error: 'Account is already set up. Please log in.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    member.accessPasswordHash = passwordHash;
    member.accessSetupComplete = true;
    if (name && name.trim().length >= 2) {
      member.name = name.trim();
    }
    await member.save();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
