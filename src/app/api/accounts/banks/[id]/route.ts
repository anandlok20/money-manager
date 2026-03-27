import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import Transaction from '@/lib/mongodb/models/Transaction';
import ScheduledPayment from '@/lib/mongodb/models/ScheduledPayment';
import Card from '@/lib/mongodb/models/Card';
import Goal from '@/lib/mongodb/models/Goal';
import { updateBankAccountSchema } from '@/lib/validations/account';
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

    const account = await BankAccount.findOne({
      _id: id,
      userId: session.user.id,
    })
      .populate('linkedMemberIds', 'name type')
      .lean();

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // Get recent transactions for this account
    const transactions = await Transaction.find({
      userId: session.user.id,
      $or: [{ sourceBankId: id }, { destinationBankId: id }],
    })
      .sort({ dateTime: -1 })
      .limit(10)
      .populate('categoryId', 'name icon color')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...account,
        _id: account._id.toString(),
        displayName: `${account.bankName} (${account.accountHolderName})`,
        recentTransactions: transactions.map((t) => ({
          ...t,
          _id: t._id.toString(),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching bank account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bank account' },
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
    const validatedData = updateBankAccountSchema.parse(body);
    const sanitizedData = sanitizeTextFields(validatedData as Record<string, unknown>);

    await connectToDatabase();

    // Get current account to check if opening balance changed
    const currentAccount = await BankAccount.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!currentAccount) {
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // If opening balance changed, use atomic $inc for currentBalance adjustment
    const updateData: Record<string, unknown> = { ...sanitizedData };
    if (validatedData.isPrivate !== undefined) {
      updateData.privateMemberId = validatedData.isPrivate ? (session.user.memberId || null) : null;
    }
    if (
      validatedData.openingBalance !== undefined &&
      validatedData.openingBalance !== currentAccount.openingBalance
    ) {
      const balanceDiff = validatedData.openingBalance - currentAccount.openingBalance;
      // Use atomic $inc to avoid race condition on currentBalance
      const account = await BankAccount.findOneAndUpdate(
        { _id: id, userId: session.user.id },
        {
          $set: updateData,
          $inc: { currentBalance: balanceDiff },
        },
        { new: true }
      )
        .populate('linkedMemberIds', 'name type')
        .lean();

      return NextResponse.json({
        success: true,
        data: {
          ...account,
          _id: account!._id.toString(),
          displayName: `${account!.bankName} (${account!.accountHolderName})`,
        },
        message: 'Bank account updated successfully',
      });
    }

    const account = await BankAccount.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: updateData },
      { new: true }
    )
      .populate('linkedMemberIds', 'name type')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...account,
        _id: account!._id.toString(),
        displayName: `${account!.bankName} (${account!.accountHolderName})`,
      },
      message: 'Bank account updated successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Failed to update bank account');
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

    // Check if there are any transactions linked to this account
    const transactionCount = await Transaction.countDocuments({
      userId: session.user.id,
      $or: [{ sourceBankId: id }, { destinationBankId: id }],
    });

    if (transactionCount > 0) {
      // Soft delete - set isActive to false
      await BankAccount.findOneAndUpdate(
        { _id: id, userId: session.user.id },
        { $set: { isActive: false } }
      );

      // Deactivate linked scheduled payments
      await ScheduledPayment.updateMany(
        { userId: session.user.id, $or: [{ sourceBankId: id }, { destinationBankId: id }] },
        { $set: { isActive: false } }
      );

      // Unlink cards and goals referencing this bank
      await Card.updateMany(
        { userId: session.user.id, linkedBankId: id },
        { $unset: { linkedBankId: 1 } }
      );
      await Goal.updateMany(
        { userId: session.user.id, linkedAccountId: id },
        { $unset: { linkedAccountId: 1 } }
      );

      return NextResponse.json({
        success: true,
        message: 'Bank account deactivated (has linked transactions)',
      });
    }

    // Hard delete if no transactions — also clean up references
    await ScheduledPayment.updateMany(
      { userId: session.user.id, $or: [{ sourceBankId: id }, { destinationBankId: id }] },
      { $set: { isActive: false } }
    );
    await Card.updateMany(
      { userId: session.user.id, linkedBankId: id },
      { $unset: { linkedBankId: 1 } }
    );
    await Goal.updateMany(
      { userId: session.user.id, linkedAccountId: id },
      { $unset: { linkedAccountId: 1 } }
    );

    const result = await BankAccount.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bank account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete bank account' },
      { status: 500 }
    );
  }
}
