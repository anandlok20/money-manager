import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Vehicle, { VehicleType, FuelType, VehicleStatus } from '@/lib/mongodb/models/Vehicle';
import { z } from 'zod';
import { checkFeatureAccess } from '@/lib/utils/apiFeatureGate';

const vehicleSchema = z.object({
  vehicleType: z.nativeEnum(VehicleType),
  make: z.string().min(1),
  model: z.string().min(1),
  variant: z.string().optional(),
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  color: z.string().optional(),
  registrationNumber: z.string().min(1),
  registrationDate: z.string().or(z.date()).optional(),
  registrationValidUntil: z.string().or(z.date()).optional(),
  rtoCode: z.string().optional(),
  engineNumber: z.string().optional(),
  chassisNumber: z.string().optional(),
  fuelType: z.nativeEnum(FuelType),
  purchaseDate: z.string().or(z.date()).optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().optional(),
  showroomName: z.string().optional(),
  insuranceCompany: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insuranceType: z.string().optional(),
  insuranceStartDate: z.string().or(z.date()).optional(),
  insuranceEndDate: z.string().or(z.date()).optional(),
  insurancePremium: z.number().optional(),
  pucNumber: z.string().optional(),
  pucIssueDate: z.string().or(z.date()).optional(),
  pucExpiryDate: z.string().or(z.date()).optional(),
  fitnessValidUntil: z.string().or(z.date()).optional(),
  hasLoan: z.boolean().optional(),
  loanProvider: z.string().optional(),
  loanAccountNumber: z.string().optional(),
  loanAmount: z.number().optional(),
  emiAmount: z.number().optional(),
  loanStartDate: z.string().or(z.date()).optional(),
  loanEndDate: z.string().or(z.date()).optional(),
  permitNumber: z.string().optional(),
  permitType: z.string().optional(),
  permitValidUntil: z.string().or(z.date()).optional(),
  documents: z.array(z.object({
    type: z.string(),
    documentNumber: z.string().optional(),
    issueDate: z.string().or(z.date()).optional(),
    expiryDate: z.string().or(z.date()).optional(),
    imageUrl: z.string().optional(),
    reminderDays: z.number().optional(),
  })).optional(),
  images: z.array(z.string()).optional(),
  currentOdometer: z.number().optional(),
  lastServiceOdometer: z.number().optional(),
  nextServiceOdometer: z.number().optional(),
  lastServiceDate: z.string().or(z.date()).optional(),
  nextServiceDate: z.string().or(z.date()).optional(),
  status: z.nativeEnum(VehicleStatus).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check feature access
    const featureBlock = await checkFeatureAccess(session.user.id, 'vehicles');
    if (featureBlock) return featureBlock;

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const expiringDocuments = searchParams.get('expiringDocuments') === 'true';

    const query: Record<string, unknown> = { userId: session.user.id };
    
    if (status) {
      query.status = status;
    }

    const vehicles = await Vehicle.find(query)
      .sort({ make: 1, model: 1 })
      .lean();

    // Find expiring documents
    let alerts: Array<{
      vehicleId: string;
      vehicleName: string;
      alertType: string;
      expiryDate: Date;
      daysLeft: number;
    }> = [];

    if (expiringDocuments) {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      vehicles.forEach((v) => {
        const vehicleName = `${v.make} ${v.model} (${v.registrationNumber})`;
        
        // Check Insurance
        if (v.insuranceEndDate && new Date(v.insuranceEndDate) <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((new Date(v.insuranceEndDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          alerts.push({
            vehicleId: v._id.toString(),
            vehicleName,
            alertType: 'Insurance',
            expiryDate: v.insuranceEndDate,
            daysLeft,
          });
        }

        // Check PUC
        if (v.pucExpiryDate && new Date(v.pucExpiryDate) <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((new Date(v.pucExpiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          alerts.push({
            vehicleId: v._id.toString(),
            vehicleName,
            alertType: 'PUC',
            expiryDate: v.pucExpiryDate,
            daysLeft,
          });
        }

        // Check Fitness
        if (v.fitnessValidUntil && new Date(v.fitnessValidUntil) <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((new Date(v.fitnessValidUntil).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          alerts.push({
            vehicleId: v._id.toString(),
            vehicleName,
            alertType: 'Fitness',
            expiryDate: v.fitnessValidUntil,
            daysLeft,
          });
        }

        // Check Registration
        if (v.registrationValidUntil && new Date(v.registrationValidUntil) <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((new Date(v.registrationValidUntil).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          alerts.push({
            vehicleId: v._id.toString(),
            vehicleName,
            alertType: 'Registration',
            expiryDate: v.registrationValidUntil,
            daysLeft,
          });
        }

        // Check Permit
        if (v.permitValidUntil && new Date(v.permitValidUntil) <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((new Date(v.permitValidUntil).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          alerts.push({
            vehicleId: v._id.toString(),
            vehicleName,
            alertType: 'Permit',
            expiryDate: v.permitValidUntil,
            daysLeft,
          });
        }
      });

      // Sort alerts by days left
      alerts = alerts.sort((a, b) => a.daysLeft - b.daysLeft);
    }

    return NextResponse.json({
      success: true,
      data: vehicles.map((v) => ({ ...v, _id: v._id.toString() })),
      alerts: expiringDocuments ? alerts : undefined,
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check feature access
    const featureBlock = await checkFeatureAccess(session.user.id, 'vehicles');
    if (featureBlock) return featureBlock;

    const body = await request.json();
    const validatedData = vehicleSchema.parse(body);

    await connectToDatabase();

    // Check if registration number already exists
    const existing = await Vehicle.findOne({
      userId: session.user.id,
      registrationNumber: validatedData.registrationNumber.toUpperCase(),
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Vehicle with this registration number already exists' },
        { status: 400 }
      );
    }

    const dateFields = [
      'purchaseDate', 'registrationDate', 'registrationValidUntil',
      'insuranceStartDate', 'insuranceEndDate', 'pucIssueDate', 'pucExpiryDate',
      'fitnessValidUntil', 'loanStartDate', 'loanEndDate', 'permitValidUntil',
      'lastServiceDate', 'nextServiceDate'
    ];

    const vehicleData: Record<string, unknown> = {
      ...validatedData,
      userId: session.user.id,
      registrationNumber: validatedData.registrationNumber.toUpperCase(),
    };

    dateFields.forEach((field) => {
      if (validatedData[field as keyof typeof validatedData]) {
        vehicleData[field] = new Date(validatedData[field as keyof typeof validatedData] as string);
      }
    });

    const vehicle = await Vehicle.create(vehicleData);

    return NextResponse.json(
      {
        success: true,
        data: { ...vehicle.toObject(), _id: vehicle._id.toString() },
        message: 'Vehicle added successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating vehicle:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}
