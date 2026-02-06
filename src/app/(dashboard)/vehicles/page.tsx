'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { format, differenceInDays, isPast, isFuture, addDays } from 'date-fns';
import {
  Car,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  FileText,
  Calendar,
  Fuel,
  Gauge,
  Hash,
  Bell,
  MapPin,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

interface Vehicle {
  _id: string;
  vehicleType: 'two_wheeler' | 'three_wheeler' | 'four_wheeler' | 'commercial' | 'heavy_vehicle';
  make: string;
  model: string;
  variant?: string;
  year: number;
  registrationNumber: string;
  registrationDate?: string;
  registrationExpiry?: string;
  engineNumber?: string;
  chassisNumber?: string;
  fuelType: 'petrol' | 'diesel' | 'cng' | 'lpg' | 'electric' | 'hybrid';
  color?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  odometerReading?: number;
  insurance?: {
    policyNumber?: string;
    insurer?: string;
    type?: string;
    premium?: number;
    startDate?: string;
    expiryDate?: string;
    idv?: number;
  };
  puc?: {
    certificateNumber?: string;
    issueDate?: string;
    expiryDate?: string;
  };
  fitness?: {
    certificateNumber?: string;
    issueDate?: string;
    expiryDate?: string;
  };
  permit?: {
    type?: string;
    number?: string;
    expiryDate?: string;
  };
  status: 'active' | 'sold' | 'scrapped';
}

interface ExpiringDocument {
  vehicleId: string;
  vehicleName: string;
  registrationNumber: string;
  documentType: string;
  expiryDate: string;
  daysRemaining: number;
}

async function fetchVehicles(): Promise<{ data: Vehicle[]; expiringDocuments: ExpiringDocument[] }> {
  const response = await fetch('/api/vehicles');
  if (!response.ok) throw new Error('Failed to fetch vehicles');
  return response.json();
}

const vehicleTypeIcons: Record<string, React.ElementType> = {
  two_wheeler: Gauge,
  three_wheeler: Car,
  four_wheeler: Car,
  commercial: Car,
  heavy_vehicle: Car,
};

const vehicleTypeLabels: Record<string, string> = {
  two_wheeler: 'Two Wheeler',
  three_wheeler: 'Three Wheeler',
  four_wheeler: 'Four Wheeler',
  commercial: 'Commercial',
  heavy_vehicle: 'Heavy Vehicle',
};

const fuelTypeColors: Record<string, string> = {
  petrol: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  diesel: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  cng: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  lpg: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  electric: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  hybrid: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  sold: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  scrapped: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function VehiclesPage() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: fetchVehicles,
  });

  const vehicles = data?.data || [];
  const expiringDocuments = data?.expiringDocuments || [];

  const filteredVehicles = statusFilter && statusFilter !== 'all'
    ? vehicles.filter((v) => v.status === statusFilter)
    : vehicles;

  // Count alerts
  const criticalAlerts = expiringDocuments.filter((d) => d.daysRemaining <= 0).length;
  const warningAlerts = expiringDocuments.filter((d) => d.daysRemaining > 0 && d.daysRemaining <= 7).length;
  const upcomingAlerts = expiringDocuments.filter((d) => d.daysRemaining > 7 && d.daysRemaining <= 30).length;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Failed to load vehicles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Vehicles</h1>
          <p className="text-muted-foreground">
            Manage your vehicles and track document expiry
          </p>
        </div>
        <Link href="/vehicles/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      {/* Expiry Alerts */}
      {expiringDocuments.length > 0 && (
        <Alert variant={criticalAlerts > 0 ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Document Expiry Alerts</AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap gap-4 mt-2">
              {criticalAlerts > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {criticalAlerts} Expired
                </Badge>
              )}
              {warningAlerts > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 gap-1">
                  <Clock className="h-3 w-3" />
                  {warningAlerts} Expiring this week
                </Badge>
              )}
              {upcomingAlerts > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Bell className="h-3 w-3" />
                  {upcomingAlerts} Expiring in 30 days
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Expiry List */}
      {expiringDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Upcoming Renewals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringDocuments.slice(0, 5).map((doc, idx) => (
                <div
                  key={`${doc.vehicleId}-${doc.documentType}-${idx}`}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    doc.daysRemaining <= 0
                      ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                      : doc.daysRemaining <= 7
                      ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      doc.daysRemaining <= 0 ? 'bg-red-100 dark:bg-red-900' : 'bg-muted'
                    }`}>
                      {doc.documentType === 'insurance' ? (
                        <Shield className="h-4 w-4" />
                      ) : doc.documentType === 'puc' ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <Calendar className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{doc.vehicleName}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.registrationNumber} • {doc.documentType.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      doc.daysRemaining <= 0 ? 'text-red-600' : doc.daysRemaining <= 7 ? 'text-yellow-600' : ''
                    }`}>
                      {doc.daysRemaining <= 0
                        ? `Expired ${Math.abs(doc.daysRemaining)} days ago`
                        : `${doc.daysRemaining} days left`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(doc.expiryDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vehicles</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="scrapped">Scrapped</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Vehicles List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : filteredVehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles found"
          description={statusFilter && statusFilter !== 'all' ? `No ${statusFilter} vehicles` : 'Add your first vehicle to get started'}
          actionLabel="Add Vehicle"
          actionHref="/vehicles/new"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredVehicles.map((vehicle) => {
            const VehicleIcon = vehicleTypeIcons[vehicle.vehicleType] || Car;
            const vehicleAlerts = expiringDocuments.filter(
              (d) => d.vehicleId === vehicle._id && d.daysRemaining <= 30
            );

            return (
              <Card key={vehicle._id} className={vehicleAlerts.some(a => a.daysRemaining <= 0) ? 'border-red-300 dark:border-red-800' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <VehicleIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {vehicle.make} {vehicle.model}
                          {vehicleAlerts.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {vehicleAlerts.length} alerts
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          {vehicle.variant && <span>{vehicle.variant}</span>}
                          <span>• {vehicle.year}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={statusColors[vehicle.status]}>
                      {vehicle.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Registration & Basic Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Registration</p>
                        <p className="font-mono font-semibold">{vehicle.registrationNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Fuel Type</p>
                        <Badge className={fuelTypeColors[vehicle.fuelType]}>
                          {vehicle.fuelType}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Document Status */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Insurance */}
                    <div className={`p-2 rounded-lg text-center ${
                      vehicle.insurance?.expiryDate && isPast(new Date(vehicle.insurance.expiryDate))
                        ? 'bg-red-100 dark:bg-red-950'
                        : vehicle.insurance?.expiryDate
                        ? 'bg-green-100 dark:bg-green-950'
                        : 'bg-muted'
                    }`}>
                      <Shield className="h-4 w-4 mx-auto mb-1" />
                      <p className="text-xs font-medium">Insurance</p>
                      {vehicle.insurance?.expiryDate ? (
                        <p className="text-xs">
                          {isPast(new Date(vehicle.insurance.expiryDate)) ? 'Expired' : format(new Date(vehicle.insurance.expiryDate), 'MMM yy')}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not added</p>
                      )}
                    </div>

                    {/* PUC */}
                    <div className={`p-2 rounded-lg text-center ${
                      vehicle.puc?.expiryDate && isPast(new Date(vehicle.puc.expiryDate))
                        ? 'bg-red-100 dark:bg-red-950'
                        : vehicle.puc?.expiryDate
                        ? 'bg-green-100 dark:bg-green-950'
                        : 'bg-muted'
                    }`}>
                      <FileText className="h-4 w-4 mx-auto mb-1" />
                      <p className="text-xs font-medium">PUC</p>
                      {vehicle.puc?.expiryDate ? (
                        <p className="text-xs">
                          {isPast(new Date(vehicle.puc.expiryDate)) ? 'Expired' : format(new Date(vehicle.puc.expiryDate), 'MMM yy')}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not added</p>
                      )}
                    </div>

                    {/* Registration */}
                    <div className={`p-2 rounded-lg text-center ${
                      vehicle.registrationExpiry && isPast(new Date(vehicle.registrationExpiry))
                        ? 'bg-red-100 dark:bg-red-950'
                        : vehicle.registrationExpiry
                        ? 'bg-green-100 dark:bg-green-950'
                        : 'bg-muted'
                    }`}>
                      <CreditCard className="h-4 w-4 mx-auto mb-1" />
                      <p className="text-xs font-medium">RC</p>
                      {vehicle.registrationExpiry ? (
                        <p className="text-xs">
                          {isPast(new Date(vehicle.registrationExpiry)) ? 'Expired' : format(new Date(vehicle.registrationExpiry), 'MMM yy')}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">-</p>
                      )}
                    </div>
                  </div>

                  {/* Value & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      {vehicle.currentValue && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Value: </span>
                          <span className="font-semibold">{formatCurrency(vehicle.currentValue, currency)}</span>
                        </p>
                      )}
                      {vehicle.odometerReading && (
                        <p className="text-xs text-muted-foreground">
                          {vehicle.odometerReading.toLocaleString()} km
                        </p>
                      )}
                    </div>
                    <Link href={`/vehicles/${vehicle._id}`}>
                      <Button size="sm">View Details</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Challan Check Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Traffic Challan Check
          </CardTitle>
          <CardDescription>
            Check pending traffic challans for your vehicles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <p className="text-sm text-muted-foreground flex-1">
              You can check pending e-challans on official government portals like{' '}
              <a
                href="https://echallan.parivahan.gov.in/index/accused-challan"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                echallan.parivahan.gov.in
              </a>{' '}
              or state-specific traffic police websites.
            </p>
            <Button
              variant="outline"
              onClick={() => window.open('https://echallan.parivahan.gov.in/index/accused-challan', '_blank')}
            >
              Check Challans
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
