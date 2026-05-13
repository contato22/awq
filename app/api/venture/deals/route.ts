import { NextRequest, NextResponse } from "next/server";
import { listDeals, getDeal, upsertDeal } from "@/lib/venture-db";
import type { DealWorkspace } from "@/lib/deal-types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const deal = await getDeal(id);
    if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ data: deal });
  }
  return NextResponse.json({ data: await listDeals() });
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const row = await upsertDeal(body as Omit<Parameters<typeof upsertDeal>[0],"data"> & { data: DealWorkspace });
  return NextResponse.json({ data: row }, { status: 201 });
}
