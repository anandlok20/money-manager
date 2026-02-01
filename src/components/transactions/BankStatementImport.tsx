'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/dates';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ArrowRightLeft,
  TrendingUp,
  Loader2,
  X
} from 'lucide-react';

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'investment';
  suggestedCategory: string | null;
  isTransfer: boolean;
  isInvestment: boolean;
  confidence: number;
  originalRow: Record<string, string>;
}

interface BankAccount {
  _id: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
}

interface Category {
  _id: string;
  name: string;
  type: string;
}

interface Props {
  bankAccounts: BankAccount[];
  categories: Category[];
}

export default function BankStatementImport({ bankAccounts, categories }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<{
    income: number;
    expense: number;
    transfer: number;
    investment: number;
  } | null>(null);

  // Category assignments for each transaction
  const [categoryAssignments, setCategoryAssignments] = useState<Record<string, string>>({});
  // Type overrides for each transaction
  const [typeOverrides, setTypeOverrides] = useState<Record<string, string>>({});

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.pdf')) {
        toast.error('Please select a PDF file');
        return;
      }
      setFile(selectedFile);
      setParsedTransactions([]);
      setSelectedIds(new Set());
      setSummary(null);
    }
  };

  const handleParse = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    if (!selectedBankId) {
      toast.error('Please select a bank account');
      return;
    }

    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bankAccountId', selectedBankId);

      const response = await fetch('/api/transactions/parse-statement', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to parse statement');
      }

      setParsedTransactions(result.data.transactions);
      setSummary(result.data.summary);
      
      // Select all non-transfer transactions by default
      const defaultSelected = new Set<string>(
        result.data.transactions
          .filter((t: ParsedTransaction) => !t.isTransfer)
          .map((t: ParsedTransaction) => t.id)
      );
      setSelectedIds(defaultSelected);

      // Set default category assignments
      const defaultCategories: Record<string, string> = {};
      result.data.transactions.forEach((t: ParsedTransaction) => {
        if (t.suggestedCategory) {
          const matchedCategory = categories.find(c => 
            c.name.toLowerCase() === t.suggestedCategory?.toLowerCase()
          );
          if (matchedCategory) {
            defaultCategories[t.id] = matchedCategory._id;
          }
        }
      });
      setCategoryAssignments(defaultCategories);

      toast.success(`Parsed ${result.data.transactions.length} transactions`);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to parse statement');
    } finally {
      setIsParsing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(parsedTransactions.map(t => t.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleCategoryChange = (transactionId: string, categoryId: string) => {
    setCategoryAssignments(prev => ({
      ...prev,
      [transactionId]: categoryId,
    }));
  };

  const handleTypeChange = (transactionId: string, type: string) => {
    setTypeOverrides(prev => ({
      ...prev,
      [transactionId]: type,
    }));
  };

  const handleConfirmImport = async () => {
    const selected = parsedTransactions.filter(t => selectedIds.has(t.id));
    if (selected.length === 0) {
      toast.error('Please select at least one transaction');
      return;
    }

    setIsSubmitting(true);
    try {
      const transactions = selected.map(t => {
        const finalType = typeOverrides[t.id] || t.type;
        const categoryId = categoryAssignments[t.id];
        
        // Parse date from DD/MM/YYYY or other formats to ISO date
        let parsedDate: Date;
        if (t.date.includes('/')) {
          // Handle DD/MM/YYYY format
          const parts = t.date.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
            const year = parseInt(parts[2], 10);
            parsedDate = new Date(year, month, day);
          } else {
            parsedDate = new Date(t.date);
          }
        } else if (t.date.includes('-')) {
          // Handle DD-MM-YYYY format
          const parts = t.date.split('-');
          if (parts.length === 3 && parts[0].length === 2) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            parsedDate = new Date(year, month, day);
          } else {
            // Assume ISO format YYYY-MM-DD
            parsedDate = new Date(t.date);
          }
        } else {
          parsedDate = new Date(t.date);
        }
        
        const base: Record<string, unknown> = {
          amount: Math.abs(t.amount),
          dateTime: parsedDate.toISOString(),
          note: t.description,
          categoryId: categoryId || undefined,
          tags: ['imported'],
        };

        if (finalType === 'income') {
          return {
            ...base,
            type: 'INCOME',
            destinationType: 'BANK',
            destinationBankId: selectedBankId,
          };
        } else if (finalType === 'expense') {
          return {
            ...base,
            type: 'EXPENSE',
            sourceType: 'BANK',
            sourceBankId: selectedBankId,
          };
        } else if (finalType === 'transfer') {
          return {
            ...base,
            type: 'TRANSFER',
            sourceType: 'BANK',
            sourceBankId: selectedBankId,
            // User would need to select destination account
          };
        } else if (finalType === 'investment') {
          return {
            ...base,
            type: 'TRANSFER',
            sourceType: 'BANK',
            sourceBankId: selectedBankId,
            // User would need to select investment account
          };
        }
        
        return base;
      });

      const response = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to import transactions');
      }

      toast.success(`Imported ${result.data.created} transactions`);
      if (result.data.failed > 0) {
        toast.warning(`${result.data.failed} transactions failed to import`);
      }

      router.push('/transactions');
      router.refresh();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import transactions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = selectedIds.size;
  const selectedTransactions = parsedTransactions.filter(t => selectedIds.has(t.id));
  const selectedTotal = selectedTransactions.reduce((sum, t) => {
    if (t.type === 'income') return sum + Math.abs(t.amount);
    if (t.type === 'expense') return sum - Math.abs(t.amount);
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Bank Statement
          </CardTitle>
          <CardDescription>
            Upload a CSV bank statement to automatically extract and categorize transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(account => (
                    <SelectItem key={account._id} value={account._id}>
                      {account.bankName} - {account.accountNumber.slice(-4)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>PDF Bank Statement</Label>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                {file && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setFile(null);
                      setParsedTransactions([]);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{file.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button onClick={handleParse} disabled={isParsing || !selectedBankId}>
                {isParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Parse Statement
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Section */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary.income)}
                  </p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary.expense)}
                  </p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Transfers</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(summary.transfer)}
                  </p>
                </div>
                <ArrowRightLeft className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Investments</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(summary.investment)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions List */}
      {parsedTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Review Transactions</CardTitle>
                <CardDescription>
                  {selectedCount} of {parsedTransactions.length} selected
                  {selectedCount > 0 && (
                    <span className="ml-2">
                      (Net: <span className={selectedTotal >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(selectedTotal)}
                      </span>)
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === parsedTransactions.length}
                        onCheckedChange={(checked) => checked ? selectAll() : deselectAll()}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-20">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedTransactions.map((txn) => (
                    <TableRow 
                      key={txn.id}
                      className={!selectedIds.has(txn.id) ? 'opacity-50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(txn.id)}
                          onCheckedChange={() => toggleSelect(txn.id)}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {txn.date}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={txn.description}>
                        {txn.description}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={typeOverrides[txn.id] || txn.type}
                          onValueChange={(value) => handleTypeChange(txn.id, value)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">
                              <div className="flex items-center gap-2">
                                <ArrowDownCircle className="h-4 w-4 text-green-500" />
                                Income
                              </div>
                            </SelectItem>
                            <SelectItem value="expense">
                              <div className="flex items-center gap-2">
                                <ArrowUpCircle className="h-4 w-4 text-red-500" />
                                Expense
                              </div>
                            </SelectItem>
                            <SelectItem value="transfer">
                              <div className="flex items-center gap-2">
                                <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                                Transfer
                              </div>
                            </SelectItem>
                            <SelectItem value="investment">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-purple-500" />
                                Investment
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className={`text-right font-mono ${
                        txn.type === 'income' ? 'text-green-600' : 
                        txn.type === 'expense' ? 'text-red-600' : ''
                      }`}>
                        {txn.type === 'income' ? '+' : txn.type === 'expense' ? '-' : ''}
                        {formatCurrency(Math.abs(txn.amount))}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={categoryAssignments[txn.id] || ''}
                          onValueChange={(value) => handleCategoryChange(txn.id, value)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories
                              .filter(c => {
                                const type = typeOverrides[txn.id] || txn.type;
                                if (type === 'income') return c.type === 'INCOME';
                                if (type === 'expense') return c.type === 'EXPENSE';
                                return true;
                              })
                              .map(category => (
                                <SelectItem key={category._id} value={category._id}>
                                  {category.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {txn.confidence >= 0.8 ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : txn.confidence >= 0.5 ? (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {Math.round(txn.confidence * 100)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Import Actions */}
      {parsedTransactions.length > 0 && (
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setFile(null);
              setParsedTransactions([]);
              setSelectedIds(new Set());
              setSummary(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmImport}
            disabled={selectedCount === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Import {selectedCount} Transactions
              </>
            )}
          </Button>
        </div>
      )}

      {/* Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Export your bank statement as CSV from your bank&apos;s website</li>
            <li>The parser automatically detects transaction types (income, expense, transfer, investment)</li>
            <li>Review and adjust transaction types and categories before importing</li>
            <li>Transfers between your own accounts are highlighted and deselected by default</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
