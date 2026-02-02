"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parse, isValid } from "date-fns";
import {
  Upload,
  FileText,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  TrendingUp,
  Search,
  Filter,
  ArrowUpDown,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  Info,
  Calendar,
  Wallet,
  CreditCard,
  Building2,
  Hash,
  BadgePercent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer" | "investment";
  category?: string;
  categoryId?: string;
  balance?: number;
  reference?: string;
  narration?: string;
  chequeNo?: string;
  valueDate?: string;
  transactionId?: string;
  merchantName?: string;
  paymentMode?: string;
  confidence?: number;
  isDuplicate?: boolean;
  duplicateOf?: string;
  rawText?: string;
}

interface Category {
  _id: string;
  name: string;
  type: "income" | "expense";
  icon?: string;
  color?: string;
  keywords?: string[];
}

interface BankAccount {
  _id: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  balance: number;
  currency: string;
}

interface CreditCard {
  _id: string;
  bankName: string;
  cardName: string;
  lastFourDigits: string;
  currentBalance: number;
  currency: string;
}

interface StatementSummary {
  totalTransactions: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
  investmentCount: number;
  incomeAmount: number;
  expenseAmount: number;
  transferAmount: number;
  investmentAmount: number;
  openingBalance?: number;
  closingBalance?: number;
  statementPeriod?: {
    from: string;
    to: string;
  };
  bankDetected?: string;
  accountNumber?: string;
  duplicateCount: number;
}

interface BankStatementImportProps {
  onImportComplete?: () => void;
}

type FilterType = "all" | "income" | "expense" | "transfer" | "investment";
type SortOrder = "date-asc" | "date-desc" | "amount-asc" | "amount-desc";

