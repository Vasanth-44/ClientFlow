import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// In-memory rate limiter (resets on cold-starts / edge re-deploy)
// For production, replace with an upstash/redis backed store.
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute window
const RATE_LIMIT_MAX = 60;           // max 60 requests per minute per IP

function rateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

// ---------------------------------------------------------------------------
// Stricter limit for AI API routes (more expensive)
// ---------------------------------------------------------------------------
const AI_RATE_LIMIT_MAX = 20; // max 20 AI requests per minute per IP
const aiRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function aiRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = aiRateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    aiRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: AI_RATE_LIMIT_MAX - 1 };
  }

  entry.count += 1;
  if (entry.count > AI_RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: AI_RATE_LIMIT_MAX - entry.count };
}

// ---------------------------------------------------------------------------
// Security headers applied to every response
// ---------------------------------------------------------------------------
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co https://api.openai.com;",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get client IP (Vercel forwards this in x-forwarded-for)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  // ── Apply stricter rate limit for /api/ai ──────────────────────────────────
  if (pathname.startsWith('/api/ai')) {
    const { allowed, remaining } = aiRateLimit(ip);
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many AI requests. Please wait a moment.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': String(AI_RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(AI_RATE_LIMIT_MAX));
    response.headers.set('X-RateLimit-Remaining', String(remaining));

    // Enforce POST-only on AI endpoint
    if (request.method !== 'POST') {
      return new NextResponse(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } }
      );
    }

    // Apply security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  // ── Apply general rate limit for all API routes ───────────────────────────
  if (pathname.startsWith('/api/')) {
    const { allowed, remaining } = rateLimit(ip);
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // ── Apply security headers to all page responses ──────────────────────────
  const response = NextResponse.next();
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
