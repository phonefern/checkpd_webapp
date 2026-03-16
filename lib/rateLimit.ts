/**
 * Simple in-memory rate limiter for PDF endpoints.
 * Limits by identifier (e.g. IP): maxRequests per windowMs.
 * Note: On serverless (Vercel) this is per-instance; for multi-instance use Redis (e.g. @upstash/ratelimit).
 */
const store = new Map<string, { count: number; resetAt: number }>();

const defaultLimit = 15;
const defaultWindowMs = 60 * 1000; // 1 minute

export function checkRateLimit(
  identifier: string,
  maxRequests: number = defaultLimit,
  windowMs: number = defaultWindowMs
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (now >= entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count += 1;
  const remaining = Math.max(0, maxRequests - entry.count);
  const ok = entry.count <= maxRequests;
  return { ok, remaining, resetAt: entry.resetAt };
}

export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  return ip;
}
