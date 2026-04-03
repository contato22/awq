// ─── AWQ Financial Ingest — Honest Layer Classification ───────────────────────
//
// PURPOSE:
//   Single source of truth for the REAL operational status of every component
//   in the financial document ingest pipeline.
//
//   This file exists to prevent "looks resolved" from being mistaken for
//   "provably works in production". Every layer is classified on two axes:
//
//   IMPLEMENTATION: is the code written and does it compile?
//   VALIDATION: has it been tested with real inputs?
//
// CRITICAL DISTINCTION:
//   "Staging-functional" = code is correct, logic is sound, structure is right,
//   but has never processed a real PDF from the actual bank accounts.
//
//   "Production-functional" = tested with real inputs, failures handled,
//   edge cases documented, persistent storage in place.
//
// DASHBOARDS:
//   All AWQ financial dashboards (awq/financial, awq/cashflow, jacqes/financial,
//   caza-vision/financial, awq/kpis, etc.) still read from hardcoded snapshots
//   (lib/awq-group-data.ts, lib/data.ts, lib/caza-data.ts).
//   The ingest infrastructure was built but NOT YET connected to dashboard reads.
//   No dashboard currently consumes public/data/financial/*.
//   This is explicitly NOT a bug — it's the correct sequencing:
//   ingest real data first, then migrate dashboard reads.

// ─── Layer status types ────────────────────────────────────────────────────────

export type LayerImplStatus =
  | "implemented"           // code exists and compiles
  | "not_implemented";      // code does not exist

export type LayerValidationStatus =
  | "proven_with_real_data"      // tested with actual bank PDFs
  | "staging_functional"         // correct code, not tested with real PDFs
  | "depends_on_real_pdfs"       // cannot be validated without actual bank statements
  | "not_validated"              // not tested at all
  | "not_verifiable_by_repo";    // requires runtime environment to verify

export type LayerProductionStatus =
  | "production_ready"           // works in Vercel/production as-is
  | "local_only"                 // works locally, NOT on Vercel (ephemeral fs)
  | "requires_infra_upgrade"     // needs Vercel Blob/S3/Postgres for production
  | "staging_only";              // staging environment only

export interface IngestLayerStatus {
  name: string;
  files: string[];
  implementation: LayerImplStatus;
  validation: LayerValidationStatus;
  production: LayerProductionStatus;
  notes: string;
  knownLimitations: string[];
}

// ─── Layer registry ────────────────────────────────────────────────────────────

