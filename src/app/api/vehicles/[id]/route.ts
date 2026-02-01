import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Vehicle, { VehicleType, FuelType, VehicleStatus } from '@/lib/mongodb/models/Vehicle';
import { z } from 'zod';

const updateVehicleSchema = z.object({
  vehicleType: z.nativeEnum(VehicleType).optional(),
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  variant: z.string().optional(),
  year: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: z.string().min(1).optional(),
  registrationNumber: z.string().min(1).optional(),
  registrationDate: z.string().or(z.date()).optional().nullable(),
  registrationValidUntil: z.string().or(z.date()).optional().nullable(),
  rtoCode: z.string().optional(),
  engineNumber: z.string().optional(),
  chassisNumber: z.string().optional(),
  fuelType: z.nativeEnum(FuelType).optional(),
  purchaseDate: z.string().or(z.date()).optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().optional(),
  showroomName: z.string().optional(),
  insuranceCompany: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insuranceType: z.string().optional(),
  insuranceStartDate: z.string().or(z.date()).optional().nullable(),
  insuranceEndDate: z.string().or(z.date()).optional().nullable(),
  insurancePremium: z.number().optional(),
  pucNumber: z.string().optional(),
  pucIssueDate: z.string().or(z.date()).optional().nullable(),
  pucExpiryDate: z.string().or(z.date()).optional().nullable(),
  fitnessValidUntil: z.string().or(z.date()).optional().nullable(),
  hasLoan: z.boolean().optional(),
  loanProvider: z.string().optional(),
  loanAccountNumber: z.string().optional(),
  loanAmount: z.number().optional(),
  emiAmount: z.number().optional(),
  loanStartDate: z.string().or(z.date()).optional().nullable(),
  loanEndDate: z.string().or(z.date()).optional().nullable(),
  permitNumber: z.string().optional(),
  permitType: z.string().optional(),
  permitValidUntil: z.string().or(z.date()).optional().nullable(),
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
  lastServiceDate: z.string().or(z.date()).optional().nullable(),
  nextServiceDate: z.string().or(z.date()).optional().nullable(),
  status: z.nativeEnum(VehicleStatus).optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectToDatabase();

    const vehicle = await Vehicle.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...vehicle, _id: vehicle._id.toString() },
    });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateVehicleSchema.parse(body);

    await connectToDatabase();

    const dateFields = [
      'purchaseDate', 'registrationDate', 'registrationValidUntil',
      'insuranceStartDate', 'insuranceEndDate', 'pucIssueDate', 'pucExpiryDate',
      'fitnessValidUntil', 'loanStartDate', 'loanEndDate', 'permitValidUntil',
      'lastServiceDate', 'nextServiceDate'
    ];

    const updateData: Record<string, unknown> = { ...validatedData };

    dateFields.forEach((field) => {
      if (validatedData[field as keyof typeof validatedData]) {
        updateData[field] = new Date(validatedData[field as keyof typeof validatedData] as string);
      }
    });

    if (validatedData.registrationNumber) {
      updateData.registrationNumber = validatedData.registrationNumber.toUpperCase();
    }

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: updateData },
      { new: true }
    ).lean();

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...vehicle, _id: vehicle._id.toString() },
      message: 'Vehicle updated successfully',
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectToDatabase();

    const result = await Vehicle.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vehicle deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
}
