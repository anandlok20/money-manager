import mongoose, { Schema, Document, Model } from 'mongoose';
import { TransactionType, AccountType } from '@/types';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  dateTime: Date;
  amount: number;
  currency?: string; // Currency code (e.g., 'INR', 'USD')
  originalAmount?: number; // Original amount if converted
  originalCurrency?: string; // Original currency if converted
  note?: string;
  type: TransactionType;
  // For INCOME/EXPENSE
  categoryId?: mongoose.Types.ObjectId;
  memberId?: mongoose.Types.ObjectId;
  // Trip tagging
  tripId?: mongoose.Types.ObjectId;
  // Source
  sourceType?: AccountType;
  sourceBankId?: mongoose.Types.ObjectId;
  sourceCardId?: mongoose.Types.ObjectId;
  // Destination (for TRANSFER_SELF)
  destinationType?: AccountType;
  destinationBankId?: mongoose.Types.ObjectId;
  destinationCardId?: mongoose.Types.ObjectId;
  destinationInvestmentId?: mongoose.Types.ObjectId;
  // Receipt/Attachment
  receiptUrl?: string;
  receiptFileName?: string;
  // Tags
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dateTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be positive'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    originalAmount: {
      type: Number,
    },
    originalCurrency: {
      type: String,
      uppercase: true,
    },
    note: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: [true, 'Transaction type is required'],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
    },
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      index: true,
    },
    sourceType: {
      type: String,
      enum: Object.values(AccountType),
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
    // Receipt/Attachment
    receiptUrl: {
      type: String,
      trim: true,
    },
    receiptFileName: {
      type: String,
      trim: true,
    },
    // Tags for flexible categorization
    tags: [{
      type: String,
      trim: true,
    }],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
TransactionSchema.index({ userId: 1, dateTime: -1 });
TransactionSchema.index({ userId: 1, type: 1 });
TransactionSchema.index({ userId: 1, categoryId: 1 });
TransactionSchema.index({ userId: 1, memberId: 1 });

const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
