import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Member from '@/lib/mongodb/models/Member';
import { MemberType } from '@/types';
import { membersCache } from '@/lib/cache/lru-cache';

function generateAccessCode(): string {
  return require('crypto').randomBytes(4).toString('hex').toUpperCase();
}

// POST — Enable access: generate code and enable
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Member users cannot manage access codes
  if (session.user.isMemberUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  await connectToDatabase();

  const member = await Member.findOne({ _id: id, userId: session.user.id });
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  if (member.type === MemberType.SELF) {
    return NextResponse.json({ error: 'Cannot enable access for self member' }, { status: 400 });
  }

  // Generate a unique code
  let code = generateAccessCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await Member.findOne({ accessCode: code });
    if (!existing) break;
    code = generateAccessCode();
    attempts++;
  }

  member.accessCode = code;
  member.accessCodeEnabled = true;
  await member.save();

  membersCache.invalidatePattern(session.user.id);

  return NextResponse.json({ success: true, accessCode: code });
}

// DELETE — Disable access
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.isMemberUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  await connectToDatabase();

  const member = await Member.findOne({ _id: id, userId: session.user.id });
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  member.accessCodeEnabled = false;
  await member.save();

  membersCache.invalidatePattern(session.user.id);

  return NextResponse.json({ success: true });
}

// PUT — Regenerate code
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.isMemberUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  await connectToDatabase();

  const member = await Member.findOne({ _id: id, userId: session.user.id });
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  if (!member.accessCodeEnabled) {
    return NextResponse.json({ error: 'Access is not enabled for this member' }, { status: 400 });
  }

  let code = generateAccessCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await Member.findOne({ accessCode: code, _id: { $ne: id } });
    if (!existing) break;
    code = generateAccessCode();
    attempts++;
  }

  member.accessCode = code;
  await member.save();

  membersCache.invalidatePattern(session.user.id);

  return NextResponse.json({ success: true, accessCode: code });
}
