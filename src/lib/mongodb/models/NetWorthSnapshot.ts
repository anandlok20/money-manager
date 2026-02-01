import mongoose, { Schema, Document } from 'mongoose';

export interface INetWorthSnapshot extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  breakdown: {
    bankAccounts: number;
    cards: number; // Card credit balance (negative = liability)
    investments: number;
    cash: number;
  };
  createdAt: Date;
}

const netWorthSnapshotSchema = new Schema<INetWorthSnapshot>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    totalAssets: {
      type: Number,
      required: true,
      default: 0,
    },
    totalLiabilities: {
      type: Number,
      required: true,
      default: 0,
    },
    netWorth: {
      type: Number,
      required: true,
      default: 0,
    },
    breakdown: {
      bankAccounts: { type: Number, default: 0 },
      cards: { type: Number, default: 0 },
      investments: { type: Number, default: 0 },
      cash: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
netWorthSnapshotSchema.index({ userId: 1, date: -1 });

// Ensure only one snapshot per day per user
netWorthSnapshotSchema.index({ userId: 1, date: 1 }, { unique: true });

export const NetWorthSnapshot =
  mongoose.models.NetWorthSnapshot ||
  mongoose.model<INetWorthSnapshot>('NetWorthSnapshot', netWorthSnapshotSchema);
