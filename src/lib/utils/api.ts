import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { sanitizeText as sanitizeTextStrong, sanitizeStringArray as sanitizeStringArrayStrong } from './sanitize';

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
 * Delegates to the comprehensive sanitize.ts implementation.
 */
export function sanitizeText(text: string | undefined | null): string | undefined {
  if (text == null) return undefined;
  const result = sanitizeTextStrong(text);
  return result === '' ? undefined : result;
}

/**
 * Sanitize an array of strings (e.g. tags).
 * Delegates to the comprehensive sanitize.ts implementation.
 */
export function sanitizeStringArray(arr: string[] | undefined): string[] | undefined {
  if (!arr) return undefined;
  return sanitizeStringArrayStrong(arr);
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
/**
 * Wraps an async API handler with standard error handling.
 */
export async function withErrorHandler(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    // next/navigation redirect() throws with a NEXT_REDIRECT digest — treat as 401 in API routes
    const digest =
      typeof error === 'object' && error !== null && 'digest' in error
        ? String((error as Record<string, unknown>).digest)
        : '';
    if (digest.startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return handleApiError(error, 'An unexpected error occurred');
  }
}

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
