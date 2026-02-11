'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Car,
  Calendar,
  Shield,
  FileCheck,
  AlertTriangle,
  Loader2,
  Fuel,
  IndianRupee,
  Gauge,
  Building2,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const vehicleTypeLabels: Record<string, string> = {
  two_wheeler: 'Two Wheeler',
  three_wheeler: 'Three Wheeler',
  four_wheeler: 'Four Wheeler',
  commercial: 'Commercial',
  heavy_vehicle: 'Heavy Vehicle',
};

const fuelTypeLabels: Record<string, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  cng: 'CNG',
  lpg: 'LPG',
  electric: 'Electric',
  hybrid: 'Hybrid',
};

interface Vehicle {
  _id: string;
  vehicleType: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  color: string;
  registrationNumber: string;
  registrationDate?: string;
  registrationValidUntil?: string;
  rtoCode?: string;
  engineNumber?: string;
  chassisNumber?: string;
  fuelType: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  showroomName?: string;
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
  insuranceType?: string;
  insuranceStartDate?: string;
  insuranceEndDate?: string;
  insurancePremium?: number;
  pucNumber?: string;
  pucIssueDate?: string;
  pucExpiryDate?: string;
  fitnessValidUntil?: string;
  hasLoan?: boolean;
  loanProvider?: string;
  loanAccountNumber?: string;
  loanAmount?: number;
  emiAmount?: number;
  loanStartDate?: string;
  loanEndDate?: string;
  permitNumber?: string;
  permitType?: string;
  permitValidUntil?: string;
  currentOdometer?: number;
  lastServiceOdometer?: number;
  nextServiceOdometer?: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  status: string;
  notes?: string;
}

async function fetchVehicle(id: string): Promise<Vehicle> {
  const response = await fetch(`/api/vehicles/${id}`);
  if (!response.ok) throw new Error('Failed to fetch vehicle');
  const result = await response.json();
  return result.data;
}

async function deleteVehicle(id: string) {
  const response = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete vehicle');
  return response.json();
}

