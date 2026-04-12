// ─── Data Quality Registry ────────────────────────────────────────────────────
//
// Registro centralizado de metadata de qualidade para todos os KPIs executivos
// da AWQ Group e suas BUs.
//
// PROPÓSITO:
//   - Declarar explicitamente o source_type e confidence de cada métrica
//   - Impedir que dado fictício, mock ou fallback apareça como KPI final
//   - Rastrear origem de cada número exibido em dashboard executivo
//
// MANUTENÇÃO:
//   - Ao adicionar nova métrica em dashboard executivo → registrar aqui
//   - Ao migrar snapshot para dado real → atualizar source_type + confidence_status
//   - Ao corrigir erro de dado → incrementar last_updated + registrar motivo

import type {
  ExecutiveMetricMetadata,
  SourceType,
  ConfidenceStatus,
  Regime,
} from "./data-quality-types";

// ─── Factory helpers ──────────────────────────────────────────────────────────

function realKpi(
  source_label: string,
  period: string,
  owner: string,
  source_module: string,
  last_updated = "2026-04-12",
  regime: Regime = "cash"
): ExecutiveMetricMetadata {
  return {
    source_type: "real",
    source_label,
    confidence_status: "verified",
    period,
    regime,
    owner,
    last_updated,
    source_module,
    can_feed_executive_kpi: true,
  };
}

function snapshotKpi(
  source_label: string,
  period: string,
  owner: string,
  source_module: string,
  last_updated = "2026-04-12",
  regime: Regime = "accrual"
): ExecutiveMetricMetadata {
  return {
    source_type: "snapshot",
    source_label,
    confidence_status: "pending",
    period,
    regime,
    owner,
    last_updated,
    source_module,
    can_feed_executive_kpi: false, // snapshot nunca alimenta KPI final diretamente
  };
}

