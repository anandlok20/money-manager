import mongoose, { Schema, Document, Model } from 'mongoose';

export enum TripStatus {
  PLANNED = 'planned',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface ITrip extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  status: TripStatus;
  totalExpenses: number;
  totalIncome: number;
  coverImage?: string;
  travelers?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Trip name is required'],
      trim: true,
      maxlength: [100, 'Trip name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: [0, 'Budget must be positive'],
    },
    status: {
      type: String,
      enum: Object.values(TripStatus),
      default: TripStatus.PLANNED,
    },
    totalExpenses: {
      type: Number,
      default: 0,
    },
    totalIncome: {
      type: Number,
      default: 0,
    },
    coverImage: {
      type: String,
    },
    travelers: [{
      type: String,
      trim: true,
    }],
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
TripSchema.index({ userId: 1, status: 1 });
TripSchema.index({ userId: 1, startDate: -1 });

const Trip: Model<ITrip> =
  mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema);

export default Trip;
