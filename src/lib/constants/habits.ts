export const HABIT_CATEGORIES = [
  'Health',
  'Fitness',
  'Learning',
  'Mindfulness',
  'Productivity',
  'Finance',
  'Social',
  'Creative',
  'Other',
] as const;

export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

export const CATEGORY_META: Record<HabitCategory, { icon: string; color: string }> = {
  Health:       { icon: '🏥', color: '#f43f5e' },
  Fitness:      { icon: '💪', color: '#f97316' },
  Learning:     { icon: '📚', color: '#3b82f6' },
  Mindfulness:  { icon: '🧘', color: '#a855f7' },
  Productivity: { icon: '⚡', color: '#22c55e' },
  Finance:      { icon: '💰', color: '#10b981' },
  Social:       { icon: '👥', color: '#eab308' },
  Creative:     { icon: '🎨', color: '#ec4899' },
  Other:        { icon: '✅', color: '#64748b' },
};
