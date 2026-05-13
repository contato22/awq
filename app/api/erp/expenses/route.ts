import { NextRequest, NextResponse } from "next/server";
import { listExpenses, createExpense, deleteExpense } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listExpenses() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createExpense(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteExpense(id);
  return NextResponse.json({ ok: true });
}
