'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

interface BankFormat {
  id: string;
  name: string;
  description: string;
}

interface BankAccount {
  _id: string;
  bankName: string;
  displayName?: string;
}

interface CardAccount {
  _id: string;
  cardName: string;
}

interface Member {
  _id: string;
  name: string;
}

interface ImportedTransaction {
  date: string;
  description: string;
  amount: number;
  type: string;
  status: 'imported' | 'skipped' | 'error';
  reason?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  transactions: ImportedTransaction[];
}

async function fetchBankFormats(): Promise<BankFormat[]> {
  const response = await fetch('/api/transactions/import');
  if (!response.ok) throw new Error('Failed to fetch formats');
  const data = await response.json();
  return data.formats;
}

async function fetchBankAccounts(): Promise<BankAccount[]> {
  const response = await fetch('/api/accounts/banks');
  if (!response.ok) throw new Error('Failed to fetch accounts');
  const data = await response.json();
  return data.data;
}

async function fetchCards(): Promise<CardAccount[]> {
  const response = await fetch('/api/accounts/cards');
  if (!response.ok) throw new Error('Failed to fetch cards');
  const data = await response.json();
  return data.data;
}

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch('/api/members');
  if (!response.ok) throw new Error('Failed to fetch members');
  const data = await response.json();
  return data.data;
}

async function importTransactions(params: {
  file: File;
  bankFormat: string;
  accountId: string;
  accountType: string;
  skipDuplicates: boolean;
  memberId?: string;
}): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('bankFormat', params.bankFormat);
  formData.append('accountId', params.accountId);
  formData.append('accountType', params.accountType);
  formData.append('skipDuplicates', String(params.skipDuplicates));
  if (params.memberId) formData.append('memberId', params.memberId);

  const response = await fetch('/api/transactions/import', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Import failed');
  }

  return response.json();
}

export function ImportTransactions() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [bankFormat, setBankFormat] = useState('generic');
  const [accountType, setAccountType] = useState('bank');
  const [accountId, setAccountId] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  const { data: formatsData } = useQuery({
    queryKey: ['import-formats'],
    queryFn: fetchBankFormats,
  });
  const formats = formatsData || [];

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts-simple'],
    queryFn: fetchBankAccounts,
  });
  const bankAccounts = bankAccountsData || [];

  const { data: cardsData } = useQuery({
    queryKey: ['cards-simple'],
    queryFn: fetchCards,
  });
  const cards = cardsData || [];

  const { data: membersData } = useQuery({
    queryKey: ['members-simple'],
    queryFn: fetchMembers,
  });
  const members = membersData || [];

  const mutation = useMutation({
    mutationFn: importTransactions,
    onSuccess: (data) => {
      setResult(data);
      if (data.imported > 0) {
        toast.success(`Imported ${data.imported} transactions`);
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB for PDF files
  });

  const handleImport = () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    if (!accountId) {
      toast.error('Please select an account');
      return;
    }

    mutation.mutate({
      file,
      bankFormat,
      accountId,
      accountType,
      skipDuplicates,
      memberId: memberId || undefined,
    });
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setBankFormat('generic');
    setAccountType('bank');
    setAccountId('');
    setMemberId('');
  };

  const handleClose = () => {
    setOpen(false);
    handleReset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) handleReset();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Bank Statement</DialogTitle>
          <DialogDescription>
            Upload a PDF bank statement to import transactions automatically
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            {/* File Drop Zone */}
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : file
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  : 'border-muted-foreground/25 hover:border-primary'
              )}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {isDragActive
                      ? 'Drop the file here'
                      : 'Drag & drop a PDF bank statement, or click to select'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum file size: 10MB
                  </p>
                </>
              )}
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              {/* Bank Format */}
              <div className="space-y-2">
                <Label>Bank Format</Label>
                <Select value={bankFormat} onValueChange={setBankFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {formats.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        {format.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account Type */}
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select value={accountType} onValueChange={(v) => {
                  setAccountType(v);
                  setAccountId('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Account</SelectItem>
                    <SelectItem value="card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Account Selection */}
              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountType === 'bank'
                      ? bankAccounts.map((acc) => (
                          <SelectItem key={acc._id} value={acc._id}>
                            {acc.displayName || acc.bankName}
                          </SelectItem>
                        ))
                      : cards.map((card) => (
                          <SelectItem key={card._id} value={card._id}>
                            {card.cardName}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Member Tag */}
              <div className="space-y-2">
                <Label>Tag Member <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No member</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Skip Duplicates */}
              <div className="space-y-2 col-span-2">
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={skipDuplicates}
                    onCheckedChange={setSkipDuplicates}
                  />
                  <span className="text-sm text-muted-foreground">
                    Skip duplicate transactions (matched by date + amount)
                  </span>
                </div>
              </div>
            </div>

            {/* Credit/Debit mapping note */}
            <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm text-muted-foreground bg-muted/30">
              <span className="font-medium text-foreground">Type detection:</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Credit → Income
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
                Debit → Expense
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || !accountId || mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Transactions
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Results */
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="text-2xl font-bold">{result.imported}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Imported</p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-yellow-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-2xl font-bold">{result.skipped}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Skipped</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <X className="h-5 w-5" />
                  <span className="text-2xl font-bold">{result.errors.length}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Errors</p>
              </div>
            </div>

            {/* Transaction List */}
            <div className="space-y-2">
              <Label>Transaction Details</Label>
              <ScrollArea className="h-[300px] rounded-lg border">
                <div className="p-2 space-y-1">
                  {result.transactions.map((txn, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center justify-between p-2 rounded text-sm',
                        txn.status === 'imported'
                          ? 'bg-green-50 dark:bg-green-950/20'
                          : txn.status === 'skipped'
                          ? 'bg-yellow-50 dark:bg-yellow-950/20'
                          : 'bg-red-50 dark:bg-red-950/20'
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {txn.status === 'imported' ? (
                          <Check className="h-4 w-4 text-green-600 shrink-0" />
                        ) : txn.status === 'skipped' ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate">{txn.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {txn.date}
                            {txn.reason && ` • ${txn.reason}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <Badge variant={txn.type === 'income' ? 'default' : 'destructive'}>
                          {txn.type === 'income' ? '+' : '-'}
                          {formatCurrency(txn.amount)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleReset}>
                Import Another
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
