import { NextRequest, NextResponse } from "next/server";
import {
  getBankTransactions,
  addBankTransaction,
  matchBankTransaction,
  ignoreBankTransaction,
  findBankMatchCandidates,
  initBankTransactionsDB,
  type BuCode,
  type BankTxnStatus,
  type BankTxnType,
} from "@/lib/ap-ar-db";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initBankTransactionsDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

// GET  ?status=unmatched&bu_code=AWQ  — list transactions
// GET  ?find_matches=<txn_id>         — find candidates for a transaction
export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const sp         = req.nextUrl.searchParams;
    const find       = sp.get("find_matches");
    const bu_code    = (sp.get("bu_code") ?? undefined) as BuCode | undefined;
    const status     = (sp.get("status")  ?? undefined) as BankTxnStatus | undefined;

    if (find) {
      const txns = await getBankTransactions();
      const txn  = txns.find((t) => t.id === find);
      if (!txn) return err("Transaction not found", 404);
      return ok(await findBankMatchCandidates(txn));
    }

    return ok(await getBankTransactions(status || bu_code ? { status, bu_code } : undefined));
  } catch (e) { return err(String(e), 500); }
}

// POST — import a new bank transaction
export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body = await req.json();
    const { txn_date, description, amount, txn_type, bank_ref, bu_code } = body;

    if (!txn_date || !description || amount == null || !txn_type)
      return err("txn_date, description, amount and txn_type are required");
    if (!["credit", "debit"].includes(txn_type))
      return err("txn_type must be credit or debit");
    if (typeof amount !== "number" || amount <= 0)
      return err("amount must be a positive number");

    return ok(await addBankTransaction({
      txn_date, description, amount,
      txn_type: txn_type as BankTxnType,
      bank_ref, bu_code,
    }));
  } catch (e) { return err(String(e)); }
}

// PATCH — match or ignore a transaction
export async function PATCH(req: NextRequest) {
  try {
    await ensureDB();
    const body = await req.json();
    const { id, action, matched_id, matched_type } = body;

    if (!id || !action) return err("id and action are required");

    if (action === "match") {
      if (!matched_id || !matched_type) return err("matched_id and matched_type required for action=match");
      if (!["AP", "AR"].includes(matched_type)) return err("matched_type must be AP or AR");
      const result = await matchBankTransaction(id, matched_id, matched_type as "AP" | "AR");
      if (!result) return err("Transaction not found", 404);
      return ok(result);
    }

    if (action === "ignore") {
      const ok2 = await ignoreBankTransaction(id);
      if (!ok2) return err("Transaction not found", 404);
      return ok({ id, status: "ignored" });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) { return err(String(e)); }
}
