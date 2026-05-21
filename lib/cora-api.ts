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

function credsForAccount(account: "AWQ_Holding" | "JACQES" = "AWQ_Holding"): CoraCredentials {
  if (account === "JACQES") {
    const jId   = env("CORA_JACQES_CLIENT_ID");
    const jCert = env("CORA_JACQES_CERT");
    const jKey  = env("CORA_JACQES_KEY");
    if (jId && jCert && jKey) return { clientId: jId, cert: jCert, key: jKey };
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
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
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

  return {
    id:          String(raw.id ?? raw.transaction_id ?? raw.entry_id ?? ""),
    date:        parseDate(raw.createdAt ?? raw.date ?? raw.created_at ?? raw.transaction_date),
    description,
    amount:      Math.abs(rawAmount),
    direction,
    balance:     null, // Cora does not provide per-entry running balance
    counterparty,
    category,
  };
}

function extractItems(json: unknown): CoraRawEntry[] {
  if (Array.isArray(json)) return json as CoraRawEntry[];
  const obj = json as Record<string, unknown>;
  if (Array.isArray(obj.items))        return obj.items as CoraRawEntry[];
  if (Array.isArray(obj.transactions)) return obj.transactions as CoraRawEntry[];
  if (Array.isArray(obj.data))         return obj.data as CoraRawEntry[];
  if (Array.isArray(obj.entries))      return obj.entries as CoraRawEntry[];
  return [];
}

export async function fetchCoraStatement(
  startDate: string,
  endDate: string,
  account: "AWQ_Holding" | "JACQES" = "AWQ_Holding",
): Promise<CoraStatementEntry[]> {
  const creds = credsForAccount(account);
  const token = await getAccessToken(creds);

  const PER_PAGE = 200;
  const all: CoraStatementEntry[] = [];
  let page = 1;

  while (true) {
    const url = `${BASE}/bank-statement/statement?start=${startDate}&end=${endDate}&perPage=${PER_PAGE}&page=${page}`;
    const { status, body } = await httpsRequest(
      "GET",
      url,
      { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
      creds,
    );

    if (page === 1) console.error("[cora statement raw p1]", status, body.slice(0, 2000));

    if (status !== 200) {
      throw new Error(`Cora statement error (HTTP ${status}): ${body}`);
    }

    const json = JSON.parse(body) as Record<string, unknown>;
    const items = extractItems(json).map(parseEntry).filter((e) => e.id && e.date);
    all.push(...items);

    // Stop when this page is not full — no more pages
    if (items.length < PER_PAGE) break;

    // Also stop if the API tells us total explicitly
    const total = Number((json as Record<string, unknown>).total ?? (json as Record<string, unknown>).totalItems ?? NaN);
    if (!isNaN(total) && all.length >= total) break;

    page++;
  }

  return all;
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
  account: "AWQ_Holding" | "JACQES",
): Promise<CoraBalance> {
  return fetchBalance(credsForAccount(account));
}
