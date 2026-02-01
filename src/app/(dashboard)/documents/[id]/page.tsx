'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, differenceInDays, isPast, isFuture } from 'date-fns';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  User,
  Hash,
  Tag,
  Bell,
  FileImage,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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

const documentTypeLabels: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  passport: 'Passport',
  driving_license: 'Driving License',
  voter_id: 'Voter ID',
  ration_card: 'Ration Card',
  birth_certificate: 'Birth Certificate',
  marriage_certificate: 'Marriage Certificate',
  caste_certificate: 'Caste Certificate',
  income_certificate: 'Income Certificate',
  domicile_certificate: 'Domicile Certificate',
  employee_id: 'Employee ID',
  education_certificate: 'Education Certificate',
  professional_license: 'Professional License',
  bank_passbook: 'Bank Passbook',
  cheque_book: 'Cheque Book',
  credit_card_doc: 'Credit Card Document',
  demat_account: 'Demat Account',
  property_deed: 'Property Deed',
  land_registry: 'Land Registry',
  rent_agreement: 'Rent Agreement',
  life_insurance: 'Life Insurance',
  health_insurance: 'Health Insurance',
  vehicle_insurance: 'Vehicle Insurance',
  rc_book: 'RC Book',
  puc_certificate: 'PUC Certificate',
  other: 'Other',
};

async function fetchDocument(id: string) {
  const response = await fetch(`/api/documents/${id}`);
  if (!response.ok) throw new Error('Failed to fetch document');
  const result = await response.json();
  return result.data;
}

async function deleteDocument(id: string) {
  const response = await fetch(`/api/documents/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete document');
  return response.json();
}

function ExpiryStatus({ expiryDate }: { expiryDate?: string }) {
  if (!expiryDate) return null;

  const date = new Date(expiryDate);
  const daysUntil = differenceInDays(date, new Date());

  if (isPast(date)) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Expired {Math.abs(daysUntil)} days ago
      </Badge>
    );
  }

  if (daysUntil <= 30) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Clock className="h-3 w-3" />
        Expires in {daysUntil} days
      </Badge>
    );
  }

  if (daysUntil <= 90) {
    return (
      <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600">
        <Clock className="h-3 w-3" />
        Expires in {daysUntil} days
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600">
      <CheckCircle2 className="h-3 w-3" />
      Valid
    </Badge>
  );
}

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: doc, isLoading, error } = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted successfully');
      router.push('/documents');
    },
    onError: () => {
      toast.error('Failed to delete document');
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Document not found</p>
            <Button asChild className="mt-4">
              <Link href="/documents">Back to Documents</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/documents">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{doc.name}</h1>
              <Badge variant={doc.isActive ? 'default' : 'secondary'}>
                {doc.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {documentTypeLabels[doc.type] || doc.type}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/documents/${id}/edit`}>
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
                <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &quot;{doc.name}&quot;. This action cannot be undone.
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

      {/* Expiry Alert */}
      {doc.expiryDate && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Expiry Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(doc.expiryDate), 'PPP')}
                  </p>
                </div>
              </div>
              <ExpiryStatus expiryDate={doc.expiryDate} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Details */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {doc.documentNumber && (
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Document Number</p>
                  <p className="font-medium font-mono">{doc.documentNumber}</p>
                </div>
              </div>
            )}

            {doc.issuedBy && (
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Issued By</p>
                  <p className="font-medium">{doc.issuedBy}</p>
                </div>
              </div>
            )}

            {doc.issuedTo && (
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Issued To</p>
                  <p className="font-medium">{doc.issuedTo}</p>
                </div>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              {doc.issueDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-medium">{format(new Date(doc.issueDate), 'PPP')}</p>
                </div>
              )}
              {doc.expiryDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Expiry Date</p>
                  <p className="font-medium">{format(new Date(doc.expiryDate), 'PPP')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reminder Settings */}
        {doc.reminderDays && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Reminder Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Reminder will be sent <span className="font-medium text-foreground">{doc.reminderDays} days</span> before expiry
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        {doc.tags && doc.tags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {doc.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        {doc.metadata && Object.keys(doc.metadata).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(doc.metadata).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-sm text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="font-medium">{String(value)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Images */}
        {doc.images && doc.images.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Images ({doc.images.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {doc.images.map((image: string, index: number) => (
                  <a
                    key={index}
                    href={image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-video bg-muted rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={image}
                      alt={`Document image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attachments */}
        {doc.attachments && doc.attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments ({doc.attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {doc.attachments.map((attachment: string, index: number) => (
                  <a
                    key={index}
                    href={attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Attachment {index + 1}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {doc.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{doc.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <Card>
          <CardContent className="py-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Created: {format(new Date(doc.createdAt), 'PPp')}</span>
              <span>Updated: {format(new Date(doc.updatedAt), 'PPp')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
