'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, getDaysInMonth } from 'date-fns';
import {
  ArrowLeft,
  Flame,
  Trophy,
  CheckCircle2,
  Calendar,
  Target,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Pause,
  Play,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button }        from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge }         from '@/components/ui/badge';
import { Progress }      from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CATEGORY_META } from '@/lib/constants/habits';
import type { HabitCategory } from '@/lib/constants/habits';

// ─── types ───────────────────────────────────────────────────────────────────
interface HabitDetail {
  _id: string;
  name: string;
  description?: string;
  category: HabitCategory;
  icon: string;
  color: string;
  frequency: string;
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

interface HabitLog {
  _id: string;
  date: string;
  note?: string;
  completedAt: string;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_ABBR    = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const FREQ_LABELS: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

const CATEGORY_COLORS: Record<string, string> = {
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

// ─── Calendar Heatmap ─────────────────────────────────────────────────────────
function CalendarHeatmap({
  year,
  month,
  completedDates,
  habitColor,
  today,
  onDayClick,
}: {
  year: number;
  month: number; // 1-based
  completedDates: Set<string>;
  habitColor: string;
  today: string;
  onDayClick: (date: string, completed: boolean) => void;
}) {
  const firstDay   = new Date(year, month - 1, 1);
  const lastDay    = new Date(year, month, 0);
  const daysInMonth = getDaysInMonth(firstDay);
  const startOffset = getDay(firstDay); // 0=Sun

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = (d: number) => `${year}-${pad(month)}-${pad(d)}`;

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_ABBR.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} />;
          const ds        = dateStr(day);
          const done      = completedDates.has(ds);
          const isToday   = ds === today;
          const isFuture  = ds > today;

          return (
            <button
              key={ds}
              type="button"
              onClick={() => !isFuture && onDayClick(ds, done)}
              disabled={isFuture}
              title={done ? `${ds} — completed` : ds}
              className={cn(
                'aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all',
                done
                  ? 'text-white shadow-sm'
                  : isToday
                  ? 'ring-2 ring-primary ring-offset-1 bg-muted text-foreground'
                  : isFuture
                  ? 'bg-transparent text-muted-foreground/40 cursor-default'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted',
                isToday && done && 'ring-2 ring-offset-1 ring-primary'
              )}
              style={done ? { backgroundColor: habitColor } : {}}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Streak Heatmap (last 12 weeks GitHub-style) ──────────────────────────────
function StreakHeatmap({ completedDates, color }: { completedDates: Set<string>; color: string }) {
  const today     = new Date();
  const todayStr  = today.toISOString().split('T')[0];
  const weeks     = 15;
  const cells: string[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(today);
      dt.setDate(dt.getDate() - (w * 7 + (6 - d)));
      cells.push(dt.toISOString().split('T')[0]);
    }
  }

  return (
    <div className="space-y-1.5">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {/* Transpose: cells are week-major, we want week columns */}
        {Array.from({ length: weeks }, (_, w) =>
          Array.from({ length: 7 }, (_, d) => {
            const date = cells[w * 7 + d];
            const done = completedDates.has(date);
            const isFuture = date > todayStr;
            return (
              <div
                key={date}
                title={date}
                className={cn(
                  'w-full aspect-square rounded-sm',
                  isFuture ? 'bg-transparent' : done ? '' : 'bg-muted/50'
                )}
                style={done ? { backgroundColor: color } : {}}
              />
            );
          })
        )}
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-muted/50" />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color + '60' }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
        <span>More</span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HabitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const router  = useRouter();
  const qc      = useQueryClient();
  const today   = new Date().toISOString().split('T')[0];

  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Fetch habit detail
  const { data: habit, isLoading: habitLoading } = useQuery<HabitDetail>({
    queryKey: ['habit', id],
    queryFn:  async () => {
      const r = await fetch(`/api/habits/${id}`);
      if (!r.ok) throw new Error();
      return r.json();
    },
  });

  // Fetch monthly logs
  const { data: logsData } = useQuery<{ habit: HabitDetail; logs: HabitLog[] }>({
    queryKey: ['habit-logs', id, calYear, calMonth],
    queryFn:  async () => {
      const r = await fetch(`/api/habits/${id}/logs?year=${calYear}&month=${calMonth}`);
      if (!r.ok) throw new Error();
      return r.json();
    },
    enabled: !!habit,
  });

  // Fetch full history for heatmap (last 6 months)
  const { data: heatmapData } = useQuery<{ logs: HabitLog[] }>({
    queryKey: ['habit-heatmap', id],
    queryFn:  async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const yr  = sixMonthsAgo.getFullYear();
      const mo  = sixMonthsAgo.getMonth() + 1;
      // Fetch a large range — use 12 months
      const r = await fetch(`/api/habits/${id}/logs?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
      return { logs: [] }; // placeholder; heatmap built from all months below
    },
    enabled: false, // we'll build it differently
  });

  // Fetch all logs for heatmap (12 months rolling)
  const allLogsQueries = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  const { data: allLogsList = [] } = useQuery<HabitLog[]>({
    queryKey: ['habit-all-logs', id],
    queryFn:  async () => {
      const results = await Promise.all(
        allLogsQueries.map(({ year, month }) =>
          fetch(`/api/habits/${id}/logs?year=${year}&month=${month}`)
            .then((r) => r.json())
            .then((d: { logs: HabitLog[] }) => d.logs ?? [])
        )
      );
      return results.flat();
    },
    enabled: !!habit,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ date, completed }: { date: string; completed: boolean }) =>
      fetch(`/api/habits/${id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, completed }),
      }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habit', id] });
      qc.invalidateQueries({ queryKey: ['habit-logs', id] });
      qc.invalidateQueries({ queryKey: ['habit-all-logs', id] });
      qc.invalidateQueries({ queryKey: ['habits'] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`/api/habits/${id}`, { method: 'DELETE' }).then((r) => {
      if (!r.ok) throw new Error();
      return r.json();
    }),
    onSuccess: () => {
      toast.success('Habit deleted');
      qc.invalidateQueries({ queryKey: ['habits'] });
      router.push('/habits');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      fetch(`/api/habits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: (_, isActive) => {
      toast.success(isActive ? 'Habit resumed' : 'Habit paused');
      qc.invalidateQueries({ queryKey: ['habit', id] });
      qc.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  if (habitLoading || !habit) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">Loading habit…</div>
      </div>
    );
  }

  const calLogs      = logsData?.logs ?? [];
  const calCompleted = new Set(calLogs.map((l) => l.date));
  const allCompleted = new Set(allLogsList.map((l) => l.date));

  // Completion rate for current month
  const daysInMonth   = new Date(calYear, calMonth, 0).getDate();
  const todayDayNum   = calYear === now.getFullYear() && calMonth === (now.getMonth() + 1)
    ? now.getDate() : daysInMonth;
  const monthRate     = todayDayNum > 0 ? Math.round((calCompleted.size / todayDayNum) * 100) : 0;

  const prevMonth = () => {
    if (calMonth === 1) { setCalYear(calYear - 1); setCalMonth(12); }
    else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalYear(calYear + 1); setCalMonth(1); }
    else setCalMonth(calMonth + 1);
  };
  const canGoNext = calYear < now.getFullYear() || (calYear === now.getFullYear() && calMonth < now.getMonth() + 1);

  // Weekly frequency label
  const daysLabel = habit.targetDays.length > 0
    ? habit.targetDays.map((d) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')
    : 'Every day';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/habits')} className="mt-0.5">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0"
              style={{ backgroundColor: habit.color + '33' }}
            >
              {habit.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{habit.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn('text-xs', CATEGORY_COLORS[habit.category])} variant="secondary">
                  {habit.category}
                </Badge>
                <span className="text-xs text-muted-foreground">{FREQ_LABELS[habit.frequency]}</span>
                {!habit.isActive && <Badge variant="secondary" className="text-xs">Paused</Badge>}
              </div>
            </div>
          </div>
          {habit.description && (
            <p className="text-sm text-muted-foreground mt-2 ml-[60px]">{habit.description}</p>
          )}
        </div>
        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline" size="icon" className="h-9 w-9"
            onClick={() => toggleActiveMutation.mutate(!habit.isActive)}
            title={habit.isActive ? 'Pause' : 'Resume'}
          >
            {habit.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline" size="icon" className="h-9 w-9"
            onClick={() => router.push(`/habits?edit=${id}`)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" size="icon" className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Today's check */}
      <Card className={cn(
        'border-2 transition-all',
        habit.completedToday ? 'border-green-400 bg-green-50 dark:bg-green-900/10' : 'border-primary/30'
      )}>
        <CardContent className="p-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => toggleMutation.mutate({ date: today, completed: !habit.completedToday })}
            className="flex-shrink-0 transition-transform active:scale-90"
          >
            {habit.completedToday
              ? <CheckCircle2 className="h-10 w-10 text-green-500" />
              : <div className="h-10 w-10 rounded-full border-2 border-primary/50 flex items-center justify-center hover:border-primary transition-colors">
                  <CheckCircle2 className="h-6 w-6 text-muted-foreground/40" />
                </div>
            }
          </button>
          <div>
            <p className="font-semibold">
              {habit.completedToday ? '✅ Completed today!' : "Mark today as done"}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Streak + Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-1">🔥</div>
            <p className="text-2xl font-bold text-orange-500">{habit.streak}</p>
            <p className="text-xs text-muted-foreground">Current Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{habit.longestStreak}</p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{habit.totalCompletions}</p>
            <p className="text-xs text-muted-foreground">Total Done</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{monthRate}%</p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Month completion progress */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{MONTH_NAMES[calMonth - 1]} {calYear} — Completions</span>
            <span className="text-muted-foreground">{calCompleted.size} / {todayDayNum} days</span>
          </div>
          <Progress value={monthRate} className="h-2" />
        </CardContent>
      </Card>

      {/* Activity heatmap (15-week rolling) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity — Last 15 Weeks
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[280px]">
            <StreakHeatmap completedDates={allCompleted} color={habit.color} />
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold min-w-[90px] text-center">
                {MONTH_NAMES[calMonth - 1]} {calYear}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth} disabled={!canGoNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CalendarHeatmap
            year={calYear}
            month={calMonth}
            completedDates={calCompleted}
            habitColor={habit.color}
            today={today}
            onDayClick={(date, done) => toggleMutation.mutate({ date, completed: !done })}
          />
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: habit.color }} />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-muted/40" />
              <span>Not completed</span>
            </div>
            <span className="ml-auto">Click to toggle</span>
          </div>
        </CardContent>
      </Card>

      {/* Habit Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Habit Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Frequency</p>
              <p className="font-medium">{FREQ_LABELS[habit.frequency]}</p>
            </div>
            {habit.frequency === 'weekly' && (
              <div>
                <p className="text-xs text-muted-foreground">Target Days</p>
                <p className="font-medium">{daysLabel}</p>
              </div>
            )}
            {habit.frequency !== 'daily' && (
              <div>
                <p className="text-xs text-muted-foreground">Target Count</p>
                <p className="font-medium">{habit.targetCount}× per {habit.frequency === 'weekly' ? 'week' : 'month'}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-medium">{format(new Date(habit.startDate), 'MMM d, yyyy')}</p>
            </div>
            {habit.endDate && (
              <div>
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="font-medium">{format(new Date(habit.endDate), 'MMM d, yyyy')}</p>
              </div>
            )}
            {habit.reminderTime && (
              <div>
                <p className="text-xs text-muted-foreground">Reminder</p>
                <p className="font-medium">{habit.reminderTime}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent logs */}
      {calLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Completion History — {MONTH_NAMES[calMonth - 1]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...calLogs].reverse().slice(0, 10).map((log) => (
              <div key={log._id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{format(new Date(log.date + 'T12:00:00'), 'EEE, MMM d')}</span>
                </div>
                {log.note && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{log.note}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Habit</DialogTitle>
            <DialogDescription>
              Delete &quot;{habit.name}&quot;? All completion history will also be deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
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
