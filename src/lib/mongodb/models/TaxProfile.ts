import mongoose, { Schema, Document, Model } from 'mongoose';

export enum TaxRegime {
  OLD = 'old',
  NEW = 'new',
}

export enum TaxStatus {
  DRAFT = 'draft',
  CALCULATED = 'calculated',
  FILED = 'filed',
  VERIFIED = 'verified',
}

export enum ResidentialStatus {
  RESIDENT = 'resident',
  NON_RESIDENT = 'non_resident',
  RNOR = 'rnor', // Resident but Not Ordinarily Resident
}

export interface ITaxDeduction {
  section: string;
  description: string;
  amount: number;
  maxLimit?: number;
}

export interface ITaxProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  financialYear: string; // e.g., "2025-26"
  assessmentYear: string; // e.g., "2026-27"
  regime: TaxRegime;
  status: TaxStatus;
  residentialStatus: ResidentialStatus;
  
  // Income Sources
  salaryIncome: number;
  housePropertyIncome: number;
  capitalGains: {
    shortTerm: number;
    longTerm: number;
  };
  businessIncome: number;
  otherIncome: number;
  exemptIncome: number;
  
  // Deductions (Old Regime)
  deductions: ITaxDeduction[];
  
  // Standard Deduction
  standardDeduction: number;
  
  // HRA Exemption
  hraExemption: number;
  
  // Tax Calculations
  grossTotalIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  taxBeforeRebate: number;
  rebate87A: number;
  taxAfterRebate: number;
  surcharge: number;
  healthEducationCess: number;
  totalTaxLiability: number;
  
  // TDS & Advance Tax
  tdsPaid: number;
  advanceTaxPaid: number;
  selfAssessmentTax: number;
  refundDue: number;
  taxPayable: number;
  
  // Auto-calculation settings
  autoCalculate: boolean;
  lastCalculatedAt?: Date;
  
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaxProfileSchema = new Schema<ITaxProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    financialYear: {
      type: String,
      required: [true, 'Financial year is required'],
      match: [/^\d{4}-\d{2}$/, 'Financial year must be in format YYYY-YY'],
    },
    assessmentYear: {
      type: String,
      required: [true, 'Assessment year is required'],
      match: [/^\d{4}-\d{2}$/, 'Assessment year must be in format YYYY-YY'],
    },
    regime: {
      type: String,
      enum: Object.values(TaxRegime),
      default: TaxRegime.NEW,
    },
    status: {
      type: String,
      enum: Object.values(TaxStatus),
      default: TaxStatus.DRAFT,
    },
    residentialStatus: {
      type: String,
      enum: Object.values(ResidentialStatus),
      default: ResidentialStatus.RESIDENT,
    },
    
    // Income Sources
    salaryIncome: { type: Number, default: 0 },
    housePropertyIncome: { type: Number, default: 0 },
    capitalGains: {
      shortTerm: { type: Number, default: 0 },
      longTerm: { type: Number, default: 0 },
    },
    businessIncome: { type: Number, default: 0 },
    otherIncome: { type: Number, default: 0 },
    exemptIncome: { type: Number, default: 0 },
    
    // Deductions
    deductions: [{
      section: { type: String, required: true },
      description: { type: String },
      amount: { type: Number, default: 0 },
      maxLimit: { type: Number },
    }],
    
    standardDeduction: { type: Number, default: 75000 }, // Updated for 2025-26
    hraExemption: { type: Number, default: 0 },
    
    // Calculated Fields
    grossTotalIncome: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    taxableIncome: { type: Number, default: 0 },
    taxBeforeRebate: { type: Number, default: 0 },
    rebate87A: { type: Number, default: 0 },
    taxAfterRebate: { type: Number, default: 0 },
    surcharge: { type: Number, default: 0 },
    healthEducationCess: { type: Number, default: 0 },
    totalTaxLiability: { type: Number, default: 0 },
    
    // TDS & Payments
    tdsPaid: { type: Number, default: 0 },
    advanceTaxPaid: { type: Number, default: 0 },
    selfAssessmentTax: { type: Number, default: 0 },
    refundDue: { type: Number, default: 0 },
    taxPayable: { type: Number, default: 0 },
    
    autoCalculate: { type: Boolean, default: true },
    lastCalculatedAt: { type: Date },
    
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Unique index for user + financial year
TaxProfileSchema.index({ userId: 1, financialYear: 1 }, { unique: true });

const TaxProfile: Model<ITaxProfile> =
  mongoose.models.TaxProfile || mongoose.model<ITaxProfile>('TaxProfile', TaxProfileSchema);

export default TaxProfile;
