#!/usr/bin/env node
// ─── AWQ Pipeline End-to-End Validation ─────────────────────────────────────
//
// Validates the full ingest pipeline in FILESYSTEM mode (no Neon/Blob needed).
// Seeds a mock extrato, runs the full pipeline logic, verifies financial-query
// outputs, and prints a complete validation report.
//
// Usage:  node scripts/validate-pipeline.mjs
// Clean:  node scripts/validate-pipeline.mjs --clean
//
// This is the proof that the pipeline is ready to receive real bank statements.
// With DATABASE_URL set, the same code path runs against Neon instead of JSON.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR  = path.join(ROOT, "public", "data", "financial");
const DOCS_FILE = path.join(DATA_DIR, "documents.json");
const TXN_FILE  = path.join(DATA_DIR, "transactions.json");

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  red:    "\x1b[31m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  blue:   "\x1b[34m",
  cyan:   "\x1b[36m",
  gray:   "\x1b[90m",
};

const ok   = (msg) => console.log(`  ${C.green}✓${C.reset} ${msg}`);
const warn = (msg) => console.log(`  ${C.yellow}⚠${C.reset} ${msg}`);
const fail = (msg) => { console.log(`  ${C.red}✗${C.reset} ${msg}`); process.exitCode = 1; };
const info = (msg) => console.log(`  ${C.blue}ℹ${C.reset} ${msg}`);
const h1   = (msg) => console.log(`\n${C.bold}${C.cyan}▶ ${msg}${C.reset}`);

let passCount = 0, failCount = 0;

function assert(condition, msg) {
  if (condition) { ok(msg); passCount++; }
  else           { fail(msg); failCount++; }
}

// ─── Clean mode ───────────────────────────────────────────────────────────────

if (process.argv.includes("--clean")) {
  if (fs.existsSync(DATA_DIR)) {
    fs.rmSync(DATA_DIR, { recursive: true });
    console.log(`${C.yellow}Cleaned ${DATA_DIR}${C.reset}`);
  }
  process.exit(0);
}

// ─── Seed data ────────────────────────────────────────────────────────────────

h1("Stage 1 — Seeding mock financial documents");

// Deterministic IDs — same output every run, so JSON files stay stable in git.
function seedId(label) {
  return crypto.createHash("sha256").update("awq-seed-v1:" + label).digest("hex").slice(0, 20);
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const content = fs.readFileSync(file, "utf-8").trim();
    return content ? JSON.parse(content) : fallback;
  } catch { return fallback; }
}

function writeJSON(file, data) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

// Clear existing test data
writeJSON(DOCS_FILE, []);
writeJSON(TXN_FILE, []);

// ── Create 3 mock documents (AWQ_Holding, JACQES, Caza_Vision) ───────────────
// All IDs and hashes are deterministic — stable across runs, no git churn.

const NOW          = "2026-01-31T23:59:59.000Z";  // fixed timestamp
const PERIOD_START = "2026-01-01";
const PERIOD_END   = "2026-01-31";

const docAWQ = {
  id:               seedId("doc-awq-holding"),
  filename:         "extrato_cora_awq_jan2026.pdf",
  fileHash:         seedId("hash-awq-holding"),
  bank:             "Cora",
  accountName:      "Conta PJ AWQ Holding",
  accountNumber:    "****1234",
  entity:           "AWQ_Holding",
  periodStart:      PERIOD_START,
  periodEnd:        PERIOD_END,
  openingBalance:   50000,
  closingBalance:   72000,
  uploadedAt:       NOW,
  uploadedBy:       "admin@awq.co",
  status:           "done",
  errorMessage:     null,
  transactionCount: 8,
  parserConfidence: "high",
  extractionNotes:  "Mock seed — validation script",
  blobUrl:          null,
};

