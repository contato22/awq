export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { listBankAccounts, createBankAccount, deleteBankAccount } from "@/lib/bank-db";

export async function GET() {
  try {
    const rows = await listBankAccounts();
    return NextResponse.json({ data: rows });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row = await createBankAccount({
      bank: body.bank ?? "",
      name: body.name ?? "",
      color: body.color ?? "blue",
      current_balance: Number(body.current_balance ?? body.currentBalance ?? 0),
      last_updated: body.last_updated ?? body.lastUpdated ?? null,
    });
    return NextResponse.json({ data: row });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteBankAccount(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
