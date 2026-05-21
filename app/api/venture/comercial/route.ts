// ─── GET /api/venture/comercial — Venture commercial pipeline ─────────────────

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import {
  listCommercialOpportunities,
  upsertCommercialOpportunity,
  deleteCommercialOpportunity,
} from "@/lib/venture-commercial-db";
import type { CommercialOpportunity } from "@/lib/venture-commercial-types";

export const runtime = "nodejs";
export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "awq_venture", "pipeline comercial");
  if (denied) return denied;
  try {
    const opps = await listCommercialOpportunities();
    return NextResponse.json(opps);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "awq_venture", "pipeline comercial");
  if (denied) return denied;
  try {
    const opp = await req.json() as CommercialOpportunity;
    await upsertCommercialOpportunity(opp);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "awq_venture", "pipeline comercial");
  if (denied) return denied;
  try {
    const { id } = await req.json() as { id: string };
    await deleteCommercialOpportunity(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
