'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';
import {
  Plane,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/currency';

interface TripTraveler {
  name: string;
  phone?: string;
  email?: string;
  memberId?: string;
  isOrganizer?: boolean;
}

interface Trip {
  _id: string;
  name: string;
  description?: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  totalExpenses: number;
  totalIncome: number;
  travelers?: (string | TripTraveler)[];
  coverImage?: string;
}

async function fetchTrips(): Promise<{ data: Trip[] }> {
  const response = await fetch('/api/trips?includeStats=true');
  if (!response.ok) throw new Error('Failed to fetch trips');
  return response.json();
}

async function deleteTrip(id: string) {
  const response = await fetch(`/api/trips/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete trip');
  return response.json();
}

const statusColors = {
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ongoing: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function TripsPage() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => {
      toast.success('Trip deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: () => {
      toast.error('Failed to delete trip');
    },
  });

  const trips = data?.data || [];
  const filteredTrips = activeTab === 'all' 
    ? trips 
    : trips.filter((t) => t.status === activeTab);

  const getTripStatus = (trip: Trip) => {
    const today = new Date();
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);

    if (trip.status === 'cancelled') return 'cancelled';
    if (isBefore(today, start)) return 'planned';
    if (isAfter(today, end)) return 'completed';
    return 'ongoing';
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Failed to load trips</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trips</h1>
          <p className="text-muted-foreground">
            Track expenses for your travels
          </p>
        </div>
        <Link href="/trips/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Plan New Trip
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="planned">Planned</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : filteredTrips.length === 0 ? (
            <EmptyState
              icon={Plane}
              title="No trips found"
              description="Start planning your next adventure!"
              actionLabel="Plan New Trip"
              actionHref="/trips/new"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTrips.map((trip) => {
                const currentStatus = getTripStatus(trip);
                const budgetUsed = (trip.totalExpenses / trip.budget) * 100;
                const daysLeft = differenceInDays(new Date(trip.endDate), new Date());

                return (
                  <Card key={trip._id} className="overflow-hidden">
                    {trip.coverImage && (
                      <div 
                        className="h-32 bg-cover bg-center"
                        style={{ backgroundImage: `url(${trip.coverImage})` }}
                      />
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{trip.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {trip.destination}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/trips/${trip._id}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/trips/${trip._id}/edit`}>
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
                                  <AlertDialogTitle>Delete Trip</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure? This will unlink all transactions tagged to this trip.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(trip._id)}
                                    className="bg-destructive text-destructive-foreground"
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
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                        </div>
                        <Badge className={statusColors[currentStatus]}>
                          {currentStatus}
                        </Badge>
                      </div>

                      {trip.travelers && trip.travelers.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {trip.travelers.map(t => typeof t === 'string' ? t : t.name).join(', ')}
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Budget Used</span>
                          <span className="font-medium">
                            {formatCurrency(trip.totalExpenses, currency)} / {formatCurrency(trip.budget, currency)}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(budgetUsed, 100)} 
                          className={budgetUsed > 100 ? '[&>div]:bg-destructive' : ''}
                        />
                        {budgetUsed > 100 && (
                          <p className="text-xs text-destructive">
                            Over budget by {formatCurrency(trip.totalExpenses - trip.budget, currency)}
                          </p>
                        )}
                      </div>

                      {currentStatus === 'ongoing' && daysLeft >= 0 && (
                        <p className="text-xs text-muted-foreground">
                          {daysLeft} days remaining
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
