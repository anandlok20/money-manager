'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Receipt,
  Plus,
  Calculator,
  FileText,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/currency';

interface TaxProfile {
  _id: string;
  financialYear: string;
  assessmentYear: string;
  regime: 'old' | 'new';
  status: 'draft' | 'calculated' | 'filed' | 'verified';
  salaryIncome: number;
  housePropertyIncome: number;
  capitalGains: { shortTerm: number; longTerm: number };
  businessIncome: number;
  otherIncome: number;
  grossTotalIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  totalTaxLiability: number;
  tdsPaid: number;
  advanceTaxPaid: number;
  taxPayable: number;
  refundDue: number;
  autoCalculate: boolean;
  lastCalculatedAt?: string;
}

async function fetchTaxProfiles(): Promise<{ data: TaxProfile[] }> {
  const response = await fetch('/api/tax');
  if (!response.ok) throw new Error('Failed to fetch tax profiles');
  return response.json();
}

async function calculateTax(id: string) {
  const response = await fetch(`/api/tax/${id}/calculate`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to calculate tax');
  return response.json();
}

const statusIcons = {
  draft: Clock,
  calculated: Calculator,
  filed: FileText,
  verified: CheckCircle,
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  calculated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  filed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  verified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

// Generate financial years
const financialYears = Array.from({ length: 5 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return `${year}-${(year + 1).toString().slice(-2)}`;
});

export default function TaxPage() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['tax-profiles'],
    queryFn: fetchTaxProfiles,
  });

  const calculateMutation = useMutation({
    mutationFn: calculateTax,
    onSuccess: () => {
      toast.success('Tax calculated successfully');
      queryClient.invalidateQueries({ queryKey: ['tax-profiles'] });
    },
    onError: () => {
      toast.error('Failed to calculate tax');
    },
  });

  const profiles = data?.data || [];
  const filteredProfiles = selectedYear && selectedYear !== 'all'
    ? profiles.filter((p) => p.financialYear === selectedYear)
    : profiles;

  // Summary calculations
  const currentYearProfile = profiles.find(
    (p) => p.financialYear === financialYears[0]
  );

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Failed to load tax profiles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground">
            Track and calculate your income tax
          </p>
        </div>
        <Link href="/tax/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Tax Year
          </Button>
        </Link>
      </div>

      {/* Current Year Summary */}
      {currentYearProfile && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gross Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(currentYearProfile.grossTotalIncome, currency)}
              </div>
              <p className="text-xs text-muted-foreground">FY {currentYearProfile.financialYear}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxable Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(currentYearProfile.taxableIncome, currency)}
              </div>
              <p className="text-xs text-muted-foreground">
                After deductions of {formatCurrency(currentYearProfile.totalDeductions, currency)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tax Liability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(currentYearProfile.totalTaxLiability, currency)}
              </div>
              <Badge className={currentYearProfile.regime === 'new' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                {currentYearProfile.regime === 'new' ? 'New Regime' : 'Old Regime'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {currentYearProfile.refundDue > 0 ? 'Refund Due' : 'Tax Payable'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${currentYearProfile.refundDue > 0 ? 'text-green-600' : 'text-destructive'}`}>
                {formatCurrency(
                  currentYearProfile.refundDue > 0 
                    ? currentYearProfile.refundDue 
                    : currentYearProfile.taxPayable,
                  currency
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                TDS Paid: {formatCurrency(currentYearProfile.tdsPaid, currency)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Financial Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {financialYears.map((fy) => (
              <SelectItem key={fy} value={fy}>FY {fy}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tax Profiles List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No tax records"
          description="Start tracking your tax for the current financial year"
          actionLabel="Add Tax Year"
          actionHref="/tax/new"
        />
      ) : (
        <div className="space-y-4">
          {filteredProfiles.map((profile) => {
            const StatusIcon = statusIcons[profile.status];

            return (
              <Card key={profile._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        FY {profile.financialYear}
                        <Badge className={statusColors[profile.status]}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {profile.status}
                        </Badge>
                        <Badge variant="outline">
                          {profile.regime === 'new' ? 'New Regime' : 'Old Regime'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Assessment Year: {profile.assessmentYear}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => calculateMutation.mutate(profile._id)}
                        disabled={calculateMutation.isPending}
                      >
                        <Calculator className="h-4 w-4 mr-1" />
                        Calculate
                      </Button>
                      <Link href={`/tax/${profile._id}`}>
                        <Button size="sm">View Details</Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Gross Income</p>
                      <p className="font-semibold">
                        {formatCurrency(profile.grossTotalIncome, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deductions</p>
                      <p className="font-semibold text-green-600">
                        -{formatCurrency(profile.totalDeductions, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Taxable Income</p>
                      <p className="font-semibold">
                        {formatCurrency(profile.taxableIncome, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tax Liability</p>
                      <p className="font-semibold text-destructive">
                        {formatCurrency(profile.totalTaxLiability, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {profile.refundDue > 0 ? 'Refund' : 'Payable'}
                      </p>
                      <p className={`font-semibold ${profile.refundDue > 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {formatCurrency(
                          profile.refundDue > 0 ? profile.refundDue : profile.taxPayable,
                          currency
                        )}
                      </p>
                    </div>
                  </div>

                  {profile.lastCalculatedAt && (
                    <p className="text-xs text-muted-foreground mt-4">
                      Last calculated: {format(new Date(profile.lastCalculatedAt), 'PPp')}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tax Slabs Info */}
      <Card>
        <CardHeader>
          <CardTitle>FY 2025-26 Tax Slabs</CardTitle>
          <CardDescription>Compare old and new tax regimes</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="new">
            <TabsList>
              <TabsTrigger value="new">New Regime</TabsTrigger>
              <TabsTrigger value="old">Old Regime</TabsTrigger>
            </TabsList>
            <TabsContent value="new" className="mt-4">
              <div className="space-y-2">
                {[
                  { range: '₹0 - ₹4,00,000', rate: 'Nil' },
                  { range: '₹4,00,001 - ₹8,00,000', rate: '5%' },
                  { range: '₹8,00,001 - ₹12,00,000', rate: '10%' },
                  { range: '₹12,00,001 - ₹16,00,000', rate: '15%' },
                  { range: '₹16,00,001 - ₹20,00,000', rate: '20%' },
                  { range: '₹20,00,001 - ₹24,00,000', rate: '25%' },
                  { range: 'Above ₹24,00,000', rate: '30%' },
                ].map((slab) => (
                  <div key={slab.range} className="flex justify-between py-2 border-b last:border-0">
                    <span>{slab.range}</span>
                    <span className="font-semibold">{slab.rate}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Standard Deduction: ₹75,000 | Rebate u/s 87A up to ₹12L income: ₹60,000
              </p>
            </TabsContent>
            <TabsContent value="old" className="mt-4">
              <div className="space-y-2">
                {[
                  { range: '₹0 - ₹2,50,000', rate: 'Nil' },
                  { range: '₹2,50,001 - ₹5,00,000', rate: '5%' },
                  { range: '₹5,00,001 - ₹10,00,000', rate: '20%' },
                  { range: 'Above ₹10,00,000', rate: '30%' },
                ].map((slab) => (
                  <div key={slab.range} className="flex justify-between py-2 border-b last:border-0">
                    <span>{slab.range}</span>
                    <span className="font-semibold">{slab.rate}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Allows deductions under 80C (₹1.5L), 80D, HRA, etc. | Rebate u/s 87A up to ₹5L: ₹12,500
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
