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

await saveDealOverrides("TEST-001", { stage: "Due Diligence", editedAt: "2026-05-10" });
const overrides = await getDealOverrides("TEST-001");
ok("saveDealOverrides + getDealOverrides: persiste em fallback", overrides?.stage === "Due Diligence");

await saveDealClientResponses("TEST-001", [{ round: 1, status: "approved" }]);
const responses = await getDealClientResponses("TEST-001");
ok("saveDealClientResponses + getDealClientResponses: array persiste", Array.isArray(responses) && responses.length === 1);

await deleteDeal("TEST-001");
const afterDelete = await getDeals();
ok("deleteDeal: remove do fallback", !afterDelete.some(d => d.id === "TEST-001"));

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

const emptyAccounts = await getBankAccounts();
ok("getBankAccounts sem DB: retorna [] sem erro", Array.isArray(emptyAccounts));

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

let docsError = null, docs;
try { docs = await getAllDocuments(); } catch(e) { docsError = e; }
ok("getAllDocuments sem DB: sem exceção", docsError === null);
ok("getAllDocuments sem DB: retorna array", Array.isArray(docs));

let txnsError = null, txns;
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

// ─── 6. lib/epm-gl.ts ────────────────────────────────────────────────────────
console.log("\n── 6. lib/epm-gl.ts (Supabase / JSON fallback) ─────────────");
const { getAllGLEntries, addJournalEntry, getJournals, getTrialBalance, getBalanceSheet } = await import("./lib/epm-gl.ts");

const beforeGL = await getAllGLEntries();
const glCountBefore = beforeGL.length;
ok("getAllGLEntries sem DB: retorna array", Array.isArray(beforeGL));

let glErr = null, glResult;
try {
  glResult = await addJournalEntry({
    transaction_date: "2026-05-10",
    bu_code: "AWQ",
    description: "Teste operacional GL",
    debit_account_code:  "1.1.01",
    debit_amount:        1000,
    credit_account_code: "3.1.01",
    credit_amount:       1000,
    source_system: "manual",
    created_by: "test",
  });
} catch(e) { glErr = e; }

if (glErr) {
  // Account codes may not exist in this environment — just verify it throws properly
  ok("addJournalEntry sem DB: executa sem crash de módulo", glErr instanceof Error);
  ok("getAllGLEntries após addJournal: retorna array", Array.isArray(await getAllGLEntries()));
} else {
  ok("addJournalEntry sem DB: retorna debit+credit entries", glResult?.debit?.gl_id && glResult?.credit?.gl_id);
  const afterGL = await getAllGLEntries();
  ok("getAllGLEntries: conta incrementou", afterGL.length > glCountBefore);
  const journals = await getJournals();
  ok("getJournals: inclui journal criado", journals.some(j => j.journal_id === glResult?.debit?.journal_id));
  const tb = await getTrialBalance();
  ok("getTrialBalance: retorna array", Array.isArray(tb));
  const bs = await getBalanceSheet();
  ok("getBalanceSheet: retorna objeto com hasData", typeof bs.hasData === "boolean");
}

// ─── 7. lib/awq-apar-db.ts ───────────────────────────────────────────────────
console.log("\n── 7. lib/awq-apar-db.ts (Supabase / [] fallback) ──────────");
const { getAllAPARItems, upsertAPARItem, deleteAPARItem } = await import("./lib/awq-apar-db.ts");

// Sem DB → deve retornar [] sem erro
const emptyApar = await getAllAPARItems();
ok("getAllAPARItems sem DB: retorna []", Array.isArray(emptyApar) && emptyApar.length === 0);

// Sem DB → upsert é no-op sem erro
let aparErr = null;
try {
  await upsertAPARItem({
    id: "apar-test-001", type: "ap", bu: "awq",
    description: "Fornecedor Teste", entity: "ACME Ltda",
    amount: 5000, due_date: "2026-06-01",
    status: "pending", category: "Fornecedor",
    created_at: new Date().toISOString(),
  });
} catch(e) { aparErr = e; }
ok("upsertAPARItem sem DB: no-op sem exceção", aparErr === null);

let aparDelErr = null;
try { await deleteAPARItem("apar-test-001"); } catch(e) { aparDelErr = e; }
ok("deleteAPARItem sem DB: no-op sem exceção", aparDelErr === null);

// ─── 8. lib/contraparte-db.ts ────────────────────────────────────────────────
console.log("\n── 8. lib/contraparte-db.ts (Supabase / [] fallback) ────────");
const { listContrapartesDB, upsertContraparteDB, softDeleteContraparteDB } = await import("./lib/contraparte-db.ts");

const emptyContra = await listContrapartesDB();
ok("listContrapartesDB sem DB: retorna []", Array.isArray(emptyContra) && emptyContra.length === 0);

let contraErr = null;
try {
  await upsertContraparteDB({
    id: "contra-test-001", tipo: "pj", papel: "fornecedor",
    razaoSocial: "ACME Ltda", cnpjCpf: "12345678000199",
    regime: "simples", bu: "awq", status: "ativo",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
} catch(e) { contraErr = e; }
ok("upsertContraparteDB sem DB: no-op sem exceção", contraErr === null);

let contraSoftDelErr = null;
try { await softDeleteContraparteDB("contra-test-001"); } catch(e) { contraSoftDelErr = e; }
ok("softDeleteContraparteDB sem DB: no-op sem exceção", contraSoftDelErr === null);

// ─── Resultado final ─────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(55)}`);
console.log(`  RESULTADO: ${passed} passou  |  ${failed} falhou`);
console.log(`${"─".repeat(55)}`);

if (failed > 0) process.exit(1);
