import { NextResponse } from "next/server";
import { listCommercial } from "@/lib/venture-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listCommercial() });
}
