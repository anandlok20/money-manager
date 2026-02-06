import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Card from '@/lib/mongodb/models/Card';
import Transaction from '@/lib/mongodb/models/Transaction';
import ScheduledPayment from '@/lib/mongodb/models/ScheduledPayment';
import { updateCardSchema } from '@/lib/validations/account';
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

    const card = await Card.findOne({
      _id: id,
      userId: session.user.id,
    })
      .populate('linkedBankId', 'bankName accountHolderName')
      .populate('linkedMemberId', 'name type')
      .lean();

    if (!card) {
      return NextResponse.json(
        { success: false, error: 'Card not found' },
        { status: 404 }
      );
    }

    // Get recent transactions for this card
    const transactions = await Transaction.find({
      userId: session.user.id,
      $or: [{ sourceCardId: id }, { destinationCardId: id }],
    })
      .sort({ dateTime: -1 })
      .limit(10)
      .populate('categoryId', 'name icon color')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...card,
        _id: card._id.toString(),
        recentTransactions: transactions.map((t) => ({
          ...t,
          _id: t._id.toString(),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching card:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch card' },
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
    const validatedData = updateCardSchema.parse(body);
    const sanitizedData = sanitizeTextFields(validatedData as Record<string, unknown>);

    await connectToDatabase();

    const card = await Card.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: sanitizedData },
      { new: true }
    )
      .populate('linkedBankId', 'bankName accountHolderName')
      .populate('linkedMemberId', 'name type')
      .lean();

    if (!card) {
      return NextResponse.json(
        { success: false, error: 'Card not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...card, _id: card._id.toString() },
      message: 'Card updated successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Failed to update card');
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

    // Check if there are any transactions linked to this card
    const transactionCount = await Transaction.countDocuments({
      userId: session.user.id,
      $or: [{ sourceCardId: id }, { destinationCardId: id }],
    });

    if (transactionCount > 0) {
      // Soft delete - set isActive to false
      await Card.findOneAndUpdate(
        { _id: id, userId: session.user.id },
        { $set: { isActive: false } }
      );

      // Deactivate linked scheduled payments
      await ScheduledPayment.updateMany(
        { userId: session.user.id, $or: [{ sourceCardId: id }, { destinationCardId: id }] },
        { $set: { isActive: false } }
      );

      return NextResponse.json({
        success: true,
        message: 'Card deactivated (has linked transactions)',
      });
    }

    // Hard delete — also clean up references
    await ScheduledPayment.updateMany(
      { userId: session.user.id, $or: [{ sourceCardId: id }, { destinationCardId: id }] },
      { $set: { isActive: false } }
    );

    const result = await Card.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Card not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Card deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete card' },
      { status: 500 }
    );
  }
}
