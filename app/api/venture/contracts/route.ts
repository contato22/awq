import { NextRequest, NextResponse } from "next/server";
import { getVentureContracts, upsertVentureContract, deleteVentureContract } from "@/lib/venture-db";
import type { VentureContract } from "@/lib/awq-group-data";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(await getVentureContracts());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { action } = body;

  if (action === "upsert") {
    const id = await upsertVentureContract(body.contract as VentureContract & { id?: string });
    return NextResponse.json({ success: true, id });
  }
  if (action === "delete") {
    await deleteVentureContract(body.id as string);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
