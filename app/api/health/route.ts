// ─── GET /api/health — Infrastructure presence + live DB state ————————————————
//
// PUBLIC endpoint (excluded from middleware auth). Reports:
//   1. Env var presence (boolean — never exposes values)
//   2. Active DB adapter (which client is used for financial data)
//   3. ERP Supabase connectivity (live ping via REST)
//   4. Cora configuration status
//   5. Real data counters
//
// Accessible without authentication.

import { NextResponse } from "next/server";
import { USE_DB, USE_BLOB, sql, initDB } from "@/lib/db";
import { isCoraConfigured, isCoraJacqesConfigured } from "@/lib/cora-api";
import { USE_SUPABASE, USE_ERP_ADMIN, erpAnon } from "@/lib/supabase";

export const runtime = "nodejs";

async function pingErpSupabase(): Promise<{ ok: boolean; rls: boolean | null; rowCount: number | null; ms: number }> {
  const t0 = Date.now();
  try {
    const { data, error } = await erpAnon!
      .from("bank_transactions")
      .select("id", { count: "exact", head: false })
      .limit(1);

    const ms = Date.now() - t0;
    if (error) {
      // 42501 = RLS blocking anon; tables exist but anon can't read
      const rls = error.code === "42501";
      return { ok: false, rls, rowCount: null, ms };
    }
    const { count } = await erpAnon!
      .from("bank_transactions")
      .select("*", { count: "exact", head: true });
    return { ok: true, rls: false, rowCount: count ?? (data?.length ?? 0), ms };
  } catch {
    return { ok: false, rls: null, rowCount: null, ms: Date.now() - t0 };
  }
}

export async function GET(): Promise<NextResponse> {
  // ── Env var presence (boolean only — no secret values) ————————————————
  const presence = {
    auth:    !!process.env.NEXTAUTH_SECRET,
    authUrl: !!process.env.NEXTAUTH_URL,
    ai:      !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "sk-ant-api03-placeholder",
    blob:    USE_BLOB,
    // DB adapters
    supabaseFinancial: USE_SUPABASE,
    erpServiceRole:    USE_ERP_ADMIN,
    directPostgres:    USE_DB,
    // Cora
    coraHolding: isCoraConfigured(),
    coraJacqes:  isCoraJacqesConfigured(),
  };

  // DB adapter priority (mirrors financial-db.ts logic)
  const dbAdapter = USE_SUPABASE    ? "supabase-financial-service-role"
                  : USE_ERP_ADMIN   ? "erp-supabase-service-role"
                  : USE_DB          ? "direct-postgres"
                  : "erp-supabase-anon";  // anon only — may be blocked by RLS

  // ── ERP Supabase live ping —————————————————————————————————————————
  const erp = await pingErpSupabase();

  // ── Direct Postgres ping (if DATABASE_URL set) —————————————————————————
  let directDb: { ping: "ok" | "error" | "skipped"; ms: number | null; tables: { documents: boolean; transactions: boolean } | null; transactionCount: number | null; hasRealData: boolean } = {
    ping: "skipped", ms: null, tables: null, transactionCount: null, hasRealData: false,
  };

  if (USE_DB && sql) {
    const t0 = Date.now();
    try {
      await sql`SELECT 1 AS ping`;
      await initDB();
      const tableCheck = await sql`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('financial_documents', 'bank_transactions')
      `;
      const tableNames = new Set(tableCheck.map((r) => r.table_name as string));
      const txnRow = tableNames.has("bank_transactions")
        ? await sql`SELECT COUNT(*) AS n FROM bank_transactions`
        : null;
      const txnCount = txnRow ? Number(txnRow[0]?.n ?? 0) : null;
      directDb = {
        ping: "ok",
        ms: Date.now() - t0,
        tables: {
          documents:    tableNames.has("financial_documents"),
          transactions: tableNames.has("bank_transactions"),
        },
        transactionCount: txnCount,
        hasRealData: (txnCount ?? 0) > 0,
      };
    } catch {
      directDb = { ping: "error", ms: Date.now() - t0, tables: null, transactionCount: null, hasRealData: false };
    }
  }

  // ── Overall readiness ——————————————————————————————————————————
  const dbReady    = USE_SUPABASE || USE_ERP_ADMIN || USE_DB || erp.ok;
  const syncReady  = dbReady && (USE_SUPABASE || USE_ERP_ADMIN || USE_DB); // needs service role or direct postgres
  const coraReady  = presence.coraHolding;

  return NextResponse.json({
    ok: dbReady && coraReady,

    // Config presence
    ...presence,
    dbAdapter,

    // ERP Supabase anon ping
    erpPing: erp.ok ? "ok" : "error",
    erpPingMs: erp.ms,
    erpRlsBlocking: erp.rls,   // true = RLS active, needs DISABLE or service role
    erpTransactionCount: erp.rowCount,

    // Direct postgres (if DATABASE_URL set)
    directDb: USE_DB ? directDb : null,

    // Readiness summary
    syncReady,   // true = can write Cora data to DB
    coraReady,   // true = can call Cora API
    allGreen: syncReady && coraReady,
  });
}
