'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  FileText,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  CreditCard,
  Car,
  Home,
  Shield,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

interface StoredDocument {
  _id: string;
  type: string;
  name: string;
  documentNumber?: string;
  issuedBy?: string;
  issuedTo?: string;
  issueDate?: string;
  expiryDate?: string;
  images: string[];
  isActive: boolean;
}

async function fetchDocuments(): Promise<{ data: StoredDocument[] }> {
  const response = await fetch('/api/documents?includeInactive=true');
  if (!response.ok) throw new Error('Failed to fetch documents');
  return response.json();
}

async function deleteDocument(id: string) {
  const response = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete document');
  return response.json();
}

const documentCategories = [
  { id: 'all', label: 'All Documents', icon: FileText },
  { id: 'id', label: 'ID Cards', icon: CreditCard },
  { id: 'vehicle', label: 'Vehicle', icon: Car },
  { id: 'property', label: 'Property', icon: Home },
  { id: 'insurance', label: 'Insurance', icon: Shield },
];

const documentTypeLabels: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  passport: 'Passport',
  driving_license: 'Driving License',
  voter_id: 'Voter ID',
  ration_card: 'Ration Card',
  birth_certificate: 'Birth Certificate',
  marriage_certificate: 'Marriage Certificate',
  employee_id: 'Employee ID',
  education_certificate: 'Education Certificate',
  rc_book: 'RC Book',
  puc_certificate: 'PUC Certificate',
  life_insurance: 'Life Insurance',
  health_insurance: 'Health Insurance',
  vehicle_insurance: 'Vehicle Insurance',
  property_deed: 'Property Deed',
  land_registry: 'Land Registry',
  rent_agreement: 'Rent Agreement',
  other: 'Other',
};

const categoryTypes: Record<string, string[]> = {
  id: ['aadhaar', 'pan', 'passport', 'driving_license', 'voter_id', 'ration_card', 'birth_certificate', 'marriage_certificate', 'employee_id', 'education_certificate'],
  vehicle: ['rc_book', 'puc_certificate', 'vehicle_insurance'],
  property: ['property_deed', 'land_registry', 'rent_agreement'],
  insurance: ['life_insurance', 'health_insurance', 'vehicle_insurance'],
};

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Memoize date calculations to avoid impure Date.now() during render
  const dateThresholds = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return { now, thirtyDaysFromNow };
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => {
      toast.error('Failed to delete document');
    },
  });

  const documents = data?.data || [];

  const filteredDocuments = documents.filter((doc) => {
    // Category filter
    if (activeTab !== 'all' && categoryTypes[activeTab]) {
      if (!categoryTypes[activeTab].includes(doc.type)) return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(query) ||
        doc.documentNumber?.toLowerCase().includes(query) ||
        doc.issuedTo?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const expiringDocs = documents.filter((doc) => {
    if (!doc.expiryDate) return false;
    const expiry = new Date(doc.expiryDate);
    return expiry <= dateThresholds.thirtyDaysFromNow && expiry >= dateThresholds.now;
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Failed to load documents</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Store and manage your important documents
          </p>
        </div>
        <Link href="/documents/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Document
          </Button>
        </Link>
      </div>

      {/* Expiring Soon Alert */}
      {expiringDocs.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Documents Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {expiringDocs.map((doc) => (
                <Badge key={doc._id} variant="outline" className="border-orange-300">
                  {doc.name} - {format(new Date(doc.expiryDate!), 'MMM d, yyyy')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          {documentCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents found"
              description="Add your important documents for safe keeping"
              actionLabel="Add Document"
              actionHref="/documents/new"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments.map((doc) => {
                const isExpiringSoon = doc.expiryDate && 
                  new Date(doc.expiryDate) <= dateThresholds.thirtyDaysFromNow;
                const isExpired = doc.expiryDate && new Date(doc.expiryDate) < dateThresholds.now;

                return (
                  <Card key={doc._id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {documentTypeLabels[doc.type] || doc.type}
                          </Badge>
                          <CardTitle className="text-base">{doc.name}</CardTitle>
                          {doc.documentNumber && (
                            <CardDescription>{doc.documentNumber}</CardDescription>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Document options">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/documents/${doc._id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/documents/${doc._id}/edit`}>
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
                                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(doc._id)}
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
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {doc.issuedTo && (
                          <p className="text-muted-foreground">
                            Issued to: {doc.issuedTo}
                          </p>
                        )}
                        {doc.expiryDate && (
                          <p className={isExpired ? 'text-destructive' : isExpiringSoon ? 'text-orange-600' : 'text-muted-foreground'}>
                            {isExpired ? 'Expired: ' : 'Expires: '}
                            {format(new Date(doc.expiryDate), 'MMM d, yyyy')}
                          </p>
                        )}
                        {doc.images.length > 0 && (
                          <p className="text-muted-foreground">
                            {doc.images.length} image(s) attached
                          </p>
                        )}
                      </div>
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
