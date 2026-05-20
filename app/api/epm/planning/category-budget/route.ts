import { NextRequest, NextResponse } from "next/server";
import { getCategoryBudget, upsertCategoryBudgetItem } from "@/lib/epm-planning-db";
import { sql } from "@/lib/db";

export async function GET() {
  const data = await getCategoryBudget();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await upsertCategoryBudgetItem(body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!sql) return NextResponse.json({ error: "no db" }, { status: 503 });
  await sql`DELETE FROM epm_category_budget WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
