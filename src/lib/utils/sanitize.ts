/**
 * Input sanitization utilities to prevent XSS and injection attacks.
 * Used to sanitize user-provided text before storing in the database.
 */

// Private IP ranges for SSRF prevention
const PRIVATE_IP_REGEX =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|0\.|localhost|::1|fc00:|fe80:)/i;

/**
 * Strip HTML tags from a string.
 * Uses multiple passes to catch common XSS bypass patterns:
 *   - Removes all HTML/SVG tags
 *   - Removes event handler attributes
 *   - Strips javascript: / data:text URIs
 */
export function stripHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove script blocks
    .replace(/<style[\s\S]*?<\/style>/gi, '')   // Remove style blocks
    .replace(/<[^>]+on\w+\s*=\s*["'][^"']*["'][^>]*>/gi, '') // Remove event handler tags
    .replace(/<[^>]*>/g, '')                     // Strip remaining tags
    .replace(/javascript\s*:/gi, '')             // Remove javascript: URIs
    .replace(/data\s*:\s*text\/(html|javascript)/gi, '') // Remove data: script URIs
    .trim();
}

/**
 * Escape HTML special characters to prevent XSS when rendering user content.
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize a plain-text field: strip HTML and trim whitespace.
 */
export function sanitizeText(str: string | undefined | null): string {
  if (!str || typeof str !== 'string') return '';
  return stripHtml(str).trim();
}

/**
 * Sanitize and enforce a maximum character length.
 */
export function sanitizeTextWithLimit(str: string | undefined | null, maxLength: number): string {
  return sanitizeText(str).slice(0, maxLength);
}

/**
 * Sanitize a URL.
 * - Only allows http:// and https:// (no data:, javascript:, etc.)
 * - Blocks private/loopback IP addresses to prevent SSRF
 * - Allows relative paths starting with /
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();

  // Allow relative paths (no protocol = no SSRF risk)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    // Only allow safe protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';

    // Block private/loopback addresses to prevent SSRF
    const hostname = parsed.hostname;
    if (PRIVATE_IP_REGEX.test(hostname)) return '';

    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize an email address.
 */
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email || typeof email !== 'string') return '';
  const sanitized = sanitizeText(email).toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitize a phone number — keep only digits, +, -, spaces, and parentheses.
 * Validates basic pattern after stripping.
 */
export function sanitizePhone(phone: string | undefined | null): string {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.replace(/[^0-9+\-\s()]/g, '').trim();
  // Basic pattern: 7-15 chars of digits/separators
  return /^\+?[0-9\-\s()]{7,15}$/.test(cleaned) ? cleaned : '';
}

/**
 * Sanitize a numeric value.
 */
export function sanitizeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? undefined : num;
}

/**
 * Sanitize an object by applying field-type-specific sanitization.
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

  config.textFields?.forEach((field) => {
    if (typeof result[field] === 'string') {
      (result[field] as unknown) = sanitizeText(result[field] as string);
    }
  });

  config.emailFields?.forEach((field) => {
    if (typeof result[field] === 'string') {
      (result[field] as unknown) = sanitizeEmail(result[field] as string);
    }
  });

  config.phoneFields?.forEach((field) => {
    if (typeof result[field] === 'string') {
      (result[field] as unknown) = sanitizePhone(result[field] as string);
    }
  });

  config.urlFields?.forEach((field) => {
    if (typeof result[field] === 'string') {
      (result[field] as unknown) = sanitizeUrl(result[field] as string);
    }
  });

  config.numberFields?.forEach((field) => {
    (result[field] as unknown) = sanitizeNumber(result[field]);
  });

  return result;
}

/**
 * Sanitize an array of strings.
 */
export function sanitizeStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item): item is string => typeof item === 'string')
    .map(sanitizeText)
    .filter(Boolean);
}
