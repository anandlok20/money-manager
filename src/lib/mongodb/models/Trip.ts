import mongoose, { Schema, Document, Model } from 'mongoose';

export enum TripStatus {
  PLANNED = 'planned',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface ITripTraveler {
  name: string;
  phone?: string;
  email?: string;
  memberId?: mongoose.Types.ObjectId; // Link to existing member if applicable
  isOrganizer?: boolean;
}

export interface ITripTicket {
  _id?: mongoose.Types.ObjectId;
  type: 'flight' | 'train' | 'bus' | 'other';
  title: string;
  bookingReference?: string;
  departureLocation: string;
  arrivalLocation: string;
  departureTime?: Date;
  arrivalTime?: Date;
  carrier?: string; // Airline, train operator, etc.
  seatNumber?: string;
  price?: number;
  pdfUrl?: string;
  notes?: string;
}

export interface ITripHotel {
  _id?: mongoose.Types.ObjectId;
  name: string;
  address?: string;
  checkIn: Date;
  checkOut: Date;
  bookingReference?: string;
  price?: number;
  phone?: string;
  email?: string;
  roomType?: string;
  pdfUrl?: string;
  notes?: string;
}

export interface ITripPlace {
  _id?: mongoose.Types.ObjectId;
  name: string;
  category?: 'attraction' | 'restaurant' | 'shopping' | 'nature' | 'cultural' | 'other';
  address?: string;
  plannedDate?: Date;
  estimatedDuration?: string; // e.g., "2 hours"
  estimatedCost?: number;
  priority?: 'must-visit' | 'nice-to-have' | 'optional';
  visited?: boolean;
  rating?: number; // 1-5
  notes?: string;
}

export interface ITripCab {
  _id?: mongoose.Types.ObjectId;
  type: 'airport-pickup' | 'airport-drop' | 'local' | 'outstation' | 'rental';
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  pickupLocation?: string;
  dropLocation?: string;
  pickupTime?: Date;
  price?: number;
  bookingReference?: string;
  notes?: string;
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
  travelers?: ITripTraveler[];
  tickets?: ITripTicket[];
  hotels?: ITripHotel[];
  placesToVisit?: ITripPlace[];
  cabs?: ITripCab[];
  notes?: string;
  documents?: {
    name: string;
    url: string;
    type: string;
  }[];
  isPrivate?: boolean;
  privateMemberId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TripTravelerSchema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member' },
  isOrganizer: { type: Boolean, default: false },
}, { _id: true });

const TripTicketSchema = new Schema({
  type: { type: String, enum: ['flight', 'train', 'bus', 'other'], required: true },
  title: { type: String, required: true, trim: true },
  bookingReference: { type: String, trim: true },
  departureLocation: { type: String, required: true, trim: true },
  arrivalLocation: { type: String, required: true, trim: true },
  departureTime: { type: Date },
  arrivalTime: { type: Date },
  carrier: { type: String, trim: true },
  seatNumber: { type: String, trim: true },
  price: { type: Number, min: 0 },
  pdfUrl: { type: String },
  notes: { type: String, trim: true },
}, { _id: true });

const TripHotelSchema = new Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, trim: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  bookingReference: { type: String, trim: true },
  price: { type: Number, min: 0 },
  phone: { type: String, trim: true },
  email: { type: String, trim: true },
  roomType: { type: String, trim: true },
  pdfUrl: { type: String },
  notes: { type: String, trim: true },
}, { _id: true });

const TripPlaceSchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ['attraction', 'restaurant', 'shopping', 'nature', 'cultural', 'other'] },
  address: { type: String, trim: true },
  plannedDate: { type: Date },
  estimatedDuration: { type: String, trim: true },
  estimatedCost: { type: Number, min: 0 },
  priority: { type: String, enum: ['must-visit', 'nice-to-have', 'optional'] },
  visited: { type: Boolean, default: false },
  rating: { type: Number, min: 1, max: 5 },
  notes: { type: String, trim: true },
}, { _id: true });

const TripCabSchema = new Schema({
  type: { type: String, enum: ['airport-pickup', 'airport-drop', 'local', 'outstation', 'rental'], required: true },
  driverName: { type: String, trim: true },
  driverPhone: { type: String, trim: true },
  vehicleNumber: { type: String, trim: true },
  vehicleType: { type: String, trim: true },
  pickupLocation: { type: String, trim: true },
  dropLocation: { type: String, trim: true },
  pickupTime: { type: Date },
  price: { type: Number, min: 0 },
  bookingReference: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { _id: true });

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
    travelers: [TripTravelerSchema],
    tickets: [TripTicketSchema],
    hotels: [TripHotelSchema],
    placesToVisit: [TripPlaceSchema],
    cabs: [TripCabSchema],
    notes: {
      type: String,
      trim: true,
    },
    documents: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      type: { type: String, required: true },
    }],
    isPrivate: { type: Boolean, default: false },
    privateMemberId: { type: Schema.Types.ObjectId, ref: 'Member', default: null },
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
