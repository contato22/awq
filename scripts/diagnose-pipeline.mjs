#!/usr/bin/env node
// ─── AWQ Pipeline Diagnostics ────────────────────────────────────────────────
//
// Diagnoses the financial ingest pipeline without needing the HTTP server.
// Run from project root: node scripts/diagnose-pipeline.mjs
//
// Reports:
//   1. public/data/financial/ directory contents
//   2. documents.json — status and metadata per document
//   3. transactions.json — summary counts
//   4. Actionable advice based on what's found

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR  = path.join(ROOT, "public", "data", "financial");
const DOCS_FILE = path.join(DATA_DIR, "documents.json");
const TXN_FILE  = path.join(DATA_DIR, "transactions.json");
const PDF_DIR   = path.join(DATA_DIR, "pdfs");

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

function ok(msg)   { console.log(`  ${C.green}✓${C.reset} ${msg}`); }
function warn(msg) { console.log(`  ${C.yellow}⚠${C.reset} ${msg}`); }
function err(msg)  { console.log(`  ${C.red}✗${C.reset} ${msg}`); }
function info(msg) { console.log(`  ${C.blue}ℹ${C.reset} ${msg}`); }
function h1(msg)   { console.log(`\n${C.bold}${C.cyan}▶ ${msg}${C.reset}`); }
function h2(msg)   { console.log(`\n  ${C.bold}${msg}${C.reset}`); }

// ─── 1. Directory check ───────────────────────────────────────────────────────

h1("Directory Check");

if (!fs.existsSync(DATA_DIR)) {
  err(`public/data/financial/ does not exist`);
  warn("Run the app and upload a PDF via /awq/ingest to create this directory.");
  process.exit(1);
}
ok(`public/data/financial/ exists`);

const dirContents = fs.readdirSync(DATA_DIR);
info(`Contents: ${dirContents.join(", ") || "(empty)"}`);

// ─── 2. PDFs ─────────────────────────────────────────────────────────────────

h1("PDF Files");

if (!fs.existsSync(PDF_DIR)) {
  warn("pdfs/ subdirectory does not exist — no PDFs uploaded yet");
} else {
  const pdfs = fs.readdirSync(PDF_DIR).filter(f => f.endsWith(".pdf"));
  if (pdfs.length === 0) {
    warn("pdfs/ directory exists but is empty — no PDFs uploaded");
  } else {
    ok(`${pdfs.length} PDF(s) found:`);
    pdfs.forEach(f => {
      const size = fs.statSync(path.join(PDF_DIR, f)).size;
      info(`  ${f} (${Math.round(size / 1024)}KB)`);
    });
  }
}

// ─── 3. Documents ─────────────────────────────────────────────────────────────

h1("documents.json");

