// Sliding-window in-memory rate limiter for Vercel serverless.
// Per-instance — sufficient for protecting costly AI endpoints against
// accidental bursts. For multi-region distributed limiting, use Upstash Redis.

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Clean up expired windows every 5 minutes to avoid unbounded Map growth.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, win] of store.entries()) {
    if (now >= win.resetAt) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
}

/**
 * Check rate limit for a given key (e.g. `"chat:user@email.com"`).
 *
 * @param key       Unique identifier (route + user)
 * @param limit     Max requests allowed in the window
 * @param windowMs  Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  cleanup();

  const now = Date.now();
  const win = store.get(key);

  if (!win || now >= win.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (win.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: win.resetAt };
  }

  win.count += 1;
  return { allowed: true, remaining: limit - win.count, resetAt: win.resetAt };
}

/** Build standard 429 rate-limit headers. */
export function rateLimitHeaders(result: RateLimitResult, limit: number): HeadersInit {
  const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
  return {
    "X-RateLimit-Limit":     String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset":     String(Math.ceil(result.resetAt / 1000)),
    "Retry-After":           String(retryAfterSec),
  };
}
