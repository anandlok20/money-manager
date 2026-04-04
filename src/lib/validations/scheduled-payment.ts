import { z } from 'zod';
import { Frequency, AccountType, TransactionType } from '@/types';

// Base schema without refinements for partial()
const scheduledPaymentBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  transactionType: z.nativeEnum(TransactionType),
  categoryId: z.string().optional(),
  frequency: z.nativeEnum(Frequency),
  startDate: z.date(),
  endDate: z.date().optional(),
  amount: z.number().positive('Amount must be positive'),
  note: z.string().max(500, 'Note is too long').optional(),
  memberId: z.string().optional(),
  sourceType: z.nativeEnum(AccountType),
  sourceBankId: z.string().optional(),
  sourceCardId: z.string().optional(),
  destinationType: z.nativeEnum(AccountType).optional(),
  destinationBankId: z.string().optional(),
  destinationCardId: z.string().optional(),
  destinationInvestmentId: z.string().optional(),
});

// Full schema with refinements for create
export const scheduledPaymentSchema = scheduledPaymentBaseSchema
  .refine((data) => {
    // Category required for EXPENSE and INCOME
    if (
      (data.transactionType === TransactionType.EXPENSE ||
        data.transactionType === TransactionType.INCOME) &&
      !data.categoryId
    )
      return false;
    return true;
  }, { message: 'Category is required for expense/income payments' })
  .refine((data) => {
    // Require at least one source account
    if (data.sourceType === AccountType.BANK && !data.sourceBankId) return false;
    if (data.sourceType === AccountType.CARD && !data.sourceCardId) return false;
    return true;
  }, { message: 'Source account is required' })
  .refine((data) => {
    // Destination required only for TRANSFER_SELF and INVESTMENT_CONTRIBUTION
    if (
      data.transactionType === TransactionType.TRANSFER_SELF ||
      data.transactionType === TransactionType.INVESTMENT_CONTRIBUTION
    ) {
      if (!data.destinationType) return false;
      if (data.destinationType === AccountType.BANK && !data.destinationBankId) return false;
      if (data.destinationType === AccountType.CARD && !data.destinationCardId) return false;
      if (data.destinationType === AccountType.INVESTMENT && !data.destinationInvestmentId) return false;
    }
    return true;
  }, { message: 'Destination account is required' });

// Update schema uses the base schema (without refinements) for partial
export const updateScheduledPaymentSchema = scheduledPaymentBaseSchema.partial().refine(
  (data) => {
    // Only enforce category check when transactionType is explicitly being set
    if (
      data.transactionType &&
      (data.transactionType === TransactionType.EXPENSE ||
        data.transactionType === TransactionType.INCOME) &&
      data.categoryId === undefined
    )
      return false;
    return true;
  },
  { message: 'Category is required for expense/income payments' }
);

export type ScheduledPaymentInput = z.infer<typeof scheduledPaymentSchema>;
export type UpdateScheduledPaymentInput = z.infer<typeof updateScheduledPaymentSchema>;
