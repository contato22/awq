import { NextRequest, NextResponse } from "next/server";
import { listIcTransactions, createIcTransaction, deleteIcTransaction } from "@/lib/epm-dynamic";
export const runtime = "nodejs";
export async function GET() { return NextResponse.json({ data: await listIcTransactions() }); }
export async function POST(req: NextRequest) { return NextResponse.json({ data: await createIcTransaction(await req.json()) }, { status: 201 }); }
export async function DELETE(req: NextRequest) { const { id } = await req.json(); await deleteIcTransaction(id); return NextResponse.json({ ok: true }); }
