// GET /api/venture/crm/stats — KPIs consolidados do VENTURE CRM

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { getVentureCrmStats } from "@/lib/venture-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "venture", "CRM Stats Venture");
  if (denied) return denied;

  return NextResponse.json(await getVentureCrmStats());
}
