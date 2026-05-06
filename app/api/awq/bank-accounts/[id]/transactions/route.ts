// ─── /api/awq/bank-accounts/[id]/transactions — Add transaction ───────────────
import { NextRequest, NextResponse } from "next/server";
import { sql, initDB } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sql) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  await initDB();
  const { id: accountId } = await params;
  const d = await req.json();
  const [row] = await sql`
    INSERT INTO awq_bank_transactions
      (id, account_id, date, description, amount, category, balance, original)
    VALUES
      (${d.id}, ${accountId}, ${d.date}, ${d.description},
       ${d.amount}, ${d.category ?? "outros"}, ${d.balance ?? null}, ${d.original ?? null})
    RETURNING id, account_id AS "accountId", date, description,
              amount::float, category, balance::float, original
  `;
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sql) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  await initDB();
  const { id: accountId } = await params;
  const { txId } = await req.json();
  await sql`DELETE FROM awq_bank_transactions WHERE id = ${txId} AND account_id = ${accountId}`;
  return NextResponse.json({ ok: true });
}
