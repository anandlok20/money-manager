import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/mongodb/client';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import Card from '@/lib/mongodb/models/Card';
import Category from '@/lib/mongodb/models/Category';
import { BankStatementImport } from '@/components/transactions/BankStatementImport';
import ReceiptScanner from '@/components/transactions/ReceiptScanner';
import { SMSImport } from '@/components/transactions/SMSImport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSpreadsheet, Receipt, MessageSquare } from 'lucide-react';

export default async function ImportTransactionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  await connectToDatabase();

  // Fetch required data
  const [bankAccounts, cards, categories] = await Promise.all([
    BankAccount.find({ userId: session.user.id }).lean(),
    Card.find({ userId: session.user.id }).lean(),
    Category.find({ userId: session.user.id }).lean(),
  ]);

  // Serialize MongoDB documents
  const serializedBankAccounts = bankAccounts.map(acc => ({
    _id: acc._id.toString(),
    bankName: acc.bankName,
    accountNumber: acc.accountNumber || '',
    accountType: (acc as unknown as Record<string, string>).accountType || 'SAVINGS',
  }));

  const serializedCards = cards.map(card => ({
    _id: card._id.toString(),
    cardName: card.cardName,
    lastFourDigits: card.last4Digits || '',
  }));

  const serializedCategories = categories.map(cat => ({
    _id: cat._id.toString(),
    name: cat.name,
    type: cat.type,
  }));

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Import Transactions</h1>
        <p className="text-muted-foreground mt-2">
          Import transactions from bank statements, scan receipts, or paste SMS messages
        </p>
      </div>

      <Tabs defaultValue="statement" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="statement" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Bank Statement</span>
            <span className="sm:hidden">Statement</span>
          </TabsTrigger>
          <TabsTrigger value="receipt" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Scan Receipt</span>
            <span className="sm:hidden">Receipt</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">From SMS</span>
            <span className="sm:hidden">SMS</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statement">
          <BankStatementImport />
        </TabsContent>

        <TabsContent value="receipt">
          <ReceiptScanner
            bankAccounts={serializedBankAccounts}
            cards={serializedCards}
            categories={serializedCategories}
          />
        </TabsContent>

        <TabsContent value="sms">
          <SMSImport
            categories={serializedCategories}
            bankAccounts={serializedBankAccounts}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
