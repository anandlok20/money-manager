'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const deductionSections = [
  { value: '80C', label: '80C - Investments', maxLimit: 150000 },
  { value: '80CCC', label: '80CCC - Pension Fund', maxLimit: 150000 },
  { value: '80CCD(1)', label: '80CCD(1) - NPS Employee', maxLimit: 150000 },
  { value: '80CCD(1B)', label: '80CCD(1B) - NPS Additional', maxLimit: 50000 },
  { value: '80CCD(2)', label: '80CCD(2) - NPS Employer', maxLimit: 0 },
  { value: '80D', label: '80D - Health Insurance', maxLimit: 100000 },
  { value: '80DD', label: '80DD - Disabled Dependent', maxLimit: 125000 },
  { value: '80DDB', label: '80DDB - Medical Treatment', maxLimit: 100000 },
  { value: '80E', label: '80E - Education Loan Interest', maxLimit: 0 },
  { value: '80EE', label: '80EE - Home Loan Interest (First Time)', maxLimit: 50000 },
  { value: '80EEA', label: '80EEA - Home Loan Interest (Affordable)', maxLimit: 150000 },
  { value: '80G', label: '80G - Donations', maxLimit: 0 },
  { value: '80GG', label: '80GG - Rent Paid (No HRA)', maxLimit: 60000 },
  { value: '80TTA', label: '80TTA - Savings Interest', maxLimit: 10000 },
  { value: '80TTB', label: '80TTB - Senior Citizen Interest', maxLimit: 50000 },
  { value: '80U', label: '80U - Disability', maxLimit: 125000 },
];

const taxSchema = z.object({
  regime: z.enum(['old', 'new']),
  status: z.enum(['draft', 'calculated', 'filed', 'verified']),
  residentialStatus: z.enum(['resident', 'non_resident', 'rnor']),
  salaryIncome: z.number().min(0),
  housePropertyIncome: z.number(),
  capitalGainsShortTerm: z.number().min(0),
  capitalGainsLongTerm: z.number().min(0),
  businessIncome: z.number(),
  otherIncome: z.number().min(0),
  exemptIncome: z.number().min(0),
  standardDeduction: z.number().min(0),
  hraExemption: z.number().min(0),
  deductions: z.array(z.object({
    section: z.string(),
    description: z.string().optional(),
    amount: z.number().min(0),
    maxLimit: z.number().min(0).optional(),
  })),
  tdsPaid: z.number().min(0),
  advanceTaxPaid: z.number().min(0),
  selfAssessmentTax: z.number().min(0),
  autoCalculate: z.boolean(),
  notes: z.string().optional(),
});

type TaxFormValues = z.infer<typeof taxSchema>;

async function fetchTaxProfile(id: string) {
  const response = await fetch(`/api/tax/${id}`);
  if (!response.ok) throw new Error('Failed to fetch tax profile');
  const result = await response.json();
  return result.data;
}

