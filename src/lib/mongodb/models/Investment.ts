import mongoose, { Schema, Document, Model } from 'mongoose';
import { InvestmentType } from '@/types';

export interface IInvestment extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  type: InvestmentType;
  currentValue: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InvestmentSchema = new Schema<IInvestment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Investment name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(InvestmentType),
      required: [true, 'Investment type is required'],
    },
    currentValue: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
InvestmentSchema.index({ userId: 1, isActive: 1 });

const Investment: Model<IInvestment> = mongoose.models.Investment || mongoose.model<IInvestment>('Investment', InvestmentSchema);

export default Investment;
