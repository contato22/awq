import { NextResponse } from "next/server";
import { seedAllEPMPlanningData } from "@/lib/epm-planning-db";
import { initEPMPlanningDB } from "@/lib/db";

export async function POST() {
  await initEPMPlanningDB();
  const result = await seedAllEPMPlanningData();
  return NextResponse.json(result);
}
