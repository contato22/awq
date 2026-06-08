// ─── AWQ Security — Rate Limit (in-memory, IP+key based) ─────────────────────
//
// Rate limiter simples em memória. Sliding window por chave (IP, IP+email, etc).
// Adequado pra endpoints sensíveis (login, password reset) em deploy single-region.
//
// LIMITAÇÕES:
//   - Memória local: cada lambda Vercel mantém seu próprio contador. Reduz mas
//     não elimina credential stuffing distribuído. Pra rate-limit estrito,
//     migrar pra Upstash/Vercel KV.
//   - Reseta ao redeploy (aceitável — atacantes não controlam o ciclo do deploy).

interface Bucket {
  hits:    number;
  resetAt: number;
}

const STORE = new Map<string, Bucket>();

// Limpa buckets expirados periodicamente (1× a cada 100 chamadas)
let _gcCounter = 0;
function gc(now: number) {
  if (++_gcCounter % 100 !== 0) return;
  for (const [k, b] of STORE) {
    if (b.resetAt < now) STORE.delete(k);
  }
}

/**
 * Aplica rate-limit numa chave. Retorna `{ allowed, retryAfterMs }`.
 * - `key`        — identificador único (ex: `login:1.2.3.4`)
 * - `limit`      — máx de hits permitidos na janela
 * - `windowMs`   — duração da janela em ms
 */
export function rateLimit(
  key:      string,
  limit:    number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number; remaining: number } {
  const now = Date.now();
  gc(now);

  const bucket = STORE.get(key);

  if (!bucket || bucket.resetAt < now) {
    STORE.set(key, { hits: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0, remaining: limit - 1 };
  }

  bucket.hits += 1;
  if (bucket.hits > limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now, remaining: 0 };
  }
  return { allowed: true, retryAfterMs: 0, remaining: limit - bucket.hits };
}

/**
 * Extrai o IP do cliente respeitando headers de proxy (Vercel envia
 * x-forwarded-for). Cai pra `unknown` se nada estiver disponível.
 */
export function getClientIp(req: { headers: { get: (k: string) => string | null } }): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
