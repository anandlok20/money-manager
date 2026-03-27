import mongoose, { Schema, Document, Model } from 'mongoose';

export type LoanType = 'home' | 'car' | 'personal' | 'education' | 'gold' | 'other';
export type LoanStatus = 'active' | 'closed' | 'defaulted';

export interface ILoan extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  lender: string;
  loanType: LoanType;
  principalAmount: number;
  interestRate: number; // Annual percentage
  tenureMonths: number;
  emiAmount: number; // Monthly EMI
  disbursementDate: Date;
  startDate: Date; // First EMI date
  endDate?: Date; // Expected closure date
  outstandingBalance: number;
  accountNumber?: string;
  linkedVehicleId?: mongoose.Types.ObjectId;
  status: LoanStatus;
  notes?: string;
  isPrivate?: boolean;
  privateMemberId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchema = new Schema<ILoan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lender: {
      type: String,
      required: [true, 'Lender name is required'],
      trim: true,
    },
    loanType: {
      type: String,
      enum: ['home', 'car', 'personal', 'education', 'gold', 'other'],
      required: [true, 'Loan type is required'],
    },
    principalAmount: {
      type: Number,
      required: [true, 'Principal amount is required'],
      min: [1, 'Principal must be positive'],
    },
    interestRate: {
      type: Number,
      required: [true, 'Interest rate is required'],
      min: [0, 'Interest rate must be non-negative'],
    },
    tenureMonths: {
      type: Number,
      required: [true, 'Tenure is required'],
      min: [1, 'Tenure must be at least 1 month'],
    },
    emiAmount: {
      type: Number,
      required: [true, 'EMI amount is required'],
      min: [0, 'EMI must be non-negative'],
    },
    disbursementDate: {
      type: Date,
      required: [true, 'Disbursement date is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: Date,
    outstandingBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    linkedVehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'defaulted'],
      default: 'active',
    },
    notes: {
      type: String,
      trim: true,
    },
    isPrivate: { type: Boolean, default: false },
    privateMemberId: { type: Schema.Types.ObjectId, ref: 'Member', default: null },
  },
  {
    timestamps: true,
  }
);

LoanSchema.index({ userId: 1, status: 1 });

const Loan: Model<ILoan> = mongoose.models.Loan || mongoose.model<ILoan>('Loan', LoanSchema);

export default Loan;
