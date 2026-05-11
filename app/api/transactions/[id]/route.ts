import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { updateTransaction } from "@/lib/financial-db";
import type { BankTransaction } from "@/lib/financial-db";

export const runtime = "nodejs";

type Row = Record<string, unknown>;
const s  = (v: unknown): string        => v as string;
const sn = (v: unknown): string | null => (v != null ? (v as string) : null);

function rowToTransaction(r: Row): BankTransaction {
  return {
    id:                        s(r.id),
    documentId:                s(r.document_id),
    bank:                      s(r.bank),
    accountName:               s(r.account_name),
    entity:                    s(r.entity) as BankTransaction["entity"],
    transactionDate:           s(r.transaction_date),
    descriptionOriginal:       s(r.description_original),
    amount:                    Number(r.amount),
    direction:                 s(r.direction) as "credit" | "debit",
    runningBalance:            r.running_balance != null ? Number(r.running_balance) : null,
    counterpartyName:          sn(r.counterparty_name),
    managerialCategory:        s(r.managerial_category) as BankTransaction["managerialCategory"],
    classificationConfidence:  s(r.classification_confidence) as BankTransaction["classificationConfidence"],
    classificationNote:        sn(r.classification_note),
    isIntercompany:            Boolean(r.is_intercompany),
    intercompanyMatchId:       sn(r.intercompany_match_id),
    excludedFromConsolidated:  Boolean(r.excluded_from_consolidated),
    reconciliationStatus:      (sn(r.reconciliation_status) ?? "pendente") as BankTransaction["reconciliationStatus"],
    extractedAt:               s(r.extracted_at),
    classifiedAt:              sn(r.classified_at),
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
  }

  let patch: Partial<BankTransaction>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await updateTransaction(id, patch);

    if (sql) {
      const rows = (await sql`SELECT * FROM bank_transactions WHERE id = ${id}`) as Row[];
      if (rows.length === 0) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }
      return NextResponse.json(rowToTransaction(rows[0]));
    }

    // Filesystem fallback: return patch merged onto a minimal stub
    return NextResponse.json({ id, ...patch });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
