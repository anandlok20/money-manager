import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBankAccount extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  bankName: string;
  accountHolderName: string;
  accountNumber?: string;
  upiId?: string;
  ifscCode?: string;
  openingBalance: number;
  currentBalance: number;
  linkedMemberIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true,
    },
    accountHolderName: {
      type: String,
      required: [true, 'Account holder name is required'],
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    upiId: {
      type: String,
      trim: true,
    },
    ifscCode: {
      type: String,
      trim: true,
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    currentBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    linkedMemberIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Member',
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
BankAccountSchema.index({ userId: 1, isActive: 1 });
BankAccountSchema.index({ userId: 1, bankName: 1 });

// Virtual for display name
BankAccountSchema.virtual('displayName').get(function() {
  return `${this.bankName} (${this.accountHolderName})`;
});

const BankAccount: Model<IBankAccount> = mongoose.models.BankAccount || mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);

export default BankAccount;
