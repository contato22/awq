import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { getMonthlyRevenue, upsertMonthlyRevenue } from "@/lib/epm-planning-db";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const denied = await apiGuard(req, "view", "financeiro", "EPM Planning Monthly Revenue");
  if (denied) return denied;

  const data = await getMonthlyRevenue();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const denied = await apiGuard(req, "create", "financeiro", "EPM Planning Monthly Revenue");
  if (denied) return denied;

  const body = await req.json();
  await upsertMonthlyRevenue(body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await apiGuard(req, "delete", "financeiro", "EPM Planning Monthly Revenue");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("id");
  if (!month) return NextResponse.json({ error: "id (month) required" }, { status: 400 });
  if (!sql) return NextResponse.json({ error: "no db" }, { status: 503 });
  await sql`DELETE FROM epm_monthly_revenue WHERE month = ${month}`;
  return NextResponse.json({ ok: true });
}