function emptyKpi(
  owner: string,
  source_module: string,
  reason: string
): ExecutiveMetricMetadata {
  return {
    source_type: "unknown",
    source_label: reason,
    confidence_status: "blocked",
    period: "n/a",
    regime: "unknown",
    owner,
    last_updated: "n/a",
    source_module,
    can_feed_executive_kpi: false,
  };
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Registro de metadata por metric_id.
 * Chaves correspondem a identificadores únicos de métricas em dashboards.
 */
export const DATA_QUALITY_REGISTRY: Record<string, ExecutiveMetricMetadata> = {

  // ── AWQ Holding — Caixa real ────────────────────────────────────────────────
  "awq.caixa_holding": realKpi(
    "Extrato Itaú (print 2026-04-04)",
    "Abr 2026",
    "AWQ Holding",
    "lib/awq-group-data.ts → holdingCash"
  ),
  "awq.receita_consolidada": snapshotKpi(
    "lib/awq-group-data.ts — P&L accrual Q1 2026",
    "Q1 2026",
    "AWQ Holding",
    "lib/awq-group-data.ts → consolidated.revenue"
  ),
  "awq.ebitda_consolidado": snapshotKpi(
    "lib/awq-group-data.ts — P&L accrual Q1 2026",
    "Q1 2026",
    "AWQ Holding",
    "lib/awq-group-data.ts → consolidated.ebitda"
  ),

  // ── JACQES — Agência ────────────────────────────────────────────────────────
  "jacqes.mrr": {
    source_type: "manual",
    source_label: "Notion CRM confirmado — 4 clientes ativos (CEM, Carol, André, Tati Simões)",
    confidence_status: "verified",
    period: "Abr 2026",
    regime: "accrual",
    owner: "JACQES",
    last_updated: "2026-04-08",
    source_module: "lib/awq-group-data.ts → JACQES_MRR",
    can_feed_executive_kpi: true,
  },
  "jacqes.clientes_ativos": {
    source_type: "manual",
    source_label: "Notion CRM confirmado",
    confidence_status: "verified",
    period: "Abr 2026",
    regime: "operational",
    owner: "JACQES",
    last_updated: "2026-04-08",
    source_module: "lib/awq-group-data.ts → JACQES BU customers",
    can_feed_executive_kpi: true,
  },
  "jacqes.margem": emptyKpi(
    "JACQES",
    "lib/data.ts → kpis[margin]",
    "Margem pendente — contabilidade não fechada. Exibir como 0 com aviso."
  ),
  "jacqes.nps": emptyKpi(
    "JACQES",
    "lib/data.ts → kpis[nps]",
    "NPS não medido ainda. Exibir como empty state."
  ),
  "jacqes.receita_ytd": {
    source_type: "manual",
    source_label: "Notion CRM (Jan–Abr 2026) — confirmado pelo CRM",
    confidence_status: "pending",
    period: "Jan–Abr 2026",
    regime: "accrual",
    owner: "JACQES",
    last_updated: "2026-04-08",
    source_module: "lib/awq-group-data.ts → JACQES revenue YTD",
    can_feed_executive_kpi: false, // pending contabilidade
  },

  // ── Caza Vision — Produtora ─────────────────────────────────────────────────
  "caza.receita_q1": snapshotKpi(
    "lib/awq-group-data.ts — planejamento confidencial Q1 2026",
    "Q1 2026",
    "Caza Vision",
    "lib/awq-group-data.ts → CAZA BU revenue"
  ),
  "caza.projetos": emptyKpi(
    "Caza Vision",
    "lib/caza-data.ts → projetos[]",
    "Array vazio — aguardando importação do Notion ou criação interna."
  ),
  "caza.clientes": emptyKpi(
    "Caza Vision",
    "lib/caza-data.ts → cazaClients[]",
    "Array vazio — aguardando importação do Notion ou criação interna."
  ),

  // ── AWQ Venture — Investimentos ─────────────────────────────────────────────
  "venture.caixa_cdb": realKpi(
    "Extrato Itaú — CDB DI (print 2026-04-04)",
    "Abr 2026",
    "AWQ Venture",
    "lib/awq-group-data.ts → VENTURE caixa"
  ),
  "venture.enerdy_fee_mensal": {
    source_type: "real",
    source_label: "Contrato ENERDY ativo — R$2.000/mês, 36 meses",
    confidence_status: "verified",
    period: "Jan 2026–Dez 2028",
    regime: "accrual",
    owner: "AWQ Venture",
    last_updated: "2026-04-04",
    source_module: "lib/venture-commercial-data.ts → C001",
    can_feed_executive_kpi: true,
  },
  "venture.enerdy_arr": {
    source_type: "real",
    source_label: "Derivado do contrato ENERDY (R$2K × 12)",
    confidence_status: "verified",
    period: "2026",
    regime: "accrual",
    owner: "AWQ Venture",
    last_updated: "2026-04-04",
    source_module: "lib/venture-commercial-data.ts → C001 arrQuality",
    can_feed_executive_kpi: true,
  },
  "venture.deal_media_health": snapshotKpi(
    "lib/deal-data.ts — P001 workspace (due diligence)",
    "Abr 2026",
    "AWQ Venture",
    "lib/deal-data.ts → P001 MedIA Health"
  ),
  "venture.deal_eduflow": snapshotKpi(
    "lib/deal-data.ts — P002 workspace (term sheet)",
    "Abr 2026",
    "AWQ Venture",
    "lib/deal-data.ts → P002 EduFlow"
  ),
  "venture.pipeline_template": emptyKpi(
    "AWQ Venture",
    "lib/venture-commercial-data.ts → C002/C003",
    "Oportunidades C002/C003 são templates sem dado real (quality='sem_dado')."
  ),

  // ── Advisor — Consultoria (Pré-Receita) ─────────────────────────────────────
  "advisor.receita": {
    source_type: "real",
    source_label: "pre_revenue — Advisor sem contrato ou mandato ativo",
    confidence_status: "verified",
    period: "2026",
    regime: "cash",
    owner: "Advisor",
    last_updated: "2026-04-08",
    source_module: "lib/awq-group-data.ts → ADVISOR BU revenue (R$0, corrigido 2026-04-08)",
    can_feed_executive_kpi: true, // R$0 é real e verificado
  },
  "advisor.clientes": emptyKpi(
    "Advisor",
    "/advisor/customers",
    "pre_revenue — sem mandato ou cliente ativo."
  ),
  "advisor.pipeline": emptyKpi(
    "Advisor",
    "/advisor",
    "pre_revenue — sem pipeline real. Exibir empty state."
  ),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Recupera metadata de uma métrica pelo ID. Retorna unknown/blocked se não registrada. */
export function getMetricMetadata(metric_id: string): ExecutiveMetricMetadata {
  return (
    DATA_QUALITY_REGISTRY[metric_id] ?? {
      source_type: "unknown" as SourceType,
      source_label: `Métrica '${metric_id}' não registrada no DATA_QUALITY_REGISTRY`,
      confidence_status: "blocked" as ConfidenceStatus,
      period: "n/a",
      regime: "unknown" as Regime,
      owner: "unknown",
      last_updated: "n/a",
      source_module: "unknown",
      can_feed_executive_kpi: false,
    }
  );
}

/** Retorna todas as métricas que NÃO podem alimentar KPI executivo final. */
export function getBlockedMetrics(): string[] {
  return Object.entries(DATA_QUALITY_REGISTRY)
    .filter(([, m]) => !m.can_feed_executive_kpi)
    .map(([id]) => id);
}

/** Retorna todas as métricas snapshot (visíveis apenas com badge). */
export function getSnapshotMetrics(): string[] {
  return Object.entries(DATA_QUALITY_REGISTRY)
    .filter(([, m]) => m.source_type === "snapshot")
    .map(([id]) => id);
}

/** Auditoria: retorna métricas com source_type problemático. */
export function getDataQualityAlerts(): Array<{ id: string; metadata: ExecutiveMetricMetadata }> {
  const problematic: SourceType[] = ["mock", "fallback", "legacy", "unknown"];
  return Object.entries(DATA_QUALITY_REGISTRY)
    .filter(([, m]) => problematic.includes(m.source_type) || m.confidence_status === "blocked")
    .map(([id, metadata]) => ({ id, metadata }));
}
