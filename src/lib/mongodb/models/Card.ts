import mongoose, { Schema, Document, Model } from 'mongoose';

export type CardType = 'CREDIT' | 'DEBIT' | 'PREPAID' | 'FOREX' | 'VIRTUAL';
export type CardNetwork = 'VISA' | 'MASTERCARD' | 'RUPAY' | 'AMEX' | 'DINERS' | 'DISCOVER' | 'OTHER';

export interface ICard extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  cardName: string;
  cardType: CardType;
  cardNetwork?: CardNetwork;
  cardNumber?: string; // Stored encrypted/masked
  last4Digits?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string; // Stored encrypted
  pin?: string; // Stored encrypted
  billingCycleDay?: number;
  creditLimit?: number;
  currentBalance: number;
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
      type: String,
      trim: true,
    },
    pin: {
      type: String,
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

const Card: Model<ICard> = mongoose.models.Card || mongoose.model<ICard>('Card', CardSchema);

export default Card;