export const INGEST_LAYER_STATUS: IngestLayerStatus[] = [
  {
    name: "Upload API",
    files: ["app/api/ingest/upload/route.ts"],
    implementation: "implemented",
    validation: "staging_functional",
    production: "local_only",
    notes:
      "Accepts PDF via multipart/form-data. Validates type, size (20MB), deduplicates by SHA-256. " +
      "Saves PDF to public/data/financial/pdfs/. Auth via getToken() (correct for App Router). " +
      "Works correctly in local development.",
    knownLimitations: [
      "public/data/financial/pdfs/ is ephemeral on Vercel serverless — PDFs lost between cold starts",
      "For production persistence: migrate to Vercel Blob storage (single env var change)",
    ],
  },
  {
    name: "Document Storage (JSON)",
    files: ["lib/financial-db.ts", "public/data/financial/documents.json"],
    implementation: "implemented",
    validation: "staging_functional",
    production: "local_only",
    notes:
      "JSON file persistence for document metadata and transactions. " +
      "Correct fallback handling (empty file, missing file, malformed JSON). " +
      "SHA-256 deduplication. Works correctly in local development.",
    knownLimitations: [
      "public/data/financial/*.json written to filesystem — ephemeral on Vercel serverless",
      "For production persistence: migrate to Neon/Postgres or Vercel KV",
      "Current JSON format is clean and migration to proper DB is straightforward",
    ],
  },
  {
    name: "PDF Extraction (Claude Vision API)",
    files: ["lib/bank-parsers.ts"],
    implementation: "implemented",
    validation: "depends_on_real_pdfs",
    production: "staging_only",
    notes:
      "Uses Claude claude-opus-4-6 DocumentBlockParam (SDK 0.80.0 native type — no `as any` cast). " +
      "Bank-specific prompts for Cora and Itaú. Honest confidence scoring. " +
      "Error handling returns confidence:low + diagnostics instead of crash. " +
      "REQUIRES ANTHROPIC_API_KEY to function.",
    knownLimitations: [
      "NOT PROVEN with real Cora or Itaú bank statement PDFs",
      "Scanned/image-only PDFs have no text layer — extraction will return 0 transactions (confidence:low)",
      "Very large PDFs (>20MB) are rejected at upload — may be too restrictive for some bank exports",
      "Parser prompts are based on documented Cora/Itaú formats, not empirically validated",
      "Multi-page statements with complex headers may confuse column detection",
    ],
  },
  {
    name: "Bank Parser — Cora",
    files: ["lib/bank-parsers.ts (BANK_HINTS.Cora)"],
    implementation: "implemented",
    validation: "depends_on_real_pdfs",
    production: "staging_only",
    notes: "Prompt describes Cora format characteristics. Structure is correct.",
    knownLimitations: [
      "Zero real Cora PDF statements processed through this pipeline",
      "Layout assumptions based on known Cora format — not empirically validated",
    ],
  },
  {
    name: "Bank Parser — Itaú",
    files: ["lib/bank-parsers.ts (BANK_HINTS.Itaú)"],
    implementation: "implemented",
    validation: "depends_on_real_pdfs",
    production: "staging_only",
    notes: "Prompt describes Itaú PJ format characteristics. Structure is correct.",
    knownLimitations: [
      "Zero real Itaú PDF statements processed through this pipeline",
      "Itaú PJ statements may vary by account type and export format",
    ],
  },
  {
    name: "Transaction Classification",
    files: ["lib/financial-classifier.ts"],
    implementation: "implemented",
    validation: "staging_functional",
    production: "staging_only",
    notes:
      "22 gerencial categories. Rule-based counterparty dictionary (known AWQ clients). " +
      "Structural heuristics (salary, pro-labore, taxes, software, personal expenses). " +
      "Confidence levels are real: confirmed/probable/ambiguous/unclassifiable. " +
      "Ambiguous transactions remain ambiguous — never forced into a false category.",
    knownLimitations: [
      "Rules are based on known patterns — new clients or unknown counterparties fall to 'ambiguous'",
      "Pix transactions without identifiable counterparty name always classified as ambiguous",
      "Classification accuracy depends on description quality from Claude extraction",
      "No machine learning — purely rule-based",
    ],
  },
  {
    name: "Intercompany Reconciliation",
    files: ["lib/financial-reconciler.ts"],
    implementation: "implemented",
    validation: "depends_on_real_pdfs",
    production: "staging_only",
    notes:
      "Detects Cora↔Itaú transfers by amount + date proximity (±3 days). " +
      "Tags both sides excludedFromConsolidated=true. " +
      "Financial applications/redemptions also auto-excluded. " +
      "Algorithm is correct for the documented account topology.",
    knownLimitations: [
      "Cannot reconcile until BOTH Cora and Itaú statements are ingested",
      "Requires real transactions to validate matching algorithm",
      "Date tolerance (3 days) may need adjustment based on real transfer timing",
      "Same-day same-amount coincidences between operational payments could produce false positives",
    ],
  },
  {
    name: "Pipeline Processing API (SSE)",
    files: ["app/api/ingest/process/route.ts"],
    implementation: "implemented",
    validation: "staging_functional",
    production: "local_only",
    notes:
      "SSE streaming pipeline: extract→classify→reconcile→persist. " +
      "Correct error propagation. API key guard for ANTHROPIC_API_KEY. " +
      "All stages have honest status reporting.",
    knownLimitations: [
      "Reads PDF from local filesystem (ephemeral on Vercel)",
      "Requires ANTHROPIC_API_KEY server-side env var",
      "Vercel serverless functions have 60s timeout — large PDFs may time out",
    ],
  },
  {
    name: "Query APIs (documents + transactions)",
    files: [
      "app/api/ingest/documents/route.ts",
      "app/api/ingest/transactions/route.ts",
    ],
    implementation: "implemented",
    validation: "staging_functional",
    production: "local_only",
    notes: "Filter queries with entity/bank/status/confidence/intercompany params. Correct.",
    knownLimitations: ["Returns empty state if no documents ingested yet (correct behavior)"],
  },
  {
    name: "Ingest UI (/awq/ingest)",
    files: ["app/awq/ingest/page.tsx"],
    implementation: "implemented",
    validation: "staging_functional",
    production: "staging_only",
    notes:
      "Full pipeline UI: drag-drop upload, bank/entity selection, SSE pipeline log, " +
      "transaction table with filters, intercompany badges, ambiguity alerts, governance footer.",
    knownLimitations: [
      "In STATIC_EXPORT=1 mode (GitHub Pages) all API routes are unavailable — ingest shows empty state",
      "No manual classification/override UI yet — ambiguous items can be seen but not corrected in-app",
    ],
  },
  {
    name: "Dashboard Integration (AWQ Financial)",
    files: [
      "lib/awq-group-data.ts",
      "lib/data.ts",
      "lib/caza-data.ts",
      "app/awq/financial/page.tsx",
      "app/awq/cashflow/page.tsx",
      "app/jacqes/financial/page.tsx",
      "app/caza-vision/financial/page.tsx",
    ],
    implementation: "not_implemented",
    validation: "not_validated",
    production: "staging_only",
    notes:
      "NOT CONNECTED. All dashboards still read from hardcoded snapshots. " +
      "This is intentional sequencing: real data must be ingested and validated " +
      "before migrating dashboard reads. No mock data was replaced.",
    knownLimitations: [
      "awq-group-data.ts, data.ts, caza-data.ts remain the source for all KPI/financial displays",
      "Zero financial dashboard reads from public/data/financial/",
      "Migration path exists (getCashPositionByEntity(), getTransactionsByEntity()) but not wired up",
    ],
  },
];

// ─── Summary view ──────────────────────────────────────────────────────────────

export const INGEST_SUMMARY = {
  totalLayers: INGEST_LAYER_STATUS.length,
  implementedLayers: INGEST_LAYER_STATUS.filter(
    (l) => l.implementation === "implemented"
  ).length,
  productionReady: INGEST_LAYER_STATUS.filter(
    (l) => l.production === "production_ready"
  ).length,
  stagingFunctional: INGEST_LAYER_STATUS.filter(
    (l) => l.validation === "staging_functional"
  ).length,
  provenWithRealData: INGEST_LAYER_STATUS.filter(
    (l) => l.validation === "proven_with_real_data"
  ).length,
  requiresRealPDFs: INGEST_LAYER_STATUS.filter(
    (l) => l.validation === "depends_on_real_pdfs"
  ).length,
  dashboardsStillOnSnapshot: true, // explicit flag — never silently false
  overallAssessment:
    "STAGING-FUNCTIONAL: Pipeline is architecturally correct and locally functional. " +
    "Not yet validated with real bank PDFs. Not yet production-ready (ephemeral storage). " +
    "Dashboards remain on hardcoded snapshots. " +
    "Next gate: ingest real Cora + Itaú statements and validate output.",
} as const;
