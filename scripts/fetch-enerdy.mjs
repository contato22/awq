#!/usr/bin/env node
// ─── Fetch Enerdy (Cora BU ENRD) ──────────────────────────────────────────────
//
// Standalone fetcher for the "Cora Enerdy" account (entity ENERDY / BU ENRD).
// Pulls the current balance + bank statement straight from the Cora API using
// OAuth2 client_credentials + mTLS — no running Next.js server required.
//
//   node scripts/fetch-enerdy.mjs                 # last 90 days
//   node scripts/fetch-enerdy.mjs 2026-01-01 2026-06-30
//   node scripts/fetch-enerdy.mjs --start 2026-01-01 --end 2026-06-30
//   node scripts/fetch-enerdy.mjs --no-write      # print only, skip JSON output
//
// Credentials (read from env, or .env.local if present):
//   CORA_ENERDY_CLIENT_ID / CORA_ENERDY_CERT / CORA_ENERDY_KEY
//   …or set CORA_ENERDY_USE_HOLDING=true to fall back to CORA_CLIENT_ID/CERT/KEY.
//
// This mirrors the auth + parsing logic in lib/cora-api.ts so the static output
// matches what the app's /api/cora/* routes would produce for ENERDY.

import https from "node:https";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "data", "financial", "enerdy");

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", red: "\x1b[31m", green: "\x1b[32m",
  yellow: "\x1b[33m", blue: "\x1b[34m", cyan: "\x1b[36m", gray: "\x1b[90m",
};
const ok   = (m) => console.log(`  ${C.green}✓${C.reset} ${m}`);
const warn = (m) => console.log(`  ${C.yellow}⚠${C.reset} ${m}`);
const fail = (m) => console.log(`  ${C.red}✗${C.reset} ${m}`);
const info = (m) => console.log(`  ${C.blue}ℹ${C.reset} ${m}`);
const h1   = (m) => console.log(`\n${C.bold}${C.cyan}▶ ${m}${C.reset}`);

// ─── Lightweight .env.local loader (no dependency) ──────────────────────────────

function loadDotEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = join(ROOT, name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      if (process.env[key] !== undefined) continue; // real env wins
      let val = m[2];
      // strip surrounding quotes, keep escaped \n as-is (normalised later)
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

// PEM env vars store newlines escaped as "\n" — restore real newlines.
const env = (key) => (process.env[key] ?? "").replace(/\\n/g, "\n");

// ─── Cora config ────────────────────────────────────────────────────────────────

const CORA_ENV = (process.env.CORA_ENV ?? "production");
const BASE = CORA_ENV === "stage"
  ? "https://api.stage.cora.com.br"
  : "https://matls-clients.api.cora.com.br";

// Resolve ENERDY credentials with the same fallback rules as lib/cora-api.ts.
function enerdyCreds() {
  const eId = env("CORA_ENERDY_CLIENT_ID");
  const eCert = env("CORA_ENERDY_CERT");
  const eKey = env("CORA_ENERDY_KEY");
  if (eId && eCert && eKey) {
    return { clientId: eId, cert: eCert, key: eKey, source: "CORA_ENERDY_*" };
  }
  const allowHoldingFallback = ["1", "true", "yes"].includes(
    String(process.env.CORA_ENERDY_USE_HOLDING ?? "").toLowerCase(),
  );
  if (allowHoldingFallback) {
    const hId = env("CORA_CLIENT_ID");
    const hCert = env("CORA_CERT");
    const hKey = env("CORA_KEY");
    if (hId && hCert && hKey) {
      return { clientId: hId, cert: hCert, key: hKey, source: "CORA_* (holding fallback)" };
    }
  }
  throw new Error(
    "Credenciais Enerdy não configuradas. Configure CORA_ENERDY_CLIENT_ID, " +
    "CORA_ENERDY_CERT e CORA_ENERDY_KEY (ou CORA_ENERDY_USE_HOLDING=true para " +
    "usar as credenciais AWQ_Holding como fallback).",
  );
}

// ─── Low-level HTTPS (mTLS) — Node fetch can't do client certs ──────────────────

function httpsRequest(method, url, headers, creds, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method,
        headers,
        cert: creds.cert || undefined,
        key: creds.key || undefined,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk.toString(); });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken(creds) {
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.clientId,
  });
  const { status, body } = await httpsRequest(
    "POST",
    `${BASE}/token`,
    { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    creds,
    params.toString(),
  );
  if (status !== 200) throw new Error(`Cora auth error (HTTP ${status}): ${body}`);
  return JSON.parse(body).access_token;
}

// ─── Parsing (mirrors lib/cora-api.ts) ──────────────────────────────────────────

