import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { getHoldingTreasury, upsertHoldingTreasury } from "@/lib/epm-planning-db";

export async function GET(req: NextRequest) {
  const denied = await apiGuard(req, "view", "financeiro", "EPM Planning Holding Treasury");
  if (denied) return denied;

  const data = await getHoldingTreasury();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const denied = await apiGuard(req, "create", "financeiro", "EPM Planning Holding Treasury");
  if (denied) return denied;

  const body = await req.json();
  await upsertHoldingTreasury(body);
  return NextResponse.json({ ok: true });
}
