'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format, isToday, startOfWeek, addDays } from 'date-fns';
import {
  Plus,
  Flame,
  Trophy,
  CheckCircle2,
  Circle,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronRight,
  Target,
  Calendar,
  Activity,
  Pause,
  Play,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button }        from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress }      from '@/components/ui/progress';
import { Badge }         from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input }    from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { HABIT_CATEGORIES, CATEGORY_META } from '@/lib/constants/habits';
import type { HabitCategory } from '@/lib/constants/habits';
import { createHabitSchema } from '@/lib/validations/habit';

// ─── types ───────────────────────────────────────────────────────────────────
interface Habit {
  _id: string;
  name: string;
  description?: string;
  category: HabitCategory;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  targetDays: number[];
  targetCount: number;
  reminderTime?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  streak: number;
  longestStreak: number;
  totalCompletions: number;
  completedToday: boolean;
}

type CreateInput = z.infer<typeof createHabitSchema>;

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const FREQ_LABELS: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

const CATEGORY_COLORS: Record<HabitCategory, string> = {
  Health:       'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  Fitness:      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Learning:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Mindfulness:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Productivity: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Finance:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Social:       'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Creative:     'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Other:        'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function isDueToday(h: Habit): boolean {
  if (!h.isActive) return false;
  const today = new Date();
  const start = new Date(h.startDate);
  if (today < start) return false;
  if (h.endDate && today > new Date(h.endDate)) return false;
  if (h.frequency === 'daily') return true;
  if (h.frequency === 'weekly') {
    return h.targetDays.length === 0 || h.targetDays.includes(today.getDay());
  }
  return true; // monthly — show every day so user can log
}

// ─── fetch helpers ────────────────────────────────────────────────────────────
async function fetchHabits(): Promise<Habit[]> {
  const r = await fetch('/api/habits');
  if (!r.ok) throw new Error('Failed to fetch habits');
  return r.json();
}

async function toggleCompletion(habitId: string, completed: boolean, date: string) {
  const r = await fetch(`/api/habits/${habitId}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, completed }),
  });
  if (!r.ok) throw new Error('Failed to update habit');
  return r.json();
}

// ─── Add / Edit Dialog ────────────────────────────────────────────────────────
function HabitFormDialog({
  open,
  onOpenChange,
  editHabit,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editHabit?: Habit | null;
  onSaved: () => void;
}) {
  const form = useForm<CreateInput>({
    resolver: zodResolver(createHabitSchema),
    defaultValues: editHabit
      ? {
          name:         editHabit.name,
          description:  editHabit.description ?? '',
          category:     editHabit.category,
          icon:         editHabit.icon,
          color:        editHabit.color,
          frequency:    editHabit.frequency,
          targetDays:   editHabit.targetDays,
          targetCount:  editHabit.targetCount,
          reminderTime: editHabit.reminderTime ?? '',
          startDate:    editHabit.startDate.split('T')[0],
          endDate:      editHabit.endDate?.split('T')[0] ?? '',
        }
      : {
          name:        '',
          description: '',
          category:    'Health',
          icon:        '✅',
          color:       '#6366f1',
          frequency:   'daily',
          targetDays:  [],
          targetCount: 1,
          startDate:   new Date().toISOString().split('T')[0],
        },
  });

  const freq       = form.watch('frequency');
  const category   = form.watch('category');
  const targetDays = form.watch('targetDays') ?? [];

  // Auto-fill icon/color when category changes (only for new habits)
  const onCategoryChange = (cat: HabitCategory) => {
    form.setValue('category', cat);
    if (!editHabit) {
      form.setValue('icon',  CATEGORY_META[cat].icon);
      form.setValue('color', CATEGORY_META[cat].color);
    }
  };

  const toggleDay = (day: number) => {
    const cur = form.getValues('targetDays') ?? [];
    const next = cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day];
    form.setValue('targetDays', next);
  };

  const [saving, setSaving] = useState(false);

  const onSubmit = async (data: CreateInput) => {
    setSaving(true);
    try {
      const url    = editHabit ? `/api/habits/${editHabit._id}` : '/api/habits';
      const method = editHabit ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error();
      toast.success(editHabit ? 'Habit updated!' : 'Habit created!');
      onSaved();
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error('Failed to save habit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editHabit ? 'Edit Habit' : 'New Habit'}</DialogTitle>
          <DialogDescription>
            {editHabit ? 'Update your habit details.' : 'Build a new habit to track daily progress.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Habit Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Morning Run, Read 20 pages…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Category */}
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {HABIT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => onCategoryChange(cat as HabitCategory)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                        field.value === cat
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground'
                      )}
                    >
                      <span>{CATEGORY_META[cat as HabitCategory].icon}</span>
                      {cat}
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )} />

            {/* Icon + Color row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="icon" render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon (emoji)</FormLabel>
                  <FormControl>
                    <Input placeholder="✅" {...field} className="text-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        {...field}
                        className="h-9 w-12 rounded border border-border cursor-pointer p-0.5 bg-transparent"
                      />
                      <span className="text-sm text-muted-foreground">{field.value}</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Frequency */}
            <FormField control={form.control} name="frequency" render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Weekly day picker */}
            {freq === 'weekly' && (
              <div className="space-y-2">
                <p className="text-sm font-medium">On which days?</p>
                <div className="flex gap-2 flex-wrap">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={cn(
                        'w-10 h-10 rounded-full text-sm font-semibold border transition-all',
                        targetDays.includes(i)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Leave empty to show every day</p>
              </div>
            )}

            {/* Target count (for weekly/monthly) */}
            {freq !== 'daily' && (
              <FormField control={form.control} name="targetCount" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Target: times per {freq === 'weekly' ? 'week' : 'month'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Start + End date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Reminder */}
            <FormField control={form.control} name="reminderTime" render={({ field }) => (
              <FormItem>
                <FormLabel>Reminder Time (optional)</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Description */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Why does this habit matter to you?"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: form.watch('color') + '33' }}
              >
                {form.watch('icon') || CATEGORY_META[category as HabitCategory]?.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{form.watch('name') || 'Habit name'}</p>
                <p className="text-xs text-muted-foreground">
                  {FREQ_LABELS[freq]} · {category}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editHabit ? 'Save Changes' : 'Create Habit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Habit Card ───────────────────────────────────────────────────────────────
function HabitCard({
  habit,
  showCheck,
  onToggle,
  onEdit,
  onDelete,
  onToggleActive,
  onClick,
}: {
  habit: Habit;
  showCheck?: boolean;
  onToggle?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        !habit.isActive && 'opacity-60'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Check button (Today tab) */}
          {showCheck && (
            <button
              type="button"
              onClick={onToggle}
              className="mt-0.5 flex-shrink-0 transition-transform active:scale-90"
            >
              {habit.completedToday ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
          )}

          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: habit.color + '33' }}
          >
            {habit.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0" onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
            <div className="flex items-start justify-between gap-2">
              <p className={cn('font-semibold text-sm truncate', habit.completedToday && 'line-through text-muted-foreground')}>
                {habit.name}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 -mt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={onToggleActive}>
                    {habit.isActive ? <><Pause className="h-4 w-4 mr-2" />Pause</> : <><Play className="h-4 w-4 mr-2" />Resume</>}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge variant="secondary" className={cn('text-xs px-2 py-0', CATEGORY_COLORS[habit.category])}>
                {habit.category}
              </Badge>
              <span className="text-xs text-muted-foreground">{FREQ_LABELS[habit.frequency]}</span>
              {!habit.isActive && (
                <Badge variant="secondary" className="text-xs">Paused</Badge>
              )}
            </div>

            <div className="flex items-center gap-3 mt-2">
              {habit.streak > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-orange-500">
                  <Flame className="h-3.5 w-3.5" />
                  {habit.streak}d streak
                </span>
              )}
              {habit.longestStreak > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Trophy className="h-3 w-3" />
                  Best: {habit.longestStreak}d
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                <CheckCircle2 className="h-3 w-3" />
                {habit.totalCompletions} total
              </span>
            </div>
          </div>

          {/* Navigate arrow */}
          {onClick && (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-3" onClick={onClick} style={{ cursor: 'pointer' }} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Weekly Progress Strip ─────────────────────────────────────────────────────
function WeekStrip({ habits }: { habits: Habit[] }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday

  return (
    <div className="flex gap-1.5 justify-between">
      {Array.from({ length: 7 }, (_, i) => {
        const day  = addDays(weekStart, i);
        const isT  = isToday(day);
        const isPast = day < today && !isT;
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xs text-muted-foreground">{format(day, 'EEE')[0]}</span>
            <div className={cn(
              'w-full aspect-square rounded-lg flex items-center justify-center text-xs font-semibold',
              isT    ? 'ring-2 ring-primary ring-offset-1' : '',
              isPast ? 'bg-muted/60' : 'bg-muted/30'
            )}>
              {format(day, 'd')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HabitsPage() {
  const router     = useRouter();
  const qc         = useQueryClient();
  const today      = new Date().toISOString().split('T')[0];
  const todayLabel = format(new Date(), 'EEEE, MMM d');

  const [addOpen,        setAddOpen]        = useState(false);
  const [editHabit,      setEditHabit]      = useState<Habit | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<Habit | null>(null);
  const [filterCategory, setFilterCategory] = useState<HabitCategory | 'All'>('All');

  const { data: habits = [], isLoading } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn:  fetchHabits,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      toggleCompletion(id, completed, today),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
    onError:   () => toast.error('Failed to update habit'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/habits/${id}`, { method: 'DELETE' }).then((r) => {
      if (!r.ok) throw new Error();
      return r.json();
    }),
    onSuccess: () => {
      toast.success('Habit deleted');
      qc.invalidateQueries({ queryKey: ['habits'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete habit'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/habits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: (_d, v) => {
      toast.success(v.isActive ? 'Habit resumed' : 'Habit paused');
      qc.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const dueToday = useMemo(() => habits.filter(isDueToday), [habits]);
  const completedToday = dueToday.filter((h) => h.completedToday).length;
  const todayProgress  = dueToday.length > 0 ? Math.round((completedToday / dueToday.length) * 100) : 0;

  const filteredHabits = useMemo(
    () => filterCategory === 'All' ? habits : habits.filter((h) => h.category === filterCategory),
    [habits, filterCategory]
  );

  const activeHabits  = habits.filter((h) => h.isActive);
  const bestStreak    = Math.max(0, ...habits.map((h) => h.longestStreak));
  const totalDone     = habits.reduce((a, h) => a + h.totalCompletions, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Habits</h1>
          <p className="text-sm text-muted-foreground">{todayLabel}</p>
        </div>
        <Button onClick={() => { setEditHabit(null); setAddOpen(true); }} className="gap-2 h-10">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Habit</span>
        </Button>
      </div>

      {/* Today's progress hero */}
      {dueToday.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today&apos;s Progress</p>
                <p className="text-2xl font-bold">
                  {completedToday} <span className="text-muted-foreground text-lg font-normal">/ {dueToday.length}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{todayProgress}%</p>
                {completedToday === dueToday.length && dueToday.length > 0 && (
                  <p className="text-xs text-green-600 font-semibold">🎉 All done!</p>
                )}
              </div>
            </div>
            <Progress value={todayProgress} className="h-3 rounded-full" />
          </CardContent>
        </Card>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold">{activeHabits.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Best Streak</p>
              <p className="text-xl font-bold">{bestStreak}d</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Done</p>
              <p className="text-xl font-bold">{totalDone}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due Today</p>
              <p className="text-xl font-bold">{dueToday.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="today">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex min-w-full sm:min-w-0 w-full sm:w-auto whitespace-nowrap">
            <TabsTrigger value="today"  className="flex-1 sm:flex-none gap-1.5"><CheckCircle2 className="h-4 w-4" />Today</TabsTrigger>
            <TabsTrigger value="all"    className="flex-1 sm:flex-none gap-1.5"><BarChart3 className="h-4 w-4" />All Habits</TabsTrigger>
            <TabsTrigger value="week"   className="flex-1 sm:flex-none gap-1.5"><Calendar className="h-4 w-4" />This Week</TabsTrigger>
          </TabsList>
        </div>

        {/* ── Today ── */}
        <TabsContent value="today" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading habits…</div>
          ) : dueToday.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-muted mx-auto flex items-center justify-center text-3xl">🎯</div>
              <p className="font-semibold text-lg">No habits scheduled today</p>
              <p className="text-sm text-muted-foreground">Add a habit to start tracking your progress</p>
              <Button onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />New Habit
              </Button>
            </div>
          ) : (
            <>
              {/* Pending */}
              {dueToday.filter((h) => !h.completedToday).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Pending</p>
                  {dueToday.filter((h) => !h.completedToday).map((h) => (
                    <HabitCard
                      key={h._id}
                      habit={h}
                      showCheck
                      onToggle={() => toggleMutation.mutate({ id: h._id, completed: true })}
                      onEdit={() => { setEditHabit(h); setAddOpen(true); }}
                      onDelete={() => setDeleteTarget(h)}
                      onToggleActive={() => toggleActiveMutation.mutate({ id: h._id, isActive: !h.isActive })}
                      onClick={() => router.push(`/habits/${h._id}`)}
                    />
                  ))}
                </div>
              )}
              {/* Completed */}
              {dueToday.filter((h) => h.completedToday).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Completed ✅</p>
                  {dueToday.filter((h) => h.completedToday).map((h) => (
                    <HabitCard
                      key={h._id}
                      habit={h}
                      showCheck
                      onToggle={() => toggleMutation.mutate({ id: h._id, completed: false })}
                      onEdit={() => { setEditHabit(h); setAddOpen(true); }}
                      onDelete={() => setDeleteTarget(h)}
                      onToggleActive={() => toggleActiveMutation.mutate({ id: h._id, isActive: !h.isActive })}
                      onClick={() => router.push(`/habits/${h._id}`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── All Habits ── */}
        <TabsContent value="all" className="mt-4 space-y-4">
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {(['All', ...HABIT_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap',
                  filterCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                )}
              >
                {cat !== 'All' && <span className="mr-1">{CATEGORY_META[cat].icon}</span>}
                {cat}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading…</div>
          ) : filteredHabits.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-muted mx-auto flex items-center justify-center text-3xl">🌱</div>
              <p className="font-semibold text-lg">No habits yet</p>
              <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add your first habit</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHabits.map((h) => (
                <HabitCard
                  key={h._id}
                  habit={h}
                  onEdit={() => { setEditHabit(h); setAddOpen(true); }}
                  onDelete={() => setDeleteTarget(h)}
                  onToggleActive={() => toggleActiveMutation.mutate({ id: h._id, isActive: !h.isActive })}
                  onClick={() => router.push(`/habits/${h._id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── This Week ── */}
        <TabsContent value="week" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Week Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <WeekStrip habits={habits} />
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Click any habit to see its full calendar and streak history.
            </p>
            {habits.map((h) => (
              <div
                key={h._id}
                onClick={() => router.push(`/habits/${h._id}`)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: h.color + '33' }}>
                  {h.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{h.name}</p>
                  <p className="text-xs text-muted-foreground">{h.category} · {FREQ_LABELS[h.frequency]}</p>
                </div>
                {h.streak > 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-orange-500 flex-shrink-0">
                    <Flame className="h-3.5 w-3.5" />{h.streak}d
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <HabitFormDialog
        open={addOpen}
        onOpenChange={(v) => { setAddOpen(v); if (!v) setEditHabit(null); }}
        editHabit={editHabit}
        onSaved={() => qc.invalidateQueries({ queryKey: ['habits'] })}
      />

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Habit</DialogTitle>
            <DialogDescription>
              Delete &quot;{deleteTarget?.name}&quot;? This will also delete all completion history and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
