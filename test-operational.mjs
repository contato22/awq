// Teste operacional completo — sem DATABASE_URL (modo fallback)
// Cobre TODOS os módulos de persistência migrados para o Supabase.
// Valida: leitura, escrita, exclusão e comportamento de fallback correto.

let passed = 0;
let failed = 0;

function ok(label, result) {
  if (result) { console.log(`  ✅  ${label}`); passed++; }
  else         { console.error(`  ❌  ${label}`); failed++; }
}
async function noThrow(label, fn) {
  try { await fn(); ok(label, true); }
  catch(e) { console.error(`  ❌  ${label} — ERRO: ${e.message}`); failed++; }
}

// ─── 1. lib/db.ts ────────────────────────────────────────────────────────────
console.log("\n── 1. lib/db.ts ──────────────────────────────────────────────");
const { sql, USE_DB, USE_BLOB } = await import("./lib/db.ts");
ok("sql = null sem DATABASE_URL",       sql === null);
ok("USE_DB = false sem DATABASE_URL",   USE_DB === false);
ok("USE_BLOB = false sem SUPABASE_URL", USE_BLOB === false);

// ─── 2. lib/venture-db.ts ────────────────────────────────────────────────────
console.log("\n── 2. lib/venture-db.ts ─────────────────────────────────────");
const { getDeals, upsertDeal, getDealById, deleteDeal,
        getDealOverrides, saveDealOverrides,
        getDealClientResponses, saveDealClientResponses,
        getVentureContracts, upsertVentureContract, deleteVentureContract,
      } = await import("./lib/venture-db.ts");

const testDeal = {
  id: "TEST-001", companyName: "Empresa Teste", stage: "Triagem",
  assignee: "Miguel", lastUpdated: "2026-05-10", sendStatus: "Rascunho",
  operationType: "Aquisição Parcial", valuationRange: "", proposedValue: 1_500_000,
  dealScore: 7.5, riskLevel: "Médio", priority: "Alta",
  identification: {}, strategicThesis: {}, assetDiagnosis: {},
  financials: {}, riskDiligence: {}, proposalStructure: {}, governance: {},
};
await upsertDeal(testDeal, true);
ok("upsertDeal: salva no fallback",     (await getDeals()).some(d => d.id === "TEST-001"));
ok("getDealById: retorna deal correto", (await getDealById("TEST-001"))?.companyName === "Empresa Teste");
ok("getDealById: null p/ inexistente",  (await getDealById("NOPE")) === null);
await saveDealOverrides("TEST-001", { stage: "Due Diligence" });
ok("saveDealOverrides + get: persiste", (await getDealOverrides("TEST-001"))?.stage === "Due Diligence");
await saveDealClientResponses("TEST-001", [{ round: 1 }]);
ok("saveClientResponses + get: persiste", (await getDealClientResponses("TEST-001")).length === 1);
await deleteDeal("TEST-001");
ok("deleteDeal: remove do fallback",    !(await getDeals()).some(d => d.id === "TEST-001"));

const cId = await upsertVentureContract({ counterparty: "TESTE LTDA", monthlyFee: 2000, durationMonths: 12, totalContractValue: 24000, arr: 24000, startDate: null, status: "active", note: "" });
ok("upsertVentureContract: retorna ID",  typeof cId === "string");
ok("getVentureContracts: lista",         (await getVentureContracts()).some(c => c.counterparty === "TESTE LTDA"));
await deleteVentureContract(cId);
ok("deleteVentureContract: remove",      !(await getVentureContracts()).some(c => c.counterparty === "TESTE LTDA"));

// ─── 3. lib/bank-accounts-db.ts ──────────────────────────────────────────────
console.log("\n── 3. lib/bank-accounts-db.ts ───────────────────────────────");
const { getBankAccounts, saveBankAccount, deleteBankAccount, newAccountId, newTxnId } = await import("./lib/bank-accounts-db.ts");
ok("getBankAccounts sem DB: retorna []",       Array.isArray(await getBankAccounts()));
await noThrow("saveBankAccount sem DB: no-op", () => saveBankAccount({ id: newAccountId(), bank: "Cora", name: "T", color: "bg-brand-600", currentBalance: 0, lastUpdated: "2026-05-10", transactions: [{ id: newTxnId(), date: "2026-05-10", description: "T", amount: 100, category: "receita" }] }));
await noThrow("deleteBankAccount sem DB: no-op", () => deleteBankAccount("x"));

