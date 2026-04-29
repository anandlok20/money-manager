import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Habit from '@/lib/mongodb/models/Habit';
import HabitLog from '@/lib/mongodb/models/HabitLog';
import { logHabitSchema } from '@/lib/validations/habit';
import { sanitizeText } from '@/lib/utils/sanitize';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const year  = parseInt(searchParams.get('year')  || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

  await connectToDatabase();

  const habit = await Habit.findOne({ _id: id, userId: session.user.id }).lean();
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const mm  = String(month).padStart(2, '0');
  const startDate = `${year}-${mm}-01`;
  const lastDay   = new Date(year, month, 0).getDate();
  const endDate   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;

  const logs = await HabitLog.find({
    habitId: id,
    userId:  session.user.id,
    date:    { $gte: startDate, $lte: endDate },
  })
    .lean()
    .sort({ date: 1 });

  return NextResponse.json({
    habit:  { ...habit, _id: habit._id.toString() },
    logs:   logs.map((l) => ({ ...l, _id: l._id.toString(), habitId: l.habitId.toString() })),
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();
  const parsed = logHabitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { date, completed } = parsed.data;
  const note = parsed.data.note ? sanitizeText(parsed.data.note) : undefined;

  await connectToDatabase();

  // Verify ownership before opening a transaction
  const habit = await Habit.findOne({ _id: id, userId: session.user.id })
    .select('longestStreak')
    .lean();
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // ── Atomic transaction: log + counter + streak ─────────────────────────────
  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      if (!completed) {
        const deleted = await HabitLog.findOneAndDelete(
          { habitId: id, userId: session.user.id, date },
          { session: dbSession }
        );
        if (deleted) {
          await Habit.updateOne(
            { _id: id },
            { $inc: { totalCompletions: -1 } },
            { session: dbSession }
          );
          await recalculateStreakAtomic(id, session.user.id, habit.longestStreak, dbSession);
        }
      } else {
        const existing = await HabitLog.findOne(
          { habitId: id, userId: session.user.id, date },
          null,
          { session: dbSession }
        );
        await HabitLog.findOneAndUpdate(
          { habitId: id, userId: session.user.id, date },
          { note, completedAt: new Date() },
          { upsert: true, new: true, session: dbSession }
        );
        if (!existing) {
          await Habit.updateOne(
            { _id: id },
            { $inc: { totalCompletions: 1 } },
            { session: dbSession }
          );
        }
        await recalculateStreakAtomic(id, session.user.id, habit.longestStreak, dbSession);
      }
    });
  } finally {
    await dbSession.endSession();
  }

  return NextResponse.json({ completed });
}

async function recalculateStreakAtomic(
  habitId: string,
  userId: string,
  currentLongest: number,
  dbSession: mongoose.ClientSession
) {
  const logs = await HabitLog.find({ habitId, userId }, null, { session: dbSession })
    .sort({ date: -1 })
    .select('date')
    .lean();

  if (logs.length === 0) {
    await Habit.updateOne({ _id: habitId }, { streak: 0 }, { session: dbSession });
    return;
  }

  const dateSet = new Set(logs.map((l) => l.date));
  const today   = new Date().toISOString().split('T')[0];

  const calcStreak = (from: string) => {
    let count = 0;
    let cur = from;
    while (dateSet.has(cur)) {
      count++;
      const d = new Date(cur);
      d.setDate(d.getDate() - 1);
      cur = d.toISOString().split('T')[0];
    }
    return count;
  };

  let streak = calcStreak(today);
  if (streak === 0) {
    const yd = new Date();
    yd.setDate(yd.getDate() - 1);
    streak = calcStreak(yd.toISOString().split('T')[0]);
  }

  const longestStreak = Math.max(streak, currentLongest);
  await Habit.updateOne(
    { _id: habitId },
    { streak, longestStreak },
    { session: dbSession }
  );
}
