/**
 * fetch-enerdy-portal.mjs
 *
 * Faz login no app "Controle de Montagem" da ENERDY e exporta a tabela de
 * montagem (installations) para public/data/enerdy-portal/.
 *
 * Arquitetura do portal ENERDY (verificada):
 *   - gestao.enerdy.com.br        → hub de auth/acesso (projeto Supabase
 *                                    atkkcjfylbeijwgctbse; só app_access/profiles/user_roles)
 *   - montagens.enerdy.com.br     → app "Controle de Montagem", projeto Supabase
 *                                    PRÓPRIO (gxgvucnkldzcktdzkkdv) — é AQUI que
 *                                    vivem os dados de montagem (tabela installations)
 * Cada sub-app Lovable tem seu próprio projeto Supabase e seu próprio pool de
 * usuários — as credenciais do hub NÃO valem automaticamente no app de montagem.
 *
 * Autenticação: Supabase Auth (email/senha). A anon key é pública (subject to
 * RLS) e o login é obrigatório — leitura anônima retorna 0 linhas (RLS).
 * O email é derivado do usuário (mesma regra do frontend):
 *   email = `${ENERDY_USER}@enerdy.local`  (sanitizado: [^a-z0-9_.-] removido)
 * Use ENERDY_EMAIL para sobrescrever.
 *
 * Variáveis de ambiente:
 *   ENERDY_SUPABASE_URL       URL do backend (default: gxgvucnkldzcktdzkkdv = montagem)
 *   ENERDY_SUPABASE_ANON_KEY  anon key pública (fallback: embarcada do app de montagem)
 *   ENERDY_USER               usuário do app (ex: miguel_enerdy) → @enerdy.local
 *   ENERDY_EMAIL              email de login (sobrescreve a derivação acima)
 *   ENERDY_PASS               senha de login
 *   ENERDY_TABLE              nome da tabela (default: installations; tenta candidatos)
 *
 * Uso: node scripts/fetch-enerdy-portal.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data", "enerdy-portal");

// ── Config ────────────────────────────────────────────────────────────────────
// Backend do app de montagem (montagens.enerdy.com.br), NÃO o hub de auth.
const SUPABASE_URL =
  process.env.ENERDY_SUPABASE_URL || "https://gxgvucnkldzcktdzkkdv.supabase.co";

// Anon key é pública (subject to RLS) — embarcada no bundle do app de montagem,
// fica hardcoded como fallback (mesmo padrão do ERP_ANON_KEY em lib/supabase.ts).
// Sobrescreva via env para outro projeto.
const ENERDY_ANON_KEY_FALLBACK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4Z3Z1Y25rbGR6Y2t0ZHpra2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODgzOTIsImV4cCI6MjA4ODA2NDM5Mn0.lT1GPmJOU3v12O5RvscEFFSUrf4JeLd77F0j34SiW4Q";
const ANON_KEY =
  process.env.ENERDY_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ENERDY_ANON_KEY_FALLBACK;

// O portal monta o email como `${usuario}@enerdy.local`, sanitizando o usuário
// (remove tudo fora de [a-z0-9_.-]) — idêntico à função do frontend. ENERDY_EMAIL
// tem precedência caso a conta use um email "real".
const ENERDY_EMAIL_DOMAIN = process.env.ENERDY_EMAIL_DOMAIN || "enerdy.local";
function deriveEmail(raw) {
  const e = (raw || "").trim().toLowerCase();
  if (!e) return "";
  if (e.includes("@")) return e;
  return `${e.replace(/[^a-z0-9_.-]/g, "")}@${ENERDY_EMAIL_DOMAIN}`;
}
const EMAIL = process.env.ENERDY_EMAIL || deriveEmail(process.env.ENERDY_USER);
const PASSWORD = process.env.ENERDY_PASS || "";

// Tabela de montagem — nome configurável, com candidatos do app como fallback.
const TABLE_CANDIDATES = [
  process.env.ENERDY_TABLE,
  "installations",
  "montagem",
  "montagens",
  "assembly",
].filter(Boolean);

const PAGE_SIZE = 1000;

// ── Helpers ─────────────────────────────────────────────────────────────────
function write(filename, data) {
  const path = join(OUT_DIR, filename);
  const count = Array.isArray(data) ? data.length : Object.keys(data).length;
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
  console.log(` OK ${filename} (${count} ${Array.isArray(data) ? "registros" : "campos"})`);
}

function isMissingRelation(error) {
  if (!error) return false;
  // PostgREST: 42P01 = undefined_table; PGRST205 = table not found in schema cache
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|not found|could not find the table/i.test(error.message || "")
  );
}

// Busca todas as linhas de uma tabela com paginação por range.
async function fetchAll(supabase, table) {
  const rows = [];
  let from = 0;
  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase.from(table).select("*").range(from, to);
    if (error) return { rows: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { rows, error: null };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  if (!ANON_KEY) {
    console.error(
      "ERRO: anon key ausente. Defina ENERDY_SUPABASE_ANON_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
    process.exit(1);
  }
  if (!EMAIL || !PASSWORD) {
    console.error(
      "ERRO: credenciais ausentes. Defina ENERDY_EMAIL (ou ENERDY_USER) e ENERDY_PASS."
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 1. Login ────────────────────────────────────────────────────────────────
  console.log(`[1/3] Login em ${SUPABASE_URL} como ${EMAIL}...`);
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (authError) {
    console.error(`ERRO de login: ${authError.message}`);
    process.exit(1);
  }
  console.log(`  OK — sessão iniciada (user ${auth.user?.id ?? "?"}).`);

  // ── 2. Buscar tabela de montagem ──────────────────────────────────────────
  console.log(`[2/3] Buscando tabela de montagem (candidatos: ${TABLE_CANDIDATES.join(", ")})...`);
  let table = null;
  let rows = null;
  let lastError = null;
  for (const candidate of TABLE_CANDIDATES) {
    const result = await fetchAll(supabase, candidate);
    if (result.error) {
      lastError = result.error;
      if (isMissingRelation(result.error)) {
        console.log(`  - "${candidate}" não existe, tentando próximo...`);
        continue;
      }
      // Erro real (ex: RLS, permissão) — para de tentar.
      console.error(`  ERRO ao ler "${candidate}": ${result.error.message}`);
      break;
    }
    table = candidate;
    rows = result.rows;
    break;
  }

  if (rows === null) {
    console.error(
      `ERRO: não foi possível ler a tabela de montagem. Último erro: ${lastError?.message ?? "desconhecido"}`
    );
    await supabase.auth.signOut();
    process.exit(1);
  }
  console.log(`  OK — "${table}": ${rows.length} linhas.`);

  // ── 3. Gravar ─────────────────────────────────────────────────────────────
  console.log("[3/3] Gravando em public/data/enerdy-portal/...");
  write(`${table}.json`, rows);
  write("_meta.json", {
    source: SUPABASE_URL,
    portal: "https://gestao.enerdy.com.br",
    table,
    count: rows.length,
    fetchedAt: new Date().toISOString(),
  });

  await supabase.auth.signOut();
  console.log("Concluído — export da ENERDY completo.");
}

main().catch((err) => {
  console.error("fetch-enerdy-portal FATAL:", err.message);
  process.exit(1);
});
