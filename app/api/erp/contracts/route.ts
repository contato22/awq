import { NextRequest, NextResponse } from "next/server";
import { listContracts, createContract, updateContract } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listContracts() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createContract(await req.json()) }, { status: 201 });
}
export async function PUT(req: NextRequest) {
  const { id, ...rest } = await req.json();
  const row = await updateContract(id, rest);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ data: row });
}
