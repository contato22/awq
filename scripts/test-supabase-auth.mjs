/**
 * Operational test: Supabase Auth connectivity + read/write verification
 * Run: node scripts/test-supabase-auth.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually (no dotenv dependency needed)
const envPath = resolve(process.cwd(), ".env.local");
const envLines = readFileSync(envPath, "utf8").split("\n");
for (const line of envLines) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ok  = (msg) => console.log(`  ✅  ${msg}`);
const err = (msg) => console.error(`  ❌  ${msg}`);
const hdr = (msg) => console.log(`\n── ${msg}`);

// ─────────────────────────────────────────────────────────────────────────────
hdr("1. Variáveis de ambiente");
if (!URL || !ANON || !SVC) {
  err("Uma ou mais vars Supabase ausentes em .env.local");
  process.exit(1);
}
ok(`URL           : ${URL}`);
ok(`ANON key tail : ...${ANON.slice(-12)}`);
ok(`SVC  key tail : ...${SVC.slice(-12)}`);

// ─────────────────────────────────────────────────────────────────────────────
hdr("2. Admin client — listar usuários Auth");
const admin = createClient(URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: { users }, error: listErr } = await admin.auth.admin.listUsers();
if (listErr) {
  err(`listUsers falhou: ${listErr.message}`);
} else {
  ok(`${users.length} usuário(s) registrado(s) no Supabase Auth:`);
  for (const u of users) {
    console.log(`       • ${u.email}  [role_meta: ${u.user_metadata?.role ?? "—"}]  confirmed: ${!!u.email_confirmed_at}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
hdr("3. Anon client — signInWithPassword (primeiro usuário com email confirmado)");
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

const candidate = users?.find(u => u.email_confirmed_at);
if (!candidate) {
  console.log("  ⚠️   Nenhum usuário com email confirmado encontrado — pulando teste de login.");
  console.log("       Crie usuários pelo Dashboard Supabase > Authentication > Users.");
} else {
  console.log(`  ℹ️   Tentando login com: ${candidate.email}`);
  console.log("       (requer senha correta — este teste só verifica conectividade, não credenciais)");

  // We can't test the actual password here, so we simulate a bad-password call
  // to confirm the auth endpoint is reachable and returning an auth error (not a network error)
  const { error: signErr } = await anon.auth.signInWithPassword({
    email: candidate.email,
    password: "__probe__",
  });
  if (signErr?.message?.includes("Invalid login credentials") ||
      signErr?.message?.includes("invalid_credentials") ||
      signErr?.status === 400) {
    ok(`Endpoint Supabase Auth acessível (esperado: credenciais inválidas → "${signErr.message}")`);
  } else if (signErr) {
    err(`Erro inesperado: ${signErr.message}`);
  } else {
    ok("Login bem-sucedido (senha de probe aceita — verifique política de senhas)");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
hdr("4. Admin client — teste de escrita/leitura (user_metadata update)");
if (users && users.length > 0) {
  const u = users[0];
  const originalMeta = u.user_metadata ?? {};
  const testTag = `probe_${Date.now()}`;

  const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(u.id, {
    user_metadata: { ...originalMeta, _test: testTag },
  });
  if (updErr) {
    err(`updateUserById falhou: ${updErr.message}`);
  } else {
    ok(`user_metadata escrito: _test=${updated.user.user_metadata._test}`);

    // Read back
    const { data: readback, error: readErr } = await admin.auth.admin.getUserById(u.id);
    if (readErr) {
      err(`getUserById falhou: ${readErr.message}`);
    } else if (readback.user.user_metadata._test === testTag) {
      ok(`Leitura confirmada: _test=${readback.user.user_metadata._test}`);
    } else {
      err("Leitura devolveu valor diferente do escrito");
    }

    // Restore original metadata
    await admin.auth.admin.updateUserById(u.id, { user_metadata: originalMeta });
    ok("user_metadata restaurado para estado original");
  }
} else {
  console.log("  ⚠️   Nenhum usuário disponível para teste de escrita.");
}

console.log("\n── Teste concluído\n");
