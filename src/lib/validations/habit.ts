import { z } from 'zod';
import { HABIT_CATEGORIES } from '@/lib/constants/habits';

export const createHabitSchema = z.object({
  name:         z.string().min(1, 'Name is required').max(100),
  description:  z.string().max(500).optional(),
  category:     z.enum(HABIT_CATEGORIES),
  icon:         z.string().min(1),
  color:        z.string().min(1),
  frequency:    z.enum(['daily', 'weekly', 'monthly']),
  targetDays:   z.array(z.number().int().min(0).max(6)),
  targetCount:  z.number().int().min(1),
  reminderTime: z.string().optional(),
  startDate:    z.string().min(1, 'Start date is required'),
  endDate:      z.string().optional(),
});

export const updateHabitSchema = createHabitSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const logHabitSchema = z.object({
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.boolean(),
  note:      z.string().max(300).optional(),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type LogHabitInput    = z.infer<typeof logHabitSchema>;
