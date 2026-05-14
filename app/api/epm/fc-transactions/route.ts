import { NextRequest, NextResponse } from "next/server";
import { listFcTransactions, createFcTransaction, deleteFcTransaction } from "@/lib/epm-dynamic";
export const runtime = "nodejs";
export async function GET() { return NextResponse.json({ data: await listFcTransactions() }); }
export async function POST(req: NextRequest) { return NextResponse.json({ data: await createFcTransaction(await req.json()) }, { status: 201 }); }
export async function DELETE(req: NextRequest) { const { id } = await req.json(); await deleteFcTransaction(id); return NextResponse.json({ ok: true }); }
