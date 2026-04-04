// ─── GET /api/health — Infrastructure presence + connectivity check ──────────
//
// PUBLIC endpoint (excluded from middleware auth). Reports:
//   1. Which environment variables are PRESENT (boolean — never exposes values)
//   2. Whether Neon DB is actually reachable (SELECT 1 ping)
//   3. Whether the financial_documents and bank_transactions tables exist
//
// Used by the probe-vercel.yml workflow to empirically verify infrastructure
// state without requiring admin dashboard access.
//
// Excluded from middleware in middleware.ts matcher (api/health).
// Accessible without authentication.

import { NextResponse } from "next/server";
import { USE_DB, USE_BLOB, sql, initDB } from "@/lib/db";

export const runtime = "nodejs";
// No caching — always reflect live env state
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  // ── Presence flags ─────────────────────────────────────────────────────────
  const presence = {
    db:      USE_DB,
    blob:    USE_BLOB,
    ai:      !!process.env.ANTHROPIC_API_KEY,
    auth:    !!process.env.NEXTAUTH_SECRET,
    authUrl: !!process.env.NEXTAUTH_URL,
    dbAdapter:   USE_DB   ? "neon-postgres"    : "filesystem-json",
    blobAdapter: USE_BLOB ? "vercel-blob"       : "local-filesystem",
  };

  // ── DB connectivity (only if DATABASE_URL is configured) ───────────────────
  let dbPing: "ok" | "error" | "skipped" = "skipped";
  let dbPingMs: number | null = null;
  let tablesExist: { documents: boolean; transactions: boolean } | null = null;
  let documentCount: number | null = null;

  if (USE_DB && sql) {
    const t0 = Date.now();
    try {
      // 1. Connectivity ping
      await sql`SELECT 1 AS ping`;
      dbPing = "ok";
      dbPingMs = Date.now() - t0;

      // 2. Ensure tables exist (idempotent CREATE TABLE IF NOT EXISTS)
      await initDB();

      // 3. Check table existence
      const tableCheck = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('financial_documents', 'bank_transactions')
      `;
      const tableNames = new Set(tableCheck.map((r) => r.table_name as string));
      tablesExist = {
        documents:    tableNames.has("financial_documents"),
        transactions: tableNames.has("bank_transactions"),
      };

      // 4. Document count (proves real data vs empty)
      const countRow = await sql`SELECT COUNT(*) AS n FROM financial_documents`;
      documentCount = Number(countRow[0]?.n ?? 0);
    } catch (err) {
      dbPing = "error";
      dbPingMs = Date.now() - t0;
    }
  }

  return NextResponse.json({
    ...presence,
    // DB connectivity
    dbPing,
    dbPingMs,
    tablesExist,
    documentCount,  // null = DB unavailable, 0 = DB ready but no data, N = N real docs
  });
}
