import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import ScheduledPayment from '@/lib/mongodb/models/ScheduledPayment';
import { scheduledPaymentSchema } from '@/lib/validations/scheduled-payment';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const query: Record<string, unknown> = { userId: session.user.id };
    if (!includeInactive) {
      query.isActive = true;
    }

    const payments = await ScheduledPayment.find(query)
      .populate('memberId', 'name type')
      .populate('sourceBankId', 'bankName accountHolderName')
      .populate('sourceCardId', 'cardName last4Digits')
      .populate('destinationBankId', 'bankName accountHolderName')
      .populate('destinationCardId', 'cardName last4Digits')
      .populate('destinationInvestmentId', 'name type')
      .sort({ nextRunDate: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: payments.map((p) => ({ ...p, _id: p._id.toString() })),
    });
  } catch (error) {
    console.error('Error fetching scheduled payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scheduled payments' },
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

    const body = await request.json();
    
    // Convert startDate string to Date before validation
    const dataToValidate = {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
    };
    
    const validatedData = scheduledPaymentSchema.parse(dataToValidate);

    await connectToDatabase();

    // Set nextRunDate to startDate for new scheduled payments
    const payment = await ScheduledPayment.create({
      ...validatedData,
      userId: session.user.id,
      nextRunDate: validatedData.startDate,
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: { ...payment.toObject(), _id: payment._id.toString() },
        message: 'Scheduled payment created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating scheduled payment:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create scheduled payment' },
      { status: 500 }
    );
  }
}
