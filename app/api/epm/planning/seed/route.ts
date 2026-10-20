import { NextRequest, NextResponse } from "next/server";
import { initEPMPlanningDB, seedAllEPMPlanningData } from "@/lib/epm-planning-db";
import { requireSession } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  await initEPMPlanningDB();
  const result = await seedAllEPMPlanningData();
  return NextResponse.json(result);
}
