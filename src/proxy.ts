import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Routes that require authentication
const protectedRoutes = [
  '/transactions',
  '/accounts',
  '/categories',
  '/reports',
  '/budgets',
  '/goals',
  '/trips',
  '/documents',
  '/tax',
  '/vehicles',
  '/members',
  '/scheduled-payments',
  '/settings',
  '/investments',
  '/assets',
  '/subscription',
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

// API routes with stricter rate limiting (5 req/min)
const strictRateLimitedRoutes = [
  '/api/auth/register',
  '/api/auth/callback',
  '/api/auth/signin',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/settings/sensitive-password',
];

// Simple in-memory rate limiter for edge runtime
// NOTE: This is per-instance on serverless — not a distributed limiter.
// For production, replace with Redis via @upstash/ratelimit + UPSTASH_REDIS_REST_URL.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_MAP_SIZE = 10000;

function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    if (rateLimitMap.size >= MAX_MAP_SIZE) cleanupRateLimits();
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { limited: false, remaining: limit - 1, resetTime: now + windowMs };
  }

  if (record.count >= limit) {
    return { limited: true, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { limited: false, remaining: limit - record.count, resetTime: record.resetTime };
}

function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) rateLimitMap.delete(key);
  }
}

/** Apply security headers to any response */
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), magnetometer=(), gyroscope=()'
  );
  // CSP: unsafe-inline required for Next.js style injection until Auth.js v5 nonce migration
  // unsafe-eval required in development for React devtools / Turbopack source maps
  const isDev = process.env.NODE_ENV === 'development';
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";
  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';`
  );
  return response;
}

/** Extract the real client IP — take the FIRST entry in x-forwarded-for (set by the outermost proxy) */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // First IP is the client, subsequent IPs are proxies
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);

  // Rate limit API routes
  if (pathname.startsWith('/api/')) {
    // Stricter rate limiting for auth/sensitive routes
    const isStrict = strictRateLimitedRoutes.some((route) => pathname.startsWith(route));
    const limit = isStrict ? 5 : 100;
    const windowMs = 60_000;

    const { limited, remaining, resetTime } = isRateLimited(`${ip}:${isStrict ? 'strict' : 'std'}`, limit, windowMs);

    if (limited) {
      const res = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
          },
        }
      );
      return applySecurityHeaders(res);
    }

    // Occasionally clean up stale entries
    if (Math.random() < 0.01) cleanupRateLimits();

    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Limit', String(limit));
    res.headers.set('X-RateLimit-Remaining', String(remaining));
    res.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));
    return applySecurityHeaders(res);
  }

  // Check if the route is protected — use exact prefix match (not .includes)
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if it's an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Get the session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing auth route while logged in
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
};
