import { z } from 'zod';

export const goalSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  targetAmount: z
    .number()
    .min(1, 'Target amount must be at least 1'),
  currentAmount: z
    .number()
    .min(0, 'Current amount cannot be negative')
    .optional(),
  deadline: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .optional(),
  icon: z
    .string()
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
  linkedAccountId: z
    .string()
    .optional(),
  isPrivate: z.boolean().optional(),
});

export const goalUpdateSchema = goalSchema.partial();

export const goalContributionSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  note: z.string().max(200, 'Note must be less than 200 characters').optional(),
});

export type GoalInput = z.infer<typeof goalSchema>;
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;
export type GoalContributionInput = z.infer<typeof goalContributionSchema>;
