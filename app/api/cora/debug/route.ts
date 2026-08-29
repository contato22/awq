// GET /api/cora/debug — returns raw Cora API responses to diagnose field names
// Remove this route once the integration is confirmed working.

import https from "node:https";
import { NextRequest, NextResponse } from "next/server";
import { todayBRT, daysAgoBRT } from "@/lib/date-brt";
import { getAuthIdentity, unauthorized } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function env(key: string) {
  return (process.env[key] ?? "").replace(/\\n/g, "\n");
}

function httpsRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  cert: string,
  key: string,
  body?: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method,
        headers,
        cert: cert || undefined,
        key: key || undefined,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Auth — re-decodifica JWT direto (não confia em headers do middleware)
  const identity = await getAuthIdentity(req);
  if (!identity) return unauthorized();

  const clientId = env("CORA_CLIENT_ID");
  const cert     = env("CORA_CERT");
  const key      = env("CORA_KEY");

  if (!clientId || !cert || !key) {
    return NextResponse.json({ error: "CORA_CLIENT_ID, CORA_CERT ou CORA_KEY não configurados" }, { status: 501 });
  }

  const BASE = process.env.CORA_ENV === "stage"
    ? "https://api.stage.cora.com.br"
    : "https://matls-clients.api.cora.com.br";

  const results: Record<string, unknown> = { base: BASE };

  // 1. Get token
  try {
    const params = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId });
    const tokenRes = await httpsRequest(
      "POST",
      `${BASE}/token`,
      { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
      cert,
      key,
      params.toString(),
    );
    results.token_status = tokenRes.status;

    if (tokenRes.status !== 200) {
      results.token_error = tokenRes.body;
      return NextResponse.json(results);
    }

    const tokenJson = JSON.parse(tokenRes.body) as { access_token: string };
    const token = tokenJson.access_token;
    results.token_ok = true;

    // 2. Get balance (raw)
    const balRes = await httpsRequest(
      "GET",
      `${BASE}/third-party/account/balance`,
      { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
      cert,
      key,
    );
    results.balance_status = balRes.status;
    try { results.balance_raw = JSON.parse(balRes.body); } catch { results.balance_body = balRes.body; }

    // 3. Get statement (raw, last 30 days) — try both date formats
    const todayIso = todayBRT();
    const monthAgoIso = daysAgoBRT(30);
    const stmtRes = await httpsRequest(
      "GET",
      `${BASE}/bank-statement/statement?start=${monthAgoIso}&end=${todayIso}&perPage=5`,
      { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
      cert,
      key,
    );
    results.statement_url = `${BASE}/bank-statement/statement?start=${monthAgoIso}&end=${todayIso}&perPage=5`;
    results.statement_status = stmtRes.status;
    try { results.statement_raw = JSON.parse(stmtRes.body); } catch { results.statement_body = stmtRes.body.slice(0, 2000); }
  } catch (err) {
    results.error = err instanceof Error ? err.message : String(err);
  }

  // 4. DB diagnostics — check if erpAnon can reach the financial tables
  try {
    const { erpAnon } = await import("@/lib/supabase");
    if (!erpAnon) {
      results.db_status = "erpAnon=null (IS_STATIC?)";
    } else {
      const { count: docCount, error: docErr } = await erpAnon
        .from("financial_documents")
        .select("*", { count: "exact", head: true });
      const { count: txnCount, error: txnErr } = await erpAnon
        .from("bank_transactions")
        .select("*", { count: "exact", head: true });
      results.db_status = "ok";
      results.db_financial_documents = docErr
        ? { error: docErr.message, code: docErr.code }
        : { count: docCount };
      results.db_bank_transactions   = txnErr
        ? { error: txnErr.message, code: txnErr.code }
        : { count: txnCount };

      // Per-entity breakdown: total vs. com running_balance. Confirma se JACQES
      // (e demais ex-ENERDY) têm running_balance — necessário p/ a linha de saldo
      // consolidada do chart (FinancialOverviewV2 dailySaldo/consolidatedRealBalance).
      const entities = ["AWQ_Holding", "JACQES", "Caza_Vision", "ENERDY"];
      const breakdown: Record<string, { total: number | null; withRunningBalance: number | null }> = {};
      for (const e of entities) {
        const { count: total } = await erpAnon
          .from("bank_transactions")
          .select("*", { count: "exact", head: true })
          .eq("entity", e);
        const { count: withRb } = await erpAnon
          .from("bank_transactions")
          .select("*", { count: "exact", head: true })
          .eq("entity", e)
          .not("running_balance", "is", null);
        breakdown[e] = { total: total ?? null, withRunningBalance: withRb ?? null };
      }
      results.db_entity_breakdown = breakdown;
    }
  } catch (dbErr) {
    results.db_status = dbErr instanceof Error ? dbErr.message : String(dbErr);
  }

  return NextResponse.json(results, { status: 200 });
}
