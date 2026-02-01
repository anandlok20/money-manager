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
  MapPin,
  Calendar,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  Plane,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils/currency';

interface Trip {
  _id: string;
  name: string;
  description?: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  travelers?: string[];
  notes?: string;
  totalExpenses: number;
  totalIncome: number;
  transactions: Array<{
    _id: string;
    dateTime: string;
    amount: number;
    type: string;
    note?: string;
    categoryId?: {
      name: string;
      icon: string;
      color: string;
    };
  }>;
}

async function fetchTrip(id: string): Promise<Trip> {
  const response = await fetch(`/api/trips/${id}`);
  if (!response.ok) throw new Error('Failed to fetch trip');
  const result = await response.json();
  return result.data;
}

async function deleteTrip(id: string) {
  const response = await fetch(`/api/trips/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete trip');
  return response.json();
}

export default function TripDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => fetchTrip(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip deleted successfully');
      router.push('/trips');
    },
    onError: () => {
      toast.error('Failed to delete trip');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Trip not found</p>
            <Button asChild className="mt-4">
              <Link href="/trips">Back to Trips</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const budgetUsed = trip.totalExpenses;
  const budgetPercentage = Math.min((budgetUsed / trip.budget) * 100, 100);
  const remainingBudget = trip.budget - budgetUsed;
  const netSpending = trip.totalExpenses - trip.totalIncome;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/trips">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{trip.name}</h1>
              <Badge className={getStatusColor(trip.status)}>
                {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {trip.destination}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/trips/${id}/edit`}>
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
                <AlertDialogTitle>Delete Trip</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this trip? Transactions linked to this trip will be unlinked but not deleted.
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

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(trip.budget)}</p>
              </div>
              <Wallet className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(trip.totalExpenses)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(trip.totalIncome)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className={`text-2xl font-bold ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(remainingBudget)}
                </p>
              </div>
              <Plane className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trip Details */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">
                  {format(new Date(trip.startDate), 'MMM dd, yyyy')} - {format(new Date(trip.endDate), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
            {trip.travelers && trip.travelers.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Travelers</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {trip.travelers.map((traveler, index) => (
                      <Badge key={index} variant="secondary">{traveler}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {trip.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p>{trip.description}</p>
              </div>
            </>
          )}

          {trip.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="whitespace-pre-wrap">{trip.notes}</p>
              </div>
            </>
          )}

          <Separator />
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Budget Usage</p>
              <p className="text-sm font-medium">{budgetPercentage.toFixed(0)}%</p>
            </div>
            <Progress 
              value={budgetPercentage} 
              className={budgetPercentage > 100 ? '[&>div]:bg-red-500' : budgetPercentage > 80 ? '[&>div]:bg-yellow-500' : ''}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Trip Transactions</CardTitle>
              <CardDescription>{trip.transactions.length} transactions</CardDescription>
            </div>
            <Button asChild>
              <Link href={`/transactions/new?tripId=${id}`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {trip.transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm">Add expenses to track your trip spending</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trip.transactions.map((txn) => (
                  <TableRow key={txn._id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(txn.dateTime), 'MMM dd')}
                    </TableCell>
                    <TableCell>{txn.note || '-'}</TableCell>
                    <TableCell>
                      {txn.categoryId ? (
                        <Badge variant="outline">{txn.categoryId.name}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${
                      txn.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {txn.type === 'EXPENSE' ? '-' : '+'}
                      {formatCurrency(txn.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
