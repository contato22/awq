import { NextRequest, NextResponse } from "next/server";
import { getHoldingTreasury, upsertHoldingTreasury } from "@/lib/epm-planning-db";

export async function GET() {
  const data = await getHoldingTreasury();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await upsertHoldingTreasury(body);
  return NextResponse.json({ ok: true });
}
