import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import { bankAccountSchema } from '@/lib/validations/account';
import { sanitizeTextFields, handleApiError } from '@/lib/utils/api';

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

    const accounts = await BankAccount.find(query)
      .populate('linkedMemberIds', 'name type')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate total balance
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    return NextResponse.json(
      {
        success: true,
        data: accounts.map((a) => ({
          ...a,
          _id: a._id.toString(),
          displayName: `${a.bankName} (${a.accountHolderName})`,
        })),
        totalBalance,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bank accounts' },
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
    const validatedData = bankAccountSchema.parse(body);
    const sanitizedData = sanitizeTextFields(validatedData as Record<string, unknown>);

    await connectToDatabase();

    const account = await BankAccount.create({
      ...sanitizedData,
      userId: session.user.id,
      currentBalance: validatedData.openingBalance,
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...account.toObject(),
          _id: account._id.toString(),
          displayName: `${account.bankName} (${account.accountHolderName})`,
        },
        message: 'Bank account created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'Failed to create bank account');
  }
}
