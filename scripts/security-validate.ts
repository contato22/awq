#!/usr/bin/env tsx
// ─── AWQ Security — Validation Script ────────────────────────────────────────
//
// Valida o comportamento esperado do RBAC, guard e audit log.
// Roda: npx tsx scripts/security-validate.ts
//
// CRITÉRIOS (do PAPEL):
//   1. hasPermission(owner, qualquer coisa) = true
//   2. hasPermission(viewer, delete, financeiro) = false
//   3. hasPermission(finance, import, financeiro) = true
//   4. hasPermission(operator, update, jacqes) = true
//   5. hasPermission(anonymous, import, financeiro) = false
//   6. guard em api_guarded:
//      - permite owner/admin
//      - bloqueia anonymous em API sensível
//      - gera audit event blocked
//      - gera audit event allowed

import { hasPermission, normalizeRole, SECURITY_ENFORCEMENT_MODE } from "../lib/security-access";
import { guard } from "../lib/security-guard";
import { getRecentAuditEvents, getAuditStats, _clearAuditLog_TESTING_ONLY } from "../lib/security-audit";

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean): void {
  if (condition) {
    console.log(`  ✓  ${description}`);
    passed++;
  } else {
    console.error(`  ✗  ${description}`);
    failed++;
  }
}

// ── Início ────────────────────────────────────────────────────────────────────

console.log("\n══════════════════════════════════════════════════");
console.log("  AWQ Security — Validation Suite");
console.log(`  Enforcement mode: ${SECURITY_ENFORCEMENT_MODE}`);
console.log("══════════════════════════════════════════════════\n");

// ── 1. normalizeRole ──────────────────────────────────────────────────────────

console.log("1. normalizeRole — aliases de roles legados");
assert("analyst  → finance",   normalizeRole("analyst")  === "finance");
assert("cs-ops   → operator",  normalizeRole("cs-ops")   === "operator");
assert("owner    → owner",     normalizeRole("owner")    === "owner");
assert("admin    → admin",     normalizeRole("admin")    === "admin");
assert("viewer   → viewer",    normalizeRole("viewer")   === "viewer");
assert("unknown  → viewer",    normalizeRole("unknown")  === "viewer");
assert("anonymous→ viewer",    normalizeRole("anonymous") === "viewer");

// ── 2. hasPermission — owner tem tudo ────────────────────────────────────────

console.log("\n2. hasPermission — owner: acesso irrestrito");
assert("owner · view    · financeiro",  hasPermission("owner", "financeiro",  "view"));
assert("owner · delete  · financeiro",  hasPermission("owner", "financeiro",  "delete"));
assert("owner · import  · dados_infra", hasPermission("owner", "dados_infra", "import"));
assert("owner · approve · system",      hasPermission("owner", "system",      "approve"));
assert("owner · manage_security · security", hasPermission("owner", "security", "manage_security"));

// ── 3. hasPermission — viewer bloqueado em financeiro ────────────────────────

console.log("\n3. hasPermission — viewer: sem acesso financeiro");
assert("viewer · delete · financeiro  = false",  !hasPermission("viewer", "financeiro",  "delete"));
assert("viewer · view  · financeiro  = false",   !hasPermission("viewer", "financeiro",  "view"));
assert("viewer · import · dados_infra = false",  !hasPermission("viewer", "dados_infra", "import"));
assert("viewer · view  · holding     = true",     hasPermission("viewer", "holding",     "view"));

// ── 4. hasPermission — finance (ex-analyst) ───────────────────────────────────

console.log("\n4. hasPermission — finance (import financeiro, view dados_infra)");
assert("finance · import · financeiro  = true",  hasPermission("finance", "financeiro",  "import"));
assert("finance · view   · financeiro  = true",  hasPermission("finance", "financeiro",  "view"));
assert("finance · export · financeiro  = true",  hasPermission("finance", "financeiro",  "export"));
assert("finance · delete · financeiro  = false", !hasPermission("finance", "financeiro",  "delete"));
assert("finance · import · dados_infra = true",  hasPermission("finance", "dados_infra", "import"));
assert("finance · view   · ai          = true",  hasPermission("finance", "ai",          "view"));
assert("finance · view   · juridico    = false", !hasPermission("finance", "juridico",    "view"));

