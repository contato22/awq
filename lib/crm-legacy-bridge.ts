// ─── Legacy CRM Bridge ──────────────────────────────────────────────────────
// Unifica leitura das oportunidades dos CRMs por BU (CAZA via supabase,
// JACQES via Neon) no shape canônico CrmOpportunity da holding.
//
// Filosofia: read-only e tolerante a falha. Se uma fonte estiver fora,
// ela é silenciosamente ignorada — a holding nunca quebra por causa de
// um backend legado indisponível.

import type { CrmOpportunity, PipelineStage } from "@/lib/crm-types";
import { listOpportunities as listCazaOpps } from "@/lib/caza-crm-db";
import { listOpportunities as listJacqesOpps } from "@/lib/jacqes-crm-db";

// Mapas de estágio: PT-BR (legados) → canônico do CRM da holding.
const STAGE_MAP: Record<string, PipelineStage> = {
  // CAZA
  "Lead Captado":      "discovery",
  "Qualificação":      "qualification",
  "Briefing Inicial":  "discovery",
  "Proposta Enviada":  "proposal",
  "Negociação":        "negotiation",
  "Fechado Ganho":     "closed_won",
  "Fechado Perdido":   "closed_lost",
  // JACQES extras
  "Novo Lead":         "discovery",
  "Diagnóstico":       "qualification",
  "Proposta":          "proposal",
};

function mapStage(s: string): PipelineStage {
  return STAGE_MAP[s] ?? "discovery";
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildLegacyOpportunity(args: {
  bu: "CAZA" | "JACQES";
  id: string;
  name: string;
  account_name: string;
  stage: string;
  value: number;
  probability: number;
  owner: string;
  expected_close: string | null;
  created_at?: string;
}): CrmOpportunity {
  const stage = mapStage(args.stage);
  return {
    opportunity_id:       `LEGACY-${args.bu}-${args.id}`,
    opportunity_code:     `LEGACY-${args.bu}-${args.id}`,
    opportunity_name:     args.name,
    account_id:           null,
    account_name:         args.account_name || undefined,
    contact_id:           null,
    contact_name:         null,
    bu:                   args.bu,
    stage,
    deal_value:           args.value,
    probability:          args.probability,
    expected_close_date:  args.expected_close,
    actual_close_date:    stage === "closed_won" || stage === "closed_lost" ? args.expected_close : null,
    lost_reason:          null,
    lost_to_competitor:   null,
    win_reason:           null,
    owner:                args.owner || "Miguel",
    proposal_sent_date:   null,
    proposal_viewed:      false,
    proposal_accepted:    false,
    synced_to_epm:        false,
    epm_customer_id:      null,
    epm_ar_id:            null,
    created_at:           args.created_at ?? nowIso(),
    updated_at:           args.created_at ?? nowIso(),
    created_by:           args.owner || null,
  };
}

export async function listLegacyOpportunities(): Promise<CrmOpportunity[]> {
  const out: CrmOpportunity[] = [];

  try {
    const caza = await listCazaOpps();
    for (const o of caza) {
      out.push(buildLegacyOpportunity({
        bu:             "CAZA",
        id:             o.id,
        name:           o.nome_oportunidade,
        account_name:   o.empresa,
        stage:          o.stage,
        value:          o.valor_estimado,
        probability:    o.probabilidade,
        owner:          o.owner,
        expected_close: o.prazo_estimado,
      }));
    }
  } catch {
    // CAZA backend indisponível — ignora silenciosamente
  }

  try {
    const jacqes = await listJacqesOpps();
    for (const o of jacqes) {
      out.push(buildLegacyOpportunity({
        bu:             "JACQES",
        id:             o.id,
        name:           o.nome_oportunidade,
        account_name:   o.empresa,
        stage:          o.stage,
        value:          o.valor_potencial || o.ticket_estimado,
        probability:    o.probabilidade,
        owner:          o.owner,
        expected_close: o.data_fechamento_prevista,
      }));
    }
  } catch {
    // Neon JACQES dead in prod — esperado
  }

  return out;
}
