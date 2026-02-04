import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Transaction from '@/lib/mongodb/models/Transaction';
import { transactionSchema } from '@/lib/validations/transaction';
import { deleteTransaction, updateTransaction } from '@/services/transactionService';

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

    const transaction = await Transaction.findOne({
      _id: id,
      userId: session.user.id,
    })
      .populate('categoryId', 'name icon color type')
      .populate('memberId', 'name type')
      .populate('sourceBankId', 'bankName accountHolderName currentBalance')
      .populate('sourceCardId', 'cardName last4Digits currentBalance')
      .populate('destinationBankId', 'bankName accountHolderName currentBalance')
      .populate('destinationCardId', 'cardName last4Digits currentBalance')
      .populate('destinationInvestmentId', 'name type currentValue')
      .lean();

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...transaction, _id: transaction._id.toString() },
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transaction' },
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
    
    // Convert dateTime string to Date before validation
    const dataToValidate = {
      ...body,
      dateTime: body.dateTime ? new Date(body.dateTime) : undefined,
    };
    
    const validatedData = transactionSchema.parse(dataToValidate);

    await connectToDatabase();

    const transaction = await updateTransaction(id, session.user.id, validatedData);

    // Populate the transaction for response
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('categoryId', 'name icon color type')
      .populate('memberId', 'name type')
      .populate('sourceBankId', 'bankName accountHolderName')
      .populate('sourceCardId', 'cardName last4Digits')
      .populate('destinationBankId', 'bankName accountHolderName')
      .populate('destinationCardId', 'cardName last4Digits')
      .populate('destinationInvestmentId', 'name type')
      .lean();

    return NextResponse.json({
      success: true,
      data: { ...populatedTransaction, _id: populatedTransaction!._id.toString() },
      message: 'Transaction updated successfully',
    });
  } catch (error) {
    console.error('Error updating transaction:', error);

    if (error instanceof Error) {
      if (error.message === 'Transaction not found') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        );
      }

      if (error.name === 'ZodError') {
        return NextResponse.json(
          { success: false, error: 'Validation failed', details: error },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update transaction' },
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

    await deleteTransaction(id, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);

    if (error instanceof Error && error.message === 'Transaction not found') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
