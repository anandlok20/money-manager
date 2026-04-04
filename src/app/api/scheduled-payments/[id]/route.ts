import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import ScheduledPayment from '@/lib/mongodb/models/ScheduledPayment';
import { updateScheduledPaymentSchema } from '@/lib/validations/scheduled-payment';
import { calculateNextRunDate } from '@/services/scheduledPaymentService';
import { sanitizeTextFields, validateObjectId, handleApiError } from '@/lib/utils/api';

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
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    await connectToDatabase();

    const payment = await ScheduledPayment.findOne({
      _id: id,
      userId: session.user.id,
    })
      .populate('memberId', 'name type')
      .populate('categoryId', 'name icon color')
      .populate('sourceBankId', 'bankName accountHolderName')
      .populate('sourceCardId', 'cardName last4Digits')
      .populate('destinationBankId', 'bankName accountHolderName')
      .populate('destinationCardId', 'cardName last4Digits')
      .populate('destinationInvestmentId', 'name type')
      .lean();

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Scheduled payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...payment, _id: payment._id.toString() },
    });
  } catch (error) {
    console.error('Error fetching scheduled payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scheduled payment' },
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
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    const body = await request.json();
    
    // Convert date strings to Date before validation
    const dataToValidate = {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    };
    
    const validatedData = updateScheduledPaymentSchema.parse(dataToValidate);
    const sanitizedData = sanitizeTextFields(validatedData as Record<string, unknown>);

    await connectToDatabase();

    // Get current payment to check if frequency changed
    const currentPayment = await ScheduledPayment.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!currentPayment) {
      return NextResponse.json(
        { success: false, error: 'Scheduled payment not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = { ...sanitizedData };

    // Recalculate nextRunDate if frequency or startDate changed
    if (
      (validatedData.frequency && validatedData.frequency !== currentPayment.frequency) ||
      (validatedData.startDate && validatedData.startDate !== currentPayment.startDate)
    ) {
      const newStartDate = validatedData.startDate || currentPayment.startDate;
      const newFrequency = validatedData.frequency || currentPayment.frequency;

      // If start date is in the future, use it as next run date
      if (newStartDate > new Date()) {
        updateData.nextRunDate = newStartDate;
      } else {
        // Otherwise calculate next run date from last run or start date
        const baseDate = currentPayment.lastRunDate || newStartDate;
        updateData.nextRunDate = calculateNextRunDate(baseDate, newFrequency);
      }
    }

    const payment = await ScheduledPayment.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: updateData },
      { new: true }
    )
      .populate('memberId', 'name type')
      .populate('categoryId', 'name icon color')
      .populate('sourceBankId', 'bankName accountHolderName')
      .populate('sourceCardId', 'cardName last4Digits')
      .populate('destinationBankId', 'bankName accountHolderName')
      .populate('destinationCardId', 'cardName last4Digits')
      .populate('destinationInvestmentId', 'name type')
      .lean();

    return NextResponse.json({
      success: true,
      data: { ...payment, _id: payment!._id.toString() },
      message: 'Scheduled payment updated successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Failed to update scheduled payment');
  }
}

export async function PATCH(
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
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    const body = await request.json();

    // Validate isActive is a boolean
    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Only allow toggling isActive via PATCH; also reset failureCount when reactivating
    const patch: Record<string, unknown> = { isActive: body.isActive };
    if (body.isActive) patch.failureCount = 0;

    const payment = await ScheduledPayment.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: patch },
      { new: true }
    )
      .populate('memberId', 'name type')
      .populate('categoryId', 'name icon color')
      .populate('sourceBankId', 'bankName accountHolderName')
      .populate('sourceCardId', 'cardName last4Digits')
      .populate('destinationBankId', 'bankName accountHolderName')
      .populate('destinationCardId', 'cardName last4Digits')
      .populate('destinationInvestmentId', 'name type')
      .lean();

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Scheduled payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...payment, _id: payment._id.toString() },
      message: `Scheduled payment ${body.isActive ? 'activated' : 'paused'}`,
    });
  } catch (error) {
    console.error('Error updating scheduled payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update scheduled payment' },
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
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    await connectToDatabase();

    // Soft delete - set isActive to false
    const payment = await ScheduledPayment.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: { isActive: false } },
      { new: true }
    ).lean();

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Scheduled payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled payment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting scheduled payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete scheduled payment' },
      { status: 500 }
    );
  }
}
