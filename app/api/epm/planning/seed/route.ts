import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initEPMPlanningDB, seedAllEPMPlanningData } from "@/lib/epm-planning-db";

export async function POST(req: NextRequest) {
  const denied = await apiGuard(req, "import", "financeiro", "EPM Planning Seed");
  if (denied) return denied;

  await initEPMPlanningDB();
  const result = await seedAllEPMPlanningData();
  return NextResponse.json(result);
}
