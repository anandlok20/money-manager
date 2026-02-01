'use client';

import { use, useState } from 'react';
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
  Hotel,
  Car,
  MapPinned,
  Phone,
  Mail,
  User,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { formatCurrency } from '@/lib/utils/currency';

interface TripTraveler {
  _id?: string;
  name: string;
  phone?: string;
  email?: string;
  memberId?: string;
  isOrganizer?: boolean;
}

interface TripTicket {
  _id?: string;
  type: 'flight' | 'train' | 'bus' | 'other';
  title: string;
  bookingReference?: string;
  departureLocation: string;
  arrivalLocation: string;
  departureTime?: string;
  arrivalTime?: string;
  carrier?: string;
  seatNumber?: string;
  price?: number;
  pdfUrl?: string;
  notes?: string;
}

interface TripHotel {
  _id?: string;
  name: string;
  address?: string;
  checkIn: string;
  checkOut: string;
  bookingReference?: string;
  price?: number;
  phone?: string;
  email?: string;
  roomType?: string;
  pdfUrl?: string;
  notes?: string;
}

interface TripPlace {
  _id?: string;
  name: string;
  category?: string;
  address?: string;
  plannedDate?: string;
  estimatedDuration?: string;
  estimatedCost?: number;
  priority?: string;
  visited?: boolean;
  rating?: number;
  notes?: string;
}

