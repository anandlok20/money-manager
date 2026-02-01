import mongoose, { Schema, Document, Model } from 'mongoose';

export enum DocumentType {
  // Government IDs
  AADHAAR = 'aadhaar',
  PAN = 'pan',
  PASSPORT = 'passport',
  DRIVING_LICENSE = 'driving_license',
  VOTER_ID = 'voter_id',
  RATION_CARD = 'ration_card',
  
  // Other Government Documents
  BIRTH_CERTIFICATE = 'birth_certificate',
  MARRIAGE_CERTIFICATE = 'marriage_certificate',
  CASTE_CERTIFICATE = 'caste_certificate',
  INCOME_CERTIFICATE = 'income_certificate',
  DOMICILE_CERTIFICATE = 'domicile_certificate',
  
  // Employment & Education
  EMPLOYEE_ID = 'employee_id',
  EDUCATION_CERTIFICATE = 'education_certificate',
  PROFESSIONAL_LICENSE = 'professional_license',
  
  // Financial Documents
  BANK_PASSBOOK = 'bank_passbook',
  CHEQUE_BOOK = 'cheque_book',
  CREDIT_CARD = 'credit_card_doc',
  DEMAT_ACCOUNT = 'demat_account',
  
  // Property Documents
  PROPERTY_DEED = 'property_deed',
  LAND_REGISTRY = 'land_registry',
  RENT_AGREEMENT = 'rent_agreement',
  
  // Insurance Documents
  LIFE_INSURANCE = 'life_insurance',
  HEALTH_INSURANCE = 'health_insurance',
  VEHICLE_INSURANCE = 'vehicle_insurance',
  
  // Vehicle Documents
  RC_BOOK = 'rc_book',
  PUC_CERTIFICATE = 'puc_certificate',
  
  // Other
  OTHER = 'other',
}

export interface IStoredDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: DocumentType;
  name: string;
  documentNumber?: string;
  issuedBy?: string;
  issuedTo?: string;
  issueDate?: Date;
  expiryDate?: Date;
  // Document-specific fields
  metadata: Record<string, string | number | boolean>;
  // Images
  images: string[];
  // File attachments (PDFs, etc.)
  attachments: string[];
  notes?: string;
  isActive: boolean;
  tags?: string[];
  // For alerts
  reminderDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

const StoredDocumentSchema = new Schema<IStoredDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(DocumentType),
      required: [true, 'Document type is required'],
    },
    name: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true,
    },
    documentNumber: {
      type: String,
      trim: true,
    },
    issuedBy: {
      type: String,
      trim: true,
    },
    issuedTo: {
      type: String,
      trim: true,
    },
    issueDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    images: [{
      type: String,
    }],
    attachments: [{
      type: String,
    }],
    notes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    reminderDays: {
      type: Number,
      default: 30,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
StoredDocumentSchema.index({ userId: 1, type: 1 });
StoredDocumentSchema.index({ userId: 1, expiryDate: 1 });
StoredDocumentSchema.index({ userId: 1, isActive: 1 });

const StoredDocument: Model<IStoredDocument> =
  mongoose.models.StoredDocument || mongoose.model<IStoredDocument>('StoredDocument', StoredDocumentSchema);

export default StoredDocument;
