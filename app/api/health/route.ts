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
import { isCoraConfigured, isCoraJacqesConfigured, isCoraEnerdyConfigured } from "@/lib/cora-api";
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

async function countErpTable(table: string): Promise<{ count: number | null; error: string | null }> {
  try {
    const { count, error } = await erpAnon!
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) return { count: null, error: error.code ?? error.message };
    return { count: count ?? 0, error: null };
  } catch (e) {
    return { count: null, error: e instanceof Error ? e.message : "unknown" };
  }
}

async function statusBreakdown(table: string, column = "status"): Promise<Record<string, number> | null> {
  try {
    const { data, error } = await erpAnon!.from(table).select(column).limit(2000);
    if (error || !data) return null;
    const counts: Record<string, number> = {};
    for (const row of data as unknown as Record<string, unknown>[]) {
      const k = (row?.[column] as string) ?? "(null)";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  } catch {
    return null;
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
    coraEnerdy:  isCoraEnerdyConfigured(),
  };

  // DB adapter priority (mirrors financial-db.ts logic)
  const dbAdapter = USE_SUPABASE    ? "supabase-financial-service-role"
                  : USE_ERP_ADMIN   ? "erp-supabase-service-role"
                  : USE_DB          ? "direct-postgres"
                  : "erp-supabase-anon";  // anon only — may be blocked by RLS

  // ── ERP Supabase live ping —————————————————————————————————————————
  const erp = await pingErpSupabase();
  const [
    erpInventoryItems, erpInventoryMovements, erpInventoryWarehouses, erpAssets,
    erpPurchases, erpSalesOrders,
    purchasesByStatus, salesByStatus,
  ] = await Promise.all([
    countErpTable("erp_inventory_items"),
    countErpTable("erp_inventory_movements"),
    countErpTable("erp_inventory_warehouses"),
    countErpTable("erp_assets"),
    countErpTable("erp_purchases"),
    countErpTable("erp_sales_orders"),
    statusBreakdown("erp_purchases"),
    statusBreakdown("erp_sales_orders"),
  ]);

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

    // Build / deploy identifiers (Vercel injects these automatically on every
    // deploy — https://vercel.com/docs/projects/environment-variables/system-environment-variables).
    // Exposed publicly so external probes can verify which SHA is actually
    // being served vs. what's in origin/main. If commitSha != HEAD on main,
    // a deploy is stuck/queued/rolled-back or the prod alias is pinned.
    build: {
      commitSha:     process.env.VERCEL_GIT_COMMIT_SHA     ?? null,
      commitRef:     process.env.VERCEL_GIT_COMMIT_REF     ?? null,
      commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
      deploymentId:  process.env.VERCEL_DEPLOYMENT_ID      ?? null,
      vercelEnv:     process.env.VERCEL_ENV                ?? null,
      vercelUrl:     process.env.VERCEL_URL                ?? null,
      region:        process.env.VERCEL_REGION             ?? null,
    },

    // Config presence
    ...presence,
    dbAdapter,

    // ERP Supabase anon ping
    erpPing: erp.ok ? "ok" : "error",
    erpPingMs: erp.ms,
    erpRlsBlocking: erp.rls,   // true = RLS active, needs DISABLE or service role
    erpTransactionCount: erp.rowCount,

    // ERP table diagnostics — null = table missing / RLS blocking / error
    erpTables: {
      inventory_items:      erpInventoryItems,
      inventory_movements:  erpInventoryMovements,
      inventory_warehouses: erpInventoryWarehouses,
      assets:               erpAssets,
      purchases:            erpPurchases,
      sales_orders:         erpSalesOrders,
    },
    erpStatusBreakdown: {
      purchases:    purchasesByStatus,
      sales_orders: salesByStatus,
    },

    // Direct postgres (if DATABASE_URL set)
    directDb: USE_DB ? directDb : null,

    // Readiness summary
    syncReady,   // true = can write Cora data to DB
    coraReady,        // true = can call Cora API (AWQ Holding)
    coraEnerdyReady: presence.coraEnerdy,  // true = ENERDY tem credenciais separadas
    allGreen: syncReady && coraReady,
  });
}
