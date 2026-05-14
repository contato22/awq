import { NextRequest, NextResponse } from "next/server";
import { listFxRates, upsertFxRate, deleteFxRate } from "@/lib/epm-dynamic";
export const runtime = "nodejs";
export async function GET() { return NextResponse.json({ data: await listFxRates() }); }
export async function POST(req: NextRequest) { return NextResponse.json({ data: await upsertFxRate(await req.json()) }, { status: 201 }); }
export async function DELETE(req: NextRequest) { const { id } = await req.json(); await deleteFxRate(id); return NextResponse.json({ ok: true }); }