const strOrNull = (raw) => {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  return s === "" ? null : s;
};

function parseDate(raw) {
  if (typeof raw !== "string" || !raw) return "";
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    let normalized = raw;
    const tz = normalized.match(/([+-])(\d{2})(?::?(\d{2}))?$/);
    if (tz) {
      const [, sign, hh, mm = "00"] = tz;
      normalized = normalized.replace(/[+-]\d{2}:?\d{0,2}$/, `${sign}${hh}:${mm}`);
    }
    const d = new Date(normalized);
    if (isNaN(d.getTime())) {
      const datePart = raw.slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : "";
    }
    const out = d.toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : "";
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("/");
    return `${y}-${m}-${d}`;
  }
  const sliced = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(sliced) ? sliced : "";
}

function parseEntry(raw) {
  const rawType = String(raw.type ?? raw.nature ?? raw.entry_type ?? "").toUpperCase();
  const direction = rawType.includes("DEBIT") ? "debit" : "credit";
  const rawAmount = Number(raw.amount ?? raw.value ?? raw.total_amount ?? 0) / 100;

  const tx = (raw.transaction && typeof raw.transaction === "object") ? raw.transaction : {};
  const cp = (tx.counterParty && typeof tx.counterParty === "object") ? tx.counterParty : {};
  const cat = (tx.category && typeof tx.category === "object") ? tx.category : {};

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
    (cat.sub ? String(cat.sub) : null) ??
    (raw.category ? String(raw.category) : null);
  const id = String(
    raw.id ?? raw.transaction_id ?? raw.entry_id ?? raw.movementId ??
    raw.movement_id ?? raw.statementId ?? raw.statement_id ?? raw.externalId ?? "",
  );
  const rawDate =
    raw.createdAt ?? raw.date ?? raw.created_at ?? raw.transaction_date ??
    raw.eventAt ?? raw.event_at ?? raw.settledAt ?? raw.settled_at ??
    raw.processedAt ?? raw.processed_at ?? raw.dateTime ?? raw.datetime;
  const e2eId = strOrNull(
    raw.endToEndId ?? raw.end_to_end_id ?? raw.e2eId ?? raw.e2e_id ??
    tx.endToEndId ?? tx.end_to_end_id ?? tx.identifier,
  );
  const txid = strOrNull(
    raw.txid ?? raw.txId ?? raw.tx_id ?? tx.txid ?? tx.txId ??
    raw.documentNumber ?? raw.document_number,
  );
  const counterDoc = strOrNull(
    cp.document ?? cp.documentNumber ?? cp.identity ?? cp.taxId ??
    raw.counterpartyDocument ?? raw.counterparty_document,
  );

  return {
    id, date: parseDate(rawDate), description,
    amount: Math.abs(rawAmount), direction, balance: null,
    counterparty, category, e2eId, txid, counterDoc,
  };
}