async function updateTaxProfile(id: string, data: TaxFormValues) {
  const payload = {
    regime: data.regime,
    status: data.status,
    residentialStatus: data.residentialStatus,
    salaryIncome: data.salaryIncome,
    housePropertyIncome: data.housePropertyIncome,
    capitalGains: {
      shortTerm: data.capitalGainsShortTerm,
      longTerm: data.capitalGainsLongTerm,
    },
    businessIncome: data.businessIncome,
    otherIncome: data.otherIncome,
    exemptIncome: data.exemptIncome,
    standardDeduction: data.standardDeduction,
    hraExemption: data.hraExemption,
    deductions: data.deductions,
    tdsPaid: data.tdsPaid,
    advanceTaxPaid: data.advanceTaxPaid,
    selfAssessmentTax: data.selfAssessmentTax,
    autoCalculate: data.autoCalculate,
    notes: data.notes,
  };

  const response = await fetch(`/api/tax/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update tax profile');
  return response.json();
}

export default function EditTaxProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['tax-profile', id],
    queryFn: () => fetchTaxProfile(id),
  });

  const form = useForm<TaxFormValues>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      regime: 'new',
      status: 'draft',
      residentialStatus: 'resident',
      salaryIncome: 0,
      housePropertyIncome: 0,
      capitalGainsShortTerm: 0,
      capitalGainsLongTerm: 0,
      businessIncome: 0,
      otherIncome: 0,
      exemptIncome: 0,
      standardDeduction: 75000,
      hraExemption: 0,
      deductions: [],
      tdsPaid: 0,
      advanceTaxPaid: 0,
      selfAssessmentTax: 0,
      autoCalculate: true,
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'deductions',
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        regime: profile.regime,
        status: profile.status,
        residentialStatus: profile.residentialStatus,
        salaryIncome: profile.salaryIncome || 0,
        housePropertyIncome: profile.housePropertyIncome || 0,
        capitalGainsShortTerm: profile.capitalGains?.shortTerm || 0,
        capitalGainsLongTerm: profile.capitalGains?.longTerm || 0,
        businessIncome: profile.businessIncome || 0,
        otherIncome: profile.otherIncome || 0,
        exemptIncome: profile.exemptIncome || 0,
        standardDeduction: profile.standardDeduction || 75000,
        hraExemption: profile.hraExemption || 0,
        deductions: profile.deductions || [],
        tdsPaid: profile.tdsPaid || 0,
        advanceTaxPaid: profile.advanceTaxPaid || 0,
        selfAssessmentTax: profile.selfAssessmentTax || 0,
        autoCalculate: profile.autoCalculate ?? true,
        notes: profile.notes || '',
      });
    }
  }, [profile, form]);

  const mutation = useMutation({
    mutationFn: (data: TaxFormValues) => updateTaxProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['tax-profile', id] });
      toast.success('Tax profile updated');
      router.push(`/tax/${id}`);
    },
    onError: () => {
      toast.error('Failed to update tax profile');
    },
  });

  const handleAddDeduction = () => {
    append({ section: '80C', description: '', amount: 0, maxLimit: 150000 });
  };

  const handleSectionChange = (index: number, section: string) => {
    const sectionInfo = deductionSections.find(s => s.value === section);
    if (sectionInfo) {
      form.setValue(`deductions.${index}.maxLimit`, sectionInfo.maxLimit);
    }
  };

  const onSubmit = (data: TaxFormValues) => {
    mutation.mutate(data);
  };

  const regime = form.watch('regime');

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Tax profile not found</p>
            <Button asChild className="mt-4">
              <Link href="/tax">Back to Tax Profiles</Link>
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
            <Link href={`/tax/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Tax Profile</h1>
            <p className="text-muted-foreground">FY {profile.financialYear} (AY {profile.assessmentYear})</p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="deductions">Deductions</TabsTrigger>
              <TabsTrigger value="taxes">Taxes Paid</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="regime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Regime</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="new">New Regime</SelectItem>
                              <SelectItem value="old">Old Regime</SelectItem>
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
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="calculated">Calculated</SelectItem>
                              <SelectItem value="filed">Filed</SelectItem>
                              <SelectItem value="verified">Verified</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="residentialStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Residential Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="resident">Resident</SelectItem>
                              <SelectItem value="non_resident">Non-Resident</SelectItem>
                              <SelectItem value="rnor">RNOR</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="autoCalculate"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>Auto Calculate</FormLabel>
                          <FormDescription className="text-xs">
                            Automatically recalculate tax on save
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="income" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Income from Salary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="salaryIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gross Salary Income</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="standardDeduction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Standard Deduction</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>₹75,000 for FY 2025-26</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hraExemption"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HRA Exemption</FormLabel>
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

              <Card>
                <CardHeader>
                  <CardTitle>Other Income Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="housePropertyIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Income from House Property</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>Can be negative for loss</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="capitalGainsShortTerm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capital Gains (Short Term)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="capitalGainsLongTerm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capital Gains (Long Term)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="businessIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business/Professional Income</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="otherIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Income</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>Interest, dividends, etc.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="exemptIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exempt Income</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>Agricultural, etc.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deductions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Section-wise Deductions</CardTitle>
                  <CardDescription>
                    {regime === 'new' 
                      ? 'Note: Most deductions are not available under New Tax Regime'
                      : 'Add deductions under various sections (Old Regime)'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Deduction {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`deductions.${index}.section`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Section</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  handleSectionChange(index, value);
                                }}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {deductionSections.map((section) => (
                                    <SelectItem key={section.value} value={section.value}>
                                      {section.label}
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
                          name={`deductions.${index}.amount`}
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
                      </div>

                      <FormField
                        control={form.control}
                        name={`deductions.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., PPF, ELSS, LIC Premium" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddDeduction}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Deduction
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="taxes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Taxes Already Paid</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tdsPaid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TDS Paid</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>Tax Deducted at Source by employer/others</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="advanceTaxPaid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Advance Tax Paid</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>Quarterly advance tax payments</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="selfAssessmentTax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Self Assessment Tax</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>Tax paid at time of filing return</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

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
            </TabsContent>
          </Tabs>

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
