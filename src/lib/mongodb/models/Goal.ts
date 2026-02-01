import mongoose, { Schema, Document, Model } from 'mongoose';

export enum GoalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface IGoal extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  icon?: string;
  color?: string;
  status: GoalStatus;
  linkedAccountId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Goal name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be at least 1'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative'],
    },
    deadline: {
      type: Date,
    },
    icon: {
      type: String,
      default: '🎯',
    },
    color: {
      type: String,
      default: '#3b82f6',
    },
    status: {
      type: String,
      enum: Object.values(GoalStatus),
      default: GoalStatus.ACTIVE,
    },
    linkedAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
GoalSchema.index({ userId: 1, status: 1 });
GoalSchema.index({ userId: 1, deadline: 1 });

const Goal: Model<IGoal> =
  mongoose.models.Goal || mongoose.model<IGoal>('Goal', GoalSchema);

export default Goal;
