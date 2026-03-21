import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import { Transaction, BankAccount } from '@/lib/mongodb/models';
import Card from '@/lib/mongodb/models/Card';
import { parse, isValid } from 'date-fns';
import { TransactionType, AccountType } from '@/types';
import { createTransaction } from '@/services/transactionService';

interface ImportTransaction {
  date?: string;
  description?: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'investment' | 'INCOME' | 'EXPENSE';
  categoryId?: string;
  memberId?: string;
  note?: string;
  bankAccountId?: string;
  creditCardId?: string;
  sourceBankId?: string; // alias accepted from SMS import
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
function mapTransactionType(uiType: string): TransactionType {
  switch (uiType.toLowerCase()) {
    case 'income':
      return TransactionType.INCOME;
    case 'expense':
      return TransactionType.EXPENSE;
    case 'transfer':
      return TransactionType.TRANSFER_SELF;
    case 'investment':
      return TransactionType.INVESTMENT_CONTRIBUTION;
    default:
      return TransactionType.EXPENSE;
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

    // Cap import batch size to prevent DoS
    const MAX_IMPORT_BATCH = 500;
    if (transactions.length > MAX_IMPORT_BATCH) {
      return NextResponse.json(
        { error: `Too many transactions. Maximum ${MAX_IMPORT_BATCH} per import.` },
        { status: 400 }
      );
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
        // Parse date — default to today if missing (e.g. SMS imports have no date)
        const parsedDate = txn.date ? parseTransactionDate(txn.date) : new Date();
        if (!parsedDate) {
          skipped++;
          errors.push(`Invalid date for: ${txn.description || txn.note}`);
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

        // Create transaction using service layer (handles balance updates atomically)
        const baseParams = {
          userId: session.user.id,
          type: mapTransactionType(txn.type),
          amount: Math.abs(txn.amount),
          dateTime: parsedDate,
          note: txn.description || txn.note,
          categoryId: txn.categoryId || undefined,
          memberId: txn.memberId || undefined,
          sourceType: undefined as AccountType | undefined,
          sourceBankId: undefined as string | undefined,
          sourceCardId: undefined as string | undefined,
        };

        // Set source account - verify ownership per transaction
        // Accept both `bankAccountId` (statement import) and `sourceBankId` (SMS import)
        const bankId = txn.bankAccountId || txn.sourceBankId;
        if (bankId) {
          const account = await BankAccount.findOne({
            _id: bankId,
            userId: session.user.id,
          });
          if (!account) {
            skipped++;
            errors.push(`Bank account not found for: ${txn.description || txn.note}`);
            continue;
          }
          baseParams.sourceType = AccountType.BANK;
          baseParams.sourceBankId = bankId;
        } else if (txn.creditCardId) {
          const card = await Card.findOne({
            _id: txn.creditCardId,
            userId: session.user.id,
          });
          if (!card) {
            skipped++;
            errors.push(`Credit card not found for: ${txn.description || txn.note}`);
            continue;
          }
          baseParams.sourceType = AccountType.CARD;
          baseParams.sourceCardId = txn.creditCardId;
        }

        await createTransaction(baseParams);
        imported++;
      } catch (error) {
        console.error('Error importing transaction:', error);
        errors.push(`Failed to import: ${txn.description || txn.note}`);
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
