import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Member from '@/lib/mongodb/models/Member';
import { membersCache } from '@/lib/cache/lru-cache';

// DELETE — Reset member password (primary user only)
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

  member.accessPasswordHash = undefined;
  member.accessSetupComplete = false;
  member.passwordResetRequested = false;
  await member.save();

  membersCache.invalidatePattern(session.user.id);

  return NextResponse.json({ success: true });
}
