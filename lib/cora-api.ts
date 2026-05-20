// ─── Cora Bank API Client ──────────────────────────────────────────────────────
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
//   GET  /bank-balance                    → saldo disponível
//   GET  /bank-statement/statement        → extrato (?start=&end=)
//
// Docs: https://developers.cora.com.br/docs/instrucoes-iniciais
//
// NOTE: Node.js fetch does not support mTLS agents — this module uses
// node:https.request() directly. Must run in nodejs runtime (not Edge).

import https from "node:https";

// ─── Config ───────────────────────────────────────────────────────────────────

function env(key: string) {
  return (process.env[key] ?? "").replace(/\\n/g, "\n");
}

const CORA_ENV = (process.env.CORA_ENV ?? "production") as "stage" | "production";

const BASE = CORA_ENV === "stage"
  ? "https://api.stage.cora.com.br"
  : "https://matls-clients.api.cora.com.br";

// ─── Per-account credentials ──────────────────────────────────────────────────

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

// ─── Low-level HTTPS helper (supports mTLS) ───────────────────────────────────

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

// ─── Token cache — keyed by clientId ──────────────────────────────────────────

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

// ─── Statement (Extrato) ──────────────────────────────────────────────────────

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
  const rawAmount = Number(raw.amount ?? raw.value ?? raw.total_amount ?? 0);

  return {
    id:          String(raw.id ?? raw.transaction_id ?? raw.entry_id ?? ""),
    date:        parseDate(raw.date ?? raw.created_at ?? raw.transaction_date ?? raw.competence_date),
    description: String(raw.description ?? raw.title ?? raw.memo ?? raw.name ?? ""),
    amount:      Math.abs(rawAmount),
    direction,
    balance:     raw.balance != null ? Number(raw.balance) : null,
    counterparty: raw.counterparty
      ? String(raw.counterparty)
      : raw.payer
        ? String(raw.payer)
        : raw.recipient
          ? String(raw.recipient)
          : null,
    category: raw.category ? String(raw.category) : null,
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

  // Cora uses 'start' and 'end' (not 'startDate'/'endDate')
  const url = `${BASE}/bank-statement/statement?start=${startDate}&end=${endDate}&perPage=200`;
  const { status, body } = await httpsRequest(
    "GET",
    url,
    { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    creds,
  );

  if (status !== 200) {
    throw new Error(`Cora statement error (HTTP ${status}): ${body}`);
  }

  return extractItems(JSON.parse(body)).map(parseEntry).filter((e) => e.id && e.date);
}

// ─── Account balance ──────────────────────────────────────────────────────────

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
    `${BASE}/bank-balance`,
    { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    creds,
  );

  if (status !== 200) {
    throw new Error(`Cora balance error (HTTP ${status}): ${body}`);
  }

  const json = JSON.parse(body) as Record<string, unknown>;
  // Cora may return amounts in centavos (integer) or reais (float)
  // Detect centavos: if available > 100_000 and has no decimal, assume centavos
  const raw = Number(json.available ?? json.balance ?? json.available_amount ?? json.availableAmount ?? 0);
  const rawBlocked = json.blocked != null ? Number(json.blocked) : (json.blocked_amount != null ? Number(json.blocked_amount) : null);
  const rawTotal   = json.total   != null ? Number(json.total)   : null;

  return {
    available: raw,
    blocked:   rawBlocked,
    total:     rawTotal,
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
