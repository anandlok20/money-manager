/**
 * Input sanitization utilities to prevent XSS attacks
 * Used to sanitize user-provided text before storing in database
 */

// HTML entities to escape
const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Remove all HTML tags from a string
 */
export function stripHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize a string by stripping HTML and trimming whitespace
 * Use this for simple text fields like names, notes, descriptions
 */
export function sanitizeText(str: string | undefined | null): string {
  if (!str || typeof str !== 'string') return '';
  return stripHtml(str).trim();
}

/**
 * Sanitize and limit string length
 */
export function sanitizeTextWithLimit(str: string | undefined | null, maxLength: number): string {
  const sanitized = sanitizeText(str);
  return sanitized.slice(0, maxLength);
}

/**
 * Sanitize a URL - only allow http, https, and data URIs
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '';
  
  const trimmed = url.trim();
  
  // Only allow specific protocols
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/')
  ) {
    return trimmed;
  }
  
  // If it looks like a relative path, allow it
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  
  return '';
}

/**
 * Sanitize an email address
 */
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email || typeof email !== 'string') return '';
  
  // Basic email sanitization - remove any HTML and trim
  const sanitized = sanitizeText(email).toLowerCase();
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitize a phone number - keep only digits, +, -, spaces, and parentheses
 */
export function sanitizePhone(phone: string | undefined | null): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^0-9+\-\s()]/g, '').trim();
}

/**
 * Sanitize a number input
 */
export function sanitizeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? undefined : num;
}

/**
 * Sanitize an object by applying sanitization to all string fields
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  config: {
    textFields?: (keyof T)[];
    emailFields?: (keyof T)[];
    phoneFields?: (keyof T)[];
    urlFields?: (keyof T)[];
    numberFields?: (keyof T)[];
  } = {}
): T {
  const result = { ...obj };
  
  // Sanitize text fields
  config.textFields?.forEach((field) => {
    if (typeof result[field] === 'string') {
      (result[field] as unknown) = sanitizeText(result[field] as string);
    }
  });
  
  // Sanitize email fields
  config.emailFields?.forEach((field) => {
    if (typeof result[field] === 'string') {
      (result[field] as unknown) = sanitizeEmail(result[field] as string);
    }
  });
  
  // Sanitize phone fields
  config.phoneFields?.forEach((field) => {
    if (typeof result[field] === 'string') {
      (result[field] as unknown) = sanitizePhone(result[field] as string);
    }
  });
  
  // Sanitize URL fields
  config.urlFields?.forEach((field) => {
    if (typeof result[field] === 'string') {
      (result[field] as unknown) = sanitizeUrl(result[field] as string);
    }
  });
  
  // Sanitize number fields
  config.numberFields?.forEach((field) => {
    (result[field] as unknown) = sanitizeNumber(result[field]);
  });
  
  return result;
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item): item is string => typeof item === 'string')
    .map(sanitizeText)
    .filter(Boolean);
}
