import { z } from 'zod';
import { Frequency, AccountType } from '@/types';

// Base schema without refinements for partial()
const scheduledPaymentBaseSchema = z.object({
  frequency: z.nativeEnum(Frequency),
  startDate: z.date(),
  amount: z.number().positive('Amount must be positive'),
  note: z.string().max(500, 'Note is too long').optional(),
  memberId: z.string().optional(),
  sourceType: z.nativeEnum(AccountType),
  sourceBankId: z.string().optional(),
  sourceCardId: z.string().optional(),
  destinationType: z.nativeEnum(AccountType),
  destinationBankId: z.string().optional(),
  destinationCardId: z.string().optional(),
  destinationInvestmentId: z.string().optional(),
});

// Full schema with refinements for create
export const scheduledPaymentSchema = scheduledPaymentBaseSchema.refine((data) => {
  // Require at least one source account
  if (data.sourceType === AccountType.BANK && !data.sourceBankId) return false;
  if (data.sourceType === AccountType.CARD && !data.sourceCardId) return false;
  return true;
}, {
  message: 'Source account is required',
}).refine((data) => {
  // Require at least one destination account
  if (data.destinationType === AccountType.BANK && !data.destinationBankId) return false;
  if (data.destinationType === AccountType.CARD && !data.destinationCardId) return false;
  if (data.destinationType === AccountType.INVESTMENT && !data.destinationInvestmentId) return false;
  return true;
}, {
  message: 'Destination account is required',
});

// Update schema uses the base schema (without refinements) for partial
export const updateScheduledPaymentSchema = scheduledPaymentBaseSchema.partial();

export type ScheduledPaymentInput = z.infer<typeof scheduledPaymentSchema>;
export type UpdateScheduledPaymentInput = z.infer<typeof updateScheduledPaymentSchema>;
