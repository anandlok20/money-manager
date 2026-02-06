import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlanLimits {
  banks: number;
  cards: number;
  goals: number;
  members: number;
  investments: boolean;
  reports: boolean;
  freeThemes: string[]; // Theme IDs available for free
}

export interface IAddonDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  price: number; // Monthly price in INR
  type: 'feature' | 'stackable'; // feature = toggle, stackable = quantity
  category: string; // For grouping in UI
}

export interface IPricingConfig extends Document {
  _id: mongoose.Types.ObjectId;
  // Plan prices
  freePlanPrice: number;
  premiumPlanPrice: number;
  // Plan limits
  freeLimits: IPlanLimits;
  premiumLimits: IPlanLimits;
  // Add-on definitions
  addons: IAddonDefinition[];
  // Meta
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanLimitsSchema = new Schema<IPlanLimits>(
  {
    banks: { type: Number, required: true },
    cards: { type: Number, required: true },
    goals: { type: Number, required: true },
    members: { type: Number, required: true },
    investments: { type: Boolean, required: true },
    reports: { type: Boolean, required: true },
    freeThemes: { type: [String], default: ['default', 'baby', 'valentine'] },
  },
  { _id: false }
);

const AddonDefinitionSchema = new Schema<IAddonDefinition>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    emoji: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    type: { type: String, enum: ['feature', 'stackable'], required: true },
    category: { type: String, required: true },
  },
  { _id: false }
);

const PricingConfigSchema = new Schema<IPricingConfig>(
  {
    freePlanPrice: { type: Number, default: 0 },
    premiumPlanPrice: { type: Number, default: 199 },
    freeLimits: {
      type: PlanLimitsSchema,
      default: {
        banks: 2,
        cards: 3,
        goals: 3,
        members: 2,
        investments: false,
        reports: false,
        freeThemes: ['default', 'baby', 'valentine'],
      },
    },
    premiumLimits: {
      type: PlanLimitsSchema,
      default: {
        banks: 4,
        cards: 6,
        goals: 5,
        members: 5,
        investments: true,
        reports: true,
        freeThemes: ['default', 'baby', 'valentine'],
      },
    },
    addons: {
      type: [AddonDefinitionSchema],
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PricingConfig: Model<IPricingConfig> =
  mongoose.models.PricingConfig ||
  mongoose.model<IPricingConfig>('PricingConfig', PricingConfigSchema);

export default PricingConfig;
