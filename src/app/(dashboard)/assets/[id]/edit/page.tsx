'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const assetTypes = [
  { value: 'PROPERTY', label: 'Property' },
  { value: 'POST_OFFICE', label: 'Post Office Savings' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'GOVERNMENT', label: 'Government Scheme' },
  { value: 'FIXED_INCOME', label: 'Fixed Income' },
];

const assetSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseValue: z.coerce.number().min(0, 'Must be positive'),
  currentValue: z.coerce.number().min(0).optional(),
  maturityDate: z.string().optional(),
  maturityValue: z.coerce.number().min(0).optional(),
  isRecurring: z.boolean().optional(),
  recurringAmount: z.coerce.number().min(0).optional(),
  recurringFrequency: z.string().optional(),
  nextPaymentDate: z.string().optional(),
  interestRate: z.coerce.number().min(0).optional(),
  accountNumber: z.string().optional(),
  folioNumber: z.string().optional(),
  policyNumber: z.string().optional(),
  institution: z.string().optional(),
  branch: z.string().optional(),
  // Location (for property)
  locationAddress: z.string().optional(),
  locationCity: z.string().optional(),
  locationState: z.string().optional(),
  locationPincode: z.string().optional(),
  locationArea: z.coerce.number().min(0).optional(),
  locationAreaUnit: z.string().optional(),
  // Insurance
  sumAssured: z.coerce.number().min(0).optional(),
  premiumAmount: z.coerce.number().min(0).optional(),
  premiumFrequency: z.string().optional(),
  nominee: z.string().optional(),
  // Tax
  taxSection: z.string().optional(),
  taxBenefitAmount: z.coerce.number().min(0).optional(),
  status: z.string().min(1),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

async function fetchAsset(id: string) {
  const response = await fetch(`/api/assets/${id}`);
  if (!response.ok) throw new Error('Failed to fetch asset');
  const result = await response.json();
  return result.data;
}

