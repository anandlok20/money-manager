import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import { Transaction } from '@/lib/mongodb/models';
import { startOfDay, endOfDay, subDays, addDays } from 'date-fns';

// Check for potential duplicate transactions
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, dateTime, categoryId, note, excludeId } = body;

    await connectToDatabase();

    // Find potential duplicates within +/- 3 days with same amount
    const transactionDate = new Date(dateTime);
    const startDate = startOfDay(subDays(transactionDate, 3));
    const endDate = endOfDay(addDays(transactionDate, 3));

    interface DuplicateQuery {
      userId: string;
      amount: { $gte: number; $lte: number };
      dateTime: { $gte: Date; $lte: Date };
      _id?: { $ne: string };
      categoryId?: string;
    }

    const query: DuplicateQuery = {
      userId: session.user.id,
      amount: {
        $gte: amount * 0.95, // Allow 5% variance
        $lte: amount * 1.05,
      },
      dateTime: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // Exclude current transaction if editing
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    // If category is provided, also match by category for higher confidence
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const potentialDuplicates = await Transaction.find(query)
      .populate('categoryId', 'name icon')
      .populate('memberId', 'name')
      .sort({ dateTime: -1 })
      .limit(5)
      .lean();

    // Score each potential duplicate
    const scoredDuplicates = potentialDuplicates.map((dup) => {
      let score = 0;
      const reasons: string[] = [];

      // Exact amount match
      if (dup.amount === amount) {
        score += 40;
        reasons.push('Same amount');
      } else {
        score += 20;
        reasons.push('Similar amount');
      }

      // Same date
      const dupDate = new Date(dup.dateTime);
      const dayDiff = Math.abs(
        Math.floor((dupDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      if (dayDiff === 0) {
        score += 30;
        reasons.push('Same day');
      } else if (dayDiff === 1) {
        score += 20;
        reasons.push('1 day apart');
      } else {
        score += 10;
        reasons.push(`${dayDiff} days apart`);
      }

      // Same category
      if (categoryId && dup.categoryId?._id?.toString() === categoryId) {
        score += 20;
        reasons.push('Same category');
      }

      // Similar note (basic text matching)
      if (note && dup.note) {
        const noteWords = note.toLowerCase().split(/\s+/);
        const dupNoteWords = dup.note.toLowerCase().split(/\s+/);
        const commonWords = noteWords.filter((word: string) => 
          word.length > 2 && dupNoteWords.includes(word)
        );
        if (commonWords.length > 0) {
          score += 10;
          reasons.push('Similar description');
        }
      }

      return {
        _id: dup._id,
        amount: dup.amount,
        dateTime: dup.dateTime,
        type: dup.type,
        note: dup.note,
        category: dup.categoryId,
        member: dup.memberId,
        score,
        reasons,
        confidence: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low',
      };
    });

    // Filter to only include matches with score >= 40 (at minimum similar amount + some other match)
    const filteredDuplicates = scoredDuplicates
      .filter((dup) => dup.score >= 40)
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({
      duplicates: filteredDuplicates,
      hasPotentialDuplicates: filteredDuplicates.length > 0,
      highConfidenceCount: filteredDuplicates.filter((d) => d.confidence === 'high').length,
    });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    );
  }
}
