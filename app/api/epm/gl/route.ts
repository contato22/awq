// ─── API /api/epm/gl — General Ledger CRUD ───────────────────────────────────
// GET  /api/epm/gl?bu_code=&period_code=&view=journals|entries|trial-balance
// POST /api/epm/gl  { ...NewJournalInput }
//
// Response: { success: boolean, data: T, error?: string }

import { NextRequest, NextResponse } from "next/server";
import {
  getAllGLEntries,
  getGLEntries,
  getJournals,
  getTrialBalance,
  addJournalEntry,
  initGLDB,
  CHART_OF_ACCOUNTS,
  type BuCode,
} from "@/lib/epm-gl";

let _dbReady = false;
async function ensureDB() {
  if (!_dbReady) { await initGLDB(); _dbReady = true; }
}

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const sp          = req.nextUrl.searchParams;
    const view        = sp.get("view") ?? "journals";
    const bu_code     = (sp.get("bu_code")    ?? undefined) as BuCode | undefined;
    const period_code = sp.get("period_code") ?? undefined;

    if (view === "accounts") {
      return ok(CHART_OF_ACCOUNTS);
    }

    if (view === "trial-balance") {
      return ok(await getTrialBalance({ bu_code, period_code }));
    }

    if (view === "entries") {
      return ok(await getGLEntries({ bu_code, period_code }));
    }

    // default: journals (paired debit+credit view)
    let journals = await getJournals();
    if (bu_code)     journals = journals.filter((j) => j.debit.bu_code     === bu_code);
    if (period_code) journals = journals.filter((j) => j.debit.period_code === period_code);
    return ok(journals);
  } catch (e) {
    return err(String(e), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body = await req.json();
    const {
      transaction_date,
      bu_code,
      description,
      reference_doc,
      source_system,
      created_by,
      debit_account_code,
      debit_amount,
      credit_account_code,
      credit_amount,
    } = body;

    if (!transaction_date || !bu_code || !description)
      return err("transaction_date, bu_code and description are required");
    if (!debit_account_code || !credit_account_code)
      return err("debit_account_code and credit_account_code are required");
    if (typeof debit_amount !== "number" || debit_amount <= 0)
      return err("debit_amount must be a positive number");
    if (typeof credit_amount !== "number" || credit_amount <= 0)
      return err("credit_amount must be a positive number");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction_date))
      return err("transaction_date must be YYYY-MM-DD");

    const result = await addJournalEntry({
      transaction_date,
      bu_code,
      description,
      reference_doc,
      source_system,
      created_by,
      debit_account_code,
      debit_amount,
      credit_account_code,
      credit_amount,
    });

    return ok(result);
  } catch (e) {
    return err(String(e));
  }
}
