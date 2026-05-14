export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { listBankTransactions, createBankTransaction, deleteBankTransaction } from "@/lib/bank-db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const account_id = searchParams.get("account_id") ?? undefined;
    const rows = await listBankTransactions(account_id);
    return NextResponse.json({ data: rows });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row = await createBankTransaction({
      account_id: body.account_id,
      tx_date: body.tx_date ?? body.date ?? null,
      description: body.description ?? "",
      amount: Number(body.amount ?? 0),
      category: body.category ?? "",
      balance: body.balance != null ? Number(body.balance) : null,
    });
    return NextResponse.json({ data: row });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteBankTransaction(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
