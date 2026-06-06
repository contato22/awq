// ─── Cora Bank API Client ──────────────────────────────────────────────
//
// Authentication: OAuth 2.0 Client Credentials + mTLS (mutual TLS)
//   - client_id   → CORA_CLIENT_ID env var  (AWQ Holding)
//   - certificate → CORA_CERT env var  (PEM, newlines as \n or literal)
//   - private key → CORA_KEY  env var  (PEM, newlines as \n or literal)
//
// For the JACQES account (separate Cora subscription), use:
//   - CORA_JACQES_CLIENT_ID / CORA_JACQES_CERT / CORA_JACQES_KEY
//   If unset, JACQES calls fall back to the primary credentials.
//
// Endpoints (matls-clients.api.cora.com.br):
//   POST /token                           → OAuth2 token
//   GET  /third-party/account/balance     → saldo disponível
//   GET  /bank-statement/statement        → extrato (?start=&end=&page=&perPage=)
//
// Docs: https://developers.cora.com.br/docs/instrucoes-iniciais
//
// NOTE: Node.js fetch does not support mTLS agents — this module uses
// node:https.request() directly. Must run in nodejs runtime (not Edge).

import https from "node:https";

// ─── Config ─────────────────────────────────────────────────────────────────────────

function env(key: string) {
  return (process.env[key] ?? "").replace(/\\n/g, "\n");
}

const CORA_ENV = (process.env.CORA_ENV ?? "production") as "stage" | "production";

const BASE = CORA_ENV === "stage"
  ? "https://api.stage.cora.com.br"
  : "https://matls-clients.api.cora.com.br";

// ─── Per-account credentials ──────────────────────────────────────────────────────────────

interface CoraCredentials {
  clientId: string;
  cert: string;
  key: string;
}

export type CoraAccount = "AWQ_Holding" | "JACQES" | "ENERDY";

function credsForAccount(account: CoraAccount = "AWQ_Holding"): CoraCredentials {
  if (account === "JACQES") {
    const jId   = env("CORA_JACQES_CLIENT_ID");
    const jCert = env("CORA_JACQES_CERT");
    const jKey  = env("CORA_JACQES_KEY");
    if (jId && jCert && jKey) return { clientId: jId, cert: jCert, key: jKey };
    // JACQES sem vars próprias → compartilha AWQ_Holding (comportamento legado intencional)
  }
  if (account === "ENERDY") {
    const eId   = env("CORA_ENERDY_CLIENT_ID");
    const eCert = env("CORA_ENERDY_CERT");
    const eKey  = env("CORA_ENERDY_KEY");
    // ENERDY é empresa separada — nunca usa credenciais de outra conta como fallback
    if (!eId || !eCert || !eKey) {
      throw new Error(
        "Credenciais Enerdy não configuradas. " +
        "Configure CORA_ENERDY_CLIENT_ID, CORA_ENERDY_CERT e CORA_ENERDY_KEY no Vercel."
      );
    }
    return { clientId: eId, cert: eCert, key: eKey };
  }
  return {
    clientId: env("CORA_CLIENT_ID"),
    cert:     env("CORA_CERT"),
    key:      env("CORA_KEY"),
  };
}

export function isCoraConfigured(): boolean {
  const { clientId, cert, key } = credsForAccount("AWQ_Holding");
  return !!(clientId && cert && key);
}

export function isCoraJacqesConfigured(): boolean {
  const jId   = env("CORA_JACQES_CLIENT_ID");
  const jCert = env("CORA_JACQES_CERT");
  const jKey  = env("CORA_JACQES_KEY");
  return !!(jId && jCert && jKey);
}

export function isCoraEnerdyConfigured(): boolean {
  const eId   = env("CORA_ENERDY_CLIENT_ID");
  const eCert = env("CORA_ENERDY_CERT");
  const eKey  = env("CORA_ENERDY_KEY");
  return !!(eId && eCert && eKey);
}

