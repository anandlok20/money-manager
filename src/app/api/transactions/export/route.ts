import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Transaction from '@/lib/mongodb/models/Transaction';
import Category from '@/lib/mongodb/models/Category';
import Member from '@/lib/mongodb/models/Member';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import Card from '@/lib/mongodb/models/Card';
import { format } from 'date-fns';

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const exportFormat = searchParams.get('format') || 'csv';

    // Build query
    const query: Record<string, unknown> = { userId: session.user.id };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) (query.date as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate) (query.date as Record<string, unknown>).$lte = new Date(endDate);
    }

    // Fetch all needed data
    const [transactions, categories, members, bankAccounts, cards] = await Promise.all([
      Transaction.find(query).sort({ date: -1 }).lean(),
      Category.find({ userId: session.user.id }).lean(),
      Member.find({ userId: session.user.id }).lean(),
      BankAccount.find({ userId: session.user.id }).lean(),
      Card.find({ userId: session.user.id }).lean(),
    ]);

    // Create lookup maps
    const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name]));
    const memberMap = new Map(members.map(m => [m._id.toString(), m.name]));
    const accountMap = new Map([
      ...bankAccounts.map(b => [b._id.toString(), b.bankName] as [string, string]),
      ...cards.map(c => [c._id.toString(), c.cardName] as [string, string]),
    ]);

    // Transform transactions for export
    const exportData = transactions.map(t => ({
      Date: format(new Date(t.dateTime), 'yyyy-MM-dd'),
      Type: t.type,
      Description: t.note || '',
      Amount: t.amount,
      Category: t.categoryId ? categoryMap.get(t.categoryId.toString()) || '' : '',
      Account: t.sourceBankId ? accountMap.get(t.sourceBankId.toString()) || '' : 
               t.sourceCardId ? accountMap.get(t.sourceCardId.toString()) || '' : '',
      'To Account': t.destinationBankId ? accountMap.get(t.destinationBankId.toString()) || '' : 
                    t.destinationCardId ? accountMap.get(t.destinationCardId.toString()) || '' : '',
      Member: t.memberId ? memberMap.get(t.memberId.toString()) || '' : '',
      Tags: (t.tags || []).join(', '),
    }));

    if (exportFormat === 'csv') {
      // Generate CSV
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [
        headers.join(','),
        ...exportData.map(row =>
          headers.map(header => {
            const value = String(row[header as keyof typeof row] || '');
            // Escape quotes and wrap in quotes if contains comma or quote
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        ),
      ];
      const csv = csvRows.join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="transactions_${format(new Date(), 'yyyy-MM-dd')}.csv"`,
        },
      });
    }

    // JSON format
    return NextResponse.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    console.error('Error exporting transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export transactions' },
      { status: 500 }
    );
  }
}
