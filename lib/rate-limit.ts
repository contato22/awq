// Sliding window in memory. On Vercel each isolate has its own map, so this
// slows credential stuffing on one instance and does not replace a shared store.

export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();
  private now: () => number;

  constructor(now?: () => number) {
    this.now = now ?? Date.now;
  }

  count(key: string, windowMs: number): number {
    const cutoff = this.now() - windowMs;
    const kept = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (kept.length) this.hits.set(key, kept);
    else this.hits.delete(key);
    return kept.length;
  }

  hit(key: string, windowMs: number): void {
    const cutoff = this.now() - windowMs;
    const kept = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    kept.push(this.now());
    this.hits.set(key, kept);
  }
}

const WINDOW_MS = 5 * 60 * 1000;
const MAX_PER_ACCOUNT = 5;
const MAX_PER_IP = 20;

const loginLimiter = new SlidingWindowLimiter();

function accountKey(ip: string, email: string): string {
  return `acct:${ip}|${email}`;
}

/** True when this attempt must be rejected before checking the password. */
export function loginAttemptBlocked(ip: string, email: string): boolean {
  if (loginLimiter.count(accountKey(ip, email), WINDOW_MS) >= MAX_PER_ACCOUNT) return true;
  if (ip !== "unknown" && loginLimiter.count(`ip:${ip}`, WINDOW_MS) >= MAX_PER_IP) return true;
  return false;
}

export function recordLoginFailure(ip: string, email: string): void {
  loginLimiter.hit(accountKey(ip, email), WINDOW_MS);
  if (ip !== "unknown") loginLimiter.hit(`ip:${ip}`, WINDOW_MS);
}

export function clientIpFromHeaders(headers: { get?(name: string): string | null } | Record<string, string | string[] | undefined> | undefined): string {
  if (!headers) return "unknown";
  const read = (name: string): string => {
    if (typeof (headers as { get?: unknown }).get === "function") {
      return (headers as { get(name: string): string | null }).get(name) ?? "";
    }
    const value = (headers as Record<string, string | string[] | undefined>)[name];
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
  };
  const forwarded = read("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim() || "unknown";
  const real = read("x-real-ip");
  return real.trim() || "unknown";
}
