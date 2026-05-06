// ─── /api/awq/bank-accounts/[id] — Update balance / Delete account ───────────
import { NextRequest, NextResponse } from "next/server";
import { sql, initDB } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sql) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  await initDB();
  const { id } = await params;
  const d = await req.json();
  const rows = await sql`
    UPDATE awq_bank_accounts SET
      bank            = COALESCE(${d.bank            ?? null}, bank),
      name            = COALESCE(${d.name            ?? null}, name),
      color           = COALESCE(${d.color           ?? null}, color),
      current_balance = COALESCE(${d.currentBalance  ?? null}, current_balance),
      last_updated    = COALESCE(${d.lastUpdated     ?? null}, last_updated)
    WHERE id = ${id}
    RETURNING id, bank, name, color,
              current_balance::float AS "currentBalance",
              last_updated AS "lastUpdated"
  `;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sql) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  await initDB();
  const { id } = await params;
  await sql`DELETE FROM awq_bank_accounts WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