function ExpiryAlert({ label, date }: { label: string; date?: string }) {
  if (!date) return null;
  const daysLeft = differenceInDays(new Date(date), new Date());
  
  if (daysLeft < 0) {
    return (
      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span>{label}</span>
        </div>
        <Badge variant="destructive">Expired</Badge>
      </div>
    );
  }
  
  if (daysLeft <= 30) {
    return (
      <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <span>{label}</span>
        </div>
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
          {daysLeft} days left
        </Badge>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
      <div className="flex items-center gap-2">
        <FileCheck className="h-5 w-5 text-green-500" />
        <span>{label}</span>
      </div>
      <Badge variant="outline" className="bg-green-100 text-green-800">
        Valid until {format(new Date(date), 'MMM dd, yyyy')}
      </Badge>
    </div>
  );
}

export default function VehicleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: vehicle, isLoading, error } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => fetchVehicle(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle deleted successfully');
      router.push('/vehicles');
    },
    onError: () => {
      toast.error('Failed to delete vehicle');
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

  if (error || !vehicle) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'sold':
        return 'bg-gray-100 text-gray-800';
      case 'scrapped':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="flex-shrink-0 mt-1">
            <Link href="/vehicles" aria-label="Back to vehicles">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold break-words">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              <Badge className={getStatusColor(vehicle.status)}>
                {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-1 text-sm">
              <Car className="h-4 w-4 flex-shrink-0" />
              <span className="font-mono">{vehicle.registrationNumber}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 ml-10 sm:ml-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/vehicles/${id}/edit`}>
              <Edit className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this vehicle? This action cannot be undone.
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

      {/* Expiry Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Document Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ExpiryAlert label="Insurance" date={vehicle.insuranceEndDate} />
          <ExpiryAlert label="PUC Certificate" date={vehicle.pucExpiryDate} />
          <ExpiryAlert label="Fitness Certificate" date={vehicle.fitnessValidUntil} />
          <ExpiryAlert label="Registration" date={vehicle.registrationValidUntil} />
          {vehicle.permitValidUntil && (
            <ExpiryAlert label="Permit" date={vehicle.permitValidUntil} />
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="details" className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="inline-flex w-auto min-w-full sm:w-full">
            <TabsTrigger value="details" className="flex-shrink-0">Details</TabsTrigger>
            <TabsTrigger value="insurance" className="flex-shrink-0">Insurance</TabsTrigger>
            <TabsTrigger value="documents" className="flex-shrink-0">Documents</TabsTrigger>
            {vehicle.hasLoan && <TabsTrigger value="loan" className="flex-shrink-0">Loan</TabsTrigger>}
            <TabsTrigger value="service" className="flex-shrink-0">Service</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Vehicle Type</p>
                  <p className="font-medium">{vehicleTypeLabels[vehicle.vehicleType] || vehicle.vehicleType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Color</p>
                  <p className="font-medium">{vehicle.color}</p>
                </div>
                {vehicle.variant && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Variant</p>
                    <p className="font-medium">{vehicle.variant}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Fuel className="h-4 w-4" /> Fuel Type
                  </p>
                  <p className="font-medium">{fuelTypeLabels[vehicle.fuelType] || vehicle.fuelType}</p>
                </div>
                {vehicle.engineNumber && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Engine Number</p>
                    <p className="font-medium font-mono">{vehicle.engineNumber}</p>
                  </div>
                )}
                {vehicle.chassisNumber && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Chassis Number</p>
                    <p className="font-medium font-mono">{vehicle.chassisNumber}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                {vehicle.purchaseDate && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> Purchase Date
                    </p>
                    <p className="font-medium">{format(new Date(vehicle.purchaseDate), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                {vehicle.purchasePrice && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <IndianRupee className="h-4 w-4" /> Purchase Price
                    </p>
                    <p className="font-medium">{formatCurrency(vehicle.purchasePrice)}</p>
                  </div>
                )}
                {vehicle.currentValue && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current Value</p>
                    <p className="font-medium">{formatCurrency(vehicle.currentValue)}</p>
                  </div>
                )}
                {vehicle.showroomName && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-4 w-4" /> Showroom
                    </p>
                    <p className="font-medium">{vehicle.showroomName}</p>
                  </div>
                )}
              </div>

              {vehicle.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="whitespace-pre-wrap">{vehicle.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Insurance Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vehicle.insuranceCompany ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Insurance Company</p>
                    <p className="font-medium">{vehicle.insuranceCompany}</p>
                  </div>
                  {vehicle.insurancePolicyNumber && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Policy Number</p>
                      <p className="font-medium font-mono">{vehicle.insurancePolicyNumber}</p>
                    </div>
                  )}
                  {vehicle.insuranceType && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Insurance Type</p>
                      <p className="font-medium">{vehicle.insuranceType}</p>
                    </div>
                  )}
                  {vehicle.insurancePremium && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Annual Premium</p>
                      <p className="font-medium">{formatCurrency(vehicle.insurancePremium)}</p>
                    </div>
                  )}
                  {vehicle.insuranceStartDate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">{format(new Date(vehicle.insuranceStartDate), 'MMM dd, yyyy')}</p>
                    </div>
                  )}
                  {vehicle.insuranceEndDate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">{format(new Date(vehicle.insuranceEndDate), 'MMM dd, yyyy')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No insurance details added</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Documents & Certificates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {vehicle.registrationDate && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Registration Date</p>
                    <p className="font-medium">{format(new Date(vehicle.registrationDate), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                {vehicle.rtoCode && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">RTO Code</p>
                    <p className="font-medium">{vehicle.rtoCode}</p>
                  </div>
                )}
                {vehicle.pucNumber && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">PUC Number</p>
                    <p className="font-medium font-mono">{vehicle.pucNumber}</p>
                  </div>
                )}
                {vehicle.pucIssueDate && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">PUC Issue Date</p>
                    <p className="font-medium">{format(new Date(vehicle.pucIssueDate), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                {vehicle.permitNumber && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Permit Number</p>
                    <p className="font-medium font-mono">{vehicle.permitNumber}</p>
                  </div>
                )}
                {vehicle.permitType && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Permit Type</p>
                    <p className="font-medium">{vehicle.permitType}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {vehicle.hasLoan && (
          <TabsContent value="loan">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Loan Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {vehicle.loanProvider && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Loan Provider</p>
                      <p className="font-medium">{vehicle.loanProvider}</p>
                    </div>
                  )}
                  {vehicle.loanAccountNumber && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Account Number</p>
                      <p className="font-medium font-mono">{vehicle.loanAccountNumber}</p>
                    </div>
                  )}
                  {vehicle.loanAmount && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Loan Amount</p>
                      <p className="font-medium">{formatCurrency(vehicle.loanAmount)}</p>
                    </div>
                  )}
                  {vehicle.emiAmount && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Monthly EMI</p>
                      <p className="font-medium">{formatCurrency(vehicle.emiAmount)}</p>
                    </div>
                  )}
                  {vehicle.loanStartDate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">{format(new Date(vehicle.loanStartDate), 'MMM dd, yyyy')}</p>
                    </div>
                  )}
                  {vehicle.loanEndDate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">{format(new Date(vehicle.loanEndDate), 'MMM dd, yyyy')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="service">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {vehicle.currentOdometer && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current Odometer</p>
                    <p className="font-medium">{vehicle.currentOdometer.toLocaleString()} km</p>
                  </div>
                )}
                {vehicle.lastServiceDate && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Last Service Date</p>
                    <p className="font-medium">{format(new Date(vehicle.lastServiceDate), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                {vehicle.lastServiceOdometer && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Last Service Odometer</p>
                    <p className="font-medium">{vehicle.lastServiceOdometer.toLocaleString()} km</p>
                  </div>
                )}
                {vehicle.nextServiceDate && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Next Service Date</p>
                    <p className="font-medium">{format(new Date(vehicle.nextServiceDate), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                {vehicle.nextServiceOdometer && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Next Service Odometer</p>
                    <p className="font-medium">{vehicle.nextServiceOdometer.toLocaleString()} km</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
