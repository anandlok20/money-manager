'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, IndianRupee, Building2, Landmark, Shield, PiggyBank, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
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

const assetCategories = [
  {
    category: 'property',
    label: 'Property',
    icon: Building2,
    types: [
      { value: 'residential_property', label: 'Residential Property' },
      { value: 'commercial_property', label: 'Commercial Property' },
      { value: 'land', label: 'Land' },
      { value: 'agricultural_land', label: 'Agricultural Land' },
    ],
  },
  {
    category: 'postoffice',
    label: 'Post Office Savings',
    icon: Landmark,
    types: [
      { value: 'ppf', label: 'Public Provident Fund (PPF)' },
      { value: 'nsc', label: 'National Savings Certificate (NSC)' },
      { value: 'kvp', label: 'Kisan Vikas Patra (KVP)' },
      { value: 'ssy', label: 'Sukanya Samriddhi Yojana (SSY)' },
      { value: 'scss', label: 'Senior Citizen Savings Scheme (SCSS)' },
      { value: 'post_office_rd', label: 'Post Office Recurring Deposit' },
      { value: 'post_office_td', label: 'Post Office Time Deposit' },
      { value: 'post_office_mis', label: 'Post Office Monthly Income Scheme' },
    ],
  },
  {
    category: 'insurance',
    label: 'Insurance',
    icon: Shield,
    types: [
      { value: 'term_insurance', label: 'Term Insurance' },
      { value: 'life_insurance', label: 'Life Insurance' },
      { value: 'endowment_plan', label: 'Endowment Plan' },
      { value: 'ulip', label: 'Unit Linked Insurance Plan (ULIP)' },
      { value: 'health_insurance', label: 'Health Insurance' },
      { value: 'motor_insurance', label: 'Motor Insurance' },
    ],
  },
  {
    category: 'government',
    label: 'Government Schemes',
    icon: PiggyBank,
    types: [
      { value: 'nps', label: 'National Pension System (NPS)' },
      { value: 'epf', label: 'Employee Provident Fund (EPF)' },
      { value: 'vpf', label: 'Voluntary Provident Fund (VPF)' },
      { value: 'gratuity', label: 'Gratuity' },
      { value: 'atal_pension', label: 'Atal Pension Yojana' },
      { value: 'pm_jan_dhan', label: 'PM Jan Dhan Yojana' },
      { value: 'pm_kisan', label: 'PM Kisan Samman Nidhi' },
    ],
  },
  {
    category: 'fixed_income',
    label: 'Fixed Income',
    icon: Wallet,
    types: [
      { value: 'fixed_deposit', label: 'Fixed Deposit' },
      { value: 'recurring_deposit', label: 'Recurring Deposit' },
      { value: 'corporate_bond', label: 'Corporate Bond' },
      { value: 'government_bond', label: 'Government Bond' },
      { value: 'sgb', label: 'Sovereign Gold Bond (SGB)' },
      { value: 'tax_free_bond', label: 'Tax Free Bond' },
    ],
  },
];

const taxSections = [
  '80C', '80CCC', '80CCD(1)', '80CCD(1B)', '80CCD(2)', '80D', '80E', '10(10D)'
];