export function BankStatementImport({ onImportComplete }: BankStatementImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [accountType, setAccountType] = useState<"bank" | "card">("bank");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  
  // Advanced filters
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("date-desc");
  const [showDuplicates, setShowDuplicates] = useState(true);
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);
  
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ["bankAccounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts/banks");
      if (!res.ok) throw new Error("Failed to fetch bank accounts");
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch credit cards
  const { data: creditCards = [] } = useQuery<CreditCard[]>({
    queryKey: ["creditCards"],
    queryFn: async () => {
      const res = await fetch("/api/accounts/cards");
      if (!res.ok) throw new Error("Failed to fetch credit cards");
      const json = await res.json();
      return json.data || [];
    },
  });

  // Parse statement mutation
  const parseStatementMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setParseProgress(10);
      const res = await fetch("/api/transactions/parse-statement", {
        method: "POST",
        body: formData,
      });
      setParseProgress(70);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to parse statement");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setParseProgress(90);
      const transactions: ParsedTransaction[] = data.transactions.map(
        (t: ParsedTransaction, idx: number) => ({
          ...t,
          id: t.id || `parsed-${idx}-${Date.now()}`,
        })
      );
      
      // Calculate summary with amounts
      const incomeTransactions = transactions.filter(t => t.type === "income");
      const expenseTransactions = transactions.filter(t => t.type === "expense");
      const transferTransactions = transactions.filter(t => t.type === "transfer");
      const investmentTransactions = transactions.filter(t => t.type === "investment");
      const duplicates = transactions.filter(t => t.isDuplicate);
      
      const summaryData: StatementSummary = {
        totalTransactions: transactions.length,
        incomeCount: incomeTransactions.length,
        expenseCount: expenseTransactions.length,
        transferCount: transferTransactions.length,
        investmentCount: investmentTransactions.length,
        incomeAmount: incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        expenseAmount: expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        transferAmount: transferTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        investmentAmount: investmentTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        openingBalance: data.openingBalance,
        closingBalance: data.closingBalance,
        statementPeriod: data.statementPeriod,
        bankDetected: data.bankDetected,
        accountNumber: data.accountNumber,
        duplicateCount: duplicates.length,
      };
      
      setSummary(summaryData);
      setParsedTransactions(transactions);
      
      // Auto-select non-duplicate transactions
      const nonDuplicates = transactions.filter(t => !t.isDuplicate);
      setSelectedTransactions(new Set(nonDuplicates.map(t => t.id)));
      setParseProgress(100);
      
      toast.success(`Parsed ${transactions.length} transactions`, {
        description: data.bankDetected ? `Detected: ${data.bankDetected}` : undefined,
      });
    },
    onError: (error: Error) => {
      setParseProgress(0);
      toast.error("Failed to parse statement", {
        description: error.message,
      });
    },
  });

  // Import transactions mutation
  const importTransactionsMutation = useMutation({
    mutationFn: async (transactions: ParsedTransaction[]) => {
      const accountId = accountType === "bank" ? selectedAccountId : selectedCardId;
      const res = await fetch("/api/transactions/import-parsed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: transactions.map(t => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type,
            categoryId: t.categoryId,
            bankAccountId: accountType === "bank" ? accountId : undefined,
            creditCardId: accountType === "card" ? accountId : undefined,
            reference: t.reference,
            narration: t.narration,
            source: "bank_statement_import",
          })),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to import transactions");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Transactions imported", {
        description: `${data.imported} transactions imported${data.skipped > 0 ? `, ${data.skipped} skipped` : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["creditCards"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      resetState();
      onImportComplete?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to import transactions", {
        description: error.message,
      });
    },
  });

  const resetState = () => {
    setFile(null);
    setParsing(false);
    setParseProgress(0);
    setParsedTransactions([]);
    setSelectedTransactions(new Set());
    setSummary(null);
    setFilterType("all");
    setSearchQuery("");
    setSortOrder("date-desc");
    setShowDuplicates(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        "application/pdf",
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();

      if (validTypes.includes(selectedFile.type) || ["pdf", "csv", "xlsx", "xls"].includes(fileExtension || "")) {
        setFile(selectedFile);
        setParsedTransactions([]);
        setSelectedTransactions(new Set());
        setSummary(null);
        setParseProgress(0);
      } else {
        toast.error("Invalid file type", {
          description: "Please upload a PDF, CSV, or Excel file",
        });
      }
    }
  };

  const handleParseStatement = async () => {
    if (!file) return;

    setParsing(true);
    setParseProgress(5);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await parseStatementMutation.mutateAsync(formData);
    } finally {
      setParsing(false);
    }
  };

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const visibleIds = filteredAndSortedTransactions.map(t => t.id);
      setSelectedTransactions(new Set(visibleIds));
    } else {
      setSelectedTransactions(new Set());
    }
  }, []);

  const handleSelectTransaction = useCallback((id: string, checked: boolean) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const handleCategoryChange = useCallback((transactionId: string, categoryId: string) => {
    setParsedTransactions(prev =>
      prev.map(t =>
        t.id === transactionId
          ? {
              ...t,
              categoryId,
              category: categories.find(c => c._id === categoryId)?.name,
            }
          : t
      )
    );
  }, [categories]);

  const handleTypeChange = useCallback((transactionId: string, type: ParsedTransaction["type"]) => {
    setParsedTransactions(prev =>
      prev.map(t =>
        t.id === transactionId
          ? { ...t, type, categoryId: undefined, category: undefined }
          : t
      )
    );
  }, []);

  const toggleRowExpanded = useCallback((id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleImport = () => {
    const transactionsToImport = parsedTransactions.filter(t =>
      selectedTransactions.has(t.id)
    );

    if (transactionsToImport.length === 0) {
      toast.error("No transactions selected");
      return;
    }

    const accountId = accountType === "bank" ? selectedAccountId : selectedCardId;
    if (!accountId) {
      toast.error("Please select an account");
      return;
    }

    importTransactionsMutation.mutate(transactionsToImport);
  };

  // Memoized filtered and sorted transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...parsedTransactions];

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(query) ||
        t.narration?.toLowerCase().includes(query) ||
        t.reference?.toLowerCase().includes(query) ||
        t.merchantName?.toLowerCase().includes(query)
      );
    }

    // Filter duplicates
    if (!showDuplicates) {
      filtered = filtered.filter(t => !t.isDuplicate);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "amount-asc":
          return Math.abs(a.amount) - Math.abs(b.amount);
        case "amount-desc":
          return Math.abs(b.amount) - Math.abs(a.amount);
        default:
          return 0;
      }
    });

    return filtered;
  }, [parsedTransactions, filterType, searchQuery, sortOrder, showDuplicates]);

  // Selection statistics
  const selectionStats = useMemo(() => {
    const selected = parsedTransactions.filter(t => selectedTransactions.has(t.id));
    return {
      count: selected.length,
      income: selected.filter(t => t.type === "income").reduce((sum, t) => sum + Math.abs(t.amount), 0),
      expense: selected.filter(t => t.type === "expense").reduce((sum, t) => sum + Math.abs(t.amount), 0),
      net: selected.reduce((sum, t) => {
        if (t.type === "income") return sum + Math.abs(t.amount);
        if (t.type === "expense") return sum - Math.abs(t.amount);
        return sum;
      }, 0),
    };
  }, [parsedTransactions, selectedTransactions]);

  const parseDisplayDate = (dateStr: string) => {
    try {
      // Try various date formats
      const formats = [
        "yyyy-MM-dd",
        "dd/MM/yyyy",
        "dd-MM-yyyy",
        "MM/dd/yyyy",
        "dd MMM yyyy",
        "dd-MMM-yyyy",
      ];
      
      for (const fmt of formats) {
        const parsed = parse(dateStr, fmt, new Date());
        if (isValid(parsed)) {
          return format(parsed, "dd MMM yyyy");
        }
      }
      
      // Try direct Date parsing
      const directParse = new Date(dateStr);
      if (isValid(directParse)) {
        return format(directParse, "dd MMM yyyy");
      }
      
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getTypeIcon = (type: ParsedTransaction["type"]) => {
    switch (type) {
      case "income":
        return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case "expense":
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      case "transfer":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case "investment":
        return <TrendingUp className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: ParsedTransaction["type"]) => {
    switch (type) {
      case "income":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "expense":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "transfer":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "investment":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    
    if (confidence >= 90) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-300">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          High
        </Badge>
      );
    } else if (confidence >= 70) {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-300">
          <AlertCircle className="h-3 w-3 mr-1" />
          Medium
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-red-600 border-red-300">
          <Info className="h-3 w-3 mr-1" />
          Low
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Bank Statement
          </CardTitle>
          <CardDescription>
            Upload your bank statement (PDF, CSV, or Excel) to automatically extract transactions.
            Supports HDFC, ICICI, SBI, Axis, Kotak, Yes Bank, IDFC, IndusInd, PNB, Bank of Baroda, Canara, IDBI, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Account Selection */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select
                value={accountType}
                onValueChange={(v: "bank" | "card") => setAccountType(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Bank Account
                    </div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Credit Card
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{accountType === "bank" ? "Bank Account" : "Credit Card"}</Label>
              {accountType === "bank" ? (
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(account => (
                      <SelectItem key={account._id} value={account._id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{account.bankName}</span>
                          <span className="text-muted-foreground">
                            ••••{account.accountNumber.slice(-4)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select credit card" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditCards.map(card => (
                      <SelectItem key={card._id} value={card._id}>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>{card.cardName}</span>
                          <span className="text-muted-foreground">
                            ••••{card.lastFourDigits}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="statement-file">Statement File</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="statement-file"
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
              <Button
                onClick={handleParseStatement}
                disabled={!file || parsing}
                className="min-w-[120px]"
              >
                {parsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Parse
                  </>
                )}
              </Button>
            </div>
            {file && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Progress Bar */}
          {parsing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing statement...</span>
                <span>{parseProgress}%</span>
              </div>
              <Progress value={parseProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statement Summary */}
      {summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Statement Summary
              </span>
              {summary.bankDetected && (
                <Badge variant="secondary" className="font-normal">
                  {summary.bankDetected}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Period & Account Info */}
            {(summary.statementPeriod || summary.accountNumber) && (
              <div className="flex flex-wrap gap-4 text-sm">
                {summary.statementPeriod && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {parseDisplayDate(summary.statementPeriod.from)} - {parseDisplayDate(summary.statementPeriod.to)}
                    </span>
                  </div>
                )}
                {summary.accountNumber && (
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span>Account: ••••{summary.accountNumber.slice(-4)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Balance Info */}
            {(summary.openingBalance !== undefined || summary.closingBalance !== undefined) && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                {summary.openingBalance !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Opening Balance</p>
                    <p className="text-lg font-semibold">{formatCurrency(summary.openingBalance)}</p>
                  </div>
                )}
                {summary.closingBalance !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Closing Balance</p>
                    <p className="text-lg font-semibold">{formatCurrency(summary.closingBalance)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Transaction Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <ArrowDownCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Credits</span>
                </div>
                <p className="text-lg font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(summary.incomeAmount)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">
                  {summary.incomeCount} transactions
                </p>
              </div>

              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <ArrowUpCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Debits</span>
                </div>
                <p className="text-lg font-bold text-red-700 dark:text-red-400">
                  {formatCurrency(summary.expenseAmount)}
                </p>
                <p className="text-xs text-red-600 dark:text-red-500">
                  {summary.expenseCount} transactions
                </p>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm font-medium">Transfers</span>
                </div>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {formatCurrency(summary.transferAmount)}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500">
                  {summary.transferCount} transactions
                </p>
              </div>

              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Investments</span>
                </div>
                <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
                  {formatCurrency(summary.investmentAmount)}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-500">
                  {summary.investmentCount} transactions
                </p>
              </div>
            </div>

            {/* Duplicate Warning */}
            {summary.duplicateCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400">
                <Copy className="h-4 w-4" />
                <span className="text-sm">
                  {summary.duplicateCount} potential duplicate{summary.duplicateCount > 1 ? "s" : ""} detected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-yellow-700 dark:text-yellow-400"
                  onClick={() => setShowDuplicates(!showDuplicates)}
                >
                  {showDuplicates ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Show
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transactions Review Table */}
      {parsedTransactions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-lg">
                Review Transactions ({filteredAndSortedTransactions.length})
              </CardTitle>
              
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 w-[180px]"
                  />
                </div>

                {/* Type Filter */}
                <Select value={filterType} onValueChange={(v: FilterType) => setFilterType(v)}>
                  <SelectTrigger className="w-[130px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Credits</SelectItem>
                    <SelectItem value="expense">Debits</SelectItem>
                    <SelectItem value="transfer">Transfers</SelectItem>
                    <SelectItem value="investment">Investments</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortOrder} onValueChange={(v: SortOrder) => setSortOrder(v)}>
                  <SelectTrigger className="w-[150px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (Newest)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                    <SelectItem value="amount-desc">Amount (High)</SelectItem>
                    <SelectItem value="amount-asc">Amount (Low)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Toggle Details */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                >
                  {showDetailsPanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selection Stats */}
            <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={
                    filteredAndSortedTransactions.length > 0 &&
                    filteredAndSortedTransactions.every(t => selectedTransactions.has(t.id))
                  }
                  onCheckedChange={handleSelectAll}
                />
                <span className="font-medium">
                  {selectionStats.count} of {parsedTransactions.length} selected
                </span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1 text-green-600">
                <ArrowDownCircle className="h-4 w-4" />
                <span>+{formatCurrency(selectionStats.income)}</span>
              </div>
              <div className="flex items-center gap-1 text-red-600">
                <ArrowUpCircle className="h-4 w-4" />
                <span>-{formatCurrency(selectionStats.expense)}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1 font-medium">
                <span>Net:</span>
                <span className={selectionStats.net >= 0 ? "text-green-600" : "text-red-600"}>
                  {selectionStats.net >= 0 ? "+" : ""}{formatCurrency(selectionStats.net)}
                </span>
              </div>
            </div>

            {/* Transactions Table */}
            <ScrollArea className="h-[500px] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="text-right w-[120px]">Amount</TableHead>
                    {showDetailsPanel && <TableHead className="w-[120px]">Balance</TableHead>}
                    <TableHead className="w-[150px]">Category</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTransactions.map(transaction => (
                    <React.Fragment key={transaction.id}>
                        <TableRow
                          className={cn(
                            transaction.isDuplicate && "bg-yellow-50 dark:bg-yellow-900/10",
                            !selectedTransactions.has(transaction.id) && "opacity-60"
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedTransactions.has(transaction.id)}
                              onCheckedChange={checked =>
                                handleSelectTransaction(transaction.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {parseDisplayDate(transaction.date)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium line-clamp-1">
                                  {transaction.description}
                                </span>
                                {transaction.isDuplicate && (
                                  <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">
                                    <Copy className="h-3 w-3 mr-1" />
                                    Duplicate
                                  </Badge>
                                )}
                              </div>
                              {transaction.narration && transaction.narration !== transaction.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {transaction.narration}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={transaction.type}
                              onValueChange={v => handleTypeChange(transaction.id, v as ParsedTransaction["type"])}
                            >
                              <SelectTrigger className="h-8 w-full">
                                <div className="flex items-center gap-1">
                                  {getTypeIcon(transaction.type)}
                                  <span className="capitalize text-xs">{transaction.type}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="income">
                                  <div className="flex items-center gap-2">
                                    <ArrowDownCircle className="h-4 w-4 text-green-500" />
                                    Credit
                                  </div>
                                </SelectItem>
                                <SelectItem value="expense">
                                  <div className="flex items-center gap-2">
                                    <ArrowUpCircle className="h-4 w-4 text-red-500" />
                                    Debit
                                  </div>
                                </SelectItem>
                                <SelectItem value="transfer">
                                  <div className="flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4 text-blue-500" />
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
                          <TableCell className="text-right font-mono">
                            <span
                              className={cn(
                                "font-semibold",
                                transaction.type === "income" ? "text-green-600" : "",
                                transaction.type === "expense" ? "text-red-600" : "",
                                transaction.type === "transfer" ? "text-blue-600" : "",
                                transaction.type === "investment" ? "text-purple-600" : ""
                              )}
                            >
                              {transaction.type === "income" ? "+" : "-"}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </span>
                          </TableCell>
                          {showDetailsPanel && (
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {transaction.balance !== undefined
                                ? formatCurrency(transaction.balance)
                                : "-"}
                            </TableCell>
                          )}
                          <TableCell>
                            <Select
                              value={transaction.categoryId || ""}
                              onValueChange={v => handleCategoryChange(transaction.id, v)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories
                                  .filter(c =>
                                    transaction.type === "income"
                                      ? c.type === "income"
                                      : c.type === "expense"
                                  )
                                  .map(category => (
                                    <SelectItem key={category._id} value={category._id}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => toggleRowExpanded(transaction.id)}
                              >
                                {expandedRows.has(transaction.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                          </TableCell>
                        </TableRow>
                        {expandedRows.has(transaction.id) && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={showDetailsPanel ? 8 : 7}>
                              <div className="py-2 px-4 space-y-2">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  {transaction.reference && (
                                    <div>
                                      <p className="text-muted-foreground text-xs">Reference</p>
                                      <p className="font-mono">{transaction.reference}</p>
                                    </div>
                                  )}
                                  {transaction.chequeNo && (
                                    <div>
                                      <p className="text-muted-foreground text-xs">Cheque No</p>
                                      <p className="font-mono">{transaction.chequeNo}</p>
                                    </div>
                                  )}
                                  {transaction.valueDate && (
                                    <div>
                                      <p className="text-muted-foreground text-xs">Value Date</p>
                                      <p>{parseDisplayDate(transaction.valueDate)}</p>
                                    </div>
                                  )}
                                  {transaction.merchantName && (
                                    <div>
                                      <p className="text-muted-foreground text-xs">Merchant</p>
                                      <p>{transaction.merchantName}</p>
                                    </div>
                                  )}
                                  {transaction.paymentMode && (
                                    <div>
                                      <p className="text-muted-foreground text-xs">Payment Mode</p>
                                      <p>{transaction.paymentMode}</p>
                                    </div>
                                  )}
                                  {transaction.transactionId && (
                                    <div>
                                      <p className="text-muted-foreground text-xs">Transaction ID</p>
                                      <p className="font-mono text-xs">{transaction.transactionId}</p>
                                    </div>
                                  )}
                                </div>
                                {transaction.confidence && (
                                  <div className="flex items-center gap-2 pt-2">
                                    <BadgePercent className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      Confidence: {transaction.confidence}%
                                    </span>
                                    {getConfidenceBadge(transaction.confidence)}
                                  </div>
                                )}
                                {transaction.rawText && (
                                  <div className="pt-2">
                                    <p className="text-muted-foreground text-xs mb-1">Raw Text</p>
                                    <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                                      {transaction.rawText}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Import Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={resetState}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  selectedTransactions.size === 0 ||
                  importTransactionsMutation.isPending ||
                  (!selectedAccountId && !selectedCardId)
                }
              >
                {importTransactionsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Import {selectionStats.count} Transactions
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!file && parsedTransactions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">Upload a Bank Statement</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Upload your bank statement in PDF, CSV, or Excel format. We support most major Indian banks 
              including HDFC, ICICI, SBI, Axis, Kotak, and more.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