// ── 5. hasPermission — analyst (alias → finance) ─────────────────────────────

console.log("\n5. hasPermission — analyst (alias legado → finance)");
assert("analyst · import · financeiro  = true",  hasPermission("analyst", "financeiro",  "import"));
assert("analyst · view   · jacqes      = true",  hasPermission("analyst", "jacqes",      "view"));
assert("analyst · delete · financeiro  = false", !hasPermission("analyst", "financeiro",  "delete"));

// ── 6. hasPermission — operator (ex-cs-ops) ──────────────────────────────────

console.log("\n6. hasPermission — operator (view/create/update jacqes)");
assert("operator · view   · jacqes     = true",  hasPermission("operator", "jacqes",     "view"));
assert("operator · create · jacqes     = true",  hasPermission("operator", "jacqes",     "create"));
assert("operator · update · jacqes     = true",  hasPermission("operator", "jacqes",     "update"));
assert("operator · delete · jacqes     = false", !hasPermission("operator", "jacqes",     "delete"));
assert("operator · view   · financeiro = false", !hasPermission("operator", "financeiro", "view"));
assert("operator · view   · security   = false", !hasPermission("operator", "security",   "view"));

// ── 7. hasPermission — cs-ops (alias → operator) ─────────────────────────────

console.log("\n7. hasPermission — cs-ops (alias legado → operator)");
assert("cs-ops · view   · jacqes     = true",  hasPermission("cs-ops", "jacqes",     "view"));
assert("cs-ops · update · jacqes     = true",  hasPermission("cs-ops", "jacqes",     "update"));
assert("cs-ops · view   · financeiro = false", !hasPermission("cs-ops", "financeiro", "view"));

// ── 8. hasPermission — anonymous/unknown ─────────────────────────────────────

console.log("\n8. hasPermission — anonymous: sem acesso a dados sensíveis");
assert("anonymous · import · financeiro  = false", !hasPermission("anonymous", "financeiro",  "import"));
assert("anonymous · view   · financeiro  = false", !hasPermission("anonymous", "financeiro",  "view"));
assert("anonymous · create · jacqes      = false", !hasPermission("anonymous", "jacqes",      "create"));
assert("anonymous · view   · holding     = false", !hasPermission("anonymous", "holding",      "view"));

// ── 9. guard em api_guarded ───────────────────────────────────────────────────

console.log(`\n9. guard — modo ${SECURITY_ENFORCEMENT_MODE}`);
_clearAuditLog_TESTING_ONLY();

// owner: sempre permitido
const ownerGuard = guard("alex@awqgroup.com", "owner", "/api/ingest/upload", "dados_infra", "import", "PDF");
assert("owner · import · dados_infra → allowed",       ownerGuard.result === "allowed");
assert("owner · wouldBeBlocked = false",               !ownerGuard.wouldBeBlocked);

// admin: permitido em dados_infra import
const adminGuard = guard("s.chen@jacqes.com", "admin", "/api/ingest/upload", "dados_infra", "import", "PDF");
assert("admin · import · dados_infra → allowed",       adminGuard.result === "allowed");

// finance (alias de analyst): permitido em dados_infra import
const financeGuard = guard("p.nair@jacqes.com", "analyst", "/api/ingest/upload", "dados_infra", "import", "PDF");
assert("analyst(→finance) · import · dados_infra → allowed", financeGuard.result === "allowed");

// operator: NÃO pode importar dados_infra
const operatorGuard = guard("danilo@jacqes.com", "cs-ops", "/api/ingest/upload", "dados_infra", "import", "PDF");
if (SECURITY_ENFORCEMENT_MODE === "api_guarded" || SECURITY_ENFORCEMENT_MODE === "full") {
  assert("cs-ops(→operator) · import · dados_infra → blocked", operatorGuard.result === "blocked");
} else {
  // audit_only: always allowed, but wouldBeBlocked=true
  assert("cs-ops(→operator) · import · dados_infra → allowed (audit_only)", operatorGuard.result === "allowed");
  assert("cs-ops(→operator) · wouldBeBlocked = true (audit_only)",          operatorGuard.wouldBeBlocked);
}

