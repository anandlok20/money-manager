import { z } from 'zod';
import { InvestmentType } from '@/types';

export const investmentSchema = z.object({
  name: z.string().min(2, 'Investment name must be at least 2 characters').max(100, 'Name is too long'),
  type: z.nativeEnum(InvestmentType),
  currentValue: z.number().min(0, 'Value cannot be negative'),
});

export const updateInvestmentSchema = investmentSchema.partial();

export type InvestmentInput = z.infer<typeof investmentSchema>;
export type UpdateInvestmentInput = z.infer<typeof updateInvestmentSchema>;
