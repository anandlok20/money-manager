import { z } from 'zod';
import { CategoryType } from '@/types';

export const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(50, 'Name is too long'),
  type: z.nativeEnum(CategoryType),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

export const updateCategorySchema = categorySchema.partial();

export type CategoryInput = z.infer<typeof categorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
