import mongoose, { Schema, Document, Model } from 'mongoose';

export enum AssetType {
  // Real Estate
  RESIDENTIAL_PROPERTY = 'residential_property',
  COMMERCIAL_PROPERTY = 'commercial_property',
  LAND = 'land',
  PLOT = 'plot',
  FARM_LAND = 'farm_land',
  
  // Post Office Schemes
  PPF = 'ppf', // Public Provident Fund
  NSC = 'nsc', // National Savings Certificate
  KVP = 'kvp', // Kisan Vikas Patra
  SSY = 'ssy', // Sukanya Samriddhi Yojana
  SCSS = 'scss', // Senior Citizens Savings Scheme
  POST_OFFICE_RD = 'post_office_rd', // Post Office Recurring Deposit
  POST_OFFICE_TD = 'post_office_td', // Post Office Time Deposit
  POST_OFFICE_MIS = 'post_office_mis', // Monthly Income Scheme
  
  // Insurance
  TERM_INSURANCE = 'term_insurance',
  LIFE_INSURANCE = 'life_insurance',
  ENDOWMENT_PLAN = 'endowment_plan',
  ULIP = 'ulip', // Unit Linked Insurance Plan
  HEALTH_INSURANCE = 'health_insurance',
  
  // Government Schemes
  NPS = 'nps', // National Pension System
  EPF = 'epf', // Employee Provident Fund
  ATAL_PENSION = 'atal_pension',
  PM_VAYA_VANDANA = 'pm_vaya_vandana',
  
  // Fixed Income
  FIXED_DEPOSIT = 'fixed_deposit',
  RECURRING_DEPOSIT = 'recurring_deposit',
  CORPORATE_FD = 'corporate_fd',
  BONDS = 'bonds',
  GOVERNMENT_BONDS = 'government_bonds',
  
  // Others
  GOLD = 'gold',
  SILVER = 'silver',
  SOVEREIGN_GOLD_BOND = 'sovereign_gold_bond',
  OTHER = 'other',
}

export enum AssetStatus {
  ACTIVE = 'active',
  MATURED = 'matured',
  SURRENDERED = 'surrendered',
  SOLD = 'sold',
  LAPSED = 'lapsed',
}

export interface IAsset extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: AssetType;
  name: string;
  description?: string;
  
  // Purchase/Investment Details
  purchaseDate: Date;
  purchaseValue: number;
  currentValue: number;
  maturityDate?: Date;
  maturityValue?: number;
  
  // For recurring investments
  isRecurring: boolean;
  recurringAmount?: number;
  recurringFrequency?: string; // monthly, yearly, etc.
  nextPaymentDate?: Date;
  
  // Interest/Returns
  interestRate?: number;
  expectedReturn?: number;
  
  // Location (for property/land)
  location?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    area?: number; // in sq ft or sq m
    areaUnit?: string;
  };
  
  // Insurance specific
  insuranceDetails?: {
    policyNumber: string;
    sumAssured: number;
    premiumAmount: number;
    premiumFrequency: string;
    nominee: string;
    rider?: string[];
  };
  
  // Account/Policy Details
  accountNumber?: string;
  folioNumber?: string;
  policyNumber?: string;
  institution?: string;
  branch?: string;
  
  // Documents
  documents: string[];
  
  // Tax Benefits
  taxSection?: string; // e.g., "80C", "80D"
  taxBenefitAmount?: number;
  
  status: AssetStatus;
  notes?: string;
  tags?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(AssetType),
      required: [true, 'Asset type is required'],
    },
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
    },
    purchaseValue: {
      type: Number,
      required: [true, 'Purchase value is required'],
      min: 0,
    },
    currentValue: {
      type: Number,
      required: [true, 'Current value is required'],
      min: 0,
    },
    maturityDate: Date,
    maturityValue: Number,
    
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringAmount: Number,
    recurringFrequency: String,
    nextPaymentDate: Date,
    
    interestRate: Number,
    expectedReturn: Number,
    
    location: {
      address: String,
      city: String,
      state: String,
      pincode: String,
      area: Number,
      areaUnit: String,
    },
    
    insuranceDetails: {
      policyNumber: String,
      sumAssured: Number,
      premiumAmount: Number,
      premiumFrequency: String,
      nominee: String,
      rider: [String],
    },
    
    accountNumber: String,
    folioNumber: String,
    policyNumber: String,
    institution: String,
    branch: String,
    
    documents: [String],
    
    taxSection: String,
    taxBenefitAmount: Number,
    
    status: {
      type: String,
      enum: Object.values(AssetStatus),
      default: AssetStatus.ACTIVE,
    },
    notes: String,
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// Indexes
AssetSchema.index({ userId: 1, type: 1 });
AssetSchema.index({ userId: 1, status: 1 });
AssetSchema.index({ userId: 1, maturityDate: 1 });

const Asset: Model<IAsset> =
  mongoose.models.Asset || mongoose.model<IAsset>('Asset', AssetSchema);

export default Asset;