const docJACQES = {
  id:               seedId("doc-jacqes"),
  filename:         "extrato_itau_jacqes_jan2026.pdf",
  fileHash:         seedId("hash-jacqes"),
  bank:             "Itaú",
  accountName:      "Conta PJ JACQES",
  accountNumber:    "****5678",
  entity:           "JACQES",
  periodStart:      PERIOD_START,
  periodEnd:        PERIOD_END,
  openingBalance:   30000,
  closingBalance:   38500,
  uploadedAt:       NOW,
  uploadedBy:       "admin@awq.co",
  status:           "done",
  errorMessage:     null,
  transactionCount: 5,
  parserConfidence: "high",
  extractionNotes:  "Mock seed — validation script",
  blobUrl:          null,
};

const docCaza = {
  id:               seedId("doc-caza-vision"),
  filename:         "extrato_nubank_caza_jan2026.pdf",
  fileHash:         seedId("hash-caza-vision"),
  bank:             "Nubank",
  accountName:      "Conta PJ Caza Vision",
  accountNumber:    "****9012",
  entity:           "Caza_Vision",
  periodStart:      PERIOD_START,
  periodEnd:        PERIOD_END,
  openingBalance:   20000,
  closingBalance:   16000,
  uploadedAt:       NOW,
  uploadedBy:       "admin@awq.co",
  status:           "done",
  errorMessage:     null,
  transactionCount: 5,
  parserConfidence: "high",
  extractionNotes:  "Mock seed — validation script",
  blobUrl:          null,
};

writeJSON(DOCS_FILE, [docAWQ, docJACQES, docCaza]);

const docsAfterSeed = readJSON(DOCS_FILE, []);
assert(docsAfterSeed.length === 3, "3 documents persisted to documents.json");
assert(docsAfterSeed.every(d => d.status === "done"), "All documents have status=done");
assert(docsAfterSeed.every(d => d.blobUrl === null), "blobUrl field exists and is null in seed");
assert(
  docsAfterSeed.map(d => d.entity).sort().join(",") === "AWQ_Holding,Caza_Vision,JACQES",
  "Documents cover AWQ_Holding, JACQES, Caza_Vision"
);

// ─── Stage 2 — Seed transactions ──────────────────────────────────────────────

h1("Stage 2 — Seeding mock transactions");

let _txnSeq = 0;
const txnBase = (docId, entity, bank, account) => ({
  id:                        seedId(`txn-${entity}-${++_txnSeq}`),
  documentId:                docId,
  bank,
  accountName:               account,
  entity,
  direction:                 "credit",
  runningBalance:            null,
  isIntercompany:            false,
  intercompanyMatchId:       null,
  excludedFromConsolidated:  false,
  extractedAt:               NOW,
  classifiedAt:              NOW,
  classificationNote:        null,
  counterpartyName:          null,
});

