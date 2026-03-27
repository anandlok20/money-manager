'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Users, Plus, MoreVertical, Edit, Trash2, User, UserCheck, Users2, Mail, Phone, Eye, UserX, KeyRound, Copy, RefreshCw, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { EmptyState } from '@/components/shared/EmptyState';
import { MemberType } from '@/types';

interface Member {
  _id: string;
  name: string;
  type: MemberType;
  email?: string;
  phone?: string;
  relationship?: string;
  isActive: boolean;
  accessCode?: string;
  accessCodeEnabled: boolean;
  accessSetupComplete: boolean;
  createdAt: string;
}

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch('/api/members?includeInactive=true');
  if (!response.ok) throw new Error('Failed to fetch members');
  const json = await response.json();
  return json.data || [];
}

async function deleteMember(id: string, permanent: boolean = false) {
  const url = permanent ? `/api/members/${id}?permanent=true` : `/api/members/${id}`;
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete member');
  }
  return response.json();
}

const memberTypeConfig = {
  [MemberType.SELF]: { label: 'Self', icon: User, color: 'bg-blue-500' },
  [MemberType.FAMILY]: { label: 'Family', icon: Users2, color: 'bg-green-500' },
  [MemberType.OTHER]: { label: 'Other', icon: UserCheck, color: 'bg-gray-500' },
};

function AccessCodeSection({ member, onUpdate }: { member: Member; onUpdate: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  async function enableAccess() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/${member._id}/access`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to enable access'); return; }
      toast.success('Access code generated');
      onUpdate();
    } catch { toast.error('Something went wrong'); }
    finally { setIsLoading(false); }
  }

  async function disableAccess() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/${member._id}/access`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Failed'); return; }
      toast.success('Access disabled');
      onUpdate();
    } catch { toast.error('Something went wrong'); }
    finally { setIsLoading(false); }
  }

  async function regenerateCode() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/${member._id}/access`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed'); return; }
      toast.success('New code generated');
      onUpdate();
    } catch { toast.error('Something went wrong'); }
    finally { setIsLoading(false); }
  }

  function copyCode() {
    if (member.accessCode) {
      navigator.clipboard.writeText(member.accessCode);
      toast.success('Code copied to clipboard');
    }
  }

  return (
    <div className="pt-1">
      <Separator className="mb-3" />
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <KeyRound className="h-3 w-3" />
          App Access
        </p>
        {!member.accessCodeEnabled ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-9 text-xs"
            onClick={enableAccess}
            disabled={isLoading}
          >
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Enable Access
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-2 py-1.5 rounded text-sm font-mono tracking-widest text-center">
                {member.accessCode}
              </code>
              <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={copyCode}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            {member.accessSetupComplete ? (
              <p className="text-xs text-green-600 dark:text-green-400">Account set up</p>
            ) : (
              <p className="text-xs text-muted-foreground">Waiting for first login</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-9 text-xs"
                onClick={regenerateCode}
                disabled={isLoading}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                New Code
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 text-xs text-destructive hover:text-destructive"
                    disabled={isLoading}
                  >
                    <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                    Disable
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disable Access</AlertDialogTitle>
                    <AlertDialogDescription>
                      {member.name} will no longer be able to sign in with their access code. You can re-enable it later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={disableAccess} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Disable
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MembersPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deleteMember(id, false),
    onSuccess: () => {
      toast.success('Member deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMember(id, true),
    onSuccess: () => {
      toast.success('Member permanently deleted');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Failed to load members</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground">
            Manage family members and track expenses by person
          </p>
        </div>
        <Link href="/members/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        </Link>
      </div>

      {/* Members List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members"
          description="Add family members to track expenses by person."
          actionLabel="Add Member"
          actionHref="/members/new"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((member) => {
            const config = memberTypeConfig[member.type] || memberTypeConfig[MemberType.OTHER];
            const IconComponent = config.icon;
            const canHaveAccess = member.type !== MemberType.SELF && member.isActive;

            return (
              <Card key={member._id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{member.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {config.label}
                          </Badge>
                          {!member.isActive && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                          {member.accessCodeEnabled && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                              Access On
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/members/${member._id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/members/${member._id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {member.isActive && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-amber-600"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to deactivate &quot;{member.name}&quot;? They will be marked as inactive but their data will be preserved.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deactivateMutation.mutate(member._id)}
                                  className="bg-amber-600 text-white hover:bg-amber-700"
                                >
                                  Deactivate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Permanently
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Member Permanently</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to permanently delete &quot;{member.name}&quot;? This action cannot be undone and all associated data will be lost.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(member._id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {member.relationship && (
                    <p className="text-sm text-muted-foreground">
                      {member.relationship}
                    </p>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {!member.relationship && !member.email && !member.phone && (
                    <p className="text-sm text-muted-foreground">
                      Added {new Date(member.createdAt).toLocaleDateString()}
                    </p>
                  )}
                  {canHaveAccess && (
                    <AccessCodeSection
                      member={member}
                      onUpdate={() => queryClient.invalidateQueries({ queryKey: ['members'] })}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
