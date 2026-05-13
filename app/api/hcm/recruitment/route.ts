import { NextRequest, NextResponse } from "next/server";
import { listRecruitment, createRecruitment, updateRecruitment } from "@/lib/hcm-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listRecruitment() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createRecruitment(await req.json()) }, { status: 201 });
}
export async function PUT(req: NextRequest) {
  const { id, ...rest } = await req.json();
  const row = await updateRecruitment(id, rest);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ data: row });
}
