// GET /api/jacqes/crm/propostas — lista propostas comerciais
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listProposals } from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "jacqes", "CRM JACQES — Propostas");
  if (denied) return denied;

  try {
    const data = await listProposals();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
