import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Habit from '@/lib/mongodb/models/Habit';
import HabitLog from '@/lib/mongodb/models/HabitLog';
import { createHabitSchema } from '@/lib/validations/habit';
import { sanitizeText } from '@/lib/utils/sanitize';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();

  const habits = await Habit.find({ userId: session.user.id })
    .lean()
    .sort({ createdAt: -1 });

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = await HabitLog.find({ userId: session.user.id, date: today }).lean();
  const completedIds = new Set(todayLogs.map((l) => l.habitId.toString()));

  const result = habits.map((h) => ({
    ...h,
    _id: h._id.toString(),
    userId: h.userId.toString(),
    completedToday: completedIds.has(h._id.toString()),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createHabitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();

  const data = parsed.data;
  const habit = await Habit.create({
    ...data,
    name: sanitizeText(data.name),
    description: data.description ? sanitizeText(data.description) : undefined,
    userId: session.user.id,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : undefined,
    reminderTime: data.reminderTime || undefined,
  });

  return NextResponse.json({ ...habit.toObject(), _id: habit._id.toString() }, { status: 201 });
}
