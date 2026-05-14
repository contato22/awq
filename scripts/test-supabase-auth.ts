/**
 * scripts/test-supabase-auth.ts
 *
 * Operational test: verifica leitura e escrita no Supabase Auth.
 *
 * Execução:
 *   npx tsx scripts/test-supabase-auth.ts
 *
 * Requer .env.local com NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * e SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Carrega .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("ERROR: variáveis de ambiente não encontradas. Crie .env.local com:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL");
  console.error("  NEXT_PUBLIC_SUPABASE_ANON_KEY");
  console.error("  SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ── Clientes ────────────────────────────────────────────────────────────────
const anonClient    = createClient(SUPABASE_URL, ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Usuário de teste temporário ───────────────────────────────────────────
const TEST_EMAIL    = `test-ops-${Date.now()}@awq-internal.dev`;
const TEST_PASSWORD = "TestPass@2026!";
const TEST_ROLE     = "analyst";

let createdUserId: string | null = null;

async function pass(label: string) {
  console.log(`  ✓ ${label}`);
}

async function fail(label: string, reason: string) {
  console.error(`  ✗ ${label}: ${reason}`);
  process.exitCode = 1;
}

// ── 1. Conectividade — leitura anónima ────────────────────────────────────
async function testConnectivity() {
  console.log("\n[1] Conectividade com o projeto Supabase");
  try {
    // getSession() sem usuário logado deve retornar session null (sem erro)
    const { data, error } = await anonClient.auth.getSession();
    if (error) return fail("getSession anon", error.message);
    if (data.session !== null) return fail("getSession anon", "esperado session=null");
    pass("getSession anon → null (projeto alcançável)");
  } catch (e: unknown) {
    fail("conectividade", (e as Error).message);
  }
}

// ── 2. Criação de usuário (escrita via admin) ─────────────────────────────
async function testCreateUser() {
  console.log("\n[2] Criação de usuário (admin.createUser)");
  try {
    const { data, error } = await serviceClient.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { name: "Test Ops" },
      app_metadata: { role: TEST_ROLE },
    });
    if (error) return fail("createUser", error.message);
    if (!data.user?.id) return fail("createUser", "user.id ausente");
    createdUserId = data.user.id;
    pass(`createUser → id=${createdUserId}`);

    const storedRole = data.user.app_metadata?.role;
    if (storedRole !== TEST_ROLE) return fail("app_metadata.role", `esperado "${TEST_ROLE}", obtido "${storedRole}"`);
    pass(`app_metadata.role = "${storedRole}"`);
  } catch (e: unknown) {
    fail("createUser", (e as Error).message);
  }
}

// ── 3. Login com email/senha (signInWithPassword) ─────────────────────────
async function testSignIn() {
  console.log("\n[3] Login com email/senha (signInWithPassword)");
  try {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (error) return fail("signInWithPassword", error.message);
    if (!data.session?.access_token) return fail("signIn", "access_token ausente");
    pass("signInWithPassword → access_token OK");

    const role = data.user?.app_metadata?.role;
    if (role !== TEST_ROLE) return fail("app_metadata.role pós-login", `esperado "${TEST_ROLE}", obtido "${role}"`);
    pass(`app_metadata.role pós-login = "${role}"`);
  } catch (e: unknown) {
    fail("signInWithPassword", (e as Error).message);
  }
}

// ── 4. Leitura de usuário autenticado (getUser) ───────────────────────────
async function testGetUser() {
  console.log("\n[4] Leitura de usuário autenticado (getUser)");
  try {
    const { data, error } = await anonClient.auth.getUser();
    if (error) return fail("getUser", error.message);
    if (!data.user?.email) return fail("getUser", "user.email ausente");
    if (data.user.email !== TEST_EMAIL) return fail("getUser", `e-mail errado: ${data.user.email}`);
    pass(`getUser → email=${data.user.email}`);
  } catch (e: unknown) {
    fail("getUser", (e as Error).message);
  }
}

// ── 5. Sign out ───────────────────────────────────────────────────────────
async function testSignOut() {
  console.log("\n[5] Sign out");
  try {
    const { error } = await anonClient.auth.signOut();
    if (error) return fail("signOut", error.message);
    pass("signOut OK");

    const { data } = await anonClient.auth.getSession();
    if (data.session !== null) return fail("pós-signOut session check", "session ainda ativa");
    pass("pós-signOut: session = null");
  } catch (e: unknown) {
    fail("signOut", (e as Error).message);
  }
}

// ── 6. Limpeza — remove usuário de teste ─────────────────────────────────
async function cleanup() {
  console.log("\n[6] Limpeza (deleteUser)");
  if (!createdUserId) return;
  try {
    const { error } = await serviceClient.auth.admin.deleteUser(createdUserId);
    if (error) return fail("deleteUser", error.message);
    pass(`deleteUser → id=${createdUserId} removido`);
  } catch (e: unknown) {
    fail("deleteUser", (e as Error).message);
  }
}

// ── Runner ────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Supabase Auth — Teste Operacional`);
  console.log(`  Projeto: ${SUPABASE_URL}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  await testConnectivity();
  await testCreateUser();
  await testSignIn();
  await testGetUser();
  await testSignOut();
  await cleanup();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (process.exitCode === 1) {
    console.log("  RESULTADO: ✗ Alguns testes falharam");
  } else {
    console.log("  RESULTADO: ✓ Todos os testes passaram");
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
