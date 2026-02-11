'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  Calendar,
  IndianRupee,
  TrendingUp,
  Loader2,
  FileText,
  Landmark,
  Shield,
  Percent,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
import { formatCurrency } from '@/lib/utils/currency';

interface Asset {
  _id: string;
  type: string;
  name: string;
  description?: string;
  purchaseDate?: string;
  purchaseValue: number;
  currentValue?: number;
  maturityDate?: string;
  maturityValue?: number;
  isRecurring?: boolean;
  recurringAmount?: number;
  recurringFrequency?: string;
  nextPaymentDate?: string;
  interestRate?: number;
  expectedReturn?: number;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    area?: number;
    areaUnit?: string;
  };
  insuranceDetails?: {
    policyNumber?: string;
    sumAssured?: number;
    premiumAmount?: number;
    premiumFrequency?: string;
    nominee?: string;
    rider?: string[];
  };
  accountNumber?: string;
  folioNumber?: string;
  policyNumber?: string;
  institution?: string;
  branch?: string;
  taxSection?: string;
  taxBenefitAmount?: number;
  status: string;
  notes?: string;
}

async function fetchAsset(id: string): Promise<Asset> {
  const response = await fetch(`/api/assets/${id}`);
  if (!response.ok) throw new Error('Failed to fetch asset');
  const result = await response.json();
  return result.data;
}

async function deleteAsset(id: string) {
  const response = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete asset');
  return response.json();
}

