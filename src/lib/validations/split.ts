import { z } from 'zod';

export const splitItemInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  memberId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
});

export const createSplitSchema = z.object({
  transactionId: z.string().min(1, 'Transaction is required'),
  splits: z.array(splitItemInputSchema).min(1, 'At least one participant is required'),
  isPrivate: z.boolean().optional(),
});

export const updateSplitSchema = z.object({
  splits: z.array(
    z.object({
      _id: z.string().min(1),
      name: z.string().min(1).max(100).optional(),
      amount: z.number().positive().optional(),
    })
  ).min(1),
});

export const settleSplitSchema = z.object({
  splitItemIds: z.array(z.string().min(1)).min(1),
});

export type CreateSplitInput = z.infer<typeof createSplitSchema>;
export type UpdateSplitInput = z.infer<typeof updateSplitSchema>;
export type SettleSplitInput = z.infer<typeof settleSplitSchema>;
