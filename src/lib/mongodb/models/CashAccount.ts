import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICashAccount extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  currentBalance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const CashAccountSchema = new Schema<ICashAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
  },
  { timestamps: true }
);

const CashAccount: Model<ICashAccount> =
  mongoose.models.CashAccount ||
  mongoose.model<ICashAccount>('CashAccount', CashAccountSchema);

export default CashAccount;
