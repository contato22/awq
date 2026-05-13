import { NextRequest, NextResponse } from "next/server";
import { listOrders, createOrder, updateOrder } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listOrders() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createOrder(await req.json()) }, { status: 201 });
}
export async function PUT(req: NextRequest) {
  const { id, ...rest } = await req.json();
  const row = await updateOrder(id, rest);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ data: row });
}