async function updateAsset(id: string, data: AssetFormValues) {
  // Transform flat form data to nested structure
  const payload: Record<string, unknown> = {
    type: data.type,
    name: data.name,
    description: data.description,
    purchaseDate: data.purchaseDate || null,
    purchaseValue: data.purchaseValue,
    currentValue: data.currentValue,
    maturityDate: data.maturityDate || null,
    maturityValue: data.maturityValue,
    isRecurring: data.isRecurring,
    recurringAmount: data.recurringAmount,
    recurringFrequency: data.recurringFrequency,
    nextPaymentDate: data.nextPaymentDate || null,
    interestRate: data.interestRate,
    accountNumber: data.accountNumber,
    folioNumber: data.folioNumber,
    policyNumber: data.policyNumber,
    institution: data.institution,
    branch: data.branch,
    taxSection: data.taxSection,
    taxBenefitAmount: data.taxBenefitAmount,
    status: data.status,
    notes: data.notes,
  };

  if (data.type === 'PROPERTY') {
    payload.location = {
      address: data.locationAddress,
      city: data.locationCity,
      state: data.locationState,
      pincode: data.locationPincode,
      area: data.locationArea,
      areaUnit: data.locationAreaUnit,
    };
  }

  if (data.type === 'INSURANCE') {
    payload.insuranceDetails = {
      sumAssured: data.sumAssured,
      premiumAmount: data.premiumAmount,
      premiumFrequency: data.premiumFrequency,
      nominee: data.nominee,
    };
  }

  const response = await fetch(`/api/assets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update asset');
  return response.json();
}

function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export default function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => fetchAsset(id),
  });

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      type: 'FIXED_INCOME',
      name: '',
      purchaseValue: 0,
      status: 'active',
      isRecurring: false,
    },
  });

  useEffect(() => {
    if (asset) {
      form.reset({
        type: asset.type,
        name: asset.name,
        description: asset.description || '',
        purchaseDate: formatDateForInput(asset.purchaseDate),
        purchaseValue: asset.purchaseValue,
        currentValue: asset.currentValue || 0,
        maturityDate: formatDateForInput(asset.maturityDate),
        maturityValue: asset.maturityValue || 0,
        isRecurring: asset.isRecurring || false,
        recurringAmount: asset.recurringAmount || 0,
        recurringFrequency: asset.recurringFrequency || 'monthly',
        nextPaymentDate: formatDateForInput(asset.nextPaymentDate),
        interestRate: asset.interestRate || 0,
        accountNumber: asset.accountNumber || '',
        folioNumber: asset.folioNumber || '',
        policyNumber: asset.policyNumber || '',
        institution: asset.institution || '',
        branch: asset.branch || '',
        locationAddress: asset.location?.address || '',
        locationCity: asset.location?.city || '',
        locationState: asset.location?.state || '',
        locationPincode: asset.location?.pincode || '',
        locationArea: asset.location?.area || 0,
        locationAreaUnit: asset.location?.areaUnit || 'sq.ft',
        sumAssured: asset.insuranceDetails?.sumAssured || 0,
        premiumAmount: asset.insuranceDetails?.premiumAmount || 0,
        premiumFrequency: asset.insuranceDetails?.premiumFrequency || 'yearly',
        nominee: asset.insuranceDetails?.nominee || '',
        taxSection: asset.taxSection || '',
        taxBenefitAmount: asset.taxBenefitAmount || 0,
        status: asset.status,
        notes: asset.notes || '',
      });
    }
  }, [asset, form]);

  const mutation = useMutation({
    mutationFn: (data: AssetFormValues) => updateAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
      toast.success('Asset updated successfully');
      router.push(`/assets/${id}`);
    },
    onError: () => {
      toast.error('Failed to update asset');
    },
  });

  const onSubmit = (data: AssetFormValues) => {
    mutation.mutate(data);
  };

  const assetType = form.watch('type');
  const isRecurring = form.watch('isRecurring');

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/assets/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Edit Asset</h1>
        </div>
        <p className="text-muted-foreground ml-12">Update asset details</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assetTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="matured">Matured</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="sold">Sold</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., LIC Policy, PPF Account" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="institution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institution</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., SBI, LIC, Post Office" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="purchaseValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase/Investment Value *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Value</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maturityDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maturity Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="maturityValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maturity Value</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Rate (% p.a.)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Recurring Investment */}
          <Card>
            <CardHeader>
              <CardTitle>Recurring Investment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">This is a recurring investment</FormLabel>
                  </FormItem>
                )}
              />

              {isRecurring && (
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="recurringAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="recurringFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'monthly'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nextPaymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Payment</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Details */}
          {assetType === 'PROPERTY' && (
            <Card>
              <CardHeader>
                <CardTitle>Property Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="locationAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="locationCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="locationState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="locationPincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="locationArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="locationAreaUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'sq.ft'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sq.ft">sq.ft</SelectItem>
                            <SelectItem value="sq.m">sq.m</SelectItem>
                            <SelectItem value="acres">acres</SelectItem>
                            <SelectItem value="hectares">hectares</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insurance Details */}
          {assetType === 'INSURANCE' && (
            <Card>
              <CardHeader>
                <CardTitle>Insurance Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="sumAssured"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sum Assured</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="premiumAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Premium Amount</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="premiumFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Premium Frequency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'yearly'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nominee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nominee</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tax Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Benefits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="taxSection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="80C">80C</SelectItem>
                          <SelectItem value="80CCC">80CCC</SelectItem>
                          <SelectItem value="80CCD">80CCD</SelectItem>
                          <SelectItem value="80D">80D</SelectItem>
                          <SelectItem value="80E">80E</SelectItem>
                          <SelectItem value="80G">80G</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxBenefitAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eligible Amount</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="folioNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Folio Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="policyNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Policy Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="branch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea {...field} rows={4} placeholder="Any additional notes..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
