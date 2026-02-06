'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { TrendingUp, Plus, MoreVertical, Edit, Trash2, PiggyBank, LineChart, Shield, Wallet, Home, Car, Gem, Building } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/currency';

// Combined Asset Types - includes investments + physical assets
enum AssetType {
  // Investment types
  MUTUAL_FUND = 'MUTUAL_FUND',
  INSURANCE = 'INSURANCE',
  SHARE_MARKET = 'SHARE_MARKET',
  // Physical assets
  PROPERTY = 'PROPERTY',
  VEHICLE = 'VEHICLE',
  GOLD_JEWELRY = 'GOLD_JEWELRY',
  FIXED_DEPOSIT = 'FIXED_DEPOSIT',
  PPF = 'PPF',
  NPS = 'NPS',
  CRYPTO = 'CRYPTO',
  OTHER = 'OTHER',
}

interface Asset {
  _id: string;
  name: string;
  type: AssetType;
  currentValue: number;
  purchaseValue?: number;
  purchaseDate?: string;
  isActive: boolean;
  createdAt: string;
  description?: string;
}

async function fetchAssets(): Promise<{ data: Asset[]; totalValue: number }> {
  const response = await fetch('/api/investments?includeInactive=true');
  if (!response.ok) throw new Error('Failed to fetch assets');
  return response.json();
}

async function deleteAsset(id: string) {
  const response = await fetch(`/api/investments/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete asset');
  }
  return response.json();
}

const assetTypeConfig: Record<string, { label: string; icon: typeof PiggyBank; color: string }> = {
  [AssetType.MUTUAL_FUND]: { label: 'Mutual Fund', icon: PiggyBank, color: 'bg-blue-500' },
  [AssetType.INSURANCE]: { label: 'Insurance', icon: Shield, color: 'bg-green-500' },
  [AssetType.SHARE_MARKET]: { label: 'Stocks', icon: LineChart, color: 'bg-purple-500' },
  [AssetType.PROPERTY]: { label: 'Property', icon: Home, color: 'bg-amber-500' },
  [AssetType.VEHICLE]: { label: 'Vehicle', icon: Car, color: 'bg-red-500' },
  [AssetType.GOLD_JEWELRY]: { label: 'Gold & Jewelry', icon: Gem, color: 'bg-yellow-500' },
  [AssetType.FIXED_DEPOSIT]: { label: 'Fixed Deposit', icon: Building, color: 'bg-cyan-500' },
  [AssetType.PPF]: { label: 'PPF', icon: PiggyBank, color: 'bg-emerald-500' },
  [AssetType.NPS]: { label: 'NPS', icon: Shield, color: 'bg-indigo-500' },
  [AssetType.CRYPTO]: { label: 'Crypto', icon: TrendingUp, color: 'bg-orange-500' },
  [AssetType.OTHER]: { label: 'Other', icon: Wallet, color: 'bg-gray-500' },
};

export default function AssetsPage() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['investments'],
    queryFn: fetchAssets,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      toast.success('Asset deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

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
            Track your investments, property, and other assets
          </p>
        </div>
        <Link href="/accounts/assets/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        </Link>
      </div>

      {/* Total Value Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Asset Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(data?.totalValue || 0, currency)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Assets List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : data?.data.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No assets"
          description="Start tracking your assets and investments to monitor your net worth."
          actionLabel="Add Asset"
          actionHref="/accounts/assets/new"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((asset) => {
            const config = assetTypeConfig[asset.type] || assetTypeConfig[AssetType.OTHER];
            const IconComponent = config.icon;

            return (
              <Card key={asset._id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{asset.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {config.label}
                          </Badge>
                          {!asset.isActive && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/accounts/assets/${asset._id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{asset.name}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(asset._id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(asset.currentValue, currency)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Added {new Date(asset.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
