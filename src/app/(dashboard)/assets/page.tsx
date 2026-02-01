'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Building2,
  Landmark,
  Shield,
  Wallet,
  Plus,
  Filter,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Calendar,
  Percent,
  PiggyBank,
  Home,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/currency';

interface Asset {
  _id: string;
  type: string;
  name: string;
  description?: string;
  purchaseDate?: string;
  purchaseValue: number;
  currentValue: number;
  maturityDate?: string;
  maturityValue?: number;
  interestRate?: number;
  nominee?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  insuranceDetails?: {
    policyNumber?: string;
    insurer?: string;
    sumAssured?: number;
    premium?: number;
    premiumFrequency?: string;
    policyStartDate?: string;
    policyEndDate?: string;
  };
  taxSection?: string;
  status: 'active' | 'matured' | 'closed' | 'surrendered';
  createdAt: string;
}

interface AssetSummary {
  totalValue: number;
  totalInvested: number;
  totalGain: number;
  gainPercentage: number;
  byCategory: Record<string, { count: number; value: number }>;
}

async function fetchAssets(category?: string): Promise<{ data: Asset[]; summary: AssetSummary }> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  const response = await fetch(`/api/assets?${params}`);
  if (!response.ok) throw new Error('Failed to fetch assets');
  return response.json();
}

const assetCategories = [
  { value: 'property', label: 'Property', icon: Building2 },
  { value: 'postoffice', label: 'Post Office', icon: Landmark },
  { value: 'insurance', label: 'Insurance', icon: Shield },
  { value: 'government', label: 'Government Schemes', icon: PiggyBank },
  { value: 'fixed_income', label: 'Fixed Income', icon: Wallet },
];

const assetTypeLabels: Record<string, string> = {
  // Property
  'residential_property': 'Residential Property',
  'commercial_property': 'Commercial Property',
  'land': 'Land',
  'agricultural_land': 'Agricultural Land',
  // Post Office
  'ppf': 'PPF',
  'nsc': 'NSC',
  'kvp': 'Kisan Vikas Patra',
  'ssy': 'Sukanya Samriddhi',
  'scss': 'Senior Citizen Savings',
  'post_office_rd': 'Post Office RD',
  'post_office_td': 'Time Deposit',
  'post_office_mis': 'Monthly Income Scheme',
  // Insurance
  'term_insurance': 'Term Insurance',
  'life_insurance': 'Life Insurance',
  'endowment_plan': 'Endowment Plan',
  'ulip': 'ULIP',
  'health_insurance': 'Health Insurance',
  'motor_insurance': 'Motor Insurance',
  // Government
  'nps': 'NPS',
  'epf': 'EPF',
  'vpf': 'VPF',
  'gratuity': 'Gratuity',
  'atal_pension': 'Atal Pension Yojana',
  'pm_jan_dhan': 'PM Jan Dhan',
  'pm_kisan': 'PM Kisan',
  // Fixed Income
  'fixed_deposit': 'Fixed Deposit',
  'recurring_deposit': 'Recurring Deposit',
  'corporate_bond': 'Corporate Bond',
  'government_bond': 'Government Bond',
  'sgb': 'Sovereign Gold Bond',
  'tax_free_bond': 'Tax Free Bond',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  matured: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  surrendered: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function AssetsPage() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const [activeCategory, setActiveCategory] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', activeCategory],
    queryFn: () => fetchAssets(activeCategory || undefined),
  });

  const assets = data?.data || [];
  const summary = data?.summary;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Failed to load assets</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Assets & Investments</h1>
          <p className="text-muted-foreground">
            Track your property, insurance, and government schemes
          </p>
        </div>
        <Link href="/assets/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalValue, currency)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across {assets.length} assets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Invested
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalInvested, currency)}
              </div>
              <p className="text-xs text-muted-foreground">
                Purchase/Investment value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Gain/Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-1 ${(summary.totalGain || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(summary.totalGain || 0) >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                {formatCurrency(Math.abs(summary.totalGain || 0), currency)}
              </div>
              <p className={`text-xs ${(summary.gainPercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(summary.gainPercentage || 0) >= 0 ? '+' : ''}{(summary.gainPercentage || 0).toFixed(2)}% overall
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(summary.byCategory || {}).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Asset types
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="">All Assets</TabsTrigger>
          {assetCategories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="gap-2">
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Assets List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No assets found"
          description={activeCategory ? `No ${activeCategory} assets added yet` : 'Start tracking your investments and assets'}
          actionLabel="Add Asset"
          actionHref="/assets/new"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assets.map((asset) => {
            const gain = asset.currentValue - asset.purchaseValue;
            const gainPercent = asset.purchaseValue > 0 
              ? ((gain / asset.purchaseValue) * 100) 
              : 0;

            return (
              <Card key={asset._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {asset.name}
                        <Badge className={statusColors[asset.status]}>
                          {asset.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {assetTypeLabels[asset.type] || asset.type}
                      </CardDescription>
                    </div>
                    <Link href={`/assets/${asset._id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Current Value</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(asset.currentValue, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Purchase Value</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(asset.purchaseValue, currency)}
                      </p>
                    </div>
                  </div>

                  {/* Gain/Loss indicator */}
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${gain >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                    {gain >= 0 ? (
                      <TrendingUp className={`h-4 w-4 ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    ) : (
                      <TrendingDown className={`h-4 w-4 ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    )}
                    <span className={`text-sm font-medium ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {gain >= 0 ? '+' : ''}{formatCurrency(gain, currency)} ({gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%)
                    </span>
                  </div>

                  {/* Additional details based on type */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {asset.interestRate && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Percent className="h-3 w-3" />
                        {asset.interestRate}% p.a.
                      </div>
                    )}
                    {asset.maturityDate && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Matures: {format(new Date(asset.maturityDate), 'MMM yyyy')}
                      </div>
                    )}
                    {asset.location?.city && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Home className="h-3 w-3" />
                        {asset.location.city}, {asset.location.state}
                      </div>
                    )}
                    {asset.insuranceDetails?.sumAssured && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Shield className="h-3 w-3" />
                        Cover: {formatCurrency(asset.insuranceDetails.sumAssured, currency)}
                      </div>
                    )}
                    {asset.taxSection && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        Section {asset.taxSection}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Category Distribution */}
      {summary && summary.byCategory && Object.keys(summary.byCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Distribution</CardTitle>
            <CardDescription>Value breakdown by asset category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(summary.byCategory).map(([category, data]) => {
                const percentage = summary.totalValue > 0 ? (data.value / summary.totalValue) * 100 : 0;
                const categoryInfo = assetCategories.find(c => c.value === category);
                const Icon = categoryInfo?.icon || Wallet;

                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium capitalize">{category.replace('_', ' ')}</span>
                        <Badge variant="outline">{data.count} assets</Badge>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(data.value, currency)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
