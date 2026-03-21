'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, IndianRupee, Info } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const deductionSections = [
  { value: '80C', label: '80C - Life Insurance, PPF, ELSS, etc.', maxLimit: 150000 },
  { value: '80CCC', label: '80CCC - Pension Fund Contribution', maxLimit: 150000 },
  { value: '80CCD(1)', label: '80CCD(1) - Employee NPS', maxLimit: 150000 },
  { value: '80CCD(1B)', label: '80CCD(1B) - Additional NPS', maxLimit: 50000 },
  { value: '80CCD(2)', label: '80CCD(2) - Employer NPS', maxLimit: null },
  { value: '80D', label: '80D - Health Insurance', maxLimit: 100000 },
  { value: '80DD', label: '80DD - Disabled Dependent', maxLimit: 125000 },
  { value: '80DDB', label: '80DDB - Medical Treatment', maxLimit: 100000 },
  { value: '80E', label: '80E - Education Loan Interest', maxLimit: null },
  { value: '80EE', label: '80EE - Home Loan Interest (First Time)', maxLimit: 50000 },
  { value: '80EEA', label: '80EEA - Affordable Housing', maxLimit: 150000 },
  { value: '80G', label: '80G - Donations', maxLimit: null },
  { value: '80GG', label: '80GG - Rent Paid (No HRA)', maxLimit: 60000 },
  { value: '80TTA', label: '80TTA - Savings Interest', maxLimit: 10000 },
  { value: '80TTB', label: '80TTB - Senior Citizen Interest', maxLimit: 50000 },
  { value: '80U', label: '80U - Person with Disability', maxLimit: 125000 },
  { value: 'HRA', label: 'HRA Exemption', maxLimit: null },
  { value: 'LTA', label: 'Leave Travel Allowance', maxLimit: null },
  { value: 'PROFESSIONAL_TAX', label: 'Professional Tax', maxLimit: 2500 },
  { value: 'STANDARD_DEDUCTION', label: 'Standard Deduction', maxLimit: 75000 },
];

const taxSchema = z.object({
  financialYear: z.string().min(1, 'Financial year is required'),
  regime: z.enum(['old', 'new']),
  residentialStatus: z.enum(['resident', 'non_resident', 'rnor']),
  ageGroup: z.enum(['below_60', '60_to_80', 'above_80']),
  salaryIncome: z.number().min(0),
  housePropertyIncome: z.number(),
  capitalGains: z.object({
    shortTerm: z.number().min(0),
    longTerm: z.number().min(0),
  }),
  businessIncome: z.number(),
  otherIncome: z.number().min(0),
  agriculturalIncome: z.number().min(0),
  exemptIncome: z.number().min(0),
  deductions: z.array(z.object({
    section: z.string(),
    description: z.string().optional(),
    amount: z.number().min(0),
  })),
  tdsPaid: z.number().min(0),
  advanceTaxPaid: z.number().min(0),
  selfAssessmentTaxPaid: z.number().min(0),
  autoCalculate: z.boolean(),
});

type TaxFormValues = z.infer<typeof taxSchema>;

// Generate financial years
const financialYears = Array.from({ length: 5 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return `${year}-${(year + 1).toString().slice(-2)}`;
});