// Diagnostico granular pro card de aviso. Retorna a presenca de cada var
// (e formato PEM esperado pra cert/key), sem expor valores. Server-only.
export function coraEnerdyDiag(): {
  clientId: boolean;
  cert:     { present: boolean; looksPem: boolean };
  key:      { present: boolean; looksPem: boolean };
  ready:    boolean;
} {
  const eId   = env("CORA_ENERDY_CLIENT_ID");
  const eCert = env("CORA_ENERDY_CERT");
  const eKey  = env("CORA_ENERDY_KEY");
  const certPem = /-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/.test(eCert);
  const keyPem  = /-----BEGIN (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----[\s\S]+-----END (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----/.test(eKey);
  return {
    clientId: !!eId,
    cert:     { present: !!eCert, looksPem: certPem },
    key:      { present: !!eKey,  looksPem: keyPem  },
    ready:    !!(eId && eCert && eKey && certPem && keyPem),
  };
}

// ─── Low-level HTTPS helper (supports mTLS) ──────────────────────────────────────────────

interface RawResponse {
  status: number;
  body: string;
}

function httpsRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  creds: CoraCredentials,
  body?: string,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options: https.RequestOptions = {
      hostname: u.hostname,
      port:     443,
      path:     u.pathname + u.search,
      method,
      headers,
      cert: creds.cert || undefined,
      key:  creds.key  || undefined,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
    });

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── Token cache — keyed by clientId ──────────────────────────────────────────────────────

const _tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getAccessToken(creds: CoraCredentials): Promise<string> {
  const cached = _tokenCache.get(creds.clientId);
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id:  creds.clientId,
  });

  const { status, body } = await httpsRequest(
    "POST",
    `${BASE}/token`,
    {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept":       "application/json",
    },
    creds,
    params.toString(),
  );

  if (status !== 200) {
    throw new Error(`Cora auth error (HTTP ${status}): ${body}`);
  }

  const json = JSON.parse(body) as { access_token: string; expires_in?: number };
  _tokenCache.set(creds.clientId, {
    token:     json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  });
  return json.access_token;
}

// ─── Statement (Extrato) ────────────────────────────────────────────────────────────

export interface CoraStatementEntry {
  id: string;
  date: string;           // YYYY-MM-DD (normalised from API response)
  description: string;
  amount: number;         // positive value; use direction for sign
  direction: "credit" | "debit";
  balance: number | null;
  counterparty: string | null;
  category: string | null;
}

type CoraRawEntry = Record<string, unknown>;

function parseDate(raw: unknown): string {
  if (typeof raw !== "string") return "";
  // Timestamp completo (com T) → converter para data em BRT antes de cortar
  // Ex: "2026-05-28T01:00:00Z" (UTC) → "2026-05-27" (BRT, UTC-3)
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    return new Date(raw).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
  }
  // Apenas data YYYY-MM-DD → já no formato correto (Cora envia em BRT)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // Formato DD/MM/YYYY → converter
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("/");
    return `${y}-${m}-${d}`;
  }
  return raw.slice(0, 10);
}

function parseEntry(raw: CoraRawEntry): CoraStatementEntry {
  const rawType = String(raw.type ?? raw.nature ?? raw.entry_type ?? "").toUpperCase();
  const direction: "credit" | "debit" = rawType.includes("DEBIT") ? "debit" : "credit";

  // Cora amounts are in centavos → divide by 100
  const rawAmount = Number(raw.amount ?? raw.value ?? raw.total_amount ?? 0) / 100;

  // Cora nests description, counterparty, and category inside transaction{}
  const tx = raw.transaction as Record<string, unknown> | undefined ?? {} as Record<string, unknown>;
  const cp = tx.counterParty as Record<string, unknown> | undefined ?? {} as Record<string, unknown>;
  const cat = tx.category as Record<string, unknown> | undefined ?? {} as Record<string, unknown>;

  const description = String(
    (tx.description && String(tx.description)) ||
    (raw.description && String(raw.description)) ||
    (tx.type && String(tx.type)) ||
    raw.title || raw.memo || raw.name || "",
  );

  const counterparty =
    (cp.name ? String(cp.name) : null) ??
    (raw.counterparty ? String(raw.counterparty) : null) ??
    (raw.payer ? String(raw.payer) : null) ??
    (raw.recipient ? String(raw.recipient) : null);

  const category =
    (cat.main ? String(cat.main) : null) ??
    (cat.sub  ? String(cat.sub)  : null) ??
    (raw.category ? String(raw.category) : null);

  const id = String(
    raw.id ?? raw.transaction_id ?? raw.entry_id ?? raw.movementId ??
    raw.movement_id ?? raw.statementId ?? raw.statement_id ?? raw.externalId ?? "",
  );

  const rawDate =
    raw.createdAt ?? raw.date ?? raw.created_at ?? raw.transaction_date ??
    raw.eventAt ?? raw.event_at ?? raw.settledAt ?? raw.settled_at ??
    raw.processedAt ?? raw.processed_at ?? raw.dateTime ?? raw.datetime;

  return {
    id,
    date: parseDate(rawDate),
    description,
    amount:      Math.abs(rawAmount),
    direction,
    balance:     null,
    counterparty,
    category,
  };
}

