// GET /api/advisor/crm/propostas  — lista propostas
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listProposals } from "@/lib/advisor-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "advisor", "CRM Advisor — Propostas");
  if (denied) return denied;

  const proposals = await listProposals();
  return NextResponse.json(proposals);
}