const assetSchema = z.object({
  type: z.string().min(1, 'Asset type is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseValue: z.number().min(0, 'Must be positive'),
  currentValue: z.number().min(0, 'Must be positive'),
  maturityDate: z.string().optional(),
  maturityValue: z.number().min(0).optional(),
  interestRate: z.number().min(0).max(100).optional(),
  nominee: z.string().optional(),
  accountNumber: z.string().optional(),
  folioNumber: z.string().optional(),
  // Property fields
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  }).optional(),
  propertyDetails: z.object({
    area: z.number().optional(),
    areaUnit: z.string().optional(),
    registrationNumber: z.string().optional(),
  }).optional(),
  // Insurance fields
  insuranceDetails: z.object({
    policyNumber: z.string().optional(),
    insurer: z.string().optional(),
    sumAssured: z.number().min(0).optional(),
    premium: z.number().min(0).optional(),
    premiumFrequency: z.string().optional(),
    policyStartDate: z.string().optional(),
    policyEndDate: z.string().optional(),
  }).optional(),
  taxSection: z.string().optional(),
  status: z.enum(['active', 'matured', 'closed', 'surrendered']),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

export default function NewAssetPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      type: '',
      name: '',
      description: '',
      purchaseValue: 0,
      currentValue: 0,
      status: 'active',
      location: {},
      propertyDetails: {},
      insuranceDetails: {},
    },
  });

  const selectedType = form.watch('type');
  const categoryInfo = assetCategories.find((c) =>
    c.types.some((t) => t.value === selectedType)
  );

  const createMutation = useMutation({
    mutationFn: async (data: AssetFormValues) => {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create asset');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Asset added successfully');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      router.push('/assets');
    },
    onError: () => {
      toast.error('Failed to add asset');
    },
  });

  const onSubmit = (data: AssetFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/assets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add New Asset</h1>
          <p className="text-muted-foreground">
            Track your property, savings, and investments
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Category Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Asset Category</CardTitle>
              <CardDescription>Select the type of asset you want to add</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {assetCategories.map((cat) => (
                  <Button
                    key={cat.category}
                    type="button"
                    variant={selectedCategory === cat.category ? 'default' : 'outline'}
                    className="h-24 flex-col gap-2"
                    onClick={() => {
                      setSelectedCategory(cat.category);
                      form.setValue('type', '');
                    }}
                  >
                    <cat.icon className="h-6 w-6" />
                    {cat.label}
                  </Button>
                ))}
              </div>

              {selectedCategory && (
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assetCategories
                            .find((c) => c.category === selectedCategory)
                            ?.types.map((type) => (
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
              )}
            </CardContent>
          </Card>

          {/* Basic Info */}
          {selectedType && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name / Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., LIC Jeevan Anand" {...field} />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="matured">Matured</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                            <SelectItem value="surrendered">Surrendered</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional details..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Value & Dates */}
              <Card>
                <CardHeader>
                  <CardTitle>Value & Timeline</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase / Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="purchaseValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase / Investment Value</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              placeholder="0"
                              className="pl-9"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </div>
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
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              placeholder="0"
                              className="pl-9"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </div>
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
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="7.1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
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

                  <FormField
                    control={form.control}
                    name="maturityValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maturity Value</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              placeholder="0"
                              className="pl-9"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Property Details */}
              {categoryInfo?.category === 'property' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Property Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="location.address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Full address..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location.pincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pincode</FormLabel>
                          <FormControl>
                            <Input placeholder="110001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="propertyDetails.area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Area</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1200"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="propertyDetails.areaUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Area Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sqft">Square Feet</SelectItem>
                              <SelectItem value="sqm">Square Meters</SelectItem>
                              <SelectItem value="acre">Acres</SelectItem>
                              <SelectItem value="hectare">Hectares</SelectItem>
                              <SelectItem value="gunta">Guntas</SelectItem>
                              <SelectItem value="cent">Cents</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="propertyDetails.registrationNumber"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Registration Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Property registration number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Insurance Details */}
              {categoryInfo?.category === 'insurance' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Insurance Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="insuranceDetails.policyNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Policy number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceDetails.insurer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Company</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., LIC, HDFC Life" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceDetails.sumAssured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sum Assured / Cover Amount</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="number"
                                placeholder="0"
                                className="pl-9"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceDetails.premium"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Premium Amount</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="number"
                                placeholder="0"
                                className="pl-9"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceDetails.premiumFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Premium Frequency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="half_yearly">Half Yearly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                              <SelectItem value="single">Single Premium</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceDetails.policyStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceDetails.policyEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Account / Reference Numbers */}
              <Card>
                <CardHeader>
                  <CardTitle>Reference & Tax</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account / Certificate Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Account or certificate number" {...field} />
                        </FormControl>
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
                          <Input placeholder="Nominee name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxSection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Section</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {taxSections.map((section) => (
                              <SelectItem key={section} value={section}>
                                Section {section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Tax benefit section if applicable</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="flex justify-end gap-4">
                <Link href="/assets">
                  <Button variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Adding...' : 'Add Asset'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  );
}
