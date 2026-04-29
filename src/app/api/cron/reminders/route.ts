import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb/client';
import Habit from '@/lib/mongodb/models/Habit';
import User from '@/lib/mongodb/models/User';
import {
  sendWhatsAppMessage,
  hhmToMinutes,
  currentTimeInZone,
  todayInZone,
} from '@/lib/utils/whatsapp';

// Vercel also calls crons with GET
export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(request: NextRequest) {
  // ── Constant-time auth ────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/reminders] CRON_SECRET not set');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const provided    = request.headers.get('authorization') ?? '';
  const expected    = `Bearer ${cronSecret}`;
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  const isValid =
    expectedBuf.length === providedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, providedBuf);
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
    return NextResponse.json({ skipped: 'WhatsApp not configured' });
  }

  await connectToDatabase();

  // ── Find all active habits that have a reminder time set ──────────────────
  const habits = await Habit.find({
    isActive: true,
    reminderTime: { $exists: true, $nin: ['', null] },
  })
    .select('_id name icon category frequency streak userId reminderTime lastReminderDate')
    .lean();

  if (habits.length === 0) return NextResponse.json({ sent: 0, skipped: 0 });

  // ── Load users (batch) ────────────────────────────────────────────────────
  const userIds = [...new Set(habits.map((h) => h.userId.toString()))];
  const users   = await User.find({ _id: { $in: userIds } })
    .select('_id whatsappPhone timezone')
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  let sent = 0;
  let skipped = 0;

  for (const habit of habits) {
    const user = userMap.get(habit.userId.toString());
    if (!user?.whatsappPhone) { skipped++; continue; }

    const tz    = user.timezone ?? 'Asia/Kolkata';
    const today = todayInZone(tz);

    // Quick filter — already sent today
    if (habit.lastReminderDate === today) { skipped++; continue; }

    // Time match (±1 minute window)
    const nowHHM     = currentTimeInZone(tz);
    const nowMins    = hhmToMinutes(nowHHM);
    const targetMins = hhmToMinutes(habit.reminderTime!);
    if (Math.abs(nowMins - targetMins) > 1) { skipped++; continue; }

    // ── ATOMIC CLAIM: only proceed if we win the update ──────────────────
    // Prevents duplicate sends on concurrent cron invocations
    const claimed = await Habit.findOneAndUpdate(
      { _id: habit._id, lastReminderDate: { $ne: today } },
      { $set: { lastReminderDate: today } },
      { new: true }
    ).lean();
    if (!claimed) { skipped++; continue; } // someone else won the claim

    // ── Build & send message ─────────────────────────────────────────────
    const appUrl = process.env.NEXTAUTH_URL ?? '';
    const streakLine = habit.streak > 0
      ? `🔥 Streak: *${habit.streak} day${habit.streak === 1 ? '' : 's'}* — keep it going!`
      : '🌱 Start your streak today!';

    const message = [
      `🔔 *Habit Reminder*`,
      '',
      `${habit.icon} *${habit.name}*`,
      `${habit.category} · ${habit.frequency}`,
      '',
      streakLine,
      appUrl ? `\n✅ Check off: ${appUrl}/habits/${habit._id}` : '',
    ].filter((l) => l !== undefined).join('\n').trim();

    try {
      await sendWhatsAppMessage(user.whatsappPhone, message);
      sent++;
    } catch (err) {
      // Roll back the claim so it can retry next minute
      await Habit.updateOne({ _id: habit._id }, { $unset: { lastReminderDate: '' } });
      console.error(`[cron/reminders] Send failed for habit ${habit._id}:`, err);
      skipped++;
    }
  }

  console.info(`[cron/reminders] sent=${sent} skipped=${skipped}`);
  return NextResponse.json({ sent, skipped });
}