interface TripCab {
  _id?: string;
  type: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  pickupLocation?: string;
  dropLocation?: string;
  pickupTime?: string;
  price?: number;
  bookingReference?: string;
  notes?: string;
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
  travelers?: TripTraveler[];
  tickets?: TripTicket[];
  hotels?: TripHotel[];
  placesToVisit?: TripPlace[];
  cabs?: TripCab[];
  notes?: string;
  documents?: { name: string; url: string; type: string }[];
  totalExpenses: number;
  totalIncome: number;
  transactions: Array<{
    _id: string;
    dateTime: string;
    amount: number;
    type: string;
    note?: string;
    categoryId?: { name: string; icon: string; color: string };
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

async function updateTrip(id: string, data: Partial<Trip>) {
  const response = await fetch(`/api/trips/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update trip');
  return response.json();
}

export default function TripDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [travelerDialog, setTravelerDialog] = useState(false);
  const [ticketDialog, setTicketDialog] = useState(false);
  const [hotelDialog, setHotelDialog] = useState(false);
  const [placeDialog, setPlaceDialog] = useState(false);
  const [cabDialog, setCabDialog] = useState(false);
  
  // Form states
  const [newTraveler, setNewTraveler] = useState<TripTraveler>({ name: '' });
  const [newTicket, setNewTicket] = useState<TripTicket>({ type: 'flight', title: '', departureLocation: '', arrivalLocation: '' });
  const [newHotel, setNewHotel] = useState<TripHotel>({ name: '', checkIn: '', checkOut: '' });
  const [newPlace, setNewPlace] = useState<TripPlace>({ name: '' });
  const [newCab, setNewCab] = useState<TripCab>({ type: 'local' });

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
    onError: () => toast.error('Failed to delete trip'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Trip>) => updateTrip(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip updated successfully');
    },
    onError: () => toast.error('Failed to update trip'),
  });

  const handleAddTraveler = () => {
    if (!newTraveler.name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    const travelers = [...(trip?.travelers || []), newTraveler];
    updateMutation.mutate({ travelers });
    setNewTraveler({ name: '' });
    setTravelerDialog(false);
  };

  const handleRemoveTraveler = (index: number) => {
    const travelers = trip?.travelers?.filter((_, i) => i !== index);
    updateMutation.mutate({ travelers });
  };

  const handleAddTicket = () => {
    if (!newTicket.title.trim() || !newTicket.departureLocation || !newTicket.arrivalLocation) {
      toast.error('Please fill required fields');
      return;
    }
    const tickets = [...(trip?.tickets || []), newTicket];
    updateMutation.mutate({ tickets });
    setNewTicket({ type: 'flight', title: '', departureLocation: '', arrivalLocation: '' });
    setTicketDialog(false);
  };

  const handleRemoveTicket = (index: number) => {
    const tickets = trip?.tickets?.filter((_, i) => i !== index);
    updateMutation.mutate({ tickets });
  };

  const handleAddHotel = () => {
    if (!newHotel.name.trim() || !newHotel.checkIn || !newHotel.checkOut) {
      toast.error('Please fill required fields');
      return;
    }
    const hotels = [...(trip?.hotels || []), newHotel];
    updateMutation.mutate({ hotels });
    setNewHotel({ name: '', checkIn: '', checkOut: '' });
    setHotelDialog(false);
  };

  const handleRemoveHotel = (index: number) => {
    const hotels = trip?.hotels?.filter((_, i) => i !== index);
    updateMutation.mutate({ hotels });
  };

  const handleAddPlace = () => {
    if (!newPlace.name.trim()) {
      toast.error('Please enter a place name');
      return;
    }
    const placesToVisit = [...(trip?.placesToVisit || []), newPlace];
    updateMutation.mutate({ placesToVisit });
    setNewPlace({ name: '' });
    setPlaceDialog(false);
  };

  const handleRemovePlace = (index: number) => {
    const placesToVisit = trip?.placesToVisit?.filter((_, i) => i !== index);
    updateMutation.mutate({ placesToVisit });
  };

  const handleTogglePlaceVisited = (index: number) => {
    const placesToVisit = trip?.placesToVisit?.map((p, i) => 
      i === index ? { ...p, visited: !p.visited } : p
    );
    updateMutation.mutate({ placesToVisit });
  };

  const handleAddCab = () => {
    const cabs = [...(trip?.cabs || []), newCab];
    updateMutation.mutate({ cabs });
    setNewCab({ type: 'local' });
    setCabDialog(false);
  };

  const handleRemoveCab = (index: number) => {
    const cabs = trip?.cabs?.filter((_, i) => i !== index);
    updateMutation.mutate({ cabs });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'ongoing': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Trip</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this trip?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-lg font-bold">{formatCurrency(trip.budget)}</p>
              </div>
              <Wallet className="h-6 w-6 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(trip.totalExpenses)}</p>
              </div>
              <TrendingDown className="h-6 w-6 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(trip.totalIncome)}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className={`text-lg font-bold ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(remainingBudget)}
                </p>
              </div>
              <Plane className="h-6 w-6 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto">
          <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="travelers" className="text-xs md:text-sm">
            Travelers {trip.travelers?.length ? `(${trip.travelers.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs md:text-sm">
            Tickets {trip.tickets?.length ? `(${trip.tickets.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="hotels" className="text-xs md:text-sm">
            Hotels {trip.hotels?.length ? `(${trip.hotels.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="places" className="text-xs md:text-sm">
            Places {trip.placesToVisit?.length ? `(${trip.placesToVisit.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="cabs" className="text-xs md:text-sm">
            Cabs {trip.cabs?.length ? `(${trip.cabs.length})` : ''}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
                      <p className="font-medium">{trip.travelers.length} people</p>
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
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {trip.transactions.map((txn) => (
                    <Link key={txn._id} href={`/transactions/${txn._id}`} className="block">
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium">{txn.note || 'Transaction'}</p>
                          <p className="text-sm text-muted-foreground">{format(new Date(txn.dateTime), 'MMM dd')}</p>
                        </div>
                        <span className={`font-mono ${txn.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'}`}>
                          {txn.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(txn.amount)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Travelers Tab */}
        <TabsContent value="travelers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Travelers</CardTitle>
                <Button onClick={() => setTravelerDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Traveler
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!trip.travelers?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No travelers added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trip.travelers.map((traveler, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {traveler.name}
                            {traveler.isOrganizer && <Badge variant="secondary" className="text-xs">Organizer</Badge>}
                          </p>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {traveler.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {traveler.phone}
                              </span>
                            )}
                            {traveler.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {traveler.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveTraveler(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Travel Tickets</CardTitle>
                <Button onClick={() => setTicketDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ticket
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!trip.tickets?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Plane className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tickets added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trip.tickets.map((ticket, index) => (
                    <div key={index} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{ticket.type.toUpperCase()}</Badge>
                        <div className="flex items-center gap-2">
                          {ticket.price && <span className="font-mono text-sm">{formatCurrency(ticket.price)}</span>}
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveTicket(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="font-medium">{ticket.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.departureLocation} → {ticket.arrivalLocation}
                      </p>
                      {ticket.departureTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(ticket.departureTime), 'MMM dd, yyyy HH:mm')}
                        </p>
                      )}
                      {ticket.carrier && (
                        <p className="text-xs text-muted-foreground">Carrier: {ticket.carrier}</p>
                      )}
                      {ticket.bookingReference && (
                        <p className="text-xs text-muted-foreground">Ref: {ticket.bookingReference}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hotels Tab */}
        <TabsContent value="hotels">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Hotels & Accommodations</CardTitle>
                <Button onClick={() => setHotelDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Hotel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!trip.hotels?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Hotel className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hotels added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trip.hotels.map((hotel, index) => (
                    <div key={index} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{hotel.name}</p>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveHotel(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {hotel.address && <p className="text-sm text-muted-foreground">{hotel.address}</p>}
                      <div className="flex gap-4 mt-2 text-sm">
                        <span>Check-in: {format(new Date(hotel.checkIn), 'MMM dd')}</span>
                        <span>Check-out: {format(new Date(hotel.checkOut), 'MMM dd')}</span>
                      </div>
                      {hotel.roomType && <p className="text-xs text-muted-foreground mt-1">Room: {hotel.roomType}</p>}
                      {hotel.price && <p className="font-mono text-sm mt-1">{formatCurrency(hotel.price)}</p>}
                      {hotel.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" /> {hotel.phone}
                        </p>
                      )}
                      {hotel.bookingReference && (
                        <p className="text-xs text-muted-foreground">Ref: {hotel.bookingReference}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Places Tab */}
        <TabsContent value="places">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Places to Visit</CardTitle>
                <Button onClick={() => setPlaceDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Place
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!trip.placesToVisit?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPinned className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No places added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trip.placesToVisit.map((place, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border flex items-center justify-between ${place.visited ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
                    >
                      <div>
                        <p className={`font-medium ${place.visited ? 'line-through text-muted-foreground' : ''}`}>
                          {place.name}
                        </p>
                        {place.address && <p className="text-sm text-muted-foreground">{place.address}</p>}
                        <div className="flex flex-wrap gap-2 mt-1">
                          {place.category && <Badge variant="outline" className="text-xs">{place.category}</Badge>}
                          {place.priority && (
                            <Badge 
                              variant={place.priority === 'must-visit' ? 'default' : 'secondary'} 
                              className="text-xs"
                            >
                              {place.priority}
                            </Badge>
                          )}
                        </div>
                        {place.estimatedCost && (
                          <p className="text-xs text-muted-foreground mt-1">Est. {formatCurrency(place.estimatedCost)}</p>
                        )}
                        {place.notes && <p className="text-xs text-muted-foreground mt-1">{place.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant={place.visited ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => handleTogglePlaceVisited(index)}
                        >
                          {place.visited ? <CheckCircle2 className="h-4 w-4" /> : 'Visit'}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRemovePlace(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cabs Tab */}
        <TabsContent value="cabs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Cab Bookings</CardTitle>
                <Button onClick={() => setCabDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cab
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!trip.cabs?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No cabs added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trip.cabs.map((cab, index) => (
                    <div key={index} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{cab.type.replace('-', ' ').toUpperCase()}</Badge>
                        <div className="flex items-center gap-2">
                          {cab.price && <span className="font-mono text-sm">{formatCurrency(cab.price)}</span>}
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveCab(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {cab.pickupLocation && cab.dropLocation && (
                        <p className="text-sm">{cab.pickupLocation} → {cab.dropLocation}</p>
                      )}
                      {cab.pickupTime && (
                        <p className="text-xs text-muted-foreground">
                          Pickup: {format(new Date(cab.pickupTime), 'MMM dd, yyyy HH:mm')}
                        </p>
                      )}
                      {cab.driverName && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Driver: {cab.driverName}
                          {cab.driverPhone && (
                            <a href={`tel:${cab.driverPhone}`} className="ml-2 text-primary hover:underline">
                              {cab.driverPhone}
                            </a>
                          )}
                        </p>
                      )}
                      {cab.vehicleNumber && (
                        <p className="text-xs text-muted-foreground font-mono">{cab.vehicleNumber}</p>
                      )}
                      {cab.vehicleType && (
                        <p className="text-xs text-muted-foreground">Vehicle: {cab.vehicleType}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Traveler Dialog */}
      <Dialog open={travelerDialog} onOpenChange={setTravelerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Traveler</DialogTitle>
            <DialogDescription>Add someone traveling on this trip</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input 
                value={newTraveler.name} 
                onChange={(e) => setNewTraveler({ ...newTraveler, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={newTraveler.phone || ''} 
                onChange={(e) => setNewTraveler({ ...newTraveler, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={newTraveler.email || ''} 
                onChange={(e) => setNewTraveler({ ...newTraveler, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <Button onClick={handleAddTraveler} className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Traveler'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Ticket Dialog */}
      <Dialog open={ticketDialog} onOpenChange={setTicketDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={newTicket.type} onValueChange={(v) => setNewTicket({ ...newTicket, type: v as TripTicket['type'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flight">Flight</SelectItem>
                  <SelectItem value="train">Train</SelectItem>
                  <SelectItem value="bus">Bus</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input 
                value={newTicket.title} 
                onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                placeholder="Mumbai to Goa"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>From *</Label>
                <Input 
                  value={newTicket.departureLocation} 
                  onChange={(e) => setNewTicket({ ...newTicket, departureLocation: e.target.value })}
                  placeholder="Mumbai"
                />
              </div>
              <div className="space-y-2">
                <Label>To *</Label>
                <Input 
                  value={newTicket.arrivalLocation} 
                  onChange={(e) => setNewTicket({ ...newTicket, arrivalLocation: e.target.value })}
                  placeholder="Goa"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Departure Time</Label>
              <Input 
                type="datetime-local"
                value={newTicket.departureTime || ''} 
                onChange={(e) => setNewTicket({ ...newTicket, departureTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Carrier / Operator</Label>
              <Input 
                value={newTicket.carrier || ''} 
                onChange={(e) => setNewTicket({ ...newTicket, carrier: e.target.value })}
                placeholder="IndiGo, Vistara, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Booking Reference</Label>
                <Input 
                  value={newTicket.bookingReference || ''} 
                  onChange={(e) => setNewTicket({ ...newTicket, bookingReference: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input 
                  type="number"
                  value={newTicket.price || ''} 
                  onChange={(e) => setNewTicket({ ...newTicket, price: parseFloat(e.target.value) || undefined })}
                />
              </div>
            </div>
            <Button onClick={handleAddTicket} className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Ticket'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Hotel Dialog */}
      <Dialog open={hotelDialog} onOpenChange={setHotelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Hotel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Hotel Name *</Label>
              <Input 
                value={newHotel.name} 
                onChange={(e) => setNewHotel({ ...newHotel, name: e.target.value })}
                placeholder="Taj Hotel"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                value={newHotel.address || ''} 
                onChange={(e) => setNewHotel({ ...newHotel, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Check-in *</Label>
                <Input 
                  type="date"
                  value={newHotel.checkIn} 
                  onChange={(e) => setNewHotel({ ...newHotel, checkIn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-out *</Label>
                <Input 
                  type="date"
                  value={newHotel.checkOut} 
                  onChange={(e) => setNewHotel({ ...newHotel, checkOut: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Room Type</Label>
              <Input 
                value={newHotel.roomType || ''} 
                onChange={(e) => setNewHotel({ ...newHotel, roomType: e.target.value })}
                placeholder="Deluxe, Suite, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input 
                  type="number"
                  value={newHotel.price || ''} 
                  onChange={(e) => setNewHotel({ ...newHotel, price: parseFloat(e.target.value) || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={newHotel.phone || ''} 
                  onChange={(e) => setNewHotel({ ...newHotel, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Booking Reference</Label>
              <Input 
                value={newHotel.bookingReference || ''} 
                onChange={(e) => setNewHotel({ ...newHotel, bookingReference: e.target.value })}
              />
            </div>
            <Button onClick={handleAddHotel} className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Hotel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Place Dialog */}
      <Dialog open={placeDialog} onOpenChange={setPlaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Place to Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Place Name *</Label>
              <Input 
                value={newPlace.name} 
                onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
                placeholder="Eiffel Tower"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                value={newPlace.address || ''} 
                onChange={(e) => setNewPlace({ ...newPlace, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newPlace.category || 'other'} onValueChange={(v) => setNewPlace({ ...newPlace, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attraction">Attraction</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="nature">Nature</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newPlace.priority || 'nice-to-have'} onValueChange={(v) => setNewPlace({ ...newPlace, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="must-visit">Must Visit</SelectItem>
                    <SelectItem value="nice-to-have">Nice to Have</SelectItem>
                    <SelectItem value="optional">Optional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estimated Cost</Label>
              <Input 
                type="number"
                value={newPlace.estimatedCost || ''} 
                onChange={(e) => setNewPlace({ ...newPlace, estimatedCost: parseFloat(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input 
                value={newPlace.notes || ''} 
                onChange={(e) => setNewPlace({ ...newPlace, notes: e.target.value })}
                placeholder="Opening hours, tips, etc."
              />
            </div>
            <Button onClick={handleAddPlace} className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Place'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Cab Dialog */}
      <Dialog open={cabDialog} onOpenChange={setCabDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cab Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newCab.type} onValueChange={(v) => setNewCab({ ...newCab, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="airport-pickup">Airport Pickup</SelectItem>
                  <SelectItem value="airport-drop">Airport Drop</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="outstation">Outstation</SelectItem>
                  <SelectItem value="rental">Rental</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Driver Name</Label>
                <Input 
                  value={newCab.driverName || ''} 
                  onChange={(e) => setNewCab({ ...newCab, driverName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Driver Phone</Label>
                <Input 
                  value={newCab.driverPhone || ''} 
                  onChange={(e) => setNewCab({ ...newCab, driverPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Pickup Location</Label>
                <Input 
                  value={newCab.pickupLocation || ''} 
                  onChange={(e) => setNewCab({ ...newCab, pickupLocation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Drop Location</Label>
                <Input 
                  value={newCab.dropLocation || ''} 
                  onChange={(e) => setNewCab({ ...newCab, dropLocation: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pickup Time</Label>
              <Input 
                type="datetime-local"
                value={newCab.pickupTime || ''} 
                onChange={(e) => setNewCab({ ...newCab, pickupTime: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input 
                  value={newCab.vehicleNumber || ''} 
                  onChange={(e) => setNewCab({ ...newCab, vehicleNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <Input 
                  value={newCab.vehicleType || ''} 
                  onChange={(e) => setNewCab({ ...newCab, vehicleType: e.target.value })}
                  placeholder="Sedan, SUV, etc."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input 
                type="number"
                value={newCab.price || ''} 
                onChange={(e) => setNewCab({ ...newCab, price: parseFloat(e.target.value) || undefined })}
              />
            </div>
            <Button onClick={handleAddCab} className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Cab'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
