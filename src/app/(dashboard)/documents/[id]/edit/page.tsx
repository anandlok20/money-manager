'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
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
import { useState } from 'react';

const documentTypes = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'ration_card', label: 'Ration Card' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'marriage_certificate', label: 'Marriage Certificate' },
  { value: 'caste_certificate', label: 'Caste Certificate' },
  { value: 'income_certificate', label: 'Income Certificate' },
  { value: 'domicile_certificate', label: 'Domicile Certificate' },
  { value: 'employee_id', label: 'Employee ID' },
  { value: 'education_certificate', label: 'Education Certificate' },
  { value: 'professional_license', label: 'Professional License' },
  { value: 'bank_passbook', label: 'Bank Passbook' },
  { value: 'cheque_book', label: 'Cheque Book' },
  { value: 'credit_card_doc', label: 'Credit Card Document' },
  { value: 'demat_account', label: 'Demat Account' },
  { value: 'property_deed', label: 'Property Deed' },
  { value: 'land_registry', label: 'Land Registry' },
  { value: 'rent_agreement', label: 'Rent Agreement' },
  { value: 'life_insurance', label: 'Life Insurance' },
  { value: 'health_insurance', label: 'Health Insurance' },
  { value: 'vehicle_insurance', label: 'Vehicle Insurance' },
  { value: 'rc_book', label: 'RC Book' },
  { value: 'puc_certificate', label: 'PUC Certificate' },
  { value: 'other', label: 'Other' },
];

const documentSchema = z.object({
  type: z.string().min(1, 'Document type is required'),
  name: z.string().min(1, 'Name is required'),
  documentNumber: z.string().optional(),
  issuedBy: z.string().optional(),
  issuedTo: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
  reminderDays: z.number().min(0).optional(),
  isActive: z.boolean(),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

async function fetchDocument(id: string) {
  const response = await fetch(`/api/documents/${id}`);
  if (!response.ok) throw new Error('Failed to fetch document');
  const result = await response.json();
  return result.data;
}

async function updateDocument(id: string, data: DocumentFormValues & { tags: string[] }) {
  const response = await fetch(`/api/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      issueDate: data.issueDate || null,
      expiryDate: data.expiryDate || null,
    }),
  });
  if (!response.ok) throw new Error('Failed to update document');
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

export default function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument(id),
  });

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      type: '',
      name: '',
      documentNumber: '',
      issuedBy: '',
      issuedTo: '',
      issueDate: '',
      expiryDate: '',
      notes: '',
      reminderDays: 30,
      isActive: true,
    },
  });

  useEffect(() => {
    if (doc) {
      form.reset({
        type: doc.type,
        name: doc.name,
        documentNumber: doc.documentNumber || '',
        issuedBy: doc.issuedBy || '',
        issuedTo: doc.issuedTo || '',
        issueDate: formatDateForInput(doc.issueDate),
        expiryDate: formatDateForInput(doc.expiryDate),
        notes: doc.notes || '',
        reminderDays: doc.reminderDays || 30,
        isActive: doc.isActive,
      });
      setTags(doc.tags || []);
    }
  }, [doc, form]);

  const mutation = useMutation({
    mutationFn: (data: DocumentFormValues) => updateDocument(id, { ...data, tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      toast.success('Document updated successfully');
      router.push(`/documents/${id}`);
    },
    onError: () => {
      toast.error('Failed to update document');
    },
  });

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const onSubmit = (data: DocumentFormValues) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card>
          <CardContent className="py-12 text-center">
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
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/documents/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Edit Document</h1>
        </div>
        <p className="text-muted-foreground ml-12">Update document details</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {documentTypes.map((type) => (
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
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 mt-auto">
                      <div>
                        <FormLabel>Active</FormLabel>
                        <FormDescription className="text-xs">
                          Mark as active document
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., My Passport" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="documentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., A1234567" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Issue Details */}
          <Card>
            <CardHeader>
              <CardTitle>Issue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="issuedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issued By</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Government of India" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="issuedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issued To</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., John Doe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="issueDate"
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
                  name="expiryDate"
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
            </CardContent>
          </Card>

          {/* Reminder */}
          <Card>
            <CardHeader>
              <CardTitle>Reminder Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="reminderDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder Days Before Expiry</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={0} />
                    </FormControl>
                    <FormDescription>
                      Number of days before expiry to show reminder (0 to disable)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
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

          {/* Actions */}
          <div className="flex gap-4">
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
