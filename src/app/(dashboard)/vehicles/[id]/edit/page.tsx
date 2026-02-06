'use client';

import { use, useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

const vehicleTypes = [
  { value: 'two_wheeler', label: 'Two Wheeler (Bike/Scooter)' },
  { value: 'three_wheeler', label: 'Three Wheeler (Auto)' },
  { value: 'four_wheeler', label: 'Four Wheeler (Car)' },
  { value: 'commercial', label: 'Commercial Vehicle' },
  { value: 'heavy_vehicle', label: 'Heavy Vehicle (Truck/Bus)' },
];

const fuelTypes = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'cng', label: 'CNG' },
  { value: 'lpg', label: 'LPG' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
];

const vehicleSchema = z.object({
  vehicleType: z.enum(['two_wheeler', 'three_wheeler', 'four_wheeler', 'commercial', 'heavy_vehicle']),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  variant: z.string().optional(),
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  color: z.string().optional(),
  registrationNumber: z.string().min(1, 'Registration number is required'),
  registrationDate: z.string().optional(),
  registrationValidUntil: z.string().optional(),
  rtoCode: z.string().optional(),
  engineNumber: z.string().optional(),
  chassisNumber: z.string().optional(),
  fuelType: z.enum(['petrol', 'diesel', 'cng', 'lpg', 'electric', 'hybrid']),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  showroomName: z.string().optional(),
  // Insurance
  insuranceCompany: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insuranceType: z.string().optional(),
  insuranceStartDate: z.string().optional(),
  insuranceEndDate: z.string().optional(),
  insurancePremium: z.number().min(0).optional(),
  // PUC
  pucNumber: z.string().optional(),
  pucIssueDate: z.string().optional(),
  pucExpiryDate: z.string().optional(),
  // Fitness
  fitnessValidUntil: z.string().optional(),
  // Permit
  permitNumber: z.string().optional(),
  permitType: z.string().optional(),
  permitValidUntil: z.string().optional(),
  // Loan
  hasLoan: z.boolean().optional(),
  loanProvider: z.string().optional(),
  loanAccountNumber: z.string().optional(),
  loanAmount: z.number().min(0).optional(),
  emiAmount: z.number().min(0).optional(),
  loanStartDate: z.string().optional(),
  loanEndDate: z.string().optional(),
  // Service
  currentOdometer: z.number().min(0).optional(),
  lastServiceOdometer: z.number().min(0).optional(),
  nextServiceOdometer: z.number().min(0).optional(),
  lastServiceDate: z.string().optional(),
  nextServiceDate: z.string().optional(),
  status: z.string().min(1),
  notes: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

async function fetchVehicle(id: string) {
  const response = await fetch(`/api/vehicles/${id}`);
  if (!response.ok) throw new Error('Failed to fetch vehicle');
  const result = await response.json();
  return result.data;
}

async function updateVehicle(id: string, data: VehicleFormValues) {
  const response = await fetch(`/api/vehicles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update vehicle');
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

export default function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => fetchVehicle(id),
  });

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicleType: 'four_wheeler',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      registrationNumber: '',
      fuelType: 'petrol',
      status: 'active',
      hasLoan: false,
    },
  });

  useEffect(() => {
    if (vehicle) {
      form.reset({
        vehicleType: vehicle.vehicleType,
        make: vehicle.make,
        model: vehicle.model,
        variant: vehicle.variant || '',
        year: vehicle.year,
        color: vehicle.color,
        registrationNumber: vehicle.registrationNumber,
        registrationDate: formatDateForInput(vehicle.registrationDate),
        registrationValidUntil: formatDateForInput(vehicle.registrationValidUntil),
        rtoCode: vehicle.rtoCode || '',
        engineNumber: vehicle.engineNumber || '',
        chassisNumber: vehicle.chassisNumber || '',
        fuelType: vehicle.fuelType,
        purchaseDate: formatDateForInput(vehicle.purchaseDate),
        purchasePrice: vehicle.purchasePrice || 0,
        currentValue: vehicle.currentValue || 0,
        showroomName: vehicle.showroomName || '',
        insuranceCompany: vehicle.insuranceCompany || '',
        insurancePolicyNumber: vehicle.insurancePolicyNumber || '',
        insuranceType: vehicle.insuranceType || '',
        insuranceStartDate: formatDateForInput(vehicle.insuranceStartDate),
        insuranceEndDate: formatDateForInput(vehicle.insuranceEndDate),
        insurancePremium: vehicle.insurancePremium || 0,
        pucNumber: vehicle.pucNumber || '',
        pucIssueDate: formatDateForInput(vehicle.pucIssueDate),
        pucExpiryDate: formatDateForInput(vehicle.pucExpiryDate),
        fitnessValidUntil: formatDateForInput(vehicle.fitnessValidUntil),
        permitNumber: vehicle.permitNumber || '',
        permitType: vehicle.permitType || '',
        permitValidUntil: formatDateForInput(vehicle.permitValidUntil),
        hasLoan: vehicle.hasLoan || false,
        loanProvider: vehicle.loanProvider || '',
        loanAccountNumber: vehicle.loanAccountNumber || '',
        loanAmount: vehicle.loanAmount || 0,
        emiAmount: vehicle.emiAmount || 0,
        loanStartDate: formatDateForInput(vehicle.loanStartDate),
        loanEndDate: formatDateForInput(vehicle.loanEndDate),
        currentOdometer: vehicle.currentOdometer || 0,
        lastServiceOdometer: vehicle.lastServiceOdometer || 0,
        nextServiceOdometer: vehicle.nextServiceOdometer || 0,
        lastServiceDate: formatDateForInput(vehicle.lastServiceDate),
        nextServiceDate: formatDateForInput(vehicle.nextServiceDate),
        status: vehicle.status,
        notes: vehicle.notes || '',
      });
    }
  }, [vehicle, form]);

  const mutation = useMutation({
    mutationFn: (data: VehicleFormValues) => updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      toast.success('Vehicle updated successfully');
      router.push(`/vehicles/${id}`);
    },
    onError: () => {
      toast.error('Failed to update vehicle');
    },
  });

  const onSubmit = (data: VehicleFormValues) => {
    mutation.mutate(data);
  };

  const hasLoan = form.watch('hasLoan');

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Vehicle not found</p>
            <Button asChild className="mt-4">
              <Link href="/vehicles">Back to Vehicles</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/vehicles/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Edit Vehicle</h1>
        </div>
        <p className="text-muted-foreground ml-12">Update vehicle details</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="basic" className="space-y-4">
            <div className="overflow-x-auto -mx-4 px-4 pb-2">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5">
                <TabsTrigger value="basic" className="flex-shrink-0 px-4">Basic</TabsTrigger>
                <TabsTrigger value="registration" className="flex-shrink-0 px-4">Registration</TabsTrigger>
                <TabsTrigger value="insurance" className="flex-shrink-0 px-4">Insurance</TabsTrigger>
                <TabsTrigger value="documents" className="flex-shrink-0 px-4">Documents</TabsTrigger>
                <TabsTrigger value="other" className="flex-shrink-0 px-4">Other</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Vehicle identification details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="vehicleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vehicleTypes.map((type) => (
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
                              <SelectItem value="sold">Sold</SelectItem>
                              <SelectItem value="scrapped">Scrapped</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="make"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Maruti Suzuki" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Swift" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="variant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variant</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., ZXI+" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year *</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., White" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fuelType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuel Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {fuelTypes.map((type) => (
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
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="engineNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Engine Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="chassisNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chassis Number</FormLabel>
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
            </TabsContent>

            <TabsContent value="registration">
              <Card>
                <CardHeader>
                  <CardTitle>Registration Details</CardTitle>
                  <CardDescription>Vehicle registration information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="registrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Number *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., MH01AB1234" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rtoCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RTO Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., MH01" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="registrationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="registrationValidUntil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Valid Until</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
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
                      name="purchasePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Price</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="showroomName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Showroom Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insurance">
              <Card>
                <CardHeader>
                  <CardTitle>Insurance Details</CardTitle>
                  <CardDescription>Vehicle insurance information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="insuranceCompany"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Company</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="insurancePolicyNumber"
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
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="insuranceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="comprehensive">Comprehensive</SelectItem>
                              <SelectItem value="third_party">Third Party</SelectItem>
                              <SelectItem value="own_damage">Own Damage</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="insurancePremium"
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
                      name="insuranceStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="insuranceEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>PUC, Fitness & Permit details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* PUC */}
                  <div>
                    <h4 className="font-medium mb-3">PUC Certificate</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="pucNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PUC Number</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pucIssueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Issue Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pucExpiryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiry Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Fitness */}
                  <div>
                    <h4 className="font-medium mb-3">Fitness Certificate</h4>
                    <FormField
                      control={form.control}
                      name="fitnessValidUntil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid Until</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="max-w-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Permit */}
                  <div>
                    <h4 className="font-medium mb-3">Permit (Commercial Vehicles)</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="permitNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Permit Number</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="permitType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Permit Type</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., National, State" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="permitValidUntil"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valid Until</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="other">
              <div className="space-y-4">
                {/* Loan */}
                <Card>
                  <CardHeader>
                    <CardTitle>Loan Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="hasLoan"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Vehicle has a loan</FormLabel>
                        </FormItem>
                      )}
                    />

                    {hasLoan && (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="loanProvider"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Loan Provider</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="loanAccountNumber"
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
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="loanAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Loan Amount</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="emiAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>EMI Amount</FormLabel>
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
                            name="loanStartDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="loanEndDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Service */}
                <Card>
                  <CardHeader>
                    <CardTitle>Service Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="currentOdometer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Odometer (km)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastServiceOdometer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Service (km)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nextServiceOdometer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Next Service (km)</FormLabel>
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
                        name="lastServiceDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Service Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nextServiceDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Next Service Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
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
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-4 mt-6">
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
