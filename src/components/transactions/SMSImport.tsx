'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MessageSquare, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ParsedSMS {
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  merchantName?: string;
  bankName?: string;
  accountLast4?: string;
  rawText: string;
  confidence: number;
  suggestedCategoryName?: string;
  suggestedCategoryId?: string;
}

interface Category {
  _id: string;
  name: string;
  type: string;
}

interface Member {
  _id: string;
  name: string;
}

interface SMSImportProps {
  categories: Category[];
  bankAccounts: { _id: string; bankName: string; accountNumber: string }[];
  members?: Member[];
}

async function parseSMSMessages(messages: string[]): Promise<ParsedSMS[]> {
  const res = await fetch('/api/transactions/import-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error('Failed to parse SMS messages');
  const data = await res.json();
  return data.data;
}

async function importTransactions(
  transactions: Array<{
    type: string;
    amount: number;
    categoryId?: string;
    memberId?: string;
    note?: string;
    sourceBankId?: string;
  }>
) {
  const res = await fetch('/api/transactions/import-parsed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Import failed');
  }
  return res.json();
}

export function SMSImport({ categories, bankAccounts, members = [] }: SMSImportProps) {
  const [smsText, setSmsText] = useState('');
  const [parsed, setParsed] = useState<ParsedSMS[]>([]);
  const [rowTypes, setRowTypes] = useState<Record<number, 'EXPENSE' | 'INCOME'>>({});
  const [rowCategories, setRowCategories] = useState<Record<number, string>>({});
  const [rowMembers, setRowMembers] = useState<Record<number, string>>({});
  const [selectedBank, setSelectedBank] = useState<string>('');

  const parseMutation = useMutation({
    mutationFn: (text: string) => {
      const messages = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 10);
      return parseSMSMessages(messages);
    },
    onSuccess: (data) => {
      setParsed(data);
      // Pre-fill types and categories with suggestions
      const initialTypes: Record<number, 'EXPENSE' | 'INCOME'> = {};
      const initialCategories: Record<number, string> = {};
      data.forEach((item, i) => {
        initialTypes[i] = item.type;
        if (item.suggestedCategoryId) initialCategories[i] = item.suggestedCategoryId;
      });
      setRowTypes(initialTypes);
      setRowCategories(initialCategories);
      setRowMembers({});
      if (data.length === 0) {
        toast.warning('No transactions found in the pasted messages');
      } else {
        toast.success(`Parsed ${data.length} transaction${data.length !== 1 ? 's' : ''}`);
      }
    },
    onError: () => toast.error('Failed to parse messages'),
  });

  const importMutation = useMutation({
    mutationFn: () => {
      const txns = parsed.map((item, i) => ({
        type: rowTypes[i] || item.type,
        amount: item.amount,
        categoryId: rowCategories[i] || undefined,
        memberId: rowMembers[i] || undefined,
        note: item.merchantName || item.rawText.slice(0, 100),
        sourceBankId: selectedBank || undefined,
      }));
      return importTransactions(txns);
    },
    onSuccess: (data) => {
      toast.success(`Imported ${data.imported} transaction${data.imported !== 1 ? 's' : ''}`);
      setSmsText('');
      setParsed([]);
      setRowTypes({});
      setRowCategories({});
      setRowMembers({});
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function toggleType(i: number) {
    setRowTypes((prev) => ({
      ...prev,
      [i]: prev[i] === 'INCOME' ? 'EXPENSE' : 'INCOME',
    }));
    // Clear category when type changes
    setRowCategories((prev) => ({ ...prev, [i]: '' }));
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            How to use SMS Import
          </CardTitle>
          <CardDescription>
            Copy SMS messages from your bank or UPI app and paste them below. Supports HDFC, ICICI,
            SBI, Axis, Kotak, UPI, PhonePe, Paytm, Amazon Pay, and more.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Paste area */}
      <div className="space-y-3">
        <Textarea
          placeholder={`Paste SMS messages here, one per line. Example:\nRs.500.00 has been debited from your a/c ending 1234 on 15-03-25.\nINR 2000.00 credited to A/c XXXXXX5678 on 16-03-25.`}
          value={smsText}
          onChange={(e) => setSmsText(e.target.value)}
          className="min-h-[160px] font-mono text-xs"
        />
        <Button
          onClick={() => parseMutation.mutate(smsText)}
          disabled={!smsText.trim() || parseMutation.isPending}
          className="gap-2"
        >
          {parseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Parse Messages
        </Button>
      </div>

      {/* Results */}
      {parsed.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{parsed.length} transactions found</h3>
            <div className="flex items-center gap-3">
              <Select value={selectedBank || '__none__'} onValueChange={(v) => setSelectedBank(v === '__none__' ? '' : v)}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="Link to bank (opt.)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No account</SelectItem>
                  {bankAccounts.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.bankName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {parsed.map((item, i) => {
              const currentType = rowTypes[i] || item.type;
              return (
                <div
                  key={i}
                  className="flex flex-col gap-2 p-3 border rounded-xl bg-muted/30"
                >
                  {/* Row 1: type + amount + merchant + confidence */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Clickable type badge */}
                    <button
                      type="button"
                      onClick={() => toggleType(i)}
                      title="Click to toggle expense/income"
                    >
                      <Badge
                        variant={currentType === 'INCOME' ? 'default' : 'destructive'}
                        className="cursor-pointer shrink-0"
                      >
                        {currentType === 'INCOME' ? 'Income ▲' : 'Expense ▼'}
                      </Badge>
                    </button>

                    <span className="font-semibold shrink-0">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>

                    <span className="text-sm text-muted-foreground flex-1 truncate">
                      {item.merchantName || item.bankName || 'Unknown'}
                      {item.accountLast4 && <span className="ml-1">••{item.accountLast4}</span>}
                    </span>

                    {item.confidence >= 0.8 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                  </div>

                  {/* Row 2: category + member */}
                  <div className="flex flex-wrap gap-2">
                    {/* Category picker */}
                    <Select
                      value={rowCategories[i] || '__none__'}
                      onValueChange={(val) => setRowCategories((prev) => ({ ...prev, [i]: val === '__none__' ? '' : val }))}
                    >
                      <SelectTrigger className="w-full sm:w-40 h-9 text-xs">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Uncategorized</SelectItem>
                        {categories
                          .filter((c) =>
                            currentType === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE'
                          )
                          .map((c) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    {/* Member picker */}
                    {members.length > 0 && (
                      <Select
                        value={rowMembers[i] || '__none__'}
                        onValueChange={(val) => setRowMembers((prev) => ({ ...prev, [i]: val === '__none__' ? '' : val }))}
                      >
                        <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
                          <SelectValue placeholder="Member (opt.)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No member</SelectItem>
                          {members.map((m) => (
                            <SelectItem key={m._id} value={m._id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            className="gap-2"
          >
            {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {parsed.length} Transactions
          </Button>
        </div>
      )}
    </div>
  );
}
