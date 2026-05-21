// GET /api/cora/debug — returns raw Cora API responses to diagnose field names
// Remove this route once the integration is confirmed working.

import https from "node:https";
import { NextRequest, NextResponse } from "next/server";

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
  // Uses middleware-injected header (same pattern as /api/cora/sync and /api/cora/balance)
  const userEmail = req.headers.get("x-user-email");
  if (!userEmail) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

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
    const todayIso = new Date().toISOString().slice(0, 10);
    const monthAgoIso = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const stmtRes = await httpsRequest(
      "GET",
      `${BASE}/bank-statement/statement?start=${monthAgoIso}T00:00:00Z&end=${todayIso}T23:59:59Z&perPage=5`,
      { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
      cert,
      key,
    );
    results.statement_url = `${BASE}/bank-statement/statement?start=${monthAgoIso}T00:00:00Z&end=${todayIso}T23:59:59Z&perPage=5`;
    results.statement_status = stmtRes.status;
    try { results.statement_raw = JSON.parse(stmtRes.body); } catch { results.statement_body = stmtRes.body.slice(0, 2000); }
  } catch (err) {
    results.error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(results, { status: 200 });
}
