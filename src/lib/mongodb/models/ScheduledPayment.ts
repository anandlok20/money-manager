import mongoose, { Schema, Document, Model } from 'mongoose';
import { Frequency, AccountType } from '@/types';

export interface IScheduledPayment extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  isActive: boolean;
  frequency: Frequency;
  startDate: Date;
  nextRunDate: Date;
  lastRunDate?: Date;
  amount: number;
  note?: string;
  memberId?: mongoose.Types.ObjectId;
  sourceType: AccountType;
  sourceBankId?: mongoose.Types.ObjectId;
  sourceCardId?: mongoose.Types.ObjectId;
  destinationType: AccountType;
  destinationBankId?: mongoose.Types.ObjectId;
  destinationCardId?: mongoose.Types.ObjectId;
  destinationInvestmentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledPaymentSchema = new Schema<IScheduledPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    frequency: {
      type: String,
      enum: Object.values(Frequency),
      required: [true, 'Frequency is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    nextRunDate: {
      type: Date,
      required: [true, 'Next run date is required'],
      index: true,
    },
    lastRunDate: {
      type: Date,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be positive'],
    },
    note: {
      type: String,
      trim: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
    },
    sourceType: {
      type: String,
      enum: Object.values(AccountType),
      required: [true, 'Source type is required'],
    },
    sourceBankId: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    sourceCardId: {
      type: Schema.Types.ObjectId,
      ref: 'Card',
    },
    destinationType: {
      type: String,
      enum: Object.values(AccountType),
      required: [true, 'Destination type is required'],
    },
    destinationBankId: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    destinationCardId: {
      type: Schema.Types.ObjectId,
      ref: 'Card',
    },
    destinationInvestmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Investment',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
ScheduledPaymentSchema.index({ userId: 1, isActive: 1, nextRunDate: 1 });

const ScheduledPayment: Model<IScheduledPayment> = mongoose.models.ScheduledPayment || mongoose.model<IScheduledPayment>('ScheduledPayment', ScheduledPaymentSchema);

export default ScheduledPayment;
