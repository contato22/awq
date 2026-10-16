import { NextRequest, NextResponse } from "next/server";
import { getChartOfAccounts, upsertAccount } from "@/lib/epm-planning-db";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const data = await getChartOfAccounts();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  await upsertAccount(body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("id");
  if (!code) return NextResponse.json({ error: "id (account_code) required" }, { status: 400 });
  if (!sql) return NextResponse.json({ error: "no db" }, { status: 503 });
  await sql`DELETE FROM epm_chart_of_accounts WHERE account_code = ${code}`;
  return NextResponse.json({ ok: true });
}
