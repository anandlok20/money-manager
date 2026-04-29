import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'user' | 'admin';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  currency: string;
  role: UserRole;
  hasSelectedPlan: boolean;
  lockEnabled: boolean;
  pinHash?: string;
  sensitiveDataPasswordHash?: string;
  whatsappPhone?: string; // E.164 format, e.g. "919876543210"
  timezone?: string;      // IANA timezone, e.g. "Asia/Kolkata"
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    hasSelectedPlan: {
      type: Boolean,
      default: false,
    },
    lockEnabled: {
      type: Boolean,
      default: false,
    },
    pinHash: {
      type: String,
    },
    sensitiveDataPasswordHash: {
      type: String,
    },
    whatsappPhone: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string) => !v || /^[1-9]\d{7,14}$/.test(v),
        message: 'whatsappPhone must be E.164 format without leading + or 0',
      },
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
  },
  {
    timestamps: true,
  }
);

// email already has a unique index from unique: true
// Compound index for admin queries filtering by role + creation date
UserSchema.index({ role: 1, createdAt: -1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
