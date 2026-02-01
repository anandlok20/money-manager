import { z } from 'zod';
import { TransactionType, AccountType } from '@/types';

export const transactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive('Amount must be positive'),
  dateTime: z.coerce.date(),
  note: z.string().max(500, 'Note is too long').optional(),
  categoryId: z.string().optional(),
  memberId: z.string().optional(),
  tripId: z.string().optional(),
  sourceType: z.nativeEnum(AccountType).optional(),
  sourceBankId: z.string().optional(),
  sourceCardId: z.string().optional(),
  destinationType: z.nativeEnum(AccountType).optional(),
  destinationBankId: z.string().optional(),
  destinationCardId: z.string().optional(),
  destinationInvestmentId: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
}).refine((data) => {
  // For EXPENSE and INCOME, require category and source
  if (data.type === TransactionType.EXPENSE || data.type === TransactionType.INCOME) {
    if (!data.categoryId) return false;
    if (!data.sourceType) return false;
    if (data.sourceType === AccountType.BANK && !data.sourceBankId) return false;
    if (data.sourceType === AccountType.CARD && !data.sourceCardId) return false;
  }
  return true;
}, {
  message: 'Category and source account are required for income/expense transactions',
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
  type: z.nativeEnum(TransactionType).optional(),
  categoryId: z.string().optional(),
  memberId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(10000).default(20),
});

export const updateTransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  date: z.date().optional(),
  sourceAccountId: z.string().optional(),
  destinationAccountId: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  memberId: z.string().nullable().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
