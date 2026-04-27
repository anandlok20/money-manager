import mongoose, { Schema, Document } from 'mongoose';

export interface IHabitLog extends Document {
  _id: mongoose.Types.ObjectId;
  habitId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  note?: string;
  completedAt: Date;
  createdAt: Date;
}

const HabitLogSchema = new Schema<IHabitLog>(
  {
    habitId:     { type: Schema.Types.ObjectId, ref: 'Habit', required: true },
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date:        { type: String, required: true }, // YYYY-MM-DD
    note:        { type: String, trim: true, maxlength: 300 },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One log per habit per day
HabitLogSchema.index({ habitId: 1, date: 1 }, { unique: true });
HabitLogSchema.index({ userId: 1, date: 1 });
HabitLogSchema.index({ habitId: 1, userId: 1 });

export default mongoose.models.HabitLog || mongoose.model<IHabitLog>('HabitLog', HabitLogSchema);