if (!fs.existsSync(DOCS_FILE)) {
  warn("documents.json does not exist — no documents registered yet");
  warn("Upload a PDF via /awq/ingest to create this file.");
} else {
  const raw = fs.readFileSync(DOCS_FILE, "utf-8");
  let docs = [];
  try {
    docs = JSON.parse(raw);
  } catch (e) {
    err(`documents.json is corrupted: ${e.message}`);
    process.exit(1);
  }

  ok(`${docs.length} document(s) registered`);

  const byStatus = {};
  for (const doc of docs) {
    byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
  }

  h2("Status breakdown:");
  for (const [status, count] of Object.entries(byStatus)) {
    const icon = status === "done" ? C.green + "✓" + C.reset
               : status === "error" ? C.red + "✗" + C.reset
               : C.yellow + "○" + C.reset;
    console.log(`    ${icon} ${status}: ${count}`);
  }

  h2("Document details:");
  for (const doc of docs) {
    console.log(`\n    ${C.bold}${doc.filename || doc.id}${C.reset}`);
    console.log(`      id:        ${doc.id}`);
    console.log(`      bank:      ${doc.bank || "(unknown)"}`);
    console.log(`      entity:    ${doc.entity || "(unknown)"}`);
    console.log(`      status:    ${doc.status}`);
    console.log(`      uploaded:  ${doc.uploadedAt || "(unknown)"}`);
    if (doc.transactionCount !== undefined) {
      console.log(`      txns:      ${doc.transactionCount}`);
    }
    if (doc.parserConfidence) {
      console.log(`      confidence: ${doc.parserConfidence}`);
    }
    if (doc.extractionNotes) {
      const notes = doc.extractionNotes.slice(0, 300);
      console.log(`      notes:     ${notes}${doc.extractionNotes.length > 300 ? "..." : ""}`);
    }
    if (doc.errorMessage) {
      console.log(`      ${C.red}error:${C.reset}     ${doc.errorMessage.slice(0, 300)}`);
    }

    // Check if PDF file exists on disk for this doc
    if (fs.existsSync(PDF_DIR)) {
      const matching = fs.readdirSync(PDF_DIR).filter(f => f.startsWith(doc.id));
      if (matching.length > 0) {
        ok(`      PDF on disk: ${matching[0]}`);
      } else {
        err(`      PDF NOT found on disk for documentId ${doc.id}`);
        warn(`      This will cause processing to fail with "PDF não encontrado" error.`);
        warn(`      Possible cause: server was restarted (ephemeral filesystem on Vercel).`);
        warn(`      Solution: re-upload the PDF via /awq/ingest.`);
      }
    }
  }

  // ── Diagnose stuck documents ────────────────────────────────────────────────
  const stuck = docs.filter(d => d.status === "received" || d.status === "extracting" || d.status === "classifying" || d.status === "reconciling");
  if (stuck.length > 0) {
    h2("Stuck documents (never completed pipeline):");
    for (const doc of stuck) {
      warn(`  ${doc.filename || doc.id} stuck at "${doc.status}"`);
      info(`  → Trigger re-processing: POST /api/ingest/process with { documentId: "${doc.id}" }`);
    }
  }

  const errored = docs.filter(d => d.status === "error");
  if (errored.length > 0) {
    h2("Errored documents:");
    for (const doc of errored) {
      err(`  ${doc.filename || doc.id}`);
      if (doc.errorMessage) {
        const msg = doc.errorMessage;
        if (msg.includes("Nenhum lançamento extraído")) {
          warn(`    Parser returned 0 transactions.`);
          warn(`    Possible causes:`);
          warn(`      a) PDF uses image/scan — needs ANTHROPIC_API_KEY for Claude Vision fallback`);
          warn(`      b) PDF format doesn't match bank-specific regex`);
          warn(`      c) Text extraction (pdf-parse) returned wrong whitespace encoding`);
          info(`    Solution: Set ANTHROPIC_API_KEY in .env.local to enable Claude Vision fallback.`);
          info(`    Then re-process: POST /api/ingest/process { documentId: "${doc.id}" }`);
        } else if (msg.includes("PDF não encontrado")) {
          err(`    PDF file missing from disk.`);
          info(`    Solution: re-upload the PDF via /awq/ingest`);
        } else {
          warn(`    Error: ${msg.slice(0, 200)}`);
        }
      }
    }
  }

  const done = docs.filter(d => d.status === "done");
  if (done.length === 0 && docs.length > 0) {
    h2("No documents reached 'done' status.");
    warn("buildFinancialQuery() will return hasData:false until at least one document is 'done'.");
    warn("Pages /awq/financial and /awq/cashflow will show empty state.");
    info("Steps to fix:");
    info("  1. Ensure the PDF is re-uploaded if server was restarted");
    info("  2. Go to /awq/ingest and click Process on the document");
    info("  3. If processing fails with 0 transactions, set ANTHROPIC_API_KEY");
  } else if (done.length > 0) {
    ok(`${done.length} document(s) fully processed (status=done) — hasData will be true`);
  }
}

// ─── 4. Transactions ──────────────────────────────────────────────────────────

h1("transactions.json");

if (!fs.existsSync(TXN_FILE)) {
  warn("transactions.json does not exist — no transactions ingested yet");
} else {
  const raw = fs.readFileSync(TXN_FILE, "utf-8");
  let txns = [];
  try {
    txns = JSON.parse(raw);
  } catch (e) {
    err(`transactions.json is corrupted: ${e.message}`);
    process.exit(1);
  }

  ok(`${txns.length} transaction(s) stored`);

  if (txns.length > 0) {
    const entities = {};
    const categories = {};
    let credits = 0, debits = 0;

    for (const t of txns) {
      entities[t.entity]            = (entities[t.entity] || 0) + 1;
      categories[t.managerialCategory] = (categories[t.managerialCategory] || 0) + 1;
      if (t.direction === "credit") credits += Math.abs(t.amount);
      else debits += Math.abs(t.amount);
    }

    h2("By entity:");
    for (const [e, n] of Object.entries(entities)) {
      info(`  ${e}: ${n} transactions`);
    }

    h2("Top categories:");
    const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 8);
    for (const [cat, n] of sortedCats) {
      info(`  ${cat}: ${n}`);
    }

    h2("Cash summary:");
    info(`  Total credits: R$${credits.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
    info(`  Total debits:  R$${debits.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
    info(`  Net:           R$${(credits - debits).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  }
}

// ─── 5. Summary and recommendations ──────────────────────────────────────────

h1("Summary");

const hasDocs = fs.existsSync(DOCS_FILE);
const hasTxns = fs.existsSync(TXN_FILE);

if (hasDocs && hasTxns) {
  const docs = JSON.parse(fs.readFileSync(DOCS_FILE, "utf-8"));
  const txns = JSON.parse(fs.readFileSync(TXN_FILE, "utf-8"));
  const done = docs.filter(d => d.status === "done");

  if (done.length > 0 && txns.length > 0) {
    ok("Pipeline fully functional — buildFinancialQuery() returns hasData:true");
    ok("/awq/financial and /awq/cashflow will show real data");
  } else if (docs.length > 0 && done.length === 0) {
    warn("Documents exist but none completed — pipeline blocked");
    info("Check the error messages above and follow the fix instructions");
  } else {
    info("No documents ingested yet. Upload a bank statement at /awq/ingest");
  }
} else if (!hasDocs) {
  info("No documents ingested yet. Upload a bank statement at /awq/ingest");
}

console.log();
