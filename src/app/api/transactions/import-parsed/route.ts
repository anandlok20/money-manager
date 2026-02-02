import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import { Transaction, BankAccount } from '@/lib/mongodb/models';
import Card from '@/lib/mongodb/models/Card';
import { parse, isValid } from 'date-fns';

interface ImportTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'investment';
  categoryId?: string;
  bankAccountId?: string;
  creditCardId?: string;
  reference?: string;
  narration?: string;
  source?: string;
}

// Common date formats in Indian bank statements
const DATE_FORMATS = [
  'dd/MM/yyyy',
  'dd-MM-yyyy',
  'dd MMM yyyy',
  'dd-MMM-yyyy',
  'dd/MM/yy',
  'dd-MM-yy',
  'yyyy-MM-dd',
  'MM/dd/yyyy',
  'dd MMM, yyyy',
];

function parseTransactionDate(value: string): Date | null {
  if (!value) return null;
  
  const cleaned = value.trim();
  
  for (const format of DATE_FORMATS) {
    try {
      const parsed = parse(cleaned, format, new Date());
      if (isValid(parsed) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  // Try native Date parsing as fallback
  const native = new Date(cleaned);
  if (isValid(native) && !isNaN(native.getTime())) {
    return native;
  }

  return null;
}

// Map UI types to database types
function mapTransactionType(uiType: string): string {
  switch (uiType) {
    case 'income':
      return 'income';
    case 'expense':
      return 'expense';
    case 'transfer':
      return 'transfer_self';
    case 'investment':
      return 'investment_contribution';
    default:
      return 'expense';
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { transactions } = body as { transactions: ImportTransaction[] };

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'No transactions provided' }, { status: 400 });
    }

    await connectToDatabase();

    // Verify account access
    const bankAccountId = transactions[0]?.bankAccountId;
    const creditCardId = transactions[0]?.creditCardId;

    if (bankAccountId) {
      const account = await BankAccount.findOne({
        _id: bankAccountId,
        userId: session.user.id,
      });
      if (!account) {
        return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
      }
    }

    if (creditCardId) {
      const card = await Card.findOne({
        _id: creditCardId,
        userId: session.user.id,
      });
      if (!card) {
        return NextResponse.json({ error: 'Credit card not found' }, { status: 404 });
      }
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const txn of transactions) {
      try {
        // Parse date
        const parsedDate = parseTransactionDate(txn.date);
        if (!parsedDate) {
          skipped++;
          errors.push(`Invalid date for: ${txn.description}`);
          continue;
        }

        // Check for duplicates
        const startOfDay = new Date(parsedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(parsedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingQuery: Record<string, unknown> = {
          userId: session.user.id,
          amount: txn.amount,
          dateTime: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        };

        // Add source filter for better duplicate detection
        if (bankAccountId) {
          existingQuery.sourceBankId = bankAccountId;
        } else if (creditCardId) {
          existingQuery.sourceCardId = creditCardId;
        }

        const existingTxn = await Transaction.findOne(existingQuery);
        if (existingTxn) {
          skipped++;
          continue;
        }

        // Create transaction
        const transactionData: Record<string, unknown> = {
          userId: session.user.id,
          type: mapTransactionType(txn.type),
          amount: Math.abs(txn.amount),
          dateTime: parsedDate,
          note: txn.description,
          categoryId: txn.categoryId || null,
          reference: txn.reference,
          narration: txn.narration,
          importSource: txn.source || 'bank_statement_import',
        };

        // Set source account
        if (bankAccountId) {
          transactionData.sourceType = 'bank';
          transactionData.sourceBankId = bankAccountId;
        } else if (creditCardId) {
          transactionData.sourceType = 'card';
          transactionData.sourceCardId = creditCardId;
        }

        await Transaction.create(transactionData);
        imported++;
      } catch (error) {
        console.error('Error importing transaction:', error);
        errors.push(`Failed to import: ${txn.description}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: transactions.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error importing transactions:', error);
    return NextResponse.json(
      { error: 'Failed to import transactions' },
      { status: 500 }
    );
  }
}
