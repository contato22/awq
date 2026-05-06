// ─── /api/awq/bank-accounts — Manual bank accounts CRUD ──────────────────────
import { NextRequest, NextResponse } from "next/server";
import { sql, initDB } from "@/lib/db";

async function ensureTable() {
  await initDB();
}

interface AccountRow { id: string; bank: string; name: string; color: string; currentBalance: number; lastUpdated: string; }
interface TxRow { id: string; accountId: string; date: string; description: string; amount: number; category: string; balance: number | null; original: string | null; }

// Returns all accounts with their transactions as nested array.
export async function GET() {
  if (!sql) return NextResponse.json([], { status: 200 });
  await ensureTable();

  const accounts = (await sql`
    SELECT id, bank, name, color,
           current_balance::float AS "currentBalance",
           last_updated AS "lastUpdated"
    FROM awq_bank_accounts
    ORDER BY created_at ASC
  `) as unknown as AccountRow[];

  if (!accounts.length) return NextResponse.json([]);

  const ids = accounts.map((a) => a.id);
  const txs = (await sql`
    SELECT id, account_id AS "accountId", date, description,
           amount::float, category, balance::float, original
    FROM awq_bank_transactions
    WHERE account_id = ANY(${ids})
    ORDER BY date DESC, created_at DESC
  `) as unknown as TxRow[];

  const txMap = new Map<string, TxRow[]>();
  for (const tx of txs) {
    if (!txMap.has(tx.accountId)) txMap.set(tx.accountId, []);
    txMap.get(tx.accountId)!.push(tx);
  }

  const result = accounts.map((a) => ({
    ...a,
    transactions: txMap.get(a.id) ?? [],
  }));

  return NextResponse.json(result);
}

// Creates a new account (no transactions).
export async function POST(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  await ensureTable();
  const d = await req.json();
  const [row] = await sql`
    INSERT INTO awq_bank_accounts (id, bank, name, color, current_balance, last_updated)
    VALUES (${d.id}, ${d.bank}, ${d.name}, ${d.color ?? "bg-gray-500"},
            ${d.currentBalance ?? 0}, ${d.lastUpdated ?? new Date().toISOString().slice(0, 10)})
    RETURNING id, bank, name, color,
              current_balance::float AS "currentBalance",
              last_updated AS "lastUpdated"
  `;
  return NextResponse.json({ ...row, transactions: [] }, { status: 201 });
}
