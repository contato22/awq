import { NextRequest, NextResponse } from "next/server";
import { listStrategies, createStrategy, deleteStrategy } from "@/lib/cpm-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listStrategies() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createStrategy(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteStrategy(id);
  return NextResponse.json({ ok: true });
}