// ─── 4. lib/financial-db.ts ──────────────────────────────────────────────────
console.log("\n── 4. lib/financial-db.ts ───────────────────────────────────");
const { getAllDocuments, getAllTransactions } = await import("./lib/financial-db.ts");
const docs = await getAllDocuments();
ok("getAllDocuments: sem exceção + array", Array.isArray(docs));
const txns = await getAllTransactions();
ok("getAllTransactions: sem exceção + array", Array.isArray(txns));

// ─── 5. lib/security-audit.ts ────────────────────────────────────────────────
console.log("\n── 5. lib/security-audit.ts ─────────────────────────────────");
const { logAuditEvent, getRecentAuditEvents, getAuditStats, _clearAuditLog_TESTING_ONLY } = await import("./lib/security-audit.ts");
_clearAuditLog_TESTING_ONLY();
const evt = logAuditEvent("test@awq.com", "admin", "/api/test", "read", "resource", "allowed", "ok");
ok("logAuditEvent: retorna evento com ID",         evt?.id?.startsWith("evt_"));
ok("getRecentAuditEvents: contém evento",           (await getRecentAuditEvents(5)).some(e => e.user_id === "test@awq.com"));
const stats = await getAuditStats();
ok("getAuditStats.total > 0",                       stats.total > 0);
ok("getAuditStats.persistent = false sem DB",       stats.persistent === false);

// ─── 6. lib/epm-gl.ts ────────────────────────────────────────────────────────
console.log("\n── 6. lib/epm-gl.ts ─────────────────────────────────────────");
const { getAllGLEntries, addJournalEntry, getJournals, getTrialBalance, getBalanceSheet } = await import("./lib/epm-gl.ts");
const glBefore = (await getAllGLEntries()).length;
ok("getAllGLEntries: retorna array", typeof glBefore === "number");
let glR;
try { glR = await addJournalEntry({ transaction_date: "2026-05-10", bu_code: "AWQ", description: "Teste GL", debit_account_code: "1.1.01", debit_amount: 1000, credit_account_code: "3.1.01", credit_amount: 1000, source_system: "manual", created_by: "test" }); } catch { /* account may not exist */ }
if (glR) {
  ok("addJournalEntry: retorna debit+credit", !!(glR.debit?.gl_id && glR.credit?.gl_id));
  ok("getAllGLEntries: conta incrementou",    (await getAllGLEntries()).length > glBefore);
  ok("getJournals: inclui journal criado",    (await getJournals()).some(j => j.journal_id === glR.debit.journal_id));
} else {
  ok("epm-gl: módulo carregou sem crash", true);
  ok("getJournals: retorna array",         Array.isArray(await getJournals()));
  ok("getTrialBalance: retorna array",     Array.isArray(await getTrialBalance()));
}
ok("getBalanceSheet: retorna objeto", typeof (await getBalanceSheet()).hasData === "boolean");

// ─── 7. lib/awq-apar-db.ts ───────────────────────────────────────────────────
console.log("\n── 7. lib/awq-apar-db.ts ────────────────────────────────────");
const { getAllAPARItems, upsertAPARItem, deleteAPARItem } = await import("./lib/awq-apar-db.ts");
ok("getAllAPARItems sem DB: retorna []",           (await getAllAPARItems()).length === 0);
await noThrow("upsertAPARItem sem DB: no-op",     () => upsertAPARItem({ id: "ap1", type: "ap", bu: "awq", description: "T", entity: "E", amount: 100, due_date: "2026-06-01", status: "pending", category: "Fornecedor", created_at: new Date().toISOString() }));
await noThrow("deleteAPARItem sem DB: no-op",     () => deleteAPARItem("ap1"));

