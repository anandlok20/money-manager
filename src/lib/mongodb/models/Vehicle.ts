import mongoose, { Schema, Document, Model } from 'mongoose';

export enum VehicleType {
  TWO_WHEELER = 'two_wheeler',
  THREE_WHEELER = 'three_wheeler',
  FOUR_WHEELER = 'four_wheeler',
  COMMERCIAL = 'commercial',
  HEAVY_VEHICLE = 'heavy_vehicle',
}

export enum FuelType {
  PETROL = 'petrol',
  DIESEL = 'diesel',
  CNG = 'cng',
  LPG = 'lpg',
  ELECTRIC = 'electric',
  HYBRID = 'hybrid',
}

export enum VehicleStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  SCRAPPED = 'scrapped',
}

export interface IVehicleDocument {
  type: string;
  documentNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
  imageUrl?: string;
  reminderDays: number;
}

export interface IVehicle extends Omit<Document, 'model'> {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  
  // Basic Info
  vehicleType: VehicleType;
  make: string;
  model: string;
  variant?: string;
  year: number;
  color: string;
  
  // Registration
  registrationNumber: string;
  registrationDate?: Date;
  registrationValidUntil?: Date;
  rtoCode?: string;
  
  // Engine/Chassis
  engineNumber?: string;
  chassisNumber?: string;
  fuelType: FuelType;
  
  // Purchase Details
  purchaseDate: Date;
  purchasePrice: number;
  currentValue?: number;
  showroomName?: string;
  
  // Insurance
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
  insuranceType?: string; // comprehensive, third-party
  insuranceStartDate?: Date;
  insuranceEndDate?: Date;
  insurancePremium?: number;
  
  // PUC
  pucNumber?: string;
  pucIssueDate?: Date;
  pucExpiryDate?: Date;
  
  // Fitness (for commercial)
  fitnessValidUntil?: Date;
  
  // Loan Details
  hasLoan: boolean;
  loanProvider?: string;
  loanAccountNumber?: string;
  loanAmount?: number;
  emiAmount?: number;
  loanStartDate?: Date;
  loanEndDate?: Date;
  
  // Permit (for commercial)
  permitNumber?: string;
  permitType?: string;
  permitValidUntil?: Date;
  
  // Documents storage
  documents: IVehicleDocument[];
  
  // Images
  images: string[];
  
  // Odometer
  currentOdometer?: number;
  lastServiceOdometer?: number;
  nextServiceOdometer?: number;
  
  // Service History tracking
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  
  status: VehicleStatus;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const VehicleDocumentSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['rc', 'insurance', 'puc', 'permit', 'fitness', 'tax', 'other'],
  },
  documentNumber: String,
  issueDate: Date,
  expiryDate: Date,
  imageUrl: String,
  reminderDays: {
    type: Number,
    default: 30,
  },
}, { _id: false });

const VehicleSchema = new Schema<IVehicle>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    vehicleType: {
      type: String,
      enum: Object.values(VehicleType),
      required: [true, 'Vehicle type is required'],
    },
    make: {
      type: String,
      required: [true, 'Make is required'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Model is required'],
      trim: true,
    },
    variant: String,
    year: {
      type: Number,
      required: [true, 'Year is required'],
    },
    color: {
      type: String,
      required: [true, 'Color is required'],
    },
    
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      uppercase: true,
      trim: true,
    },
    registrationDate: Date,
    registrationValidUntil: Date,
    rtoCode: String,
    
    engineNumber: String,
    chassisNumber: String,
    fuelType: {
      type: String,
      enum: Object.values(FuelType),
      required: [true, 'Fuel type is required'],
    },
    
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: 0,
    },
    currentValue: Number,
    showroomName: String,
    
    // Insurance
    insuranceCompany: String,
    insurancePolicyNumber: String,
    insuranceType: String,
    insuranceStartDate: Date,
    insuranceEndDate: Date,
    insurancePremium: Number,
    
    // PUC
    pucNumber: String,
    pucIssueDate: Date,
    pucExpiryDate: Date,
    
    // Fitness
    fitnessValidUntil: Date,
    
    // Loan
    hasLoan: {
      type: Boolean,
      default: false,
    },
    loanProvider: String,
    loanAccountNumber: String,
    loanAmount: Number,
    emiAmount: Number,
    loanStartDate: Date,
    loanEndDate: Date,
    
    // Permit
    permitNumber: String,
    permitType: String,
    permitValidUntil: Date,
    
    documents: [VehicleDocumentSchema],
    images: [String],
    
    currentOdometer: Number,
    lastServiceOdometer: Number,
    nextServiceOdometer: Number,
    
    lastServiceDate: Date,
    nextServiceDate: Date,
    
    status: {
      type: String,
      enum: Object.values(VehicleStatus),
      default: VehicleStatus.ACTIVE,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
VehicleSchema.index({ userId: 1, registrationNumber: 1 }, { unique: true });
VehicleSchema.index({ userId: 1, status: 1 });
VehicleSchema.index({ userId: 1, insuranceEndDate: 1 });
VehicleSchema.index({ userId: 1, pucExpiryDate: 1 });

const Vehicle: Model<IVehicle> =
  mongoose.models.Vehicle || mongoose.model<IVehicle>('Vehicle', VehicleSchema);

export default Vehicle;
