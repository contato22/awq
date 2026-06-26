#!/usr/bin/env node
// ─── Fetch Enerdy — Portal "Gestão Enerdy" (gestao.enerdy.com.br) ──────────────
//
// Fetches data from the Gestão Enerdy portal, whose backend is Supabase
// (project atkkcjfylbeijwgctbse). Auth is Supabase GoTrue email+password
// (the same signInWithPassword the SPA uses). NOT the Cora bank API — that
// lives in scripts/fetch-enerdy.mjs.
//
//   node scripts/fetch-enerdy-portal.mjs                  # default tables
//   node scripts/fetch-enerdy-portal.mjs profiles app_access
//   node scripts/fetch-enerdy-portal.mjs --table user_roles
//   node scripts/fetch-enerdy-portal.mjs --no-write       # print only
//
// Env (read from process.env, or .env.local if present):
//   ENERDY_USER   login identifier (Supabase expects an EMAIL; if miguel_enerdy
//                 is a username, set ENERDY_EMAIL with the real e-mail instead)
//   ENERDY_EMAIL  optional — overrides ENERDY_USER as the login e-mail
//   ENERDY_PASS   login password (required to authenticate)
//   ENERDY_SUPABASE_URL       optional — defaults to the project URL below
//   ENERDY_SUPABASE_ANON_KEY  optional — defaults to the public anon key below
//
// NOTE: the Supabase backend (*.supabase.co) must be allowed by the
// environment's network policy. If it is blocked you'll get a connect/TLS
// error — add atkkcjfylbeijwgctbse.supabase.co (or *.supabase.co) to the
// allowlist and open a new session.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "data", "enerdy-portal");

// Public client config — same values the SPA ships in its JS bundle. The anon
// key is a public, RLS-gated client key (role=anon); safe to keep as a fallback,
// matching how scripts/fetch-notion-static.mjs hardcodes public DB IDs.
const DEFAULT_SUPABASE_URL = "https://atkkcjfylbeijwgctbse.supabase.co";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0a2tjamZ5bGJlaWp3Z2N0YnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDE1MDMsImV4cCI6MjA5NDg3NzUwM30.DvNCpeWjF9mNt3L9GwnzUsbeCKQzCIvnT_-Ep8LpPJg";

// Tables the portal hub itself exposes (discovered from the SPA bundle).
const DEFAULT_TABLES = ["profiles", "user_roles", "app_access"];

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
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      if (process.env[key] !== undefined) continue; // real env wins
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const SUPABASE_URL = (process.env.ENERDY_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
const ANON_KEY = process.env.ENERDY_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

// ─── HTTP helper (plain HTTPS — Supabase needs no mTLS) ──────────────────────────

async function req(method, path, { token, body, headers } = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30_000);
  try {
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      method,
      signal: ac.signal,
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${token ?? ANON_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* leave raw */ }
    return { status: res.status, json, text };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Auth ───────────────────────────────────────────────────────────────────────

async function signIn(email, password) {
  const { status, json, text } = await req(
    "POST",
    "/auth/v1/token?grant_type=password",
    { body: { email, password } },
  );
  if (status !== 200 || !json?.access_token) {
    const msg = json?.error_description || json?.msg || json?.error || text || `HTTP ${status}`;
    throw new Error(`Falha no login Supabase (HTTP ${status}): ${msg}`);
  }
  return { token: json.access_token, user: json.user ?? null };
}

// ─── Table fetch (paginated via Range header) ────────────────────────────────────

async function fetchTable(table, token) {
  const PAGE = 1000;
  const rows = [];
  let from = 0;
  while (true) {
    const { status, json, text } = await req(
      "GET",
      `/rest/v1/${encodeURIComponent(table)}?select=*`,
      { token, headers: { Range: `${from}-${from + PAGE - 1}`, Prefer: "count=exact" } },
    );
    if (status !== 200 && status !== 206) {
      const msg = json?.message || json?.hint || text || `HTTP ${status}`;
      throw new Error(`Falha ao ler "${table}" (HTTP ${status}): ${msg}`);
    }
    const batch = Array.isArray(json) ? json : [];
    rows.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = { write: true, tables: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-write") opts.write = false;
    else if (a === "--table") opts.tables.push(argv[++i]);
    else if (/^[a-zA-Z0-9_]+$/.test(a)) opts.tables.push(a);
    else { fail(`Argumento desconhecido: ${a}`); process.exit(1); }
  }
  if (opts.tables.length === 0) opts.tables = [...DEFAULT_TABLES];
  return opts;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadDotEnv();
  const opts = parseArgs(process.argv.slice(2));

  const email = process.env.ENERDY_EMAIL || process.env.ENERDY_USER || "";
  const password = process.env.ENERDY_PASS || "";

  h1("Fetch Enerdy — Portal Gestão Enerdy (Supabase)");
  info(`Backend: ${C.bold}${SUPABASE_URL}${C.reset}`);
  info(`Tabelas: ${C.bold}${opts.tables.join(", ")}${C.reset}`);

  if (!email) { fail("ENERDY_USER (ou ENERDY_EMAIL) não configurado."); process.exit(1); }
  if (!password) {
    fail("ENERDY_PASS não configurado — sem senha não há como autenticar.");
    info("Adicione ENERDY_PASS ao ambiente (ou .env.local) e rode de novo.");
    process.exit(1);
  }
  if (!email.includes("@")) {
    warn(`ENERDY_USER="${email}" não parece um e-mail. O Supabase Auth espera e-mail;`);
    warn(`se o login falhar, defina ENERDY_EMAIL com o e-mail real do usuário.`);
  }

  h1("Login");
  let auth;
  try {
    auth = await signIn(email, password);
    ok(`Autenticado como ${C.bold}${auth.user?.email ?? email}${C.reset}`);
  } catch (e) {
    fail(e.message);
    if (/fetch failed|ENOTFOUND|ECONNREFUSED|tunnel|certificate|EAI_AGAIN|allowlist|egress|not in allow/i.test(e.message)) {
      warn("Parece bloqueio de rede: libere *.supabase.co (host atkkcjfylbeijwgctbse.supabase.co)");
      warn("nas configurações de egress e abra uma nova sessão.");
    }
    process.exit(1);
  }

  h1("Tabelas");
  const result = {};
  let failed = 0;
  for (const table of opts.tables) {
    try {
      const rows = await fetchTable(table, auth.token);
      result[table] = rows;
      ok(`${table}: ${C.bold}${rows.length}${C.reset} linha(s)`);
    } catch (e) {
      failed++;
      result[table] = { error: e.message };
      fail(e.message);
    }
  }

  if (!opts.write) {
    console.log(`\n${C.gray}(--no-write: saída JSON ignorada)${C.reset}`);
    process.exit(failed > 0 ? 1 : 0);
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  h1("Saída");
  const index = { backend: SUPABASE_URL, user: auth.user?.email ?? email, fetchedAt: new Date().toISOString(), tables: {} };
  for (const table of opts.tables) {
    const data = result[table];
    const file = join(OUT_DIR, `${table}.json`);
    writeFileSync(file, JSON.stringify(data, null, 2));
    index.tables[table] = Array.isArray(data) ? data.length : null;
    ok(`Gravado: ${file.replace(ROOT + "/", "")}`);
  }
  writeFileSync(join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2));
  ok(`Gravado: ${join(OUT_DIR, "index.json").replace(ROOT + "/", "")}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  fail(e.message ?? String(e));
  process.exit(1);
});
