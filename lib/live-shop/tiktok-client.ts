// ─── Live Shop — TikTok Shop Open API client — §14.3 ──────────────────────────
//
// Assinatura HMAC-SHA256, retry/backoff com respeito a rate-limit, refresh
// proativo de token. Segredos vêm SOMENTE de process.env no servidor (§13) —
// este módulo NUNCA contém App Secret/token literais. fetch é injetável p/ teste.
//
// IMPORTANTE: importar apenas de Route Handlers / jobs server-side.

import crypto from "node:crypto";

export const TIKTOK_API_VERSION = "202407"; // versão fixada (§14.2)

export interface TikTokCreds {
  appKey: string;
  appSecret: string;
}

/** Lê credenciais do ambiente (server-side). Lança se ausentes. */
export function readCreds(): TikTokCreds {
  const appKey = process.env.TIKTOK_APP_KEY;
  const appSecret = process.env.TIKTOK_APP_SECRET;
  if (!appKey || !appSecret) {
    throw new Error("TIKTOK_APP_KEY/TIKTOK_APP_SECRET ausentes no ambiente (server-side).");
  }
  return { appKey, appSecret };
}

export function isTikTokConfigured(): boolean {
  return !!(process.env.TIKTOK_APP_KEY && process.env.TIKTOK_APP_SECRET);
}

/**
 * Assinatura do request (§14.3): HMAC-SHA256 sobre
 *   path + (params ordenados por chave, concatenados key+value) + timestamp,
 * com app_secret como envelope (prefixo+sufixo), conforme o padrão TikTok Shop.
 * Determinística — testável offline.
 */
export function signRequest(
  appSecret: string,
  path: string,
  params: Record<string, string | number>,
  timestamp: number,
  body = "",
): string {
  const sorted = Object.keys(params)
    .filter((k) => k !== "sign" && k !== "access_token")
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");
  // base = secret + path + sortedParams + timestamp + body + secret
  const base = `${appSecret}${path}${sorted}${timestamp}${body}${appSecret}`;
  return crypto.createHmac("sha256", appSecret).update(base).digest("hex");
}

/** Verifica assinatura de webhook inbound (timing-safe). */
export function verifyWebhookSignature(appSecret: string, rawBody: string, signature: string): boolean {
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false; // tamanhos diferentes → inválido
  }
}

// ── Token refresh proativo (§14.3) ────────────────────────────────────────────
export interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}
export interface RefreshedToken {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
}

const REFRESH_SKEW_MS = 5 * 60_000; // renova 5 min antes de expirar

export function tokenNeedsRefresh(state: TokenState, now: number): boolean {
  return state.expiresAt - REFRESH_SKEW_MS <= now;
}

/**
 * Garante um access_token válido. Se faltar pouco para expirar, chama
 * `doRefresh` (injeção do POST ao token endpoint) e devolve o novo estado.
 * Assim o teste #15 valida o refresh sem rede real.
 */
export async function ensureValidToken(
  state: TokenState,
  now: number,
  doRefresh: (refreshToken: string) => Promise<RefreshedToken>,
): Promise<TokenState> {
  if (!tokenNeedsRefresh(state, now)) return state;
  const r = await doRefresh(state.refreshToken);
  return {
    accessToken: r.accessToken,
    refreshToken: r.refreshToken,
    expiresAt: now + r.expiresInSec * 1000,
  };
}

// ── HTTP com retry/backoff + rate-limit (§11) ─────────────────────────────────
export interface RetryOpts {
  maxRetries?: number;
  baseDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * GET/POST com backoff exponencial. Repete em 429/5xx respeitando Retry-After.
 * fetch e sleep são injetáveis para teste determinístico.
 */
export async function requestWithRetry(
  url: string,
  init: RequestInit,
  opts: RetryOpts = {},
): Promise<Response> {
  const maxRetries = opts.maxRetries ?? 4;
  const base = opts.baseDelayMs ?? 500;
  const doFetch = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await doFetch(url, init);
      if (res.status === 429 || res.status >= 500) {
        if (attempt === maxRetries) return res;
        const retryAfter = Number(res.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : base * 2 ** attempt;
        await sleep(delay);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt === maxRetries) throw err;
      await sleep(base * 2 ** attempt);
    }
  }
  throw lastErr;
}
