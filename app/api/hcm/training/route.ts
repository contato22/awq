import { NextRequest, NextResponse } from "next/server";
import { listTraining, createTraining } from "@/lib/hcm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const emp = new URL(req.url).searchParams.get("employee_id") ?? undefined;
  return NextResponse.json({ data: await listTraining(emp) });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createTraining(await req.json()) }, { status: 201 });
}
