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
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

// API routes that need rate limiting (handled separately)
const rateLimitedApiRoutes = [
  '/api/auth/register',
  '/api/auth/[...nextauth]',
];

// Simple in-memory rate limiter for edge runtime
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  return false;
}

// Clean up old rate limit entries periodically
function cleanupRateLimits() {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 
             request.headers.get('x-real-ip') ?? 
             'unknown';

  // Rate limit API routes
  if (pathname.startsWith('/api/')) {
    // Stricter rate limiting for auth routes
    const isAuthRoute = rateLimitedApiRoutes.some(route => pathname.includes(route.replace('[...nextauth]', '')));
    const limit = isAuthRoute ? 10 : 100; // 10 requests per minute for auth, 100 for others
    
    if (isRateLimited(ip, limit)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    
    // Clean up occasionally
    if (Math.random() < 0.01) cleanupRateLimits();
    
    return NextResponse.next();
  }

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if it's an auth route
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

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

  // Add security headers
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - manifest.json, sw.js (PWA files)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
};
