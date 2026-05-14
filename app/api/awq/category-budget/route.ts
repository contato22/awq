export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { listCategoryBudget, upsertCategoryBudget } from "@/lib/bank-db";

export async function GET() {
  try {
    const rows = await listCategoryBudget();
    return NextResponse.json({ data: rows });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, bu, budget, actual } = body;
    const row = await upsertCategoryBudget(category, bu ?? "awq", Number(budget ?? 0), Number(actual ?? 0));
    return NextResponse.json({ data: row });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
