import mongoose, { Schema, Document, Model } from 'mongoose';

export type CardType = 'CREDIT' | 'DEBIT' | 'PREPAID' | 'FOREX' | 'VIRTUAL';
export type CardNetwork = 'VISA' | 'MASTERCARD' | 'RUPAY' | 'AMEX' | 'DINERS' | 'DISCOVER' | 'OTHER';

export interface ICard extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  cardName: string;
  cardType: CardType;
  cardNetwork?: CardNetwork;
  cardNumber?: string; // Stored masked (e.g., **** **** **** 1234)
  last4Digits?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string; // Encrypted - only viewable with sensitive data password
  pin?: string; // Encrypted - only viewable with sensitive data password
  billingCycleDay?: number;
  creditLimit?: number;
  currentBalance: number;
  spendingLimit?: number;
  spendingLimitAlert: boolean;
  linkedBankId?: mongoose.Types.ObjectId;
  linkedMemberId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CardSchema = new Schema<ICard>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    cardName: {
      type: String,
      required: [true, 'Card name is required'],
      trim: true,
    },
    cardType: {
      type: String,
      enum: ['CREDIT', 'DEBIT', 'PREPAID', 'FOREX', 'VIRTUAL'],
      default: 'CREDIT',
    },
    cardNetwork: {
      type: String,
      enum: ['VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS', 'DISCOVER', 'OTHER'],
    },
    cardNumber: {
      type: String,
      trim: true,
    },
    last4Digits: {
      type: String,
      trim: true,
      maxlength: 4,
    },
    expiryMonth: {
      type: Number,
      min: 1,
      max: 12,
    },
    expiryYear: {
      type: Number,
    },
    cvv: {
      type: String, // Encrypted storage - requires sensitive data password to view
      trim: true,
    },
    pin: {
      type: String, // Encrypted storage - requires sensitive data password to view
      trim: true,
    },
    billingCycleDay: {
      type: Number,
      min: 1,
      max: 31,
    },
    creditLimit: {
      type: Number,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    spendingLimit: {
      type: Number,
      default: 0,
    },
    spendingLimitAlert: {
      type: Boolean,
      default: true,
    },
    linkedBankId: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    linkedMemberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
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
CardSchema.index({ userId: 1, isActive: 1 });
CardSchema.index({ userId: 1, cardType: 1 });

const Card: Model<ICard> = mongoose.models.Card || mongoose.model<ICard>('Card', CardSchema);

export default Card;
