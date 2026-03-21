import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Category from '@/lib/mongodb/models/Category';
import { parseSMSBatch } from '@/services/smsParser';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messages } = body as { messages: string[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No messages provided' },
        { status: 400 }
      );
    }

    if (messages.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 messages per request' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get user's categories to match suggested names → IDs
    const categories = await Category.find({ userId: session.user.id }).lean();
    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c._id.toString()]));

    const parsed = parseSMSBatch(messages);

    // Enrich with category IDs
    const enriched = parsed.map((item) => ({
      ...item,
      suggestedCategoryId: item.suggestedCategoryName
        ? categoryMap.get(item.suggestedCategoryName.toLowerCase())
        : undefined,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Error parsing SMS messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse SMS messages' },
      { status: 500 }
    );
  }
}
