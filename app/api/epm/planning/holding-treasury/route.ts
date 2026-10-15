import { NextRequest, NextResponse } from "next/server";
import { getHoldingTreasury, upsertHoldingTreasury } from "@/lib/epm-planning-db";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const data = await getHoldingTreasury();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  await upsertHoldingTreasury(body);
  return NextResponse.json({ ok: true });
}