export default function NewTaxPage() {
  const router = useRouter();
  useSession(); // Ensure user is authenticated
  const queryClient = useQueryClient();

  const form = useForm<TaxFormValues>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      financialYear: financialYears[0],
      regime: 'new',
      residentialStatus: 'resident',
      ageGroup: 'below_60',
      salaryIncome: 0,
      housePropertyIncome: 0,
      capitalGains: { shortTerm: 0, longTerm: 0 },
      businessIncome: 0,
      otherIncome: 0,
      agriculturalIncome: 0,
      exemptIncome: 0,
      deductions: [],
      tdsPaid: 0,
      advanceTaxPaid: 0,
      selfAssessmentTaxPaid: 0,
      autoCalculate: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'deductions',
  });

  const selectedRegime = form.watch('regime');

  const createMutation = useMutation({
    mutationFn: async (data: TaxFormValues & { assessmentYear: string }) => {
      const response = await fetch('/api/tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create tax profile');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Tax profile created successfully');
      queryClient.invalidateQueries({ queryKey: ['tax-profiles'] });
      router.push('/tax');
    },
    onError: () => {
      toast.error('Failed to create tax profile');
    },
  });

  const onSubmit = (data: TaxFormValues) => {
    // Derive assessmentYear from financialYear: FY 2025-26 → AY 2026-27
    const fyStart = parseInt(data.financialYear.split('-')[0]);
    const assessmentYear = `${fyStart + 1}-${String(fyStart + 2).slice(-2)}`;
    createMutation.mutate({ ...data, assessmentYear });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tax">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Tax Year</h1>
          <p className="text-muted-foreground">
            Set up your tax profile for the financial year
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Select your tax regime and personal details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="financialYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Financial Year</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {financialYears.map((fy) => (
                          <SelectItem key={fy} value={fy}>FY {fy}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="regime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Regime</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select regime" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">New Regime (Default)</SelectItem>
                        <SelectItem value="old">Old Regime</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === 'new' 
                        ? 'Lower tax rates but limited deductions' 
                        : 'Higher rates but allows 80C, 80D, HRA, etc.'}
                    </FormDescription>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="resident">Resident</SelectItem>
                        <SelectItem value="non_resident">Non-Resident</SelectItem>
                        <SelectItem value="rnor">Resident but Not Ordinarily Resident</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ageGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age Group</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select age group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="below_60">Below 60 years</SelectItem>
                        <SelectItem value="60_to_80">60 to 80 years (Senior)</SelectItem>
                        <SelectItem value="above_80">Above 80 years (Super Senior)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="autoCalculate"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel>Auto Calculate Tax</FormLabel>
                      <FormDescription>
                        Automatically calculate tax based on your income transactions
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Income Details */}
          <Card>
            <CardHeader>
              <CardTitle>Income Details</CardTitle>
              <CardDescription>Enter your income from various sources</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="salary">
                  <AccordionTrigger>Salary Income</AccordionTrigger>
                  <AccordionContent className="grid gap-4 pt-4">
                    <FormField
                      control={form.control}
                      name="salaryIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gross Salary</FormLabel>
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="house">
                  <AccordionTrigger>House Property Income</AccordionTrigger>
                  <AccordionContent className="grid gap-4 pt-4">
                    <FormField
                      control={form.control}
                      name="housePropertyIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Net Rental Income (After 30% deduction)</FormLabel>
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
                          <FormDescription>
                            Can be negative if home loan interest exceeds rental income
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="capital">
                  <AccordionTrigger>Capital Gains</AccordionTrigger>
                  <AccordionContent className="grid gap-4 md:grid-cols-2 pt-4">
                    <FormField
                      control={form.control}
                      name="capitalGains.shortTerm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Short Term Capital Gains</FormLabel>
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
                          <FormDescription>Taxed at 20%</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="capitalGains.longTerm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Long Term Capital Gains</FormLabel>
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
                          <FormDescription>Taxed at 12.5% above ₹1.25L</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="business">
                  <AccordionTrigger>Business/Profession Income</AccordionTrigger>
                  <AccordionContent className="grid gap-4 pt-4">
                    <FormField
                      control={form.control}
                      name="businessIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Net Business Income</FormLabel>
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="other">
                  <AccordionTrigger>Other Income</AccordionTrigger>
                  <AccordionContent className="grid gap-4 md:grid-cols-2 pt-4">
                    <FormField
                      control={form.control}
                      name="otherIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interest, Dividends, etc.</FormLabel>
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
                      name="agriculturalIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agricultural Income</FormLabel>
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
                          <FormDescription>Exempt from tax</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="exemptIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Exempt Income</FormLabel>
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Deductions - Only for Old Regime */}
          {selectedRegime === 'old' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Deductions</CardTitle>
                    <CardDescription>Add your eligible deductions under various sections</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ section: '80C', description: '', amount: 0 })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Deduction
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No deductions added yet</p>
                    <p className="text-sm">Click &quot;Add Deduction&quot; to claim tax benefits</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid gap-4 md:grid-cols-12 items-end border-b pb-4">
                        <div className="md:col-span-4">
                          <FormField
                            control={form.control}
                            name={`deductions.${index}.section`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Section</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select section" />
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
                        </div>

                        <div className="md:col-span-4">
                          <FormField
                            control={form.control}
                            name={`deductions.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., LIC Premium" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="md:col-span-3">
                          <FormField
                            control={form.control}
                            name={`deductions.${index}.amount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Amount</FormLabel>
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
                        </div>

                        <div className="md:col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TDS & Advance Tax */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Payments</CardTitle>
              <CardDescription>Enter taxes already paid</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="tdsPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TDS Deducted</FormLabel>
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
                    <FormDescription>As per Form 26AS</FormDescription>
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
                name="selfAssessmentTaxPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Self Assessment Tax</FormLabel>
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
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link href="/tax">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Tax Profile'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