function extractItems(json) {
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== "object") return [];
  for (const k of ["items", "transactions", "data", "entries", "results", "records", "statement", "movements"]) {
    if (Array.isArray(json[k])) return json[k];
  }
  for (const k of Object.keys(json)) {
    const v = json[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const nested = extractItems(v);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

// ─── Cora calls ───────────────────────────────────────────────────────────────

async function fetchBalance(creds, token) {
  const { status, body } = await httpsRequest(
    "GET",
    `${BASE}/third-party/account/balance`,
    { "Authorization": `Bearer ${token}`, "Accept": "application/json", "Content-Type": "application/json" },
    creds,
  );
  if (status !== 200) throw new Error(`Cora balance error (HTTP ${status}): ${body}`);
  const json = JSON.parse(body);
  const available = Number(json.balance ?? json.available ?? json.available_amount ?? json.availableAmount ?? 0) / 100;
  const blocked = json.blockedBalance != null ? Number(json.blockedBalance) / 100
    : json.blocked != null ? Number(json.blocked) / 100 : null;
  return {
    available, blocked,
    total: blocked != null ? available + blocked : null,
    updatedAt: String(json.updated_at ?? json.updatedAt ?? json.timestamp ?? new Date().toISOString()),
  };
}

async function fetchStatement(creds, token, start, end) {
  const PER_PAGE = 200;
  const all = [];
  let page = 1;
  while (true) {
    const url = `${BASE}/bank-statement/statement?start=${start}&end=${end}&perPage=${PER_PAGE}&page=${page}`;
    const { status, body } = await httpsRequest(
      "GET", url, { "Authorization": `Bearer ${token}`, "Accept": "application/json" }, creds,
    );
    if (status !== 200) throw new Error(`Cora statement error (HTTP ${status}): ${body}`);
    let json;
    try { json = JSON.parse(body); }
    catch { throw new Error(`Cora statement JSON parse error: ${body.slice(0, 500)}`); }

    const filtered = extractItems(json).map(parseEntry).filter((e) => e.id && e.date);
    all.push(...filtered);
    if (filtered.length < PER_PAGE) break;
    const total = Number(json.total ?? json.totalItems ?? json.totalCount ?? NaN);
    if (!isNaN(total) && all.length >= total) break;
    page++;
  }
  return all;
}

// ─── CLI args ───────────────────────────────────────────────────────────────────

function ymd(d) {
  return d.toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" }).slice(0, 10);
}

function parseArgs(argv) {
  const opts = { write: true, start: null, end: null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-write") opts.write = false;
    else if (a === "--start") opts.start = argv[++i];
    else if (a === "--end") opts.end = argv[++i];
    else if (/^\d{4}-\d{2}-\d{2}$/.test(a)) positional.push(a);
    else { fail(`Argumento desconhecido: ${a}`); process.exit(1); }
  }
  if (!opts.start && positional[0]) opts.start = positional[0];
  if (!opts.end && positional[1]) opts.end = positional[1];
  if (!opts.end) opts.end = ymd(new Date());
  if (!opts.start) {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    opts.start = ymd(d);
  }
  return opts;
}

const BRL = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadDotEnv();
  const opts = parseArgs(process.argv.slice(2));

  h1("Fetch Enerdy — Cora (BU ENRD)");
  info(`Ambiente Cora: ${C.bold}${CORA_ENV}${C.reset}`);
  info(`Período: ${C.bold}${opts.start}${C.reset} → ${C.bold}${opts.end}${C.reset}`);

  let creds;
  try {
    creds = enerdyCreds();
    ok(`Credenciais: ${creds.source} (client_id ${creds.clientId.slice(0, 6)}…)`);
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  const token = await getAccessToken(creds);
  ok("Token OAuth2 obtido");

  h1("Saldo");
  let balance = null;
  try {
    balance = await fetchBalance(creds, token);
    ok(`Disponível: ${C.bold}${BRL(balance.available)}${C.reset}`);
    if (balance.blocked != null) info(`Bloqueado: ${BRL(balance.blocked)}`);
    if (balance.total != null) info(`Total: ${BRL(balance.total)}`);
  } catch (e) {
    fail(`Falha ao buscar saldo: ${e.message}`);
  }

  h1("Extrato");
  const entries = await fetchStatement(creds, token, opts.start, opts.end);
  const credits = entries.filter((e) => e.direction === "credit");
  const debits = entries.filter((e) => e.direction === "debit");
  const sum = (arr) => arr.reduce((t, e) => t + e.amount, 0);
  const totalCredit = sum(credits);
  const totalDebit = sum(debits);

  ok(`${entries.length} lançamento(s)`);
  info(`Entradas: ${C.green}${BRL(totalCredit)}${C.reset} (${credits.length})`);
  info(`Saídas:   ${C.red}${BRL(totalDebit)}${C.reset} (${debits.length})`);
  info(`Líquido:  ${C.bold}${BRL(totalCredit - totalDebit)}${C.reset}`);

  if (entries.length > 0) {
    console.log(`\n  ${C.gray}Últimos 5 lançamentos:${C.reset}`);
    for (const e of entries.slice(-5)) {
      const sign = e.direction === "credit" ? `${C.green}+` : `${C.red}-`;
      const who = e.counterparty ? ` · ${e.counterparty}` : "";
      console.log(`  ${C.gray}${e.date}${C.reset}  ${sign}${BRL(e.amount)}${C.reset}  ${e.description.slice(0, 50)}${who}`);
    }
  }

  if (!opts.write) {
    console.log(`\n${C.gray}(--no-write: saída JSON ignorada)${C.reset}`);
    return;
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    account: "ENERDY",
    entity: "ENERDY",
    coraEnv: CORA_ENV,
    range: { start: opts.start, end: opts.end },
    fetchedAt: new Date().toISOString(),
    balance,
    summary: {
      count: entries.length,
      credits: credits.length,
      debits: debits.length,
      totalCredit,
      totalDebit,
      net: totalCredit - totalDebit,
    },
    entries,
  };
  const outFile = join(OUT_DIR, "statement.json");
  writeFileSync(outFile, JSON.stringify(payload, null, 2));

  h1("Saída");
  ok(`Gravado: ${outFile.replace(ROOT + "/", "")}`);
}

main().catch((e) => {
  fail(e.message ?? String(e));
  process.exit(1);
});
