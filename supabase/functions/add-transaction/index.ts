// ─── Supabase Edge Function: add-transaction ────────────────────────────────
// Validates and inserts a new bank_transaction row.
//
// POST /functions/v1/add-transaction
// Body (JSON):
//   document_id              string   required — references financial_documents.id
//   transaction_date         string   required — YYYY-MM-DD
//   description_original     string   required
//   amount                   number   required — positive value
//   direction                string   required — "credit" | "debit"
//   managerial_category      string   required — must match ManagerialCategory enum
//   counterparty_name        string   optional
//   classification_confidence string  optional — default "ambiguous"
//   classification_note      string   optional
//   is_intercompany          boolean  optional — default false
//   reconciliation_status    string   optional — default "pendente"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_CATEGORIES = new Set([
  "receita_recorrente","receita_projeto","receita_consultoria","receita_producao",
  "receita_social_media","receita_revenue_share","receita_fee_venture","receita_eventual",
  "rendimento_financeiro","aporte_socio","transferencia_interna_recebida","ajuste_bancario_credito",
  "recebimento_ambiguo","fornecedor_operacional","freelancer_terceiro","folha_remuneracao",
  "prolabore_retirada","imposto_tributo","juros_multa_iof","tarifa_bancaria","software_assinatura",
  "marketing_midia","deslocamento_combustivel","alimentacao_representacao","viagem_hospedagem",
  "aluguel_locacao","energia_agua_internet","servicos_contabeis_juridicos","cartao_compra_operacional",
  "despesa_pessoal_misturada","aplicacao_financeira","resgate_financeiro",
  "transferencia_interna_enviada","reserva_limite_cartao","despesa_ambigua","unclassified",
]);

const INTERCOMPANY_EXCLUDED = new Set([
  "aplicacao_financeira","resgate_financeiro",
  "transferencia_interna_enviada","transferencia_interna_recebida",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
    }

    // ── Required field validation ─────────────────────────────────────────────
    const required = ["document_id", "transaction_date", "description_original", "amount", "direction", "managerial_category"];
    const missing = required.filter(f => body[f] == null || body[f] === "");
    if (missing.length > 0) {
      return Response.json(
        { error: `Campos obrigatórios ausentes: ${missing.join(", ")}` },
        { status: 400, headers: corsHeaders }
      );
    }

    // ── Type & enum validation ────────────────────────────────────────────────
    const direction = String(body.direction);
    if (direction !== "credit" && direction !== "debit") {
      return Response.json({ error: "direction deve ser 'credit' ou 'debit'" }, { status: 400, headers: corsHeaders });
    }

    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return Response.json({ error: "amount deve ser um número positivo" }, { status: 400, headers: corsHeaders });
    }

    const dateStr = String(body.transaction_date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return Response.json({ error: "transaction_date deve ser YYYY-MM-DD" }, { status: 400, headers: corsHeaders });
    }

    const category = String(body.managerial_category);
    if (!VALID_CATEGORIES.has(category)) {
      return Response.json(
        { error: `managerial_category inválida: "${category}"` },
        { status: 400, headers: corsHeaders }
      );
    }

    const confidence = body.classification_confidence
      ? String(body.classification_confidence) : "ambiguous";
    const validConf = ["confirmed", "probable", "ambiguous", "unclassifiable"];
    if (!validConf.includes(confidence)) {
      return Response.json({ error: `classification_confidence inválida: "${confidence}"` }, { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return Response.json(
        { error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured" },
        { status: 503, headers: corsHeaders }
      );
    }
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // ── Verify document exists ────────────────────────────────────────────────
    const { data: doc, error: docErr } = await supabase
      .from("financial_documents")
      .select("id, bank, account_name, entity")
      .eq("id", String(body.document_id))
      .single();

    if (docErr || !doc) {
      return Response.json(
        { error: `document_id "${body.document_id}" não encontrado.` },
        { status: 404, headers: corsHeaders }
      );
    }

    const isIntercompany = Boolean(body.is_intercompany) ||
      category === "transferencia_interna_enviada" ||
      category === "transferencia_interna_recebida";

    const excludedFromConsolidated = isIntercompany || INTERCOMPANY_EXCLUDED.has(category);

    const now = new Date().toISOString();
    const newTxn = {
      document_id:               doc.id,
      bank:                      doc.bank,
      account_name:              doc.account_name,
      entity:                    doc.entity,
      transaction_date:          dateStr,
      description_original:      String(body.description_original).trim(),
      amount:                    direction === "debit" ? -Math.abs(amount) : Math.abs(amount),
      direction,
      running_balance:           body.running_balance != null ? Number(body.running_balance) : null,
      counterparty_name:         body.counterparty_name ? String(body.counterparty_name).trim() : null,
      managerial_category:       category,
      classification_confidence: confidence,
      classification_note:       body.classification_note ? String(body.classification_note).trim() : null,
      is_intercompany:           isIntercompany,
      intercompany_match_id:     null,
      excluded_from_consolidated: excludedFromConsolidated,
      reconciliation_status:     body.reconciliation_status ? String(body.reconciliation_status) : "pendente",
      extracted_at:              now,
      classified_at:             confidence === "confirmed" ? now : null,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("bank_transactions")
      .insert(newTxn)
      .select()
      .single();

    if (insertErr) throw insertErr;

    // ── Update document transaction_count ────────────────────────────────────
    await supabase.rpc("increment_transaction_count", { doc_id: doc.id }).catch(() => {
      // non-critical — ignore if RPC not available
    });

    return Response.json(
      { success: true, transaction: inserted },
      { status: 201, headers: corsHeaders }
    );

  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
});
