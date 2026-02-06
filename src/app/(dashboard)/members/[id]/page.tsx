'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Edit,
  Trash2,
  User,
  Users,
  UserCheck,
  Building2,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import { MemberType } from '@/types';

interface Member {
  _id: string;
  name: string;
  type: MemberType;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  relationship?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

interface MemberStats {
  totalExpenses: number;
  totalIncome: number;
  transactionCount: number;
  linkedBankAccounts: number;
  linkedCards: number;
}

async function fetchMember(id: string): Promise<Member> {
  const response = await fetch(`/api/members/${id}`);
  if (!response.ok) throw new Error('Failed to fetch member');
  const data = await response.json();
  return data.data;
}

async function fetchMemberStats(id: string): Promise<MemberStats> {
  // Get transactions for this member
  const transactionsRes = await fetch(`/api/transactions?memberId=${id}&limit=1000`);
  if (!transactionsRes.ok) throw new Error('Failed to fetch stats');
  const transactionsData = await transactionsRes.json();
  
  // Get bank accounts linked to this member
  const banksRes = await fetch('/api/accounts/banks');
  const banksData = await banksRes.json();
  const linkedBanks = banksData.data?.filter((b: { linkedMemberIds?: { _id: string }[] }) => 
    b.linkedMemberIds?.some((m: { _id: string }) => m._id === id)
  ) || [];
  
  // Get cards linked to this member
  const cardsRes = await fetch('/api/accounts/cards');
  const cardsData = await cardsRes.json();
  const linkedCards = cardsData.data?.filter((c: { linkedMemberId?: { _id: string } }) => 
    c.linkedMemberId?._id === id
  ) || [];

  const transactions = transactionsData.data || [];
  const totalExpenses = transactions
    .filter((t: { type: string }) => t.type === 'expense')
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
  const totalIncome = transactions
    .filter((t: { type: string }) => t.type === 'income')
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

  return {
    totalExpenses,
    totalIncome,
    transactionCount: transactions.length,
    linkedBankAccounts: linkedBanks.length,
    linkedCards: linkedCards.length,
  };
}

async function deleteMember(id: string) {
  const response = await fetch(`/api/members/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete member');
  }
  return response.json();
}

const memberTypeConfig = {
  [MemberType.SELF]: { label: 'Self', icon: User, color: 'bg-blue-500' },
  [MemberType.FAMILY]: { label: 'Family', icon: Users, color: 'bg-green-500' },
  [MemberType.OTHER]: { label: 'Other', icon: UserCheck, color: 'bg-gray-500' },
};

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const id = params.id as string;

  const { data: member, isLoading, error } = useQuery({
    queryKey: ['member', id],
    queryFn: () => fetchMember(id),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['member-stats', id],
    queryFn: () => fetchMemberStats(id),
    enabled: !!member,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMember(id),
    onSuccess: () => {
      toast.success('Member deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      router.push('/members');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Failed to load member</p>
        <Link href="/members">
          <Button variant="outline">Go Back</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  if (!member) return null;

  const config = memberTypeConfig[member.type];
  const IconComponent = config.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/members">
            <Button variant="ghost" size="icon" aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full ${config.color} flex items-center justify-center`}>
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{member.name}</h1>
                {!member.isActive && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </div>
              <Badge variant="secondary">{config.label}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/members/${id}/edit`}>
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Member</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this member? This action cannot be undone.
                  Transactions associated with this member will be preserved but unlinked.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats?.totalExpenses || 0, currency)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.totalIncome || 0, currency)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{stats?.transactionCount || 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Linked Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xl font-bold">{stats?.linkedBankAccounts || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xl font-bold">{stats?.linkedCards || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={member.isActive ? 'default' : 'secondary'}>
              {member.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{config.label}</span>
          </div>
          {member.relationship && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Relationship</span>
              <span className="font-medium">{member.relationship}</span>
            </div>
          )}
          {member.dateOfBirth && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date of Birth</span>
              <span className="font-medium">
                {format(new Date(member.dateOfBirth), 'MMMM d, yyyy')}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Added</span>
            <span className="font-medium">
              {format(new Date(member.createdAt), 'MMMM d, yyyy')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      {(member.email || member.phone) && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${member.email}`} className="text-primary hover:underline">
                  {member.email}
                </a>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${member.phone}`} className="text-primary hover:underline">
                  {member.phone}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Address */}
      {member.address && (member.address.street || member.address.city || member.address.state || member.address.country) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <address className="not-italic space-y-1">
              {member.address.street && <p>{member.address.street}</p>}
              <p>
                {[member.address.city, member.address.state, member.address.postalCode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {member.address.country && <p>{member.address.country}</p>}
            </address>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {member.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{member.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <Link href={`/transactions?memberId=${id}`}>
            <Button variant="outline">View Transactions</Button>
          </Link>
          <Link href={`/transactions/new?memberId=${id}`}>
            <Button variant="outline">Add Transaction</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