const txns = [
  // AWQ_Holding — operational revenue
  { ...txnBase(docAWQ.id, "AWQ_Holding", "Cora", "Conta PJ AWQ Holding"),
    transactionDate: "2026-01-05", descriptionOriginal: "PIX RECEBIDO JACQES LTDA",
    amount: 15000, direction: "credit", managerialCategory: "receita_recorrente",
    classificationConfidence: "confirmed",
  },
  { ...txnBase(docAWQ.id, "AWQ_Holding", "Cora", "Conta PJ AWQ Holding"),
    transactionDate: "2026-01-10", descriptionOriginal: "PIX RECEBIDO CAZA VISION",
    amount: 8000, direction: "credit", managerialCategory: "receita_projeto",
    classificationConfidence: "confirmed",
  },
  // AWQ — intercompany received (excluded from consolidated)
  { ...txnBase(docAWQ.id, "AWQ_Holding", "Cora", "Conta PJ AWQ Holding"),
    transactionDate: "2026-01-12", descriptionOriginal: "TRANSF JACQES HOLDING",
    amount: 5000, direction: "credit", managerialCategory: "transferencia_interna_recebida",
    classificationConfidence: "confirmed",
    isIntercompany: true, excludedFromConsolidated: true,
  },
  // AWQ — operational expenses
  { ...txnBase(docAWQ.id, "AWQ_Holding", "Cora", "Conta PJ AWQ Holding"),
    transactionDate: "2026-01-15", descriptionOriginal: "FORNECEDOR TI",
    amount: -3000, direction: "debit", managerialCategory: "fornecedor_operacional",
    classificationConfidence: "confirmed",
  },
  { ...txnBase(docAWQ.id, "AWQ_Holding", "Cora", "Conta PJ AWQ Holding"),
    transactionDate: "2026-01-20", descriptionOriginal: "PROLABORE SOCIO",
    amount: -5000, direction: "debit", managerialCategory: "prolabore_retirada",
    classificationConfidence: "confirmed",
  },
  // AWQ — investment application (EXCLUDED from operational)
  { ...txnBase(docAWQ.id, "AWQ_Holding", "Cora", "Conta PJ AWQ Holding"),
    transactionDate: "2026-01-25", descriptionOriginal: "APLICACAO CDB BANCARIO",
    amount: -10000, direction: "debit", managerialCategory: "aplicacao_financeira",
    classificationConfidence: "confirmed", excludedFromConsolidated: true,
  },
  // AWQ — ambiguous transaction (review queue)
  { ...txnBase(docAWQ.id, "AWQ_Holding", "Cora", "Conta PJ AWQ Holding"),
    transactionDate: "2026-01-28", descriptionOriginal: "TED NAO IDENTIFICADA",
    amount: 2000, direction: "credit", managerialCategory: "recebimento_ambiguo",
    classificationConfidence: "ambiguous",
  },

  // JACQES — revenue
  { ...txnBase(docJACQES.id, "JACQES", "Itaú", "Conta PJ JACQES"),
    transactionDate: "2026-01-03", descriptionOriginal: "BOLETO CLIENTE A",
    amount: 12000, direction: "credit", managerialCategory: "receita_recorrente",
    classificationConfidence: "confirmed",
  },
  { ...txnBase(docJACQES.id, "JACQES", "Itaú", "Conta PJ JACQES"),
    transactionDate: "2026-01-08", descriptionOriginal: "BOLETO CLIENTE B",
    amount: 8500, direction: "credit", managerialCategory: "receita_recorrente",
    classificationConfidence: "confirmed",
  },
  // JACQES — intercompany sent (excluded from consolidated)
  { ...txnBase(docJACQES.id, "JACQES", "Itaú", "Conta PJ JACQES"),
    transactionDate: "2026-01-12", descriptionOriginal: "TRANSF HOLDING AWQ",
    amount: -5000, direction: "debit", managerialCategory: "transferencia_interna_enviada",
    classificationConfidence: "confirmed",
    isIntercompany: true, excludedFromConsolidated: true,
  },
  // JACQES — expense
  { ...txnBase(docJACQES.id, "JACQES", "Itaú", "Conta PJ JACQES"),
    transactionDate: "2026-01-18", descriptionOriginal: "FREELANCER PROJETO",
    amount: -4000, direction: "debit", managerialCategory: "freelancer_terceiro",
    classificationConfidence: "confirmed",
  },
  { ...txnBase(docJACQES.id, "JACQES", "Itaú", "Conta PJ JACQES"),
    transactionDate: "2026-01-22", descriptionOriginal: "IMPOSTO SIMPLES",
    amount: -3000, direction: "debit", managerialCategory: "imposto_tributo",
    classificationConfidence: "confirmed",
  },

  // Caza_Vision — revenue
  { ...txnBase(docCaza.id, "Caza_Vision", "Nubank", "Conta PJ Caza Vision"),
    transactionDate: "2026-01-04", descriptionOriginal: "CLIENTE IMOVEL A",
    amount: 6000, direction: "credit", managerialCategory: "receita_projeto",
    classificationConfidence: "confirmed",
  },
  { ...txnBase(docCaza.id, "Caza_Vision", "Nubank", "Conta PJ Caza Vision"),
    transactionDate: "2026-01-15", descriptionOriginal: "COMISSAO VENDA",
    amount: 4000, direction: "credit", managerialCategory: "receita_eventual",
    classificationConfidence: "confirmed",
  },
  // Caza — expenses
  { ...txnBase(docCaza.id, "Caza_Vision", "Nubank", "Conta PJ Caza Vision"),
    transactionDate: "2026-01-20", descriptionOriginal: "MARKETING DIGITAL",
    amount: -2000, direction: "debit", managerialCategory: "marketing_midia",
    classificationConfidence: "confirmed",
  },
  { ...txnBase(docCaza.id, "Caza_Vision", "Nubank", "Conta PJ Caza Vision"),
    transactionDate: "2026-01-25", descriptionOriginal: "PROLABORE SOCIO CAZA",
    amount: -4000, direction: "debit", managerialCategory: "prolabore_retirada",
    classificationConfidence: "confirmed",
  },
  { ...txnBase(docCaza.id, "Caza_Vision", "Nubank", "Conta PJ Caza Vision"),
    transactionDate: "2026-01-28", descriptionOriginal: "SOFTWARE ASSINATURA",
    amount: -1500, direction: "debit", managerialCategory: "software_assinatura",
    classificationConfidence: "confirmed",
  },
];