export default function AssetDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => fetchAsset(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset deleted successfully');
      router.push('/assets');
    },
    onError: () => {
      toast.error('Failed to delete asset');
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Asset not found</p>
            <Button asChild className="mt-4">
              <Link href="/assets">Back to Assets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PROPERTY: 'Property',
      POST_OFFICE: 'Post Office Savings',
      INSURANCE: 'Insurance',
      GOVERNMENT: 'Government Scheme',
      FIXED_INCOME: 'Fixed Income',
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PROPERTY':
        return <Building2 className="h-5 w-5" />;
      case 'INSURANCE':
        return <Shield className="h-5 w-5" />;
      default:
        return <Landmark className="h-5 w-5" />;
    }
  };

  const currentValue = asset.currentValue || asset.purchaseValue;
  const returnAmount = currentValue - asset.purchaseValue;
  const returnPercentage = ((returnAmount / asset.purchaseValue) * 100).toFixed(2);
  const maturityProgress = asset.maturityValue && asset.maturityDate
    ? ((currentValue / asset.maturityValue) * 100)
    : 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/assets">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              {getTypeIcon(asset.type)}
              <h1 className="text-2xl font-bold">{asset.name}</h1>
              <Badge variant={asset.status === 'active' ? 'default' : 'secondary'}>
                {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
              </Badge>
            </div>
            <p className="text-muted-foreground">{getTypeLabel(asset.type)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/assets/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this asset? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Value Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Purchase Value</p>
                <p className="text-2xl font-bold">{formatCurrency(asset.purchaseValue)}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Value</p>
                <p className="text-2xl font-bold">{formatCurrency(currentValue)}</p>
              </div>
              <Landmark className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Returns</p>
                <p className={`text-2xl font-bold ${returnAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {returnAmount >= 0 ? '+' : ''}{formatCurrency(returnAmount)}
                </p>
                <p className={`text-sm ${parseFloat(returnPercentage) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({parseFloat(returnPercentage) >= 0 ? '+' : ''}{returnPercentage}%)
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Details */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {asset.purchaseDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Date</p>
                  <p className="font-medium">{format(new Date(asset.purchaseDate), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            )}
            {asset.maturityDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Maturity Date</p>
                  <p className="font-medium">{format(new Date(asset.maturityDate), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            )}
            {asset.interestRate && (
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Interest Rate</p>
                  <p className="font-medium">{asset.interestRate}% p.a.</p>
                </div>
              </div>
            )}
            {asset.institution && (
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Institution</p>
                  <p className="font-medium">{asset.institution}</p>
                </div>
              </div>
            )}
          </div>

          {/* Account/Policy Details */}
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            {asset.accountNumber && (
              <div>
                <p className="text-sm text-muted-foreground">Account Number</p>
                <p className="font-medium font-mono">{asset.accountNumber}</p>
              </div>
            )}
            {asset.folioNumber && (
              <div>
                <p className="text-sm text-muted-foreground">Folio Number</p>
                <p className="font-medium font-mono">{asset.folioNumber}</p>
              </div>
            )}
            {asset.policyNumber && (
              <div>
                <p className="text-sm text-muted-foreground">Policy Number</p>
                <p className="font-medium font-mono">{asset.policyNumber}</p>
              </div>
            )}
            {asset.branch && (
              <div>
                <p className="text-sm text-muted-foreground">Branch</p>
                <p className="font-medium">{asset.branch}</p>
              </div>
            )}
          </div>

          {/* Maturity Progress */}
          {asset.maturityValue && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Progress to Maturity</p>
                  <p className="text-sm font-medium">
                    {formatCurrency(currentValue)} / {formatCurrency(asset.maturityValue)}
                  </p>
                </div>
                <Progress value={maturityProgress} />
              </div>
            </>
          )}

          {/* Recurring Details */}
          {asset.isRecurring && (
            <>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                {asset.recurringAmount && (
                  <div>
                    <p className="text-sm text-muted-foreground">Recurring Amount</p>
                    <p className="font-medium">{formatCurrency(asset.recurringAmount)} / {asset.recurringFrequency || 'month'}</p>
                  </div>
                )}
                {asset.nextPaymentDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Next Payment</p>
                    <p className="font-medium">{format(new Date(asset.nextPaymentDate), 'MMM dd, yyyy')}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {asset.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p>{asset.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Property Location */}
      {asset.type === 'PROPERTY' && asset.location && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Property Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {asset.location.address && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{asset.location.address}</p>
                </div>
              )}
              {asset.location.city && (
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="font-medium">{asset.location.city}</p>
                </div>
              )}
              {asset.location.state && (
                <div>
                  <p className="text-sm text-muted-foreground">State</p>
                  <p className="font-medium">{asset.location.state}</p>
                </div>
              )}
              {asset.location.pincode && (
                <div>
                  <p className="text-sm text-muted-foreground">Pincode</p>
                  <p className="font-medium">{asset.location.pincode}</p>
                </div>
              )}
              {asset.location.area && (
                <div>
                  <p className="text-sm text-muted-foreground">Area</p>
                  <p className="font-medium">{asset.location.area} {asset.location.areaUnit || 'sq.ft'}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insurance Details */}
      {asset.type === 'INSURANCE' && asset.insuranceDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Insurance Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {asset.insuranceDetails.sumAssured && (
                <div>
                  <p className="text-sm text-muted-foreground">Sum Assured</p>
                  <p className="font-medium">{formatCurrency(asset.insuranceDetails.sumAssured)}</p>
                </div>
              )}
              {asset.insuranceDetails.premiumAmount && (
                <div>
                  <p className="text-sm text-muted-foreground">Premium</p>
                  <p className="font-medium">
                    {formatCurrency(asset.insuranceDetails.premiumAmount)} / {asset.insuranceDetails.premiumFrequency || 'year'}
                  </p>
                </div>
              )}
              {asset.insuranceDetails.nominee && (
                <div>
                  <p className="text-sm text-muted-foreground">Nominee</p>
                  <p className="font-medium">{asset.insuranceDetails.nominee}</p>
                </div>
              )}
              {asset.insuranceDetails.rider && asset.insuranceDetails.rider.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Riders</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {asset.insuranceDetails.rider.map((r, i) => (
                      <Badge key={i} variant="secondary">{r}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Benefits */}
      {(asset.taxSection || asset.taxBenefitAmount) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Tax Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {asset.taxSection && (
                <div>
                  <p className="text-sm text-muted-foreground">Section</p>
                  <p className="font-medium">{asset.taxSection}</p>
                </div>
              )}
              {asset.taxBenefitAmount && (
                <div>
                  <p className="text-sm text-muted-foreground">Eligible Amount</p>
                  <p className="font-medium">{formatCurrency(asset.taxBenefitAmount)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {asset.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{asset.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