function extractItems(json: unknown): CoraRawEntry[] {
  if (Array.isArray(json)) return json as CoraRawEntry[];
  if (!json || typeof json !== "object") return [];
  const obj = json as Record<string, unknown>;
  // Direct array fields — ordered by likelihood
  for (const k of ["items", "transactions", "data", "entries", "results", "records", "statement", "movements"]) {
    if (Array.isArray(obj[k])) return obj[k] as CoraRawEntry[];
  }
  // Nested: if a top-level value is an object, recurse one level
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const nested = extractItems(v);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

export interface CoraStatementResult {
  entries: CoraStatementEntry[];
  /** Raw first-page JSON for diagnostics (keys + sample). Only set when entries === 0. */
  _debug?: {
    status: number;
    rawBodySample: string;
    topLevelKeys: string[];
    rawItemsCount: number | null;
    rawSample: unknown;
    parsedBeforeFilter: number;
    filteredOut: number;
  };
}

export async function fetchCoraStatement(
  startDate: string,
  endDate: string,
  account: CoraAccount = "AWQ_Holding",
): Promise<CoraStatementResult> {
  const creds = credsForAccount(account);
  const token = await getAccessToken(creds);

  const PER_PAGE = 200;
  const all: CoraStatementEntry[] = [];
  let page = 1;
  let firstPageDebug: CoraStatementResult["_debug"] | undefined;

  // Cora only accepts YYYY-MM-DD (full ISO timestamps cause BST-0000 parse error)
  const startTs = startDate.slice(0, 10);
  const endTs   = endDate.slice(0, 10);

  while (true) {
    const url = `${BASE}/bank-statement/statement?start=${startTs}&end=${endTs}&perPage=${PER_PAGE}&page=${page}`;
    const { status, body } = await httpsRequest(
      "GET",
      url,
      { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
      creds,
    );

    console.error("[cora statement p" + page + "]", status, body.slice(0, 3000));

    if (status !== 200) {
      throw new Error(`Cora statement error (HTTP ${status}): ${body}`);
    }

    let json: Record<string, unknown>;
    try {
      json = JSON.parse(body) as Record<string, unknown>;
    } catch {
      throw new Error(`Cora statement JSON parse error: ${body.slice(0, 500)}`);
    }

    const rawItems = extractItems(json);
    const parsed = rawItems.map(parseEntry);
    const filtered = parsed.filter((e) => e.id && e.date);

    if (page === 1 && filtered.length === 0) {
      const firstRaw = rawItems[0] ?? null;
      firstPageDebug = {
        status,
        rawBodySample: body.slice(0, 800),
        topLevelKeys: Object.keys(json),
        rawItemsCount: rawItems.length,
        rawSample: firstRaw,
        parsedBeforeFilter: parsed.length,
        filteredOut: parsed.filter((e) => !e.id || !e.date).length,
      };
    }

    all.push(...filtered);

    if (filtered.length < PER_PAGE) break;

    const total = Number(json.total ?? json.totalItems ?? json.totalCount ?? NaN);
    if (!isNaN(total) && all.length >= total) break;

    page++;
  }

  return {
    entries: all,
    ...(all.length === 0 ? { _debug: firstPageDebug } : {}),
  };
}

// ─── Account balance ────────────────────────────────────────────────────────────────────

export interface CoraBalance {
  available: number;
  blocked: number | null;
  total: number | null;
  updatedAt: string;
}

async function fetchBalance(creds: CoraCredentials): Promise<CoraBalance> {
  const token = await getAccessToken(creds);
  const { status, body } = await httpsRequest(
    "GET",
    `${BASE}/third-party/account/balance`,
    { "Authorization": `Bearer ${token}`, "Accept": "application/json", "Content-Type": "application/json" },
    creds,
  );

  console.error("[cora balance raw]", status, body);

  if (status !== 200) {
    throw new Error(`Cora balance error (HTTP ${status}): ${body}`);
  }

  const json = JSON.parse(body) as Record<string, unknown>;
  // Cora returns amounts in centavos → divide by 100 to get BRL
  // Response fields: balance (available), blockedBalance
  const rawBalance = Number(json.balance ?? json.available ?? json.available_amount ?? json.availableAmount ?? 0) / 100;
  const rawBlocked = json.blockedBalance != null ? Number(json.blockedBalance) / 100
    : json.blocked != null ? Number(json.blocked) / 100
    : null;

  return {
    available: rawBalance,
    blocked:   rawBlocked,
    total:     rawBlocked != null ? rawBalance + rawBlocked : null,
    updatedAt: String(json.updated_at ?? json.updatedAt ?? json.timestamp ?? new Date().toISOString()),
  };
}

export async function fetchCoraBalance(): Promise<CoraBalance> {
  return fetchBalance(credsForAccount("AWQ_Holding"));
}

export async function fetchCoraBalanceForAccount(
  account: CoraAccount,
): Promise<CoraBalance> {
  return fetchBalance(credsForAccount(account));
}
