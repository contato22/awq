// ─── GET /api/health — Infrastructure presence + live DB state ────────────────
//
// PUBLIC endpoint (excluded from middleware auth). Reports:
//   1. Env var presence (boolean — never exposes values)
//   2. Neon DB connectivity (SELECT 1 ping)
//   3. Schema existence (financial_documents, bank_transactions tables)
//   4. REAL DATA counters — the definitive proof of operational state:
//        documentCount     — total docs in financial_documents
//        doneDocumentCount — docs with status='done' (processed by pipeline)
//        transactionCount  — total rows in bank_transactions (real persisted txns)
//        hasRealData       — true only when doneDocumentCount > 0 AND transactionCount > 0
//
// hasRealData = false → DB ready but no PDF has been ingested
// hasRealData = true  → full pipeline ran, financial-query can serve real data
//
// Excluded from middleware: matcher "/((?!login|api/auth|api/health|...)*)"
// Accessible without authentication.

import { NextResponse } from "next/server";
import { USE_DB, USE_BLOB, sql, initDB } from "@/lib/db";

export const runtime = "nodejs";
// NOTE: "force-dynamic" removed — incompatible with output: "export" (static build).
// This route is excluded from static export; Vercel SSR handles it dynamically by default.

export async function GET(): Promise<NextResponse> {
  // ── Presence flags (boolean only — no secret values) ──────────────────────
  const presence = {
    db:      USE_DB,
    blob:    USE_BLOB,
    ai:      !!process.env.ANTHROPIC_API_KEY,
    auth:    !!process.env.NEXTAUTH_SECRET,
    authUrl: !!process.env.NEXTAUTH_URL,
    dbAdapter:   USE_DB   ? "neon-postgres"   : "filesystem-json",
    blobAdapter: USE_BLOB ? "vercel-blob"      : "local-filesystem",
  };

  // ── DB connectivity + live data counters ───────────────────────────────────
  let dbPing: "ok" | "error" | "skipped" = "skipped";
  let dbPingMs: number | null = null;
  let tablesExist: { documents: boolean; transactions: boolean } | null = null;
  let documentCount: number | null = null;
  let doneDocumentCount: number | null = null;
  let transactionCount: number | null = null;
  let hasRealData = false;

  if (USE_DB && sql) {
    const t0 = Date.now();
    try {
      // 1. Connectivity ping
      await sql`SELECT 1 AS ping`;
      dbPing = "ok";
      dbPingMs = Date.now() - t0;

      // 2. Ensure tables exist (idempotent CREATE TABLE IF NOT EXISTS)
      await initDB();

      // 3. Table existence check
      const tableCheck = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('financial_documents', 'bank_transactions')
      `;
      const tableNames = new Set(tableCheck.map((r: { table_name: string }) => r.table_name));
      tablesExist = {
        documents:    tableNames.has("financial_documents"),
        transactions: tableNames.has("bank_transactions"),
      };

      // 4. Real data counters — proves pipeline actually ran
      if (tablesExist.documents) {
        const docRow  = await sql`SELECT COUNT(*) AS n FROM financial_documents`;
        const doneRow = await sql`SELECT COUNT(*) AS n FROM financial_documents WHERE status = 'done'`;
        documentCount     = Number(docRow[0]?.n  ?? 0);
        doneDocumentCount = Number(doneRow[0]?.n ?? 0);
      }

      if (tablesExist.transactions) {
        const txnRow = await sql`SELECT COUNT(*) AS n FROM bank_transactions`;
        transactionCount = Number(txnRow[0]?.n ?? 0);
      }

      // hasRealData = at least 1 doc completed the full pipeline AND has transactions
      hasRealData = (doneDocumentCount ?? 0) > 0 && (transactionCount ?? 0) > 0;

    } catch (_err) {
      dbPing = "error";
      dbPingMs = Date.now() - t0;
    }
  }

  return NextResponse.json({
    // Env var presence
    ...presence,
    // DB connectivity
    dbPing,
    dbPingMs,
    tablesExist,
    // Real data counters (null = DB unavailable)
    documentCount,      // total docs in DB (0 = no PDFs uploaded yet)
    doneDocumentCount,  // docs with status='done' (pipeline completed)
    transactionCount,   // rows in bank_transactions (0 = no pipeline run)
    hasRealData,        // true only when real pipeline ran end-to-end
  });
}
