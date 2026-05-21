import { NextResponse } from "next/server";
import { initEPMPlanningDB, seedAllEPMPlanningData } from "@/lib/epm-planning-db";

export async function POST() {
  await initEPMPlanningDB();
  const result = await seedAllEPMPlanningData();
  return NextResponse.json(result);
}
