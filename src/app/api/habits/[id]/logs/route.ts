import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Habit from '@/lib/mongodb/models/Habit';
import HabitLog from '@/lib/mongodb/models/HabitLog';
import { logHabitSchema } from '@/lib/validations/habit';

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

  const { date, completed, note } = parsed.data;

  await connectToDatabase();

  const habit = await Habit.findOne({ _id: id, userId: session.user.id });
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!completed) {
    const deleted = await HabitLog.findOneAndDelete({ habitId: id, userId: session.user.id, date });
    if (deleted) {
      await Habit.updateOne({ _id: id }, { $inc: { totalCompletions: -1 } });
      await recalculateStreak(id, session.user.id, habit.longestStreak);
    }
    return NextResponse.json({ completed: false });
  }

  // upsert log
  const existing = await HabitLog.findOne({ habitId: id, userId: session.user.id, date });
  await HabitLog.findOneAndUpdate(
    { habitId: id, userId: session.user.id, date },
    { note, completedAt: new Date() },
    { upsert: true, new: true }
  );

  if (!existing) {
    await Habit.updateOne({ _id: id }, { $inc: { totalCompletions: 1 } });
  }
  await recalculateStreak(id, session.user.id, habit.longestStreak);

  return NextResponse.json({ completed: true });
}

async function recalculateStreak(habitId: string, userId: string, currentLongest: number) {
  const logs = await HabitLog.find({ habitId, userId })
    .sort({ date: -1 })
    .select('date')
    .lean();

  if (logs.length === 0) {
    await Habit.updateOne({ _id: habitId }, { streak: 0 });
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
  // allow streak if completed yesterday but not yet today
  if (streak === 0) {
    const yd = new Date();
    yd.setDate(yd.getDate() - 1);
    streak = calcStreak(yd.toISOString().split('T')[0]);
  }

  const longestStreak = Math.max(streak, currentLongest);
  await Habit.updateOne({ _id: habitId }, { streak, longestStreak });
}