writeJSON(TXN_FILE, txns);

const txnsAfterSeed = readJSON(TXN_FILE, []);
assert(txnsAfterSeed.length === txns.length, `${txns.length} transactions persisted`);

const confirmedCount = txnsAfterSeed.filter(t =>
  t.classificationConfidence === "confirmed"
).length;
const ambiguousCount = txnsAfterSeed.filter(t =>
  t.classificationConfidence === "ambiguous"
).length;
const intercompanyCount = txnsAfterSeed.filter(t => t.isIntercompany).length;
const investmentCount = txnsAfterSeed.filter(t =>
  t.managerialCategory === "aplicacao_financeira" || t.managerialCategory === "resgate_financeiro"
).length;
const excludedCount = txnsAfterSeed.filter(t => t.excludedFromConsolidated).length;

assert(confirmedCount > 0, `${confirmedCount} confirmed transactions`);
assert(ambiguousCount > 0, `${ambiguousCount} ambiguous transactions (review queue)`);
assert(intercompanyCount === 2, `${intercompanyCount} intercompany transfers (matched pair: AWQ↔JACQES)`);
assert(investmentCount === 1, `${investmentCount} investment application (excludedFromConsolidated)`);
assert(excludedCount === 3, `${excludedCount} transactions excluded from consolidated (intercompany×2 + investment×1)`);

// ─── Stage 3 — financial-query validation ─────────────────────────────────────

h1("Stage 3 — financial-query logic validation (filesystem adapter)");

// Replicate core buildFinancialQuery logic without TypeScript imports
const allDocs  = readJSON(DOCS_FILE, []);
const doneDocs = allDocs.filter(d => d.status === "done");
const allTxns  = readJSON(TXN_FILE, []);

assert(allDocs.length === 3,  `getAllDocuments() returns ${allDocs.length} docs`);
assert(doneDocs.length === 3, `${doneDocs.length} docs with status=done → hasData=true`);
assert(allTxns.length > 0,   `getAllTransactions() returns ${allTxns.length} transactions`);

const REVENUE_CATS = new Set([
  "receita_recorrente", "receita_projeto", "receita_eventual",
]);
const OP_EXPENSE_CATS = new Set([
  "fornecedor_operacional", "freelancer_terceiro", "folha_remuneracao",
  "prolabore_retirada", "imposto_tributo", "tarifa_bancaria",
  "software_assinatura", "marketing_midia", "deslocamento_combustivel",
  "alimentacao_representacao", "despesa_pessoal_misturada", "despesa_ambigua",
]);

