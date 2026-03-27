'use client';

import { useState, useMemo } from 'react';
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
  Shuffle,
  Percent,
  IndianRupee,
  ScissorsIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

type SplitMode = 'amount' | 'percentage';

interface SplitRow {
  name: string;
  value: number; // amount or percentage depending on mode
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

// ─── Trip Split Calculator Dialog ───────────────────────────────────────────

interface TripSplitDialogProps {
  trip: Trip | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currency: string;
}

function TripSplitDialog({ trip, open, onOpenChange, currency }: TripSplitDialogProps) {
  const [splitMode, setSplitMode] = useState<SplitMode>('amount');
  const [rows, setRows] = useState<SplitRow[]>([]);

  // Reset rows when trip changes / dialog opens
  const travelerNames = useMemo(() => {
    if (!trip?.travelers) return [];
    return trip.travelers.map((t) => (typeof t === 'string' ? t : t.name));
  }, [trip?.travelers]);

  // Re-init when trip changes
  useMemo(() => {
    setRows(travelerNames.map((name) => ({ name, value: 0 })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?._id]);

  if (!trip) return null;

  const total = trip.totalExpenses || 0;

  function getAmount(row: SplitRow): number {
    if (splitMode === 'percentage') return parseFloat(((row.value / 100) * total).toFixed(2));
    return row.value;
  }

  function getPct(row: SplitRow): number {
    if (splitMode === 'percentage') return row.value;
    return total > 0 ? parseFloat(((row.value / total) * 100).toFixed(1)) : 0;
  }

  const othersTotal = rows.reduce((sum, r) => sum + getAmount(r), 0);
  const yourShare = total - othersTotal;
  const isOver = yourShare < -0.01;

  const othersPct = rows.reduce((sum, r) => sum + getPct(r), 0);
  const yourPct = 100 - othersPct;

  function updateRow(idx: number, value: number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { name: '', value: 0 }]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateName(idx: number, name: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, name } : r)));
  }

  function handleEqualSplit() {
    const count = rows.length + 1; // +1 for "you"
    if (count <= 1 || rows.length === 0) return;

    if (splitMode === 'percentage') {
      const each = parseFloat((100 / count).toFixed(2));
      setRows((prev) =>
        prev.map((r, i) => ({
          ...r,
          value: i === prev.length - 1 ? parseFloat((100 - each * (prev.length - 1)).toFixed(2)) : each,
        }))
      );
    } else {
      const each = parseFloat((total / count).toFixed(2));
      const remainder = parseFloat((total - each * count).toFixed(2));
      setRows((prev) =>
        prev.map((r, i) => ({
          ...r,
          value: i === prev.length - 1 ? each + remainder : each,
        }))
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScissorsIcon className="h-4 w-4" />
            Split Trip Expenses
          </DialogTitle>
          <DialogDescription>
            {trip.name} · {trip.destination}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total */}
          <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Expenses</span>
            <span className="font-semibold text-lg">{formatCurrency(total, currency)}</span>
          </div>

          {total === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No expenses recorded yet for this trip.
            </p>
          )}

          {/* Mode toggle + equal split */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center rounded-md border p-0.5 gap-0.5 bg-muted/40">
              <Button
                type="button"
                size="sm"
                variant={splitMode === 'amount' ? 'secondary' : 'ghost'}
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => { setSplitMode('amount'); setRows((r) => r.map((x) => ({ ...x, value: 0 }))); }}
              >
                <IndianRupee className="h-3 w-3" />
                By Amount
              </Button>
              <Button
                type="button"
                size="sm"
                variant={splitMode === 'percentage' ? 'secondary' : 'ghost'}
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => { setSplitMode('percentage'); setRows((r) => r.map((x) => ({ ...x, value: 0 }))); }}
              >
                <Percent className="h-3 w-3" />
                By %
              </Button>
            </div>
            {rows.length > 0 && total > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={handleEqualSplit}
              >
                <Shuffle className="h-3 w-3" />
                Equal Split
              </Button>
            )}
          </div>

          {/* Participant rows */}
          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div key={idx} className="flex items-end gap-2">
                {/* Name */}
                <div className="flex-1 space-y-1">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Person</Label>}
                  <Input
                    className="h-8 text-sm"
                    placeholder="Name"
                    value={row.name}
                    onChange={(e) => updateName(idx, e.target.value)}
                  />
                </div>

                {/* Value input */}
                <div className="w-28 space-y-1">
                  {idx === 0 && (
                    <Label className="text-xs text-muted-foreground">
                      {splitMode === 'percentage' ? 'Share (%)' : 'Amount (₹)'}
                    </Label>
                  )}
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max={splitMode === 'percentage' ? 100 : undefined}
                      step="any"
                      className="h-8 text-sm pr-7"
                      placeholder="0"
                      value={row.value || ''}
                      onChange={(e) => updateRow(idx, parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      {splitMode === 'percentage' ? '%' : '₹'}
                    </span>
                  </div>
                  {/* Show cross-value */}
                  {row.value > 0 && total > 0 && (
                    <p className="text-xs text-muted-foreground pl-1">
                      {splitMode === 'percentage'
                        ? `= ${formatCurrency(getAmount(row), currency)}`
                        : `= ${getPct(row).toFixed(1)}%`}
                    </p>
                  )}
                </div>

                {/* Remove (only for manually-added rows beyond travelers list) */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(idx)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={addRow}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Person
          </Button>

          {/* Summary */}
          {rows.length > 0 && total > 0 && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Summary</div>
                {rows.map((row, idx) => (
                  row.name && getAmount(row) > 0 ? (
                    <div key={idx} className="flex justify-between">
                      <span className="text-muted-foreground">{row.name}</span>
                      <span className="font-medium">
                        {formatCurrency(getAmount(row), currency)}
                        <span className="text-xs text-muted-foreground ml-1">({getPct(row).toFixed(1)}%)</span>
                      </span>
                    </div>
                  ) : null
                ))}
                <Separator className="my-1" />
                <div className="flex justify-between font-semibold">
                  <span>Your share</span>
                  <span className={isOver ? 'text-destructive' : 'text-emerald-600'}>
                    {isOver
                      ? `−${formatCurrency(Math.abs(yourShare), currency)} over`
                      : formatCurrency(yourShare, currency)}
                    {!isOver && (
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        ({yourPct.toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </div>
                {isOver && (
                  <p className="text-xs text-destructive">
                    Split amounts exceed total. Reduce shares.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TripsPage() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [splitTrip, setSplitTrip] = useState<Trip | null>(null);

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
                const budgetUsed = (trip.budget ?? 0) > 0 ? (trip.totalExpenses / trip.budget) * 100 : 0;
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
                            <DropdownMenuItem
                              onSelect={() => setSplitTrip(trip)}
                            >
                              <ScissorsIcon className="mr-2 h-4 w-4" />
                              Split Expenses
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
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
                          {trip.travelers.map((t) => typeof t === 'string' ? t : t.name).join(', ')}
                        </div>
                      )}

                      {/* Budget progress */}
                      {(trip.budget ?? 0) > 0 ? (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Budget Used</span>
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
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Spent</span>
                          <span className="font-medium">{formatCurrency(trip.totalExpenses, currency)}</span>
                        </div>
                      )}

                      {currentStatus === 'ongoing' && daysLeft >= 0 && (
                        <p className="text-xs text-muted-foreground">
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
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

      {/* Split expenses calculator dialog */}
      <TripSplitDialog
        trip={splitTrip}
        open={!!splitTrip}
        onOpenChange={(v) => { if (!v) setSplitTrip(null); }}
        currency={currency}
      />
    </div>
  );
}
