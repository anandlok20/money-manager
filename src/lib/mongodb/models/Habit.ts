import mongoose, { Schema, Document } from 'mongoose';
import { HABIT_CATEGORIES } from '@/lib/constants/habits';
import type { HabitCategory } from '@/lib/constants/habits';

export { HABIT_CATEGORIES } from '@/lib/constants/habits';
export type { HabitCategory } from '@/lib/constants/habits';
export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export interface IHabit extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  category: HabitCategory;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  targetDays: number[]; // 0=Sun…6=Sat (used for weekly)
  targetCount: number;  // completions per period (weekly/monthly)
  reminderTime?: string; // HH:MM
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  streak: number;
  longestStreak: number;
  totalCompletions: number;
  lastReminderDate?: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

const HabitSchema = new Schema<IHabit>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:         { type: String, required: true, trim: true, maxlength: 100 },
    description:  { type: String, trim: true, maxlength: 500 },
    category:     { type: String, enum: HABIT_CATEGORIES, required: true },
    icon:         { type: String, default: '✅' },
    color:        { type: String, default: '#6366f1' },
    frequency:    { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
    targetDays:   { type: [Number], default: [] },
    targetCount:  { type: Number, default: 1, min: 1 },
    reminderTime: { type: String },
    startDate:    { type: Date, required: true },
    endDate:      { type: Date },
    isActive:     { type: Boolean, default: true },
    streak:           { type: Number, default: 0 },
    longestStreak:    { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 },
    lastReminderDate: { type: String }, // YYYY-MM-DD, prevents duplicate sends per day
  },
  { timestamps: true }
);

HabitSchema.index({ userId: 1, isActive: 1 });
HabitSchema.index({ userId: 1, category: 1 });

export default mongoose.models.Habit || mongoose.model<IHabit>('Habit', HabitSchema);
