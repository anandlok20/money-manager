import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWhatsAppNotificationPreferences {
  enabled: boolean;
  phoneNumber?: string;
  verifiedAt?: Date;
  dailyExpenseSummary: boolean;
  dailySummaryTime: string; // 24hr format "21:00"
  weeklyNetWorthSummary: boolean;
  monthlySummary: boolean;
  dueDateAlerts: boolean;
  scheduledPaymentAlerts: boolean;
  lowBalanceAlerts: boolean;
  spendingLimitAlerts: boolean;
  budgetExceededAlerts: boolean;
  vehicleAlerts: boolean;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  currency: string;
  lockEnabled: boolean;
  pinHash?: string;
  whatsappNotifications: IWhatsAppNotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppNotificationPreferencesSchema = new Schema({
  enabled: { type: Boolean, default: false },
  phoneNumber: { type: String },
  verifiedAt: { type: Date },
  dailyExpenseSummary: { type: Boolean, default: true },
  dailySummaryTime: { type: String, default: '21:00' },
  weeklyNetWorthSummary: { type: Boolean, default: true },
  monthlySummary: { type: Boolean, default: true },
  dueDateAlerts: { type: Boolean, default: true },
  scheduledPaymentAlerts: { type: Boolean, default: true },
  lowBalanceAlerts: { type: Boolean, default: true },
  spendingLimitAlerts: { type: Boolean, default: true },
  budgetExceededAlerts: { type: Boolean, default: true },
  vehicleAlerts: { type: Boolean, default: true },
}, { _id: false });

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
    lockEnabled: {
      type: Boolean,
      default: false,
    },
    pinHash: {
      type: String,
    },
    whatsappNotifications: {
      type: WhatsAppNotificationPreferencesSchema,
      default: () => ({
        enabled: false,
        dailyExpenseSummary: true,
        dailySummaryTime: '21:00',
        weeklyNetWorthSummary: true,
        monthlySummary: true,
        dueDateAlerts: true,
        scheduledPaymentAlerts: true,
        lowBalanceAlerts: true,
        spendingLimitAlerts: true,
        budgetExceededAlerts: true,
        vehicleAlerts: true,
      }),
    },
  },
  {
    timestamps: true,
  }
);

// Note: email already has unique: true which creates an index

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
