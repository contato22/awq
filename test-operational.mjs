// Teste operacional das funções de DB — sem DATABASE_URL (modo in-memory/fallback)
// Valida: criação, leitura, atualização, exclusão em todos os módulos migrados

import assert from "assert";

let passed = 0;
let failed = 0;

function ok(label, result) {
  if (result) { console.log(`  ✅  ${label}`); passed++; }
  else         { console.error(`  ❌  ${label}`); failed++; }
}

// ─── 1. lib/db.ts ────────────────────────────────────────────────────────────
console.log("\n── 1. lib/db.ts ──────────────────────────────────────────────");
const { sql, USE_DB, USE_BLOB } = await import("./lib/db.ts");
ok("sql = null sem DATABASE_URL",     sql === null);
ok("USE_DB = false sem DATABASE_URL", USE_DB === false);
ok("USE_BLOB = false sem SUPABASE_URL", USE_BLOB === false);

// ─── 2. lib/venture-db.ts ────────────────────────────────────────────────────
console.log("\n── 2. lib/venture-db.ts ─────────────────────────────────────");
const { getDeals, upsertDeal, getDealById, deleteDeal,
        getDealOverrides, saveDealOverrides,
        getDealClientResponses, saveDealClientResponses,
        getVentureContracts, upsertVentureContract, deleteVentureContract
      } = await import("./lib/venture-db.ts");

// Deals — CRUD
const testDeal = {
  id: "TEST-001", companyName: "Empresa Teste", stage: "Triagem",
  assignee: "Miguel", lastUpdated: new Date().toISOString().slice(0,10),
  sendStatus: "Rascunho", operationType: "Aquisição Parcial",
  valuationRange: "R$1M-R$2M", proposedValue: 1_500_000,
  dealScore: 7.5, riskLevel: "Médio", priority: "Alta",
  identification: {}, strategicThesis: {}, assetDiagnosis: {},
  financials: {}, riskDiligence: {}, proposalStructure: {}, governance: {},
};

await upsertDeal(testDeal, true);
const allDeals = await getDeals();
ok("upsertDeal: deal salvo no fallback in-memory", allDeals.some(d => d.id === "TEST-001"));

const found = await getDealById("TEST-001");
ok("getDealById: retorna deal correto", found?.companyName === "Empresa Teste");

const notFound = await getDealById("INEXISTENTE");
ok("getDealById: null para ID inexistente", notFound === null);

// Overrides
await saveDealOverrides("TEST-001", { stage: "Due Diligence", editedAt: "2026-05-10" });
const overrides = await getDealOverrides("TEST-001");
ok("saveDealOverrides + getDealOverrides: persiste em fallback", overrides?.stage === "Due Diligence");

// Client responses
await saveDealClientResponses("TEST-001", [{ round: 1, status: "approved" }]);
const responses = await getDealClientResponses("TEST-001");
ok("saveDealClientResponses + getDealClientResponses: array persiste", Array.isArray(responses) && responses.length === 1);

// Delete
await deleteDeal("TEST-001");
const afterDelete = await getDeals();
ok("deleteDeal: remove do fallback", !afterDelete.some(d => d.id === "TEST-001"));

// Contracts — CRUD
const contractId = await upsertVentureContract({
  counterparty: "TESTE LTDA", monthlyFee: 2000, durationMonths: 12,
  totalContractValue: 24000, arr: 24000, startDate: null,
  status: "active", note: "Contrato de teste"
});
ok("upsertVentureContract: retorna ID", typeof contractId === "string" && contractId.length > 0);

const contracts = await getVentureContracts();
ok("getVentureContracts: lista contratos", contracts.some(c => c.counterparty === "TESTE LTDA"));

await deleteVentureContract(contractId);
const afterContractDelete = await getVentureContracts();
ok("deleteVentureContract: remove contrato", !afterContractDelete.some(c => c.counterparty === "TESTE LTDA"));

// ─── 3. lib/bank-accounts-db.ts ──────────────────────────────────────────────
console.log("\n── 3. lib/bank-accounts-db.ts ───────────────────────────────");
const { getBankAccounts, saveBankAccount, deleteBankAccount, newAccountId, newTxnId }
  = await import("./lib/bank-accounts-db.ts");

// Sem DB — deve retornar [] sem erro
const emptyAccounts = await getBankAccounts();
ok("getBankAccounts sem DB: retorna [] sem erro", Array.isArray(emptyAccounts));

// Sem DB — save deve ser no-op sem erro
const testAccount = {
  id: newAccountId(), bank: "Cora", name: "Conta Teste",
  color: "bg-brand-600", currentBalance: 5000,
  lastUpdated: new Date().toISOString().slice(0,10),
  transactions: [
    { id: newTxnId(), date: "2026-05-10", description: "Pagamento cliente",
      amount: 5000, category: "receita" }
  ],
};
let saveError = null;
try { await saveBankAccount(testAccount); } catch(e) { saveError = e; }
ok("saveBankAccount sem DB: no-op sem exceção", saveError === null);

let deleteError = null;
try { await deleteBankAccount(testAccount.id); } catch(e) { deleteError = e; }
ok("deleteBankAccount sem DB: no-op sem exceção", deleteError === null);

// ─── 4. lib/financial-db.ts ──────────────────────────────────────────────────
console.log("\n── 4. lib/financial-db.ts (fallback JSON) ───────────────────");
const { getAllDocuments, getAllTransactions } = await import("./lib/financial-db.ts");

let docsError = null;
let docs;
try { docs = await getAllDocuments(); } catch(e) { docsError = e; }
ok("getAllDocuments sem DB: sem exceção", docsError === null);
ok("getAllDocuments sem DB: retorna array", Array.isArray(docs));

let txnsError = null;
let txns;
try { txns = await getAllTransactions(); } catch(e) { txnsError = e; }
ok("getAllTransactions sem DB: sem exceção", txnsError === null);
ok("getAllTransactions sem DB: retorna array", Array.isArray(txns));

// ─── 5. lib/security-audit.ts ────────────────────────────────────────────────
console.log("\n── 5. lib/security-audit.ts ─────────────────────────────────");
const { logAuditEvent, getRecentAuditEvents, getAuditStats, _clearAuditLog_TESTING_ONLY }
  = await import("./lib/security-audit.ts");

_clearAuditLog_TESTING_ONLY();
const evt = logAuditEvent("test@awq.com", "admin", "/api/test", "read", "resource", "allowed", "ok");
ok("logAuditEvent: retorna evento com ID", evt?.id?.startsWith("evt_"));

const recent = await getRecentAuditEvents(5);
ok("getRecentAuditEvents: contém evento registrado", recent.some(e => e.user_id === "test@awq.com"));

const stats = await getAuditStats();
ok("getAuditStats.total > 0", stats.total > 0);
ok("getAuditStats.persistent = false sem DB", stats.persistent === false);

// ─── Resultado final ─────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(55)}`);
console.log(`  RESULTADO: ${passed} passou  |  ${failed} falhou`);
console.log(`${"─".repeat(55)}`);

if (failed > 0) process.exit(1);
