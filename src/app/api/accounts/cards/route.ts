import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Card from '@/lib/mongodb/models/Card';
import { cardSchema } from '@/lib/validations/account';
import { sanitizeTextFields, handleApiError } from '@/lib/utils/api';
import { canCreateResource } from '@/lib/utils/subscription';

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

    const cards = await Card.find(query)
      .populate('linkedBankId', 'bankName accountHolderName')
      .populate('linkedMemberId', 'name type')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate total balance
    const totalBalance = cards.reduce((sum, card) => sum + card.currentBalance, 0);

    return NextResponse.json(
      {
        success: true,
        data: cards.map((c) => ({ ...c, _id: c._id.toString() })),
        totalBalance,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cards' },
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
    const validatedData = cardSchema.parse(body);
    const sanitizedData = sanitizeTextFields(validatedData as Record<string, unknown>);

    await connectToDatabase();

    // Check subscription limits
    const currentCount = await Card.countDocuments({ userId: session.user.id, isActive: true });
    const limitCheck = await canCreateResource(session.user.id, 'cards', currentCount);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: limitCheck.message },
        { status: 403 }
      );
    }

    const card = await Card.create({
      ...sanitizedData,
      userId: session.user.id,
      currentBalance: 0,
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: { ...card.toObject(), _id: card._id.toString() },
        message: 'Card created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'Failed to create card');
  }
}
