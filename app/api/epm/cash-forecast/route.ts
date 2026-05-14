import { NextRequest, NextResponse } from "next/server";
import { listCashForecast, createCashForecast, deleteCashForecast } from "@/lib/epm-dynamic";
export const runtime = "nodejs";
export async function GET() { return NextResponse.json({ data: await listCashForecast() }); }
export async function POST(req: NextRequest) { return NextResponse.json({ data: await createCashForecast(await req.json()) }, { status: 201 }); }
export async function DELETE(req: NextRequest) { const { id } = await req.json(); await deleteCashForecast(id); return NextResponse.json({ ok: true }); }
