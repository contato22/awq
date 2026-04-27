// ─── Supabase Edge Function: get-accounts ────────────────────────────────────
// Returns financial_documents available as accounts (for dropdowns and listings).
//
// GET /functions/v1/get-accounts
// Query params:
//   status   — filter by status (default: all; common: "done")
//   entity   — filter by entity
//   bank     — filter by bank name

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return Response.json(
        { error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured" },
        { status: 503, headers: corsHeaders }
      );
    }
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const url    = new URL(req.url);
    const status = url.searchParams.get("status");
    const entity = url.searchParams.get("entity");
    const bank   = url.searchParams.get("bank");

    let query = supabase
      .from("financial_documents")
      .select(`
        id,
        filename,
        bank,
        account_name,
        account_number,
        entity,
        period_start,
        period_end,
        opening_balance,
        closing_balance,
        status,
        transaction_count,
        parser_confidence,
        uploaded_at,
        uploaded_by
      `)
      .order("uploaded_at", { ascending: false });

    if (status)  query = query.eq("status", status);
    if (entity)  query = query.eq("entity", entity);
    if (bank)    query = query.eq("bank", bank);

    const { data, error } = await query;
    if (error) throw error;

    const accounts = (data ?? []).map(doc => ({
      id:               doc.id,
      label:            `${doc.account_name} — ${doc.bank}`,
      accountName:      doc.account_name,
      accountNumber:    doc.account_number,
      bank:             doc.bank,
      entity:           doc.entity,
      periodStart:      doc.period_start,
      periodEnd:        doc.period_end,
      openingBalance:   doc.opening_balance ?? 0,
      closingBalance:   doc.closing_balance ?? 0,
      status:           doc.status,
      transactionCount: doc.transaction_count ?? 0,
      parserConfidence: doc.parser_confidence,
      uploadedAt:       doc.uploaded_at,
      uploadedBy:       doc.uploaded_by,
    }));

    return Response.json(
      {
        total:    accounts.length,
        accounts,
        summary: {
          done:       accounts.filter(a => a.status === "done").length,
          processing: accounts.filter(a => ["extracting","classifying","reconciling"].includes(a.status)).length,
          error:      accounts.filter(a => a.status === "error").length,
          received:   accounts.filter(a => a.status === "received").length,
        },
      },
      { headers: corsHeaders }
    );

  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
});
