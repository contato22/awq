import { NextRequest, NextResponse } from "next/server";
import { listFixedAssets, createFixedAsset, deleteFixedAsset } from "@/lib/epm-dynamic";
export const runtime = "nodejs";
export async function GET() { return NextResponse.json({ data: await listFixedAssets() }); }
export async function POST(req: NextRequest) { return NextResponse.json({ data: await createFixedAsset(await req.json()) }, { status: 201 }); }
export async function DELETE(req: NextRequest) { const { id } = await req.json(); await deleteFixedAsset(id); return NextResponse.json({ ok: true }); }
