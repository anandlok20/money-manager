import mongoose, { Schema, Document, Model } from 'mongoose';

export type PlanType = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface IAddon {
  addonId: string;
  quantity: number; // For stackable add-ons like extra members/banks/cards
  activatedAt: Date;
}

export interface ISubscription extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  plan: PlanType;
  status: SubscriptionStatus;
  addons: IAddon[];
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AddonSchema = new Schema<IAddon>(
  {
    addonId: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    activatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active',
    },
    addons: {
      type: [AddonSchema],
      default: [],
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1, status: 1 });

const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>('Subscription', SubscriptionSchema);

export default Subscription;
