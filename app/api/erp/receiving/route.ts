import { NextRequest, NextResponse } from "next/server";
import { listReceiving, createReceiving, deleteReceiving } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listReceiving() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createReceiving(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteReceiving(id);
  return NextResponse.json({ ok: true });
}
