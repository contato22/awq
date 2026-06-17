import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { getChartOfAccounts, upsertAccount } from "@/lib/epm-planning-db";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const denied = await apiGuard(req, "view", "financeiro", "EPM Planning Chart of Accounts");
  if (denied) return denied;

  const data = await getChartOfAccounts();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const denied = await apiGuard(req, "create", "financeiro", "EPM Planning Chart of Accounts");
  if (denied) return denied;

  const body = await req.json();
  await upsertAccount(body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await apiGuard(req, "delete", "financeiro", "EPM Planning Chart of Accounts");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("id");
  if (!code) return NextResponse.json({ error: "id (account_code) required" }, { status: 400 });
  if (!sql) return NextResponse.json({ error: "no db" }, { status: 503 });
  await sql`DELETE FROM epm_chart_of_accounts WHERE account_code = ${code}`;
  return NextResponse.json({ ok: true });
}
