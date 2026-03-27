import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Transaction from '@/lib/mongodb/models/Transaction';
import Trip from '@/lib/mongodb/models/Trip';
import { transactionSchema, transactionFiltersSchema } from '@/lib/validations/transaction';
import { createTransaction } from '@/services/transactionService';
import { sanitizeText, sanitizeStringArray } from '@/lib/utils/sanitize';

// Ensure Trip model is registered for populate() calls
void Trip;

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
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    const filters = transactionFiltersSchema.parse({
      type: searchParams.get('type') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      memberId: searchParams.get('memberId') || undefined,
      startDate: startDateParam ? new Date(startDateParam) : undefined,
      endDate: endDateParam ? new Date(endDateParam) : undefined,
      minAmount: searchParams.get('minAmount') ? Number(searchParams.get('minAmount')) : undefined,
      maxAmount: searchParams.get('maxAmount') ? Number(searchParams.get('maxAmount')) : undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
    });

    // Build query
    const query: Record<string, unknown> = { userId: session.user.id };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.categoryId) {
      query.categoryId = filters.categoryId;
    }

    if (filters.memberId) {
      query.memberId = filters.memberId;
    }

    if (filters.startDate || filters.endDate) {
      query.dateTime = {};
      if (filters.startDate) {
        (query.dateTime as Record<string, Date>).$gte = filters.startDate;
      }
      if (filters.endDate) {
        (query.dateTime as Record<string, Date>).$lte = filters.endDate;
      }
    }

    if (filters.minAmount != null || filters.maxAmount != null) {
      query.amount = {};
      if (filters.minAmount != null) {
        (query.amount as Record<string, number>).$gte = filters.minAmount;
      }
      if (filters.maxAmount != null) {
        (query.amount as Record<string, number>).$lte = filters.maxAmount;
      }
    }

    // Get total count
    const total = await Transaction.countDocuments(query);

    // Get paginated transactions
    const skip = (filters.page - 1) * filters.limit;
    const transactions = await Transaction.find(query)
      .sort({ dateTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(filters.limit)
      .populate('categoryId', 'name icon color type')
      .populate('memberId', 'name type')
      .populate('sourceBankId', 'bankName accountHolderName')
      .populate('sourceCardId', 'cardName last4Digits')
      .populate('destinationBankId', 'bankName accountHolderName')
      .populate('destinationCardId', 'cardName last4Digits')
      .populate('destinationInvestmentId', 'name type')
      .populate('tripId', 'name status')
      .lean();

    return NextResponse.json({
      success: true,
      data: transactions.map((t) => ({ ...t, _id: t._id.toString() })),
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
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
    
    // Sanitize text inputs
    const sanitizedBody = {
      ...body,
      note: body.note ? sanitizeText(body.note) : undefined,
      tags: body.tags ? sanitizeStringArray(body.tags) : undefined,
    };
    
    // Convert dateTime string to Date before validation
    const dataToValidate = {
      ...sanitizedBody,
      dateTime: sanitizedBody.dateTime ? new Date(sanitizedBody.dateTime) : undefined,
    };
    
    const validatedData = transactionSchema.parse(dataToValidate);

    await connectToDatabase();

    const transaction = await createTransaction({
      userId: session.user.id,
      ...validatedData,
    });

    // Populate the transaction for response
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('categoryId', 'name icon color type')
      .populate('memberId', 'name type')
      .populate('sourceBankId', 'bankName accountHolderName')
      .populate('sourceCardId', 'cardName last4Digits')
      .populate('destinationBankId', 'bankName accountHolderName')
      .populate('destinationCardId', 'cardName last4Digits')
      .populate('destinationInvestmentId', 'name type')
      .populate('tripId', 'name status')
      .populate('goalId', 'name targetAmount currentAmount status')
      .lean();

    if (!populatedTransaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction created but could not be fetched' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { ...populatedTransaction, _id: populatedTransaction._id.toString() },
        message: 'Transaction created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating transaction:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
