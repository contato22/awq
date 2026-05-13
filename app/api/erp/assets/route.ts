import { NextRequest, NextResponse } from "next/server";
import { listAssets, createAsset } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listAssets() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createAsset(await req.json()) }, { status: 201 });
}