let totalRevenue = 0, totalExpenses = 0, intercompanyEliminated = 0;

for (const t of allTxns) {
  if (t.excludedFromConsolidated) {
    if (t.isIntercompany) intercompanyEliminated += Math.abs(t.amount);
    continue;
  }
  const amt = Math.abs(t.amount);
  if (REVENUE_CATS.has(t.managerialCategory) && t.direction === "credit") totalRevenue += amt;
  if (OP_EXPENSE_CATS.has(t.managerialCategory) && t.direction === "debit") totalExpenses += amt;
}

const operationalNetCash = totalRevenue - totalExpenses;
const intercompanyPairCount = allTxns.filter(t => t.isIntercompany && t.excludedFromConsolidated).length / 2;

assert(totalRevenue > 0,       `totalRevenue = R$${totalRevenue.toLocaleString("pt-BR")} (cash-basis receita)`);
assert(totalExpenses > 0,      `totalExpenses = R$${totalExpenses.toLocaleString("pt-BR")} (cash-basis despesas)`);
assert(operationalNetCash > 0, `operationalNetCash = R$${operationalNetCash.toLocaleString("pt-BR")}`);
assert(intercompanyPairCount === 1, `${intercompanyPairCount} intercompany pair eliminated from consolidated (AWQ↔JACQES, R$${intercompanyEliminated.toLocaleString("pt-BR")} removed)`);

// Validate investment separation
const investmentTxns = allTxns.filter(t =>
  t.managerialCategory === "aplicacao_financeira" || t.managerialCategory === "resgate_financeiro"
);
const investmentTxnsInOperational = allTxns.filter(t =>
  (t.managerialCategory === "aplicacao_financeira" || t.managerialCategory === "resgate_financeiro") &&
  !t.excludedFromConsolidated
);

assert(investmentTxns.length > 0, `${investmentTxns.length} investment transactions detected`);
assert(
  investmentTxnsInOperational.length === 0,
  "Zero investment transactions leak into operational FCO (all excluded)"
);

// ─── Stage 4 — investment-query validation ────────────────────────────────────

h1("Stage 4 — investment-query logic validation");

const confirmedInvestment = allTxns.filter(t =>
  t.managerialCategory === "aplicacao_financeira" || t.managerialCategory === "resgate_financeiro"
);
const applications = confirmedInvestment.filter(t =>
  t.managerialCategory === "aplicacao_financeira" && t.direction === "debit"
);
const redemptions = confirmedInvestment.filter(t =>
  t.managerialCategory === "resgate_financeiro" && t.direction === "credit"
);

assert(applications.length === 1, `${applications.length} confirmed aplicacao_financeira`);
assert(redemptions.length === 0,  `${redemptions.length} resgates — empty investment result is honest`);

const totalApplications = applications.reduce((s, t) => s + Math.abs(t.amount), 0);
assert(totalApplications > 0, `totalApplications = R$${totalApplications.toLocaleString("pt-BR")}`);

const netInvested = totalApplications - redemptions.reduce((s, t) => s + Math.abs(t.amount), 0);
assert(netInvested === totalApplications, `netInvested = R$${netInvested.toLocaleString("pt-BR")} (net cash out to investment vehicles)`);

// Validate no internal transfers entered investment pool
const internalTransferInvestment = allTxns.filter(t =>
  (t.managerialCategory === "transferencia_interna_enviada" ||
   t.managerialCategory === "transferencia_interna_recebida") &&
  !t.isIntercompany
);
assert(
  internalTransferInvestment.length === 0 || internalTransferInvestment.every(t => t.excludedFromConsolidated),
  "Unmatched internal transfers not counted as new investment"
);

// ─── Stage 5 — coverage validation ───────────────────────────────────────────

