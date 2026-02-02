import { z } from 'zod';
import { MemberType } from '@/types';

const addressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
}).optional();

export const memberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  type: z.nativeEnum(MemberType),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  dateOfBirth: z.date().optional().nullable(),
  relationship: z.string().max(50).optional().or(z.literal('')),
  address: addressSchema,
  notes: z.string().max(500).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

export const updateMemberSchema = memberSchema.partial();

export type MemberInput = z.infer<typeof memberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
