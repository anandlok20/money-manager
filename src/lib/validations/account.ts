import { z } from 'zod';

export const bankAccountSchema = z.object({
  bankName: z.string().min(2, 'Bank name must be at least 2 characters').max(100, 'Bank name is too long'),
  accountHolderName: z.string().min(2, 'Account holder name must be at least 2 characters').max(100, 'Name is too long'),
  accountNumber: z.string().max(30, 'Account number is too long').optional(),
  upiId: z.string().max(100, 'UPI ID is too long').optional(),
  ifscCode: z.string().max(20, 'IFSC code is too long').optional(),
  openingBalance: z.number(),
  linkedMemberIds: z.array(z.string()).optional(),
});

export const updateBankAccountSchema = bankAccountSchema.partial();

export const CardType = z.enum(['CREDIT', 'DEBIT', 'PREPAID', 'FOREX', 'VIRTUAL']);
export const CardNetwork = z.enum(['VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS', 'DISCOVER', 'OTHER']);

export const cardSchema = z.object({
  cardName: z.string().min(2, 'Card name must be at least 2 characters').max(100, 'Card name is too long'),
  cardType: CardType,
  cardNetwork: CardNetwork.optional(),
  cardNumber: z.string().max(19, 'Card number is too long').optional(),
  last4Digits: z.string().length(4, 'Must be exactly 4 digits').regex(/^\d+$/, 'Must contain only numbers').optional(),
  expiryMonth: z.number().int().min(1).max(12).optional(),
  expiryYear: z.number().int().min(2000).max(2100).optional(),
  cvv: z.string().min(3).max(4).optional().or(z.literal('')),
  pin: z.string().min(4).max(6).optional().or(z.literal('')),
  billingCycleDay: z.number().int().min(1).max(31).optional(),
  creditLimit: z.number().positive().optional(),
  linkedBankId: z.string().optional(),
  linkedMemberId: z.string().optional(),
});

export const updateCardSchema = cardSchema.partial();

export type BankAccountInput = z.infer<typeof bankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
export type CardInput = z.infer<typeof cardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
