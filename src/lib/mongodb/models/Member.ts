import mongoose, { Schema, Document, Model } from 'mongoose';
import { MemberType } from '@/types';

export interface IMember extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  type: MemberType;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  relationship?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  notes?: string;
  avatar?: string;
  isActive: boolean;
  // App access fields
  accessCode?: string;
  accessCodeEnabled: boolean;
  accessPasswordHash?: string;
  accessSetupComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema = new Schema<IMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(MemberType),
      default: MemberType.SELF,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    relationship: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'India' },
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    avatar: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // App access fields
    accessCode: {
      type: String,
      sparse: true,
    },
    accessCodeEnabled: {
      type: Boolean,
      default: false,
    },
    accessPasswordHash: {
      type: String,
    },
    accessSetupComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
MemberSchema.index({ userId: 1, isActive: 1 });
MemberSchema.index({ accessCode: 1 }, { unique: true, sparse: true });

const Member: Model<IMember> = mongoose.models.Member || mongoose.model<IMember>('Member', MemberSchema);

export default Member;
