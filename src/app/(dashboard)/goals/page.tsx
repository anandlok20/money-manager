'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  Target,
  Plus,
  Calendar,
  Trash2,
  Edit,
  TrendingUp,
  Check,
  Wallet,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface Goal {
  _id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon: string;
  color: string;
  status: 'active' | 'completed' | 'cancelled';
  progress: number;
  remaining: number;
  monthlyNeeded: number | null;
  isPrivate?: boolean;
  linkedAccountId?: {
    _id: string;
    bankName: string;
    accountHolderName: string;
  };
}

interface GoalFormData {
  name: string;
  description: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  icon: string;
  color: string;
  isPrivate: boolean;
}

const GOAL_ICONS = ['🎯', '🏠', '🚗', '✈️', '📚', '💍', '🎓', '💰', '🏦', '🎁', '🎉', '🌴'];

async function fetchGoals(status?: string): Promise<Goal[]> {
  const url = status ? `/api/goals?status=${status}` : '/api/goals';
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch goals');
  const data = await response.json();
  return data.data;
}

export default function GoalsPage() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  
  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    description: '',
    targetAmount: '',
    currentAmount: '0',
    deadline: '',
    icon: '🎯',
    color: '#3b82f6',
    isPrivate: false,
  });

  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals', activeTab],
    queryFn: () => fetchGoals(activeTab === 'all' ? undefined : activeTab),
  });

  const createMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          targetAmount: parseFloat(data.targetAmount),
          currentAmount: parseFloat(data.currentAmount) || 0,
          deadline: data.deadline || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to create goal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success('Goal created successfully!');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create goal');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GoalFormData }) => {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          targetAmount: parseFloat(data.targetAmount),
          currentAmount: parseFloat(data.currentAmount) || 0,
          deadline: data.deadline || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to update goal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success('Goal updated successfully!');
      setEditingGoal(null);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to update goal');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete goal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success('Goal deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete goal');
    },
  });

  const contributeMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (!response.ok) throw new Error('Failed to add contribution');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      if (data.data.status === 'completed') {
        toast.success('🎉 Congratulations! You reached your goal!');
      } else {
        toast.success('Contribution added successfully!');
      }
      setContributionGoal(null);
      setContributionAmount('');
    },
    onError: () => {
      toast.error('Failed to add contribution');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      targetAmount: '',
      currentAmount: '0',
      deadline: '',
      icon: '🎯',
      color: '#3b82f6',
      isPrivate: false,
    });
  };

  const handleEdit = (goal: Goal) => {
    setFormData({
      name: goal.name,
      description: goal.description || '',
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline ? format(new Date(goal.deadline), 'yyyy-MM-dd') : '',
      icon: goal.icon,
      color: goal.color,
      isPrivate: goal.isPrivate ?? false,
    });
    setEditingGoal(goal);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  // Summary stats
  const activeGoals = goals?.filter(g => g.status === 'active') || [];
  const totalTargetAmount = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrentAmount = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTargetAmount > 0 
    ? Math.round((totalCurrentAmount / totalTargetAmount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Savings Goals</h1>
          <p className="text-muted-foreground">
            Track your progress towards financial targets
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Set a savings target to work towards
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Goal Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Emergency Fund"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What is this goal for?"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="targetAmount">Target Amount</Label>
                    <Input
                      id="targetAmount"
                      type="number"
                      min="1"
                      step="0.01"
                      value={formData.targetAmount}
                      onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                      placeholder="50000"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currentAmount">Current Amount</Label>
                    <Input
                      id="currentAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.currentAmount}
                      onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deadline">Target Date (optional)</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Icon</Label>
                  <div className="flex flex-wrap gap-2">
                    {GOAL_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={cn(
                          'w-11 h-11 rounded-lg flex items-center justify-center text-xl border transition-colors',
                          formData.icon === icon
                            ? 'border-primary bg-primary/10'
                            : 'border-muted hover:bg-muted'
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Private</p>
                      <p className="text-xs text-muted-foreground">Only visible to you</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.isPrivate}
                    onCheckedChange={(v) => setFormData({ ...formData, isPrivate: v })}
                  />
                </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Goal'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGoals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalCurrentAmount, currency)}
            </div>
            <p className="text-sm text-muted-foreground">
              of {formatCurrency(totalTargetAmount, currency)} target
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallProgress}%</div>
            <Progress value={overallProgress} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-2 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : goals?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No goals yet</p>
                <p className="text-muted-foreground text-center mb-4">
                  Start by creating your first savings goal
                </p>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {goals?.map((goal) => (
                <Card
                  key={goal._id}
                  className={cn(
                    'relative overflow-hidden transition-shadow hover:shadow-md',
                    goal.status === 'completed' && 'border-green-500/50'
                  )}
                >
                  {/* Colored accent bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: goal.color }}
                  />
                  <CardContent className="p-6 pt-8">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${goal.color}20` }}
                      >
                        {goal.icon}
                      </div>
                      <Badge className={getStatusColor(goal.status)}>
                        {goal.status === 'completed' && <Check className="h-3 w-3 mr-1" />}
                        {goal.status}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-lg mb-1">{goal.name}</h3>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {goal.description}
                      </p>
                    )}

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{goal.progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${goal.progress}%`,
                            backgroundColor: goal.status === 'completed' ? '#22c55e' : goal.color,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium" style={{ color: goal.color }}>
                          {formatCurrency(goal.currentAmount, currency)}
                        </span>
                        <span className="text-muted-foreground">
                          of {formatCurrency(goal.targetAmount, currency)}
                        </span>
                      </div>
                    </div>

                    {goal.deadline && (
                      <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(goal.deadline) > new Date()
                            ? `${formatDistanceToNow(new Date(goal.deadline))} left`
                            : 'Deadline passed'}
                        </span>
                      </div>
                    )}

                    {goal.monthlyNeeded && goal.status === 'active' && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        <span>
                          {formatCurrency(goal.monthlyNeeded, currency)}/month needed
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      {goal.status === 'active' && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => setContributionGoal(goal)}
                        >
                          <Wallet className="h-4 w-4 mr-1" />
                          Add Funds
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(goal)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{goal.name}&quot;? This action
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(goal._id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>
              Update your savings goal details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Goal Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-targetAmount">Target Amount</Label>
                  <Input
                    id="edit-targetAmount"
                    type="number"
                    min="1"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-currentAmount">Current Amount</Label>
                  <Input
                    id="edit-currentAmount"
                    type="number"
                    min="0"
                    value={formData.currentAmount}
                    onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-deadline">Target Date</Label>
                <Input
                  id="edit-deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center text-xl border transition-colors',
                        formData.icon === icon
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:bg-muted'
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingGoal(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contribution Dialog */}
      <Dialog open={!!contributionGoal} onOpenChange={(open) => !open && setContributionGoal(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
            <DialogDescription>
              Add funds to &quot;{contributionGoal?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {contributionGoal && (
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Current</span>
                  <span className="font-medium">
                    {formatCurrency(contributionGoal.currentAmount, currency)}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Target</span>
                  <span className="font-medium">
                    {formatCurrency(contributionGoal.targetAmount, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Remaining</span>
                  <span className="font-medium text-primary">
                    {formatCurrency(contributionGoal.remaining, currency)}
                  </span>
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="contribution">Amount to Add</Label>
              <Input
                id="contribution"
                type="number"
                min="0.01"
                step="0.01"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                placeholder="Enter amount"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setContributionGoal(null);
                setContributionAmount('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (contributionGoal && contributionAmount) {
                  contributeMutation.mutate({
                    id: contributionGoal._id,
                    amount: parseFloat(contributionAmount),
                  });
                }
              }}
              disabled={
                contributeMutation.isPending ||
                !contributionAmount ||
                parseFloat(contributionAmount) <= 0
              }
            >
              {contributeMutation.isPending ? 'Adding...' : 'Add Contribution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
