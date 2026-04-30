import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, getOpportunity, updateOpportunity, getAccount } from "@/lib/crm-db";
import { sql } from "@/lib/db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

// BU code → EPM revenue account code
const BU_REVENUE_ACCOUNT: Record<string, string> = {
  JACQES:  "4.1.01",
  CAZA:    "4.1.02",
  ADVISOR: "4.1.03",
  VENTURE: "4.1.04",
};

export async function POST(req: NextRequest) {
  try {
    await initCrmDB();
    const { opportunity_id } = await req.json();
    if (!opportunity_id) return err("opportunity_id required", 400);

    const opp = await getOpportunity(opportunity_id);
    if (!opp) return err("Opportunity not found", 404);
    if (opp.stage !== "closed_won") return err("Opportunity must be closed_won", 400);
    if (opp.synced_to_epm) return ok({ already_synced: true });

    if (!sql) {
      // No DB — simulate sync
      return ok({
        customer_synced: true,
        epm_customer_id: "sim-customer-id",
        gl_entry_created: true,
        ar_invoice_created: true,
        epm_ar_id: "sim-ar-id",
        note: "Simulated — DATABASE_URL not set",
      });
    }

    // ── 1. Sync Account → EPM Customer ──────────────────────────────────────
    let epmCustomerId: string | null = opp.epm_customer_id;

    if (!epmCustomerId && opp.account_id) {
      const account = await getAccount(opp.account_id);
      if (account) {
        // Check if EPM customer exists by CNPJ
        if (account.document_number) {
          const existing = await sql`
            SELECT customer_id FROM customers WHERE document_number = ${account.document_number}
          `;
          if (existing.length > 0) {
            epmCustomerId = existing[0].customer_id as string;
          }
        }
        // Create EPM customer if not found
        if (!epmCustomerId) {
          const created = await sql`
            INSERT INTO customers (legal_name, trade_name, document_type, document_number,
              email, phone, address, payment_terms, is_active, notes)
            VALUES (${account.account_name}, ${account.trade_name ?? null}, 'CNPJ',
              ${account.document_number ?? null}, null, null,
              ${[account.address_street, account.address_city, account.address_state].filter(Boolean).join(', ') || null},
              30, true, ${`Synced from CRM account ${account.account_code}`})
            RETURNING customer_id
          `;
          epmCustomerId = created[0].customer_id as string;
          // Link back to CRM account
          await sql`UPDATE crm_accounts SET epm_customer_id = ${epmCustomerId} WHERE account_id = ${opp.account_id}`;
        }
      }
    }

    // ── 2. Lookup EPM IDs ────────────────────────────────────────────────────
    const revenueAccCode = BU_REVENUE_ACCOUNT[opp.bu] ?? "4.1.05";
    const [arAccRows, revAccRows, buRows, periodRows] = await Promise.all([
      sql`SELECT account_id FROM accounts WHERE account_code = '1.1.02'`,
      sql`SELECT account_id FROM accounts WHERE account_code = ${revenueAccCode}`,
      sql`SELECT bu_id FROM business_units WHERE bu_code = ${opp.bu}`,
      sql`SELECT period_id FROM fiscal_periods WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE LIMIT 1`,
    ]);

    const arAccountId  = arAccRows[0]?.account_id  as string | undefined;
    const revAccountId = revAccRows[0]?.account_id as string | undefined;
    const buId         = buRows[0]?.bu_id          as string | undefined;
    const periodId     = periodRows[0]?.period_id  as string | undefined;

    if (!arAccountId || !revAccountId) return err("EPM account codes not found (1.1.02 or revenue account)", 500);

    // ── 3. Create GL Journal Entry (double-entry) ────────────────────────────
    const journalId = crypto.randomUUID();
    const txDate = opp.actual_close_date ?? new Date().toISOString().slice(0, 10);
    const desc = `Revenue — ${opp.opportunity_name}`;

    await sql`
      INSERT INTO general_ledger (journal_id, transaction_date, period_id, bu_id, account_id,
        debit_amount, credit_amount, description, reference_doc, source_system)
      VALUES
        (${journalId}, ${txDate}, ${periodId ?? null}, ${buId ?? null}, ${arAccountId},
         ${opp.deal_value}, 0, ${desc}, ${opp.opportunity_code}, 'crm'),
        (${journalId}, ${txDate}, ${periodId ?? null}, ${buId ?? null}, ${revAccountId},
         0, ${opp.deal_value}, ${desc}, ${opp.opportunity_code}, 'crm')
    `;

    // ── 4. Create AR Invoice ─────────────────────────────────────────────────
    const dueDate = new Date(new Date(txDate).getTime() + 30 * 86400000).toISOString().slice(0, 10);
    const arRows = await sql`
      INSERT INTO accounts_receivable (customer_id, bu_id, invoice_date, due_date,
        gross_amount, tax_amount, net_amount, amount_paid, status, notes)
      VALUES (${epmCustomerId ?? null}, ${buId ?? null}, ${txDate}, ${dueDate},
        ${opp.deal_value}, 0, ${opp.deal_value}, 0, 'pending',
        ${`CRM Sync — ${opp.opportunity_name}`})
      RETURNING ar_id
    `;
    const arId = arRows[0].ar_id as string;

    // ── 5. Mark opportunity as synced ────────────────────────────────────────
    await updateOpportunity(opportunity_id, {
      synced_to_epm:   true,
      epm_customer_id: epmCustomerId ?? undefined,
      epm_ar_id:       arId,
    });

    return ok({
      customer_synced:   true,
      epm_customer_id:   epmCustomerId,
      gl_entry_created:  true,
      ar_invoice_created: true,
      epm_ar_id:         arId,
    });
  } catch (e) { return err(String(e)); }
}
