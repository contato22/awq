#!/usr/bin/env node
// ─── Verifica sincronização Cora vs banco ────────────────────────────────────
//
// Conecta direto na API Cora (mTLS + OAuth2) e no Supabase ERP,
// lista quantas transações existem em cada fonte por período e aponta gaps.
//
// Uso:
//   CORA_CLIENT_ID=xxx CORA_CERT="..." CORA_KEY="..." \
//   ERP_SUPABASE_URL=https://kkhxxsrgsewjfvnnssyf.supabase.co \
//   ERP_SUPABASE_SERVICE_ROLE_KEY=xxx \
//   node scripts/verify-cora-sync.mjs [startDate] [endDate]
//
// Datas: YYYY-MM-DD (padrão: 2026-01-01 até hoje)
// Para verificar JACQES também:
//   CORA_JACQES_CLIENT_ID=xxx CORA_JACQES_CERT="..." CORA_JACQES_KEY="..." \
//   node scripts/verify-cora-sync.mjs

import https from "https";
import { createClient } from "@supabase/supabase-js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function env(key) {
  return (process.env[key] ?? "").replace(/\\n/g, "\n");
}

const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  red:    "\x1b[31m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
  gray:   "\x1b[90m",
};

function log(color, ...args) { console.log(color + args.join(" ") + C.reset); }
function ok(...a)    { log(C.green,  "  ✓", ...a); }
function warn(...a)  { log(C.yellow, "  !", ...a); }
function fail(...a)  { log(C.red,    "  ✗", ...a); }
function info(...a)  { log(C.cyan,   "  →", ...a); }
function dim(...a)   { log(C.gray,   "   ", ...a); }
function bold(...a)  { log(C.bold,   ...a); }
function hr()        { console.log(C.gray + "─".repeat(60) + C.reset); }

function today() { return new Date().toISOString().slice(0, 10); }

// ─── Cora mTLS helper ────────────────────────────────────────────────────────

function httpsRequest(method, url, headers, cert, key, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method,
      headers,
      cert: cert || undefined,
      key:  key  || undefined,
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk.toString(); });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── Cora OAuth2 token ────────────────────────────────────────────────────────