// anonymous: bloqueado em qualquer dado sensível
const anonGuard = guard("anonymous", "anonymous", "/api/jacqes/crm/leads", "jacqes", "create", "CRM Leads");
if (SECURITY_ENFORCEMENT_MODE === "api_guarded" || SECURITY_ENFORCEMENT_MODE === "full") {
  assert("anonymous · create · jacqes → blocked",      anonGuard.result === "blocked");
} else {
  assert("anonymous · create · jacqes → allowed (audit_only)", anonGuard.result === "allowed");
  assert("anonymous · wouldBeBlocked = true (audit_only)",     anonGuard.wouldBeBlocked);
}

// supervisor: somente owner/admin (approve em system)
const supervisorOwner   = guard("alex@awqgroup.com", "owner",     "/api/supervisor", "system", "approve", "Supervisor");
const supervisorAdmin   = guard("s.chen@jacqes.com", "admin",     "/api/supervisor", "system", "approve", "Supervisor");
const supervisorFinance = guard("p.nair@jacqes.com", "analyst",   "/api/supervisor", "system", "approve", "Supervisor");
assert("owner  · approve · system (supervisor) → allowed", supervisorOwner.result === "allowed");
assert("admin  · approve · system (supervisor) → allowed", supervisorAdmin.result === "allowed");
if (SECURITY_ENFORCEMENT_MODE === "api_guarded" || SECURITY_ENFORCEMENT_MODE === "full") {
  assert("analyst(→finance) · approve · system (supervisor) → blocked", supervisorFinance.result === "blocked");
}

// ── 10. audit log ────────────────────────────────────────────────────────────

console.log("\n10. audit log — allowed e blocked gerados");
const events = getRecentAuditEvents(50);
const stats  = getAuditStats();

assert("audit log tem eventos",          events.length > 0);
assert("stats.total > 0",               stats.total > 0);
assert("todos os eventos têm id",        events.every(e => e.id.startsWith("evt_")));
assert("todos os eventos têm timestamp", events.every(e => Boolean(e.timestamp)));
assert("todos os eventos têm user_id",   events.every(e => Boolean(e.user_id)));
assert("todos os eventos têm reason",    events.every(e => Boolean(e.reason)));

if (SECURITY_ENFORCEMENT_MODE === "api_guarded") {
  assert("audit log tem eventos allowed", stats.allowed > 0);
  assert("audit log tem eventos blocked", stats.blocked > 0);
  console.log(`  ℹ  allowed: ${stats.allowed}, blocked: ${stats.blocked}, total: ${stats.total}`);
} else {
  assert("audit log tem eventos (audit_only)", stats.allowed > 0);
  const wouldBeBlocked = events.filter(e => e.reason.includes("TERIA"));
  console.log(`  ℹ  total: ${stats.total}, would-be-blocked: ${wouldBeBlocked.length}`);
}

// Verificar que nenhum evento tem dado sensível no reason
const sensitiveLeak = events.some(e =>
  e.reason.toLowerCase().includes("secret") ||
  e.reason.toLowerCase().includes("password") ||
  e.reason.toLowerCase().includes("token") ||
  e.reason.toLowerCase().includes("sk-ant")
);
assert("nenhum dado sensível em reason", !sensitiveLeak);
assert("nenhum evento tem user_id vazio", events.every(e => e.user_id !== ""));

// ── Resultado final ───────────────────────────────────────────────────────────

console.log("\n══════════════════════════════════════════════════");
console.log(`  Resultado: ${passed} passed, ${failed} failed`);
console.log("══════════════════════════════════════════════════\n");

if (failed > 0) {
  process.exit(1);
}
