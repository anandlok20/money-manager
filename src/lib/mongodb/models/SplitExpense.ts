import mongoose, { Schema, Document, Model } from 'mongoose';

export enum SplitStatus {
  PENDING = 'PENDING',
  SETTLED = 'SETTLED',
}

export interface ISplitItem {
  _id: mongoose.Types.ObjectId;
  name: string;
  memberId?: mongoose.Types.ObjectId;
  amount: number;
  status: SplitStatus;
  settledAt?: Date;
  settlementTransactionId?: mongoose.Types.ObjectId;
}

export interface ISplitExpense extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  transactionId: mongoose.Types.ObjectId;
  totalAmount: number;
  yourShare: number;
  splits: ISplitItem[];
  createdAt: Date;
  updatedAt: Date;
}

const SplitItemSchema = new Schema<ISplitItem>({
  name: { type: String, required: true, trim: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member' },
  amount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: Object.values(SplitStatus),
    default: SplitStatus.PENDING,
  },
  settledAt: Date,
  settlementTransactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
});

const SplitExpenseSchema = new Schema<ISplitExpense>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
    },
    totalAmount: { type: Number, required: true },
    yourShare: { type: Number, required: true },
    splits: [SplitItemSchema],
  },
  { timestamps: true }
);

SplitExpenseSchema.index({ userId: 1, createdAt: -1 });
SplitExpenseSchema.index({ transactionId: 1 }, { unique: true });
SplitExpenseSchema.index({ userId: 1, 'splits.status': 1 });

const SplitExpense: Model<ISplitExpense> =
  mongoose.models.SplitExpense ||
  mongoose.model<ISplitExpense>('SplitExpense', SplitExpenseSchema);

export default SplitExpense;
