// GET /api/setup/migrate
// Returns the SQL migration that creates financial_documents + bank_transactions
// in the ERP Supabase project. Run this in Supabase → SQL Editor once.
// After running, the Cora sync and all financial pages will work without DATABASE_URL.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_SQL = `-- AWQ Financial Tables Migration
-- Run once in Supabase SQL Editor (project kkhxxsrgsewjfvnnssyf or gqkgsoglgubmaborixfb)
-- Safe to re-run (IF NOT EXISTS / IF NOT EXISTS guards).

CREATE TABLE IF NOT EXISTS financial_documents (
  id                  TEXT PRIMARY KEY,
  filename            TEXT NOT NULL,
  file_hash           TEXT NOT NULL UNIQUE,
  bank                TEXT NOT NULL,
  account_name        TEXT NOT NULL,
  account_number      TEXT,
  entity              TEXT NOT NULL,
  period_start        TEXT,
  period_end          TEXT,
  opening_balance     NUMERIC,
  closing_balance     NUMERIC,
  uploaded_at         TEXT NOT NULL,
  uploaded_by         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'received',
  error_message       TEXT,
  transaction_count   INTEGER NOT NULL DEFAULT 0,
  parser_confidence   TEXT,
  extraction_notes    TEXT,
  blob_url            TEXT
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id                          TEXT PRIMARY KEY,
  document_id                 TEXT NOT NULL REFERENCES financial_documents(id),
  bank                        TEXT NOT NULL,
  account_name                TEXT NOT NULL,
  entity                      TEXT NOT NULL,
  transaction_date            TEXT NOT NULL,
  description_original        TEXT NOT NULL,
  amount                      NUMERIC NOT NULL,
  direction                   TEXT NOT NULL,
  running_balance             NUMERIC,
  counterparty_name           TEXT,
  managerial_category         TEXT NOT NULL,
  classification_confidence   TEXT NOT NULL,
  classification_note         TEXT,
  is_intercompany             BOOLEAN NOT NULL DEFAULT false,
  intercompany_match_id       TEXT,
  excluded_from_consolidated  BOOLEAN NOT NULL DEFAULT false,
  reconciliation_status       TEXT NOT NULL DEFAULT 'pendente',
  extracted_at                TEXT NOT NULL,
  classified_at               TEXT
);

ALTER TABLE bank_transactions
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'pendente';

CREATE INDEX IF NOT EXISTS idx_bt_document_id ON bank_transactions(document_id);
CREATE INDEX IF NOT EXISTS idx_bt_entity       ON bank_transactions(entity);
CREATE INDEX IF NOT EXISTS idx_bt_date         ON bank_transactions(transaction_date);

-- Allow anon key to read and write (required for Cora sync without service role key)
GRANT ALL ON financial_documents TO anon, authenticated;
GRANT ALL ON bank_transactions   TO anon, authenticated;

-- Disable RLS so anon key can insert/select without policies
ALTER TABLE financial_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions   DISABLE ROW LEVEL SECURITY;

-- ── AP Entries (Contas a Pagar — módulo ap-db.ts) ─────────────────────────────
-- Required for the ReconcileDrawer "Criar lançamento" flow to persist AP entries
-- in Supabase instead of local JSON (which is read-only on Vercel).

CREATE TABLE IF NOT EXISTS ap_entries (
  id                  TEXT PRIMARY KEY,
  account_code        TEXT NOT NULL,
  account_description TEXT NOT NULL,
  managerial_category TEXT NOT NULL,
  supplier_name       TEXT NOT NULL,
  supplier_document   TEXT,
  entity              TEXT NOT NULL,
  amount              NUMERIC NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'BRL',
  issue_date          TEXT NOT NULL,
  due_date            TEXT NOT NULL,
  payment_date        TEXT,
  status              TEXT NOT NULL DEFAULT 'pendente',
  invoice_number      TEXT,
  description         TEXT,
  notes               TEXT,
  bank_transaction_id TEXT,
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT,
  approved_by         TEXT,
  approved_at         TEXT
);

GRANT ALL ON ap_entries TO anon, authenticated;
ALTER TABLE ap_entries DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ap_entity    ON ap_entries(entity);
CREATE INDEX IF NOT EXISTS idx_ap_status    ON ap_entries(status);
CREATE INDEX IF NOT EXISTS idx_ap_due_date  ON ap_entries(due_date);
`;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const userEmail = req.headers.get("x-user-email");
  if (!userEmail) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/plain")) {
    return new NextResponse(MIGRATION_SQL, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.json({
    instructions: [
      "1. Abra o Supabase SQL Editor no projeto ERP (kkhxxsrgsewjfvnnssyf)",
      "2. Cole o SQL abaixo e execute",
      "3. Após executar, o sync da Cora e o módulo AP (Criar lançamento) funcionarão automaticamente",
    ],
    sql: MIGRATION_SQL,
  });
}
