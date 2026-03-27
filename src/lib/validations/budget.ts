import { z } from 'zod';

export const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be positive'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  isPrivate: z.boolean().optional(),
});

export const updateBudgetSchema = budgetSchema.partial();

export type BudgetInput = z.infer<typeof budgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
