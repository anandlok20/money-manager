import { z } from 'zod';
import { TransactionType, AccountType } from '@/types';

export const transactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive('Amount must be positive'),
  dateTime: z.date(),
  note: z.string().max(500, 'Note is too long').optional(),
  categoryId: z.string().optional(),
  memberId: z.string().optional(),
  tripId: z.string().optional(),
  goalId: z.string().optional(),
  sourceType: z.nativeEnum(AccountType).optional(),
  sourceBankId: z.string().optional(),
  sourceCardId: z.string().optional(),
  destinationType: z.nativeEnum(AccountType).optional(),
  destinationBankId: z.string().optional(),
  destinationCardId: z.string().optional(),
  destinationInvestmentId: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
}).refine((data) => {
  // For EXPENSE and INCOME, category is required but source is optional
  if (data.type === TransactionType.EXPENSE || data.type === TransactionType.INCOME) {
    if (!data.categoryId) return false;
    // Source account is now optional - only validate if sourceType is provided
    if (data.sourceType === AccountType.BANK && !data.sourceBankId) return false;
    if (data.sourceType === AccountType.CARD && !data.sourceCardId) return false;
  }
  return true;
}, {
  message: 'Category is required for income/expense transactions',
}).refine((data) => {
  // For TRANSFER_SELF, require source and destination
  if (data.type === TransactionType.TRANSFER_SELF) {
    if (!data.sourceType || !data.destinationType) return false;
    // Prevent same account transfer
    if (data.sourceBankId && data.sourceBankId === data.destinationBankId) return false;
    if (data.sourceCardId && data.sourceCardId === data.destinationCardId) return false;
  }
  return true;
}, {
  message: 'Source and destination are required for transfers and cannot be the same',
}).refine((data) => {
  // For INVESTMENT_CONTRIBUTION, require source and destination investment
  if (data.type === TransactionType.INVESTMENT_CONTRIBUTION) {
    if (!data.sourceType) return false;
    if (!data.destinationInvestmentId) return false;
  }
  return true;
}, {
  message: 'Source account and investment are required for investment contributions',
});

export const transactionFiltersSchema = z.object({
  // Accept any case — coerce to uppercase so callers can pass "expense" or "EXPENSE"
  type: z.string().transform((v) => v.toUpperCase()).pipe(z.nativeEnum(TransactionType)).optional(),
  categoryId: z.string().optional(),
  memberId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().positive().optional(),
  page: z.number().int().positive().default(1),
  // Allow up to 1000 for full-page data exports (budgets/reports/member views)
  limit: z.number().int().positive().max(1000).default(20),
});

export const updateTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  dateTime: z.date().optional(),
  note: z.string().max(500, 'Note is too long').optional(),
  categoryId: z.string().nullable().optional(),
  memberId: z.string().nullable().optional(),
  tripId: z.string().nullable().optional(),
  goalId: z.string().nullable().optional(),
  sourceType: z.nativeEnum(AccountType).optional(),
  sourceBankId: z.string().nullable().optional(),
  sourceCardId: z.string().nullable().optional(),
  destinationType: z.nativeEnum(AccountType).optional(),
  destinationBankId: z.string().nullable().optional(),
  destinationCardId: z.string().nullable().optional(),
  destinationInvestmentId: z.string().nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
