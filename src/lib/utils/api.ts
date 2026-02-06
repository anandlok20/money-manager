import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';

/**
 * Validate that a string is a valid MongoDB ObjectId.
 * Returns an error response if invalid, or null if valid.
 */
export function validateObjectId(id: string, label = 'ID'): NextResponse | null {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, error: `Invalid ${label} format` },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Strip HTML tags and trim whitespace from a string.
 * Prevents stored XSS from text fields.
 */
export function sanitizeText(text: string | undefined | null): string | undefined {
  if (text == null) return undefined;
  return text
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>]/g, '')     // Strip remaining angle brackets
    .trim();
}

/**
 * Sanitize an array of strings (e.g. tags).
 */
export function sanitizeStringArray(arr: string[] | undefined): string[] | undefined {
  if (!arr) return undefined;
  return arr.map(s => s.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim()).filter(Boolean);
}

/**
 * Sanitize all string fields in an object (shallow).
 * Preserves non-string fields as-is.
 */
export function sanitizeTextFields<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeText(value);
    } else if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
      (result as Record<string, unknown>)[key] = sanitizeStringArray(value as string[]);
    }
  }
  return result;
}

/**
 * Standard error handler for API routes.
 * Handles ZodError → 400, everything else → 500.
 */
export function handleApiError(error: unknown, fallbackMessage: string): NextResponse {
  console.error(fallbackMessage + ':', error);

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: error.issues.map((i) => i.message),
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { success: false, error: fallbackMessage },
    { status: 500 }
  );
}
