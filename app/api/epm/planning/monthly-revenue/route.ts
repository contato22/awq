import { NextRequest, NextResponse } from "next/server";
import { getMonthlyRevenue, upsertMonthlyRevenue } from "@/lib/epm-planning-db";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const data = await getMonthlyRevenue();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  await upsertMonthlyRevenue(body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("id");
  if (!month) return NextResponse.json({ error: "id (month) required" }, { status: 400 });
  if (!sql) return NextResponse.json({ error: "no db" }, { status: 503 });
  await sql`DELETE FROM epm_monthly_revenue WHERE month = ${month}`;
  return NextResponse.json({ ok: true });
}