async function getToken(base, creds) {
  const params = new URLSearchParams({ grant_type: "client_credentials", client_id: creds.clientId });
  const res = await httpsRequest(
    "POST",
    `${base}/token`,
    { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    creds.cert, creds.key,
    params.toString(),
  );
  if (res.status !== 200) throw new Error(`Token error HTTP ${res.status}: ${res.body.slice(0, 300)}`);
  return JSON.parse(res.body).access_token;
}

// ─── Extract items from Cora response (handles nested structures) ─────────────

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

// ─── Fetch full Cora statement with pagination ────────────────────────────────

async function fetchStatement(base, token, creds, startDate, endDate) {
  const PER_PAGE = 200;
  const all = [];
  let page = 1;

  while (true) {
    const url = `${base}/bank-statement/statement?start=${startDate}&end=${endDate}&perPage=${PER_PAGE}&page=${page}`;
    const res = await httpsRequest(
      "GET", url,
      { Authorization: `Bearer ${token}`, Accept: "application/json" },
      creds.cert, creds.key,
    );

    if (res.status !== 200) throw new Error(`Statement error HTTP ${res.status}: ${res.body.slice(0, 300)}`);

    const json = JSON.parse(res.body);
    const items = extractItems(json);
    const filtered = items.filter((e) => e.id && (e.createdAt || e.date || e.created_at || e.transaction_date || e.eventAt));

    all.push(...filtered);
    dim(`  página ${page}: ${filtered.length} transações (total acumulado: ${all.length})`);

    if (filtered.length < PER_PAGE) break;
    const total = Number(json.total ?? json.totalItems ?? json.totalCount ?? NaN);
    if (!isNaN(total) && all.length >= total) break;
    page++;
  }

  return all;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startDate = process.argv[2] ?? "2026-01-01";
  const endDate   = process.argv[3] ?? today();

  bold("\n╔══════════════════════════════════════════════════════╗");
  bold(  "║   AWQ — Verificação Cora vs Banco                    ║");
  bold(  "╚══════════════════════════════════════════════════════╝\n");

  info(`Período: ${startDate} → ${endDate}`);

  // ── Credenciais ──────────────────────────────────────────────────────────────

  const clientId = env("CORA_CLIENT_ID");
  const cert     = env("CORA_CERT");
  const key      = env("CORA_KEY");

  if (!clientId || !cert || !key) {
    fail("CORA_CLIENT_ID, CORA_CERT ou CORA_KEY não definidos.");
    fail("Defina as variáveis de ambiente antes de rodar.");
    process.exit(1);
  }

  const jacqesId   = env("CORA_JACQES_CLIENT_ID");
  const jacquesCert = env("CORA_JACQES_CERT");
  const jacqesKey  = env("CORA_JACQES_KEY");
  const hasJacqes  = !!(jacqesId && jacquesCert && jacqesKey);

  const accounts = [
    { label: "AWQ_Holding", creds: { clientId, cert, key } },
    ...(hasJacqes ? [{ label: "JACQES", creds: { clientId: jacqesId, cert: jacquesCert, key: jacqesKey } }] : []),
  ];

  if (!hasJacqes) warn("CORA_JACQES_* não definidos — conta JACQES será pulada.");

  const BASE = process.env.CORA_ENV === "stage"
    ? "https://api.stage.cora.com.br"
    : "https://matls-clients.api.cora.com.br";

  info(`Endpoint Cora: ${BASE}\n`);

  // ── Supabase ──────────────────────────────────────────────────────────────────

  const erpUrl = process.env.ERP_SUPABASE_URL || "https://kkhxxsrgsewjfvnnssyf.supabase.co";
  const erpKey = env("ERP_SUPABASE_SERVICE_ROLE_KEY") || env("NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY");

  let db = null;
  if (erpKey) {
    db = createClient(erpUrl, erpKey, { auth: { persistSession: false } });
    info(`Supabase: ${erpUrl}`);
  } else {
    warn("ERP_SUPABASE_SERVICE_ROLE_KEY não definido — comparação com banco será pulada.");
  }

  // ── Verificação por conta ────────────────────────────────────────────────────

  let totalCoraAll = 0;
  let totalDbAll   = 0;
  let totalMissing = 0;

  for (const acc of accounts) {
    hr();
    bold(`\n[${acc.label}]`);

    // Token
    let token;
    try {
      process.stdout.write("  Obtendo token OAuth2… ");
      token = await getToken(BASE, acc.creds);
      console.log(C.green + "OK" + C.reset);
    } catch (err) {
      fail(`Falha no token: ${err.message}`);
      continue;
    }

    // Saldo
    try {
      process.stdout.write("  Saldo disponível… ");
      const res = await httpsRequest(
        "GET", `${BASE}/third-party/account/balance`,
        { Authorization: `Bearer ${token}`, Accept: "application/json" },
        acc.creds.cert, acc.creds.key,
      );
      if (res.status === 200) {
        const j = JSON.parse(res.body);
        const raw = Number(j.balance ?? j.available ?? j.available_amount ?? 0);
        const brl = (raw / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        console.log(C.green + brl + C.reset);
      } else {
        console.log(C.yellow + `HTTP ${res.status}` + C.reset);
      }
    } catch (err) {
      console.log(C.yellow + `erro: ${err.message}` + C.reset);
    }

    // Extrato
    let coraItems = [];
    try {
      info(`Buscando extrato ${startDate} → ${endDate}…`);
      coraItems = await fetchStatement(BASE, token, acc.creds, startDate, endDate);
      ok(`Cora retornou ${coraItems.length} transações`);
    } catch (err) {
      fail(`Erro ao buscar extrato: ${err.message}`);
      continue;
    }

    totalCoraAll += coraItems.length;

    // Comparação com banco
    if (db) {
      try {
        const { data: dbRows, error } = await db
          .from("bank_transactions")
          .select("id, transaction_date")
          .eq("entity", acc.label)
          .gte("transaction_date", startDate)
          .lte("transaction_date", endDate);

        if (error) throw new Error(error.message);

        const dbIdSet   = new Set((dbRows ?? []).map((r) => r.id));
        const allDbIds  = new Set((dbRows ?? []).map((r) => r.id));
        const coraIdSet = new Set(coraItems.map((e) => `cora-${e.id}`));
        const missing   = [...coraIdSet].filter((id) => !dbIdSet.has(id));

        totalDbAll   += dbRows?.length ?? 0;
        totalMissing += missing.length;

        info(`Banco: ${dbRows?.length ?? 0} transações no período`);

        if (missing.length === 0) {
          ok(`Nenhuma transação faltando — banco está em dia com a Cora!`);
        } else {
          fail(`${missing.length} transação(ões) na Cora que NÃO estão no banco:`);
          for (const id of missing.slice(0, 20)) {
            const raw = coraItems.find((e) => `cora-${e.id}` === id);
            const date = raw?.createdAt ?? raw?.date ?? raw?.created_at ?? "?";
            const desc = raw?.transaction?.description ?? raw?.description ?? raw?.title ?? raw?.memo ?? "sem descrição";
            const amt  = raw?.amount ? `R$ ${(Number(raw.amount) / 100).toFixed(2)}` : "";
            dim(`${id}  ${String(date).slice(0, 10)}  ${amt}  ${String(desc).slice(0, 50)}`);
          }
          if (missing.length > 20) dim(`  … e mais ${missing.length - 20} transações`);
        }

        // Transações no banco que não estão na Cora (possíveis duplicatas/fantasmas)
        const orphans = [...allDbIds].filter((id) => id.startsWith("cora-") && !coraIdSet.has(id));
        if (orphans.length > 0) {
          warn(`${orphans.length} ID(s) no banco com prefixo "cora-" que já não existem na Cora:`);
          for (const id of orphans.slice(0, 10)) dim(`  ${id}`);
        }

      } catch (err) {
        fail(`Erro ao consultar banco: ${err.message}`);
      }
    }
  }

  // ── Resumo final ─────────────────────────────────────────────────────────────

  hr();
  bold("\nResumo:");
  info(`Total na Cora (todas as contas): ${totalCoraAll}`);
  if (db) {
    info(`Total no banco (período):        ${totalDbAll}`);
    if (totalMissing === 0) {
      ok("Nenhum lançamento faltando — sincronização completa!\n");
    } else {
      fail(`${totalMissing} lançamento(s) na Cora faltam no banco.\n`);
      info("Para importar, acesse /awq/conciliacao e clique em 'Varredura'");
      info("ou chame: POST /api/cora/sync  { startDate: '2026-01-01', endDate: '...' }\n");
    }
  }
}

main().catch((err) => {
  console.error(C.red + "\nErro fatal: " + err.message + C.reset);
  process.exit(1);
});
