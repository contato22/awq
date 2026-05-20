// ─── Cora Bank API Client ──────────────────────────────────────────────────────
//
// Authentication: OAuth 2.0 Client Credentials + mTLS (mutual TLS)
//   - client_id   → CORA_CLIENT_ID env var
//   - certificate → CORA_CERT env var  (PEM, newlines as \n or literal)
//   - private key → CORA_KEY  env var  (PEM, newlines as \n or literal)
//
// Credentials are issued by Cora in the app: Conta → Integrações via APIs.
// Requires CoraPro plan (R$44,90/mês).
//
// Environments (CORA_ENV env var):
//   "stage"      → api.stage.cora.com.br   (sandbox, use stage credentials)
//   "production" → matls-clients.api.cora.com.br  (live data)
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

const CLIENT_ID    = env("CORA_CLIENT_ID");
const CERT         = env("CORA_CERT");
const KEY          = env("CORA_KEY");
const CORA_ENV     = (process.env.CORA_ENV ?? "production") as "stage" | "production";

const API_BASE = CORA_ENV === "stage"
  ? "https://api.stage.cora.com.br"
  : "https://matls-clients.api.cora.com.br";

const TOKEN_URL = CORA_ENV === "stage"
  ? "https://api.stage.cora.com.br/oauth/token"
  : "https://api.cora.com.br/oauth/token";

export function isCoraConfigured(): boolean {
  return !!(CLIENT_ID && CERT && KEY);
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
  body?: string,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options: https.RequestOptions = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method,
      headers,
      // mTLS: present client certificate on every request
      cert: CERT || undefined,
      key:  KEY  || undefined,
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

// ─── Token cache (module-level — lives for the lifetime of the serverless instance) ──

let _token: string | null = null;
let _tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiresAt - 60_000) return _token;

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
  });

  const { status, body } = await httpsRequest(
    "POST",
    TOKEN_URL,
    {
      "Content-Type":  "application/x-www-form-urlencoded",
      "Accept":        "application/json",
    },
    params.toString(),
  );

  if (status !== 200) {
    throw new Error(`Cora auth error (HTTP ${status}): ${body}`);
  }

  const json = JSON.parse(body) as { access_token: string; expires_in?: number };
  _token = json.access_token;
  _tokenExpiresAt = Date.now() + (json.expires_in ?? 3600) * 1000;
  return _token;
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

// Raw response shape from Cora API — field names reflect documented schema.
// Some fields may be absent depending on transaction type; all are optional.
type CoraRawEntry = Record<string, unknown>;

function parseDate(raw: unknown): string {
  if (typeof raw !== "string") return "";
  // Cora returns dates as "YYYY-MM-DD" or "DD/MM/YYYY" or ISO timestamp
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("/");
    return `${y}-${m}-${d}`;
  }
  return raw.slice(0, 10);
}

function parseEntry(raw: CoraRawEntry): CoraStatementEntry {
  // Cora API response fields (based on documented schema; adjust if needed):
  //   id, date, description / title / name, amount / value,
  //   type ("CREDIT"/"DEBIT"), balance, counterparty / counterpart / name
  const rawType = String(raw.type ?? raw.nature ?? "").toUpperCase();
  const direction: "credit" | "debit" = rawType.includes("DEBIT") ? "debit" : "credit";

  const rawAmount = Number(raw.amount ?? raw.value ?? 0);

  return {
    id:           String(raw.id ?? raw.transaction_id ?? raw.entry_id ?? ""),
    date:         parseDate(raw.date ?? raw.created_at ?? raw.transaction_date),
    description:  String(raw.description ?? raw.title ?? raw.memo ?? ""),
    amount:       Math.abs(rawAmount),
    direction,
    balance:      raw.balance != null ? Number(raw.balance) : null,
    counterparty: raw.counterparty
      ? String(raw.counterparty)
      : raw.payer
        ? String(raw.payer)
        : raw.recipient
          ? String(raw.recipient)
          : null,
    category:     raw.category ? String(raw.category) : null,
  };
}

/**
 * Fetch bank statement entries from Cora API.
 *
 * @param startDate YYYY-MM-DD
 * @param endDate   YYYY-MM-DD
 */
export async function fetchCoraStatement(
  startDate: string,
  endDate: string,
): Promise<CoraStatementEntry[]> {
  const token = await getAccessToken();

  const url = `${API_BASE}/bank-statement/statement?startDate=${startDate}&endDate=${endDate}`;
  const { status, body } = await httpsRequest(
    "GET",
    url,
    {
      "Authorization": `Bearer ${token}`,
      "Accept":        "application/json",
    },
  );

  if (status !== 200) {
    throw new Error(`Cora statement error (HTTP ${status}): ${body}`);
  }

  const json = JSON.parse(body) as unknown;

  // Cora may return: an array, or { items: [...] }, or { transactions: [...] }
  const items: CoraRawEntry[] = Array.isArray(json)
    ? json as CoraRawEntry[]
    : Array.isArray((json as Record<string, unknown>).items)
      ? (json as Record<string, unknown[]>).items as CoraRawEntry[]
      : Array.isArray((json as Record<string, unknown>).transactions)
        ? (json as Record<string, unknown[]>).transactions as CoraRawEntry[]
        : [];

  return items.map(parseEntry).filter((e) => e.id && e.date);
}

// ─── Account balance ──────────────────────────────────────────────────────────

export interface CoraBalance {
  available: number;
  blocked: number | null;
  total: number | null;
  updatedAt: string;
}

export async function fetchCoraBalance(): Promise<CoraBalance> {
  const token = await getAccessToken();
  const { status, body } = await httpsRequest(
    "GET",
    `${API_BASE}/bank-statement/balance`,
    { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
  );

  if (status !== 200) {
    throw new Error(`Cora balance error (HTTP ${status}): ${body}`);
  }

  const json = JSON.parse(body) as Record<string, unknown>;
  return {
    available:  Number(json.available ?? json.balance ?? 0),
    blocked:    json.blocked   != null ? Number(json.blocked)   : null,
    total:      json.total     != null ? Number(json.total)     : null,
    updatedAt:  String(json.updated_at ?? json.updatedAt ?? new Date().toISOString()),
  };
}
