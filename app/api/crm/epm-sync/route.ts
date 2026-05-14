import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, getOpportunity, updateOpportunity, getAccount } from "@/lib/crm-db";
import { getSupabaseAdmin } from "@/lib/supabase";

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

    const sb = getSupabaseAdmin();
    if (!sb) {
      return ok({
        customer_synced: true,
        epm_customer_id: "sim-customer-id",
        gl_entry_created: true,
        ar_invoice_created: true,
        epm_ar_id: "sim-ar-id",
        note: "Simulated — Supabase not configured",
      });
    }

    // ── 1. Sync Account → EPM Customer ──────────────────────────────────────
    let epmCustomerId: string | null = opp.epm_customer_id ?? null;

    if (!epmCustomerId && opp.account_id) {
      const account = await getAccount(opp.account_id);
      if (account) {
        // Check if EPM customer exists by CNPJ
        if (account.document_number) {
          const { data: existing } = await sb
            .from("customers")
            .select("customer_id")
            .eq("document_number", account.document_number)
            .limit(1);
          if (existing && existing.length > 0) {
            epmCustomerId = (existing[0] as Record<string, string>).customer_id;
          }
        }
        // Create EPM customer if not found
        if (!epmCustomerId) {
          const address = [account.address_street, account.address_city, account.address_state]
            .filter(Boolean).join(", ") || null;
          const { data: created } = await sb
            .from("customers")
            .insert({
              legal_name: account.account_name,
              trade_name: account.trade_name ?? null,
              document_type: "CNPJ",
              document_number: account.document_number ?? null,
              email: null, phone: null, address,
              payment_terms: 30, is_active: true,
              notes: `Synced from CRM account ${account.account_code}`,
            })
            .select("customer_id")
            .single();
          if (created) {
            epmCustomerId = (created as Record<string, string>).customer_id;
            await sb.from("crm_accounts")
              .update({ epm_customer_id: epmCustomerId })
              .eq("account_id", opp.account_id);
          }
        }
      }
    }

    // ── 2. Lookup EPM IDs ────────────────────────────────────────────────────
    const revenueAccCode = BU_REVENUE_ACCOUNT[opp.bu] ?? "4.1.05";
    const today = new Date().toISOString().slice(0, 10);

    const [arAccRes, revAccRes, buRes, periodRes] = await Promise.all([
      sb.from("accounts").select("account_id").eq("account_code", "1.1.02").limit(1),
      sb.from("accounts").select("account_id").eq("account_code", revenueAccCode).limit(1),
      sb.from("business_units").select("bu_id").eq("bu_code", opp.bu).limit(1),
      sb.from("fiscal_periods").select("period_id").lte("start_date", today).gte("end_date", today).limit(1),
    ]);

    const arAccountId  = (arAccRes.data?.[0]  as Record<string, string> | undefined)?.account_id;
    const revAccountId = (revAccRes.data?.[0] as Record<string, string> | undefined)?.account_id;
    const buId         = (buRes.data?.[0]     as Record<string, string> | undefined)?.bu_id;
    const periodId     = (periodRes.data?.[0] as Record<string, string> | undefined)?.period_id;

    if (!arAccountId || !revAccountId) return err("EPM account codes not found (1.1.02 or revenue account)", 500);

    // ── 3. Create GL Journal Entry (double-entry) ────────────────────────────
    const journalId = crypto.randomUUID();
    const txDate = opp.actual_close_date ?? today;
    const desc = `Revenue — ${opp.opportunity_name}`;

    await sb.from("general_ledger").insert([
      {
        journal_id: journalId, transaction_date: txDate,
        period_id: periodId ?? null, bu_id: buId ?? null, account_id: arAccountId,
        debit_amount: opp.deal_value, credit_amount: 0,
        description: desc, reference_doc: opp.opportunity_code, source_system: "crm",
      },
      {
        journal_id: journalId, transaction_date: txDate,
        period_id: periodId ?? null, bu_id: buId ?? null, account_id: revAccountId,
        debit_amount: 0, credit_amount: opp.deal_value,
        description: desc, reference_doc: opp.opportunity_code, source_system: "crm",
      },
    ]);

    // ── 4. Create AR Invoice ─────────────────────────────────────────────────
    const dueDate = new Date(new Date(txDate).getTime() + 30 * 86400000).toISOString().slice(0, 10);
    const { data: arRow } = await sb
      .from("accounts_receivable")
      .insert({
        customer_id: epmCustomerId ?? null,
        bu_id: buId ?? null,
        invoice_date: txDate,
        due_date: dueDate,
        gross_amount: opp.deal_value,
        tax_amount: 0,
        net_amount: opp.deal_value,
        amount_paid: 0,
        status: "pending",
        notes: `CRM Sync — ${opp.opportunity_name}`,
      })
      .select("ar_id")
      .single();
    const arId = arRow ? (arRow as Record<string, string>).ar_id : null;

    // ── 5. Mark opportunity as synced ────────────────────────────────────────
    await updateOpportunity(opportunity_id, {
      synced_to_epm:   true,
      epm_customer_id: epmCustomerId ?? undefined,
      epm_ar_id:       arId ?? undefined,
    });

    return ok({
      customer_synced:    true,
      epm_customer_id:    epmCustomerId,
      gl_entry_created:   true,
      ar_invoice_created: true,
      epm_ar_id:          arId,
    });
  } catch (e) { return err(String(e)); }
}