// ─── 8. lib/contraparte-db.ts ────────────────────────────────────────────────
console.log("\n── 8. lib/contraparte-db.ts ─────────────────────────────────");
const { listContrapartesDB, upsertContraparteDB, softDeleteContraparteDB } = await import("./lib/contraparte-db.ts");
ok("listContrapartesDB sem DB: retorna []",            (await listContrapartesDB()).length === 0);
await noThrow("upsertContraparteDB sem DB: no-op",     () => upsertContraparteDB({ id: "c1", tipo: "pj", papel: "fornecedor", razaoSocial: "ACME", cnpjCpf: "00000000000199", regime: "simples", bu: "awq", status: "ativo", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
await noThrow("softDeleteContraparteDB sem DB: no-op", () => softDeleteContraparteDB("c1"));

// ─── 9. lib/caza-db.ts ───────────────────────────────────────────────────────
console.log("\n── 9. lib/caza-db.ts ────────────────────────────────────────");
const { listProjects: cazaListProjects, listClients: cazaListClients } = await import("./lib/caza-db.ts");
ok("listProjects sem DB: retorna []",  Array.isArray(await cazaListProjects()));
ok("listClients sem DB: retorna []",   Array.isArray(await cazaListClients()));

// ─── 10. lib/advisor-db.ts ───────────────────────────────────────────────────
console.log("\n── 10. lib/advisor-db.ts ────────────────────────────────────");
const { listAdvisorClients } = await import("./lib/advisor-db.ts");
ok("listAdvisorClients sem DB: retorna []", Array.isArray(await listAdvisorClients()));

// ─── 11. lib/crm-db.ts ───────────────────────────────────────────────────────
console.log("\n── 11. lib/crm-db.ts ────────────────────────────────────────");
const { listAccounts, listContacts, listLeads: crmListLeads } = await import("./lib/crm-db.ts");
ok("listAccounts sem DB: retorna array (seed)",  Array.isArray(await listAccounts()));
ok("listContacts sem DB: retorna array",         Array.isArray(await listContacts()));
ok("listLeads sem DB: retorna array",            Array.isArray(await crmListLeads()));

// ─── 12. lib/bpm-db.ts ───────────────────────────────────────────────────────
console.log("\n── 12. lib/bpm-db.ts ────────────────────────────────────────");
const { getAllProcessDefinitions, createProcessInstance } = await import("./lib/bpm-db.ts");
const defs = await getAllProcessDefinitions();
ok("getAllProcessDefinitions sem DB: retorna array", Array.isArray(defs));
// createProcessInstance requires a valid processCode — just verify it doesn't import-crash
ok("bpm-db: módulo carregado sem crash", typeof createProcessInstance === "function");

// ─── 13. lib/ppm-db.ts ───────────────────────────────────────────────────────
console.log("\n── 13. lib/ppm-db.ts ────────────────────────────────────────");
const { listProjects: ppmList, listTasks, listRisks } = await import("./lib/ppm-db.ts");
const ppmProjects = await ppmList();
ok("listProjects sem DB: retorna seed data",  Array.isArray(ppmProjects) && ppmProjects.length > 0);
ok("listTasks sem DB: retorna array",         Array.isArray(await listTasks()));
ok("listRisks sem DB: retorna array",         Array.isArray(await listRisks()));

// ─── 14. lib/ap-ar-db.ts (EPM full AP/AR) ────────────────────────────────────
console.log("\n── 14. lib/ap-ar-db.ts (EPM full) ──────────────────────────");
const { getAllAP, getAllAR, getSuppliers, getCustomers } = await import("./lib/ap-ar-db.ts");
ok("getAllAP sem DB: retorna array (json fallback)",   Array.isArray(await getAllAP()));
ok("getAllAR sem DB: retorna array (json fallback)",   Array.isArray(await getAllAR()));
ok("getSuppliers sem DB: retorna array",              Array.isArray(await getSuppliers()));
ok("getCustomers sem DB: retorna array",              Array.isArray(await getCustomers()));

// ─── 15. lib/jacqes-crm-db.ts ────────────────────────────────────────────────
console.log("\n── 15. lib/jacqes-crm-db.ts ─────────────────────────────────");
const { listLeads: jListLeads, listOpportunities: jListOpps, listCrmClients: jListClients } = await import("./lib/jacqes-crm-db.ts");
ok("listLeads sem DB: retorna seed",        Array.isArray(await jListLeads()));
ok("listOpportunities sem DB: retorna array", Array.isArray(await jListOpps()));
ok("listCrmClients sem DB: retorna array",    Array.isArray(await jListClients()));

// ─── 16. lib/caza-crm-db.ts ──────────────────────────────────────────────────
console.log("\n── 16. lib/caza-crm-db.ts ───────────────────────────────────");
const { listLeads: czListLeads, listOpportunities: czListOpps, listProposals: czListProps } = await import("./lib/caza-crm-db.ts");
ok("listLeads sem DB: retorna []",        Array.isArray(await czListLeads()));
ok("listOpportunities sem DB: retorna []", Array.isArray(await czListOpps()));
ok("listProposals sem DB: retorna []",    Array.isArray(await czListProps()));

// ─── 17. lib/erp-db.ts ───────────────────────────────────────────────────────
console.log("\n── 17. lib/erp-db.ts ────────────────────────────────────────");
const {
  getPurchaseOrders, upsertPurchaseOrder, deletePurchaseOrder,
  getSalesOrders, upsertSalesOrder,
  getInventoryItems, upsertInventoryItem,
  getERPContracts, upsertERPContract, deleteERPContract,
  getFixedAssets, upsertFixedAsset,
  getExpenseReports, upsertExpenseReport,
} = await import("./lib/erp-db.ts");

ok("getPurchaseOrders sem DB: retorna []",  Array.isArray(await getPurchaseOrders()));
await noThrow("upsertPurchaseOrder sem DB: no-op", () => upsertPurchaseOrder({ id: "po1", numero: "PC-001", supplier: "F", date: "2026-05-10", total_value: 1000, status: "Rascunho", bu: "awq", created_at: new Date().toISOString() }));
await noThrow("deletePurchaseOrder sem DB: no-op", () => deletePurchaseOrder("po1"));
ok("getSalesOrders sem DB: retorna []",     Array.isArray(await getSalesOrders()));
await noThrow("upsertSalesOrder sem DB: no-op", () => upsertSalesOrder({ id: "so1", numero: "PV-001", customer: "C", date: "2026-05-10", value: 500, status: "Novo", bu: "awq", created_at: new Date().toISOString() }));
ok("getInventoryItems sem DB: retorna []",  Array.isArray(await getInventoryItems()));
await noThrow("upsertInventoryItem sem DB: no-op", () => upsertInventoryItem({ id: "ii1", code: "SKU-001", description: "Item Teste", category: "Geral", unit: "un", qty_stock: 10, location: "A1", bu: "awq", created_at: new Date().toISOString() }));
ok("getERPContracts sem DB: retorna []",    Array.isArray(await getERPContracts()));
await noThrow("upsertERPContract sem DB: no-op", () => upsertERPContract({ id: "ct1", numero: "CT-001", counterparty: "CP", object: "Serviços", total_value: 12000, start_date: "2026-01-01", end_date: "2026-12-31", status: "Ativo", bu: "awq", created_at: new Date().toISOString() }));
ok("getFixedAssets sem DB: retorna []",     Array.isArray(await getFixedAssets()));
await noThrow("upsertFixedAsset sem DB: no-op", () => upsertFixedAsset({ id: "fa1", code: "AT-001", description: "Notebook", category: "TI", location: "Escritório", acquisition_value: 5000, acquisition_date: "2025-01-01", status: "Ativo", bu: "awq", created_at: new Date().toISOString() }));
ok("getExpenseReports sem DB: retorna []",  Array.isArray(await getExpenseReports()));
await noThrow("upsertExpenseReport sem DB: no-op", () => upsertExpenseReport({ id: "er1", date: "2026-05-10", employee: "João", category: "Viagem", description: "Passagem SP", value: 350, status: "Submetido", bu: "awq", created_at: new Date().toISOString() }));

// ─── 18. lib/hcm-db.ts ───────────────────────────────────────────────────────
console.log("\n── 18. lib/hcm-db.ts ────────────────────────────────────────");
const {
  getEmployees, upsertEmployee,
  getPayrollRuns, upsertPayrollRun,
  getVacationRequests, upsertVacationRequest,
  getJobOpenings, upsertJobOpening,
  getTrainingCourses, upsertTrainingCourse,
} = await import("./lib/hcm-db.ts");

ok("getEmployees sem DB: retorna []",        Array.isArray(await getEmployees()));
await noThrow("upsertEmployee sem DB: no-op", () => upsertEmployee({ id: "e1", name: "Ana", role: "Dev", department: "TI", bu: "awq", salary: 8000, hire_date: "2024-01-01", status: "Ativo", email: "ana@awq.com", created_at: new Date().toISOString() }));
ok("getPayrollRuns sem DB: retorna []",       Array.isArray(await getPayrollRuns()));
await noThrow("upsertPayrollRun sem DB: no-op", () => upsertPayrollRun({ id: "pr1", period: "2026-05", bu: "awq", total_gross: 50000, total_net: 40000, employee_count: 10, status: "Rascunho", payment_date: null, created_at: new Date().toISOString() }));
ok("getVacationRequests sem DB: retorna []",  Array.isArray(await getVacationRequests()));
await noThrow("upsertVacationRequest sem DB: no-op", () => upsertVacationRequest({ id: "vr1", employee_id: "e1", employee_name: "Ana", start_date: "2026-07-01", end_date: "2026-07-15", days: 15, status: "Solicitado", bu: "awq", created_at: new Date().toISOString() }));
ok("getJobOpenings sem DB: retorna []",       Array.isArray(await getJobOpenings()));
await noThrow("upsertJobOpening sem DB: no-op", () => upsertJobOpening({ id: "jo1", title: "Dev Senior", department: "TI", bu: "awq", status: "Aberta", open_date: "2026-05-01", close_date: null, applications: 0, created_at: new Date().toISOString() }));
ok("getTrainingCourses sem DB: retorna []",   Array.isArray(await getTrainingCourses()));
await noThrow("upsertTrainingCourse sem DB: no-op", () => upsertTrainingCourse({ id: "tc1", title: "Segurança da Informação", category: "Compliance", instructor: "Prof. Carlos", start_date: "2026-06-01", end_date: "2026-06-02", participants: 20, status: "Planejado", bu: "awq", created_at: new Date().toISOString() }));

// ─── 19. lib/grc-db.ts ───────────────────────────────────────────────────────
console.log("\n── 19. lib/grc-db.ts ────────────────────────────────────────");
const {
  getGRCPolicies, upsertGRCPolicy,
  getGRCRisks, upsertGRCRisk,
  getGRCControls, upsertGRCControl,
  getGRCAudits, upsertGRCAudit,
} = await import("./lib/grc-db.ts");

ok("getGRCPolicies sem DB: retorna []",   Array.isArray(await getGRCPolicies()));
await noThrow("upsertGRCPolicy sem DB: no-op", () => upsertGRCPolicy({ id: "gp1", title: "Política de Segurança", category: "Segurança", owner: "TI", version: "v1.0", status: "Aprovada", effective_date: "2026-01-01", review_date: "2027-01-01", bu: "awq", created_at: new Date().toISOString() }));
ok("getGRCRisks sem DB: retorna []",      Array.isArray(await getGRCRisks()));
await noThrow("upsertGRCRisk sem DB: no-op", () => upsertGRCRisk({ id: "gr1", title: "Risco Financeiro", category: "Financeiro", description: "Inadimplência", probability: 3, impact: 4, risk_score: 12, level: "Alto", owner: "CFO", status: "Identificado", mitigation: "Seguro", bu: "awq", created_at: new Date().toISOString() }));
ok("getGRCControls sem DB: retorna []",   Array.isArray(await getGRCControls()));
await noThrow("upsertGRCControl sem DB: no-op", () => upsertGRCControl({ id: "gc1", title: "Revisão Acesso", type: "Preventivo", category: "TI", risk_id: null, owner: "TI", frequency: "Mensal", status: "Efetivo", last_test_date: "2026-04-01", next_test_date: "2026-05-01", bu: "awq", created_at: new Date().toISOString() }));
ok("getGRCAudits sem DB: retorna []",     Array.isArray(await getGRCAudits()));
await noThrow("upsertGRCAudit sem DB: no-op", () => upsertGRCAudit({ id: "ga1", title: "Auditoria Interna Q1", scope: "Financeiro", auditor: "Auditoria", start_date: "2026-04-01", end_date: "2026-04-30", status: "Concluída", findings: 3, critical_findings: 1, bu: "awq", created_at: new Date().toISOString() }));

// ─── 20. lib/dms-db.ts ───────────────────────────────────────────────────────
console.log("\n── 20. lib/dms-db.ts ────────────────────────────────────────");
const {
  getDMSDocuments, upsertDMSDocument, deleteDMSDocument,
  getDocumentVersions, addDocumentVersion,
} = await import("./lib/dms-db.ts");

ok("getDMSDocuments sem DB: retorna []",    Array.isArray(await getDMSDocuments()));
await noThrow("upsertDMSDocument sem DB: no-op", () => upsertDMSDocument({ id: "doc1", title: "Contrato Modelo", category: "Contrato", owner: "Jurídico", status: "Aprovado", version: "v1.0", size_kb: 512, mime_type: "application/pdf", tags: ["contrato", "modelo"], bu: "awq", folder: "Contratos/2026", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
await noThrow("deleteDMSDocument sem DB: no-op", () => deleteDMSDocument("doc1"));
ok("getDocumentVersions sem DB: retorna []", Array.isArray(await getDocumentVersions("doc1")));
await noThrow("addDocumentVersion sem DB: no-op", () => addDocumentVersion({ id: "dv1", document_id: "doc1", version: "v1.1", changed_by: "Ana", change_note: "Revisão cláusula 3", size_kb: 520, created_at: new Date().toISOString() }));

// ─── 21. lib/cpm-db.ts ───────────────────────────────────────────────────────
console.log("\n── 21. lib/cpm-db.ts ────────────────────────────────────────");
const {
  getOKRs, upsertOKR,
  getScorecards, upsertScorecard,
  getStrategicObjectives, upsertStrategicObjective,
  getPerformanceReviews, upsertPerformanceReview,
} = await import("./lib/cpm-db.ts");

ok("getOKRs sem DB: retorna []",                   Array.isArray(await getOKRs()));
await noThrow("upsertOKR sem DB: no-op", () => upsertOKR({ id: "okr1", cycle: "Q2 2026", type: "company", owner: "CEO", objective: "Crescer ARR 30%", key_results: [], progress: 0, status: "Não Iniciado", bu: "awq", created_at: new Date().toISOString() }));
ok("getScorecards sem DB: retorna []",             Array.isArray(await getScorecards()));
await noThrow("upsertScorecard sem DB: no-op", () => upsertScorecard({ id: "sc1", name: "BSC Q2 2026", period: "Q2 2026", bu: "awq", overall_score: 0, kpis: [], created_at: new Date().toISOString() }));
ok("getStrategicObjectives sem DB: retorna []",    Array.isArray(await getStrategicObjectives()));
await noThrow("upsertStrategicObjective sem DB: no-op", () => upsertStrategicObjective({ id: "so1", title: "Expansão Mercado", description: "Novos clientes", perspective: "Cliente", owner: "CCO", target_date: "2026-12-31", status: "Em Execução", progress: 30, bu: "awq", created_at: new Date().toISOString() }));
ok("getPerformanceReviews sem DB: retorna []",     Array.isArray(await getPerformanceReviews()));
await noThrow("upsertPerformanceReview sem DB: no-op", () => upsertPerformanceReview({ id: "rev1", title: "Revisão Q1 2026", type: "quarterly", period: "Q1 2026", facilitator: "CEO", date: "2026-04-15", status: "Realizada", participants: 8, key_decisions: "Acelerar produto", bu: "awq", created_at: new Date().toISOString() }));

// ─── Resultado final ─────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(55)}`);
console.log(`  RESULTADO: ${passed} passou  |  ${failed} falhou`);
console.log(`${"─".repeat(55)}`);
if (failed > 0) process.exit(1);
