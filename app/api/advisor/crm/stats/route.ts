// GET /api/advisor/crm/stats — KPIs consolidados do ADVISOR CRM

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { getAdvisorCrmStats } from "@/lib/advisor-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "advisor", "CRM Stats Advisor");
  if (denied) return denied;

  return NextResponse.json(await getAdvisorCrmStats());
}
