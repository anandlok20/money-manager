import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Habit from '@/lib/mongodb/models/Habit';
import HabitLog from '@/lib/mongodb/models/HabitLog';
import { updateHabitSchema } from '@/lib/validations/habit';
import { sanitizeText } from '@/lib/utils/sanitize';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectToDatabase();

  const habit = await Habit.findOne({ _id: id, userId: session.user.id }).lean();
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const today = new Date().toISOString().split('T')[0];
  const todayLog = await HabitLog.findOne({ habitId: id, userId: session.user.id, date: today }).lean();

  return NextResponse.json({
    ...habit,
    _id: habit._id.toString(),
    userId: habit.userId.toString(),
    completedToday: !!todayLog,
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateHabitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.name)        updateData.name        = sanitizeText(parsed.data.name);
  if (parsed.data.description) updateData.description = sanitizeText(parsed.data.description);
  if (parsed.data.startDate)   updateData.startDate   = new Date(parsed.data.startDate);
  if (parsed.data.endDate)     updateData.endDate     = new Date(parsed.data.endDate);
  if (parsed.data.reminderTime === '') delete updateData.reminderTime;

  const habit = await Habit.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    updateData,
    { new: true }
  ).lean();
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ...habit, _id: habit._id.toString() });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectToDatabase();

  const habit = await Habit.findOneAndDelete({ _id: id, userId: session.user.id });
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await HabitLog.deleteMany({ habitId: id });

  return NextResponse.json({ success: true });
}