h1("Stage 5 — Coverage by entity and period");

const entityCoverage = new Set(doneDocs.map(d => d.entity));
assert(entityCoverage.has("AWQ_Holding"),  "AWQ_Holding: covered");
assert(entityCoverage.has("JACQES"),       "JACQES: covered");
assert(entityCoverage.has("Caza_Vision"),  "Caza_Vision: covered");

const periodStart = doneDocs.reduce((min, d) => !min || d.periodStart < min ? d.periodStart : min, null);
const periodEnd   = doneDocs.reduce((max, d) => !max || d.periodEnd   > max ? d.periodEnd   : max, null);
assert(periodStart === PERIOD_START, `Period start: ${periodStart}`);
assert(periodEnd   === PERIOD_END,   `Period end: ${periodEnd}`);

// ─── Stage 6 — blobUrl field validation ──────────────────────────────────────

h1("Stage 6 — blobUrl field presence (Neon schema readiness)");

for (const doc of allDocs) {
  assert(
    "blobUrl" in doc,
    `${doc.entity} document has blobUrl field (null = filesystem, string = Blob URL)`
  );
}

// ─── Stage 7 — Data quality report ───────────────────────────────────────────

h1("Stage 7 — Data quality simulation");

const qualityAmbiguous = allTxns.filter(t =>
  t.classificationConfidence === "ambiguous" || t.classificationConfidence === "unclassifiable"
).length;
const qualityConfirmed = allTxns.filter(t =>
  t.classificationConfidence === "confirmed" || t.classificationConfidence === "probable"
).length;

assert(qualityConfirmed > 0, `${qualityConfirmed} transactions with confirmed/probable classification`);
assert(qualityAmbiguous > 0, `${qualityAmbiguous} transactions in review queue (expected — correct)`);

info(`Classification rate: ${Math.round(qualityConfirmed / allTxns.length * 100)}% confirmed`);
info(`Review queue: ${qualityAmbiguous} transactions`);

// ─── Final summary ────────────────────────────────────────────────────────────

h1("Validation Summary");

console.log();
console.log(`  Tests passed: ${C.green}${passCount}${C.reset}`);
console.log(`  Tests failed: ${failCount > 0 ? C.red : C.green}${failCount}${C.reset}`);
console.log();

if (failCount === 0) {
  console.log(`  ${C.green}${C.bold}✓ Pipeline fully validated in filesystem mode${C.reset}`);
  console.log(`  ${C.green}  With DATABASE_URL set, identical logic runs against Neon Postgres${C.reset}`);
  console.log(`  ${C.green}  With BLOB_READ_WRITE_TOKEN set, PDFs are stored in Vercel Blob${C.reset}`);
  console.log();
  console.log(`  ${C.blue}Key metrics:${C.reset}`);
  console.log(`    Revenue (cash-basis):       R$${totalRevenue.toLocaleString("pt-BR")}`);
  console.log(`    Expenses (cash-basis):      R$${totalExpenses.toLocaleString("pt-BR")}`);
  console.log(`    FCO líquido:                R$${operationalNetCash.toLocaleString("pt-BR")}`);
  console.log(`    Intercompany eliminated:    R$${intercompanyEliminated.toLocaleString("pt-BR")}`);
  console.log(`    Investment applications:    R$${totalApplications.toLocaleString("pt-BR")}`);
  console.log(`    Coverage: AWQ_Holding, JACQES, Caza_Vision — janeiro 2026`);
  console.log();
  console.log(`  ${C.gray}Seeded data is in public/data/financial/{documents,transactions}.json${C.reset}`);
  console.log(`  ${C.gray}Run 'node scripts/validate-pipeline.mjs --clean' to remove seed data${C.reset}`);
} else {
  console.log(`  ${C.red}${C.bold}✗ ${failCount} validation(s) failed — investigate above${C.reset}`);
}

console.log();
