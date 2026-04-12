#!/usr/bin/env tsx
// ─── AWQ Security — Validation Script (v2) ───────────────────────────────────
// npx tsx scripts/security-validate.ts

import { hasPermission, normalizeRole, SECURITY_ENFORCEMENT_MODE } from "../lib/security-access";
import { guard } from "../lib/security-guard";
import { getRecentAuditEvents, getAuditStats, _clearAuditLog_TESTING_ONLY } from "../lib/security-audit";
import { SENSITIVE_APIS, SENSITIVE_ROUTES } from "../lib/security-registry";

let passed = 0;
let failed = 0;

function assert(desc: string, cond: boolean): void {
  if (cond) { console.log(`  ✓  ${desc}`); passed++; }
  else      { console.error(`  ✗  ${desc}`); failed++; }
}

console.log("\n══════════════════════════════════════════════════");
console.log("  AWQ Security v2 — Validation Suite");
console.log(`  Enforcement: ${SECURITY_ENFORCEMENT_MODE}`);
console.log("══════════════════════════════════════════════════\n");

// 1. normalizeRole
console.log("1. normalizeRole");
assert("analyst→finance",   normalizeRole("analyst")   === "finance");
assert("cs-ops→operator",   normalizeRole("cs-ops")    === "operator");
assert("owner→owner",       normalizeRole("owner")     === "owner");
assert("unknown→viewer",    normalizeRole("unknown")   === "viewer");

// 2. hasPermission — owner
console.log("\n2. hasPermission — owner");
assert("owner·view·financeiro",          hasPermission("owner", "financeiro",  "view"));
assert("owner·delete·financeiro",        hasPermission("owner", "financeiro",  "delete"));
assert("owner·manage_security·security", hasPermission("owner", "security",    "manage_security"));

// 3. hasPermission — viewer blocked
console.log("\n3. hasPermission — viewer blocked");
assert("viewer·delete·financeiro=false", !hasPermission("viewer", "financeiro", "delete"));
assert("viewer·view·financeiro=false",   !hasPermission("viewer", "financeiro", "view"));
assert("viewer·view·holding=true",        hasPermission("viewer", "holding",    "view"));

// 4. hasPermission — finance
console.log("\n4. hasPermission — finance");
assert("finance·import·financeiro=true", hasPermission("finance", "financeiro", "import"));
assert("finance·view·ai=true",          hasPermission("finance", "ai",         "view"));
assert("analyst·import·financeiro=true", hasPermission("analyst", "financeiro", "import"));

// 5. hasPermission — operator
console.log("\n5. hasPermission — operator");
assert("operator·update·jacqes=true",    hasPermission("operator", "jacqes",     "update"));
assert("operator·update·caza_vision=false", !hasPermission("operator", "caza_vision", "update"));
assert("operator·view·caza_vision=true",  hasPermission("operator", "caza_vision", "view"));

// 6. hasPermission — anonymous
console.log("\n6. hasPermission — anonymous");
assert("anonymous·view·security=false",  !hasPermission("anonymous", "security",   "view"));
assert("anonymous·import·financeiro=false", !hasPermission("anonymous", "financeiro", "import"));

// 7. guard + audit (sync tests — in-memory fallback)
console.log("\n7. guard + audit log");
_clearAuditLog_TESTING_ONLY();

const g1 = guard("alex@awqgroup.com", "owner",     "/api/ingest/upload",   "dados_infra", "import", "PDF");
const g2 = guard("anonymous",         "anonymous",  "/api/jacqes/crm/leads","jacqes",      "create", "CRM");
const g3 = guard("p.nair@jacqes.com", "analyst",    "/api/security/audit",  "security",    "view",   "Audit log");

assert("owner→allowed",                g1.result === "allowed");
assert("anonymous→blocked",            g2.result === "blocked");
assert("analyst(→finance)→security→blocked", g3.result === "blocked");

// 8-10: async tests wrapped in IIFE
(async () => {
  // 8. audit events in memory (async because getRecentAuditEvents is now async)
  console.log("\n8. audit events in-memory");
  const memEvents = await getRecentAuditEvents(50);
  const memStats  = await getAuditStats();
  assert("eventos gerados",                 memEvents.length >= 3);
  assert("stats.total >= 3",               memStats.total >= 3);
  assert("has allowed",                     memStats.allowed > 0);
  assert("has blocked",                     memStats.blocked > 0);
  assert("todos têm id",                   memEvents.every(e => e.id.startsWith("evt_")));
  assert("todos têm timestamp",            memEvents.every(e => Boolean(e.timestamp)));
  assert("nenhum secret em reason",        memEvents.every(e => !e.reason.toLowerCase().includes("secret") && !e.reason.toLowerCase().includes("sk-ant")));
  assert("persistent field presente",       typeof memStats.persistent === "boolean");

  // 9. security registry coverage
  console.log("\n9. security registry coverage");
  const guardedCount    = SENSITIVE_APIS.filter(a => a.guardStatus === "guarded").length;
  const registeredCount = SENSITIVE_APIS.filter(a => a.guardStatus === "registered").length;
  const coveragePct     = Math.round((guardedCount / SENSITIVE_APIS.length) * 100);
  assert(`API coverage: ${coveragePct}% (${guardedCount}/${SENSITIVE_APIS.length})`, coveragePct >= 90);
  assert(`registered APIs: ${registeredCount}`,                                     registeredCount === 0);
  assert(`/api/security/audit registrado`,                                          SENSITIVE_APIS.some(a => a.pattern === "/api/security/audit"));
  assert(`routes com routeGuardStatus`,                                             SENSITIVE_ROUTES.every(r => r.routeGuardStatus !== undefined));

  // 10. /api/security/audit permission
  console.log("\n10. /api/security/audit permission");
  const auditOwner    = guard("alex@awqgroup.com", "owner",     "/api/security/audit", "security", "view", "Audit");
  const auditAdmin    = guard("s.chen@jacqes.com", "admin",     "/api/security/audit", "security", "view", "Audit");
  const auditFinance  = guard("p.nair@jacqes.com", "analyst",   "/api/security/audit", "security", "view", "Audit");
  const auditOperator = guard("danilo@jacqes.com", "cs-ops",    "/api/security/audit", "security", "view", "Audit");
  const auditAnon     = guard("anonymous",         "anonymous",  "/api/security/audit", "security", "view", "Audit");
  assert("owner  → allowed",  auditOwner.result    === "allowed");
  assert("admin  → allowed",  auditAdmin.result    === "allowed");
  assert("finance → blocked", auditFinance.result  === "blocked");
  assert("operator→ blocked", auditOperator.result === "blocked");
  assert("anon   → blocked",  auditAnon.result     === "blocked");

  // Result
  console.log("\n══════════════════════════════════════════════════");
  console.log(`  Resultado: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════════════════\n");

  if (failed > 0) process.exit(1);
})();
