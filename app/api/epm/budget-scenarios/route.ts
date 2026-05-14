import { NextRequest, NextResponse } from "next/server";
import { listBudgetScenarios, createBudgetScenario, updateBudgetScenarioStatus, deleteBudgetScenario } from "@/lib/epm-dynamic";
export const runtime = "nodejs";
export async function GET() { return NextResponse.json({ data: await listBudgetScenarios() }); }
export async function POST(req: NextRequest) { return NextResponse.json({ data: await createBudgetScenario(await req.json()) }, { status: 201 }); }
export async function PATCH(req: NextRequest) {
  const { id, status, by } = await req.json();
  const data = await updateBudgetScenarioStatus(id, status, by ?? "");
  return NextResponse.json({ data });
}
export async function DELETE(req: NextRequest) { const { id } = await req.json(); await deleteBudgetScenario(id); return NextResponse.json({ ok: true }); }
