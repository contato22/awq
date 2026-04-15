// ─── AWQ Integration Registry ─────────────────────────────────────────────────
//
// Canonical registry of every data source that feeds AWQ KPIs, DFC, DRE,
// Budget, CRM and BU Scoreboard.
//
// DISCIPLINE:
//   - Only real integrations appear here. No fake or aspirational sources.
//   - status=ativo    → connected, data flowing, used in production today
//   - status=parcial  → connected but incomplete coverage (missing periods/entities)
//   - status=pendente → code exists, env key or manual trigger missing
//   - status=bloqueado→ not yet built; hard dependency missing
//
// RULE:
//   Fallback/snapshot sources MUST be labelled as such.
//   A KPI fed by a snapshot source is a planning KPI, not a real KPI.
//   No source may be promoted to "real" without ingested bank statement evidence.

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntegrationType    = "banco" | "crm" | "notion" | "manual" | "internal";
export type IntegrationStatus  = "ativo" | "parcial" | "pendente" | "bloqueado";
export type FeedsTarget        = "DFC" | "DRE" | "KPI" | "Budget" | "CRM" | "Forecast" | "BU_Scoreboard" | "Reconciliacao";
export type ConfidenceLevel    = "confirmed" | "probable" | "low" | "unavailable";
export type ContaminationRisk  = "none" | "low" | "medium" | "high";

export interface Integration {
  integration_id:      string;
  name:                string;
  description:         string;
  type:                IntegrationType;
  source_of_truth:     string;      // file path, system name, or API endpoint
  owner:               string;      // legal entity responsible
  entity:              string;      // platform entity label
  status:              IntegrationStatus;
  feeds:               FeedsTarget[];
  confidence_status:   ConfidenceLevel;
  last_sync:           string | null;  // ISO date of last successful data pull
  updated_at:          string | null;  // ISO date of last manual update
  contamination_risk:  ContaminationRisk;
  contamination_note:  string | null;
  dependent_kpis:      string[];       // KPI IDs from financial-metric-query.ts
  required_action:     string | null;
  notes:               string;
}

export interface KPISourceEntry {
  kpi_id:             string;
  kpi_label:          string;
  integration_id:     string;
  integration_name:   string;
  intermediate_layer: string;   // lib/ path chain
  destination_pages:  string[];
  source_type:        "real" | "snapshot" | "empty";
  warning?:           string;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const INTEGRATIONS: Integration[] = [
  // ── Bank feeds ──────────────────────────────────────────────────────────────

  {
    integration_id:     "bank_cora_awq_holding",
    name:               "Cora — AWQ Holding (Conta PJ)",
    description:        "Extrato PDF Cora da Conta PJ AWQ Holding. Período coberto: Mar–Abr 2026. Status do documento: done.",
    type:               "banco",
    source_of_truth:    "public/data/financial/documents.json (id: cora0awq0apr2026000001) + transactions.json",
    owner:              "AWQ Holding",
    entity:             "AWQ_Holding",
    status:             "parcial",
    feeds:              ["DFC", "DRE", "KPI", "Reconciliacao"],
    confidence_status:  "confirmed",
    last_sync:          "2026-04-04",
    updated_at:         "2026-04-04",
    contamination_risk: "low",
    contamination_note: "9 transações conciliadas, 15 classificadas pendentes. KPIs finais consomem apenas base conciliada.",
    dependent_kpis:     ["cashInflows", "cashOutflows", "dfcVariacaoCaixa", "dreReceitaCaixa", "dreEbitdaCaixa", "dreMargemEbitdaCaixa", "operationalNetCash", "totalCashBalance"],
    required_action:    "Ingira extrato mensal via /awq/ingest para expandir cobertura além de Abr 2026.",
    notes:              "Pipeline: PDF → POST /api/ingest/process (Claude SSE) → financial-db.ts → financial-query.ts → financial-metric-query.ts. Deduplicação SHA-256.",
  },

  {
    integration_id:     "bank_itau_awq_holding",
    name:               "Itaú Empresas — AWQ Holding",
    description:        "Extrato PDF Itaú Empresas da AWQ Holding. Período coberto: 02 Abr 2026 (1 dia). Status: done.",
    type:               "banco",
    source_of_truth:    "public/data/financial/documents.json (id: itau0empresas0awq000002) + transactions.json",
    owner:              "AWQ Holding",
    entity:             "AWQ_Holding",
    status:             "parcial",
    feeds:              ["DFC", "DRE", "KPI", "Reconciliacao"],
    confidence_status:  "confirmed",
    last_sync:          "2026-04-02",
    updated_at:         "2026-04-02",
    contamination_risk: "low",
    contamination_note: null,
    dependent_kpis:     ["cashInflows", "cashOutflows", "dfcVariacaoCaixa", "dreEbitdaCaixa", "operationalNetCash", "totalCashBalance"],
    required_action:    "Ingira extrato mensal completo. Cobertura atual: apenas 1 dia (02/04/2026).",
    notes:              "2 transações ativas: tarifa_bancaria (opex, conciliado). Saldo de fechamento: R$1.193,58.",
  },

  {
    integration_id:     "bank_itau_jacqes",
    name:               "Itaú — JACQES (Conta PJ)",
    description:        "Extrato Itaú da JACQES ingerido mas com status pending — não processado pelo pipeline.",
    type:               "banco",
    source_of_truth:    "public/data/financial/documents.json (id: 9dc98c34dd57188fd33d)",
    owner:              "JACQES",
    entity:             "JACQES",
    status:             "pendente",
    feeds:              ["DFC", "DRE", "KPI", "BU_Scoreboard"],
    confidence_status:  "unavailable",
    last_sync:          null,
    updated_at:         "2026-01-31",
    contamination_risk: "medium",
    contamination_note: "Documento com status=pending — transações não processadas, não entram em nenhum KPI. Saldo snapshot R$38.500 não verificado.",
    dependent_kpis:     [],
    required_action:    "Processar documento via pipeline de ingestão (/awq/ingest). Verificar e conciliar transações.",
    notes:              "Período: Jan 2026. Bloqueador: document.status !== 'done'. Saldo de fechamento snapshot: R$38.500.",
  },

  {
    integration_id:     "bank_nubank_caza",
    name:               "Nubank — Caza Vision (Conta PJ)",
    description:        "Extrato Nubank da Caza Vision ingerido mas com status pending — não processado.",
    type:               "banco",
    source_of_truth:    "public/data/financial/documents.json (id: 345d0c089922c64e67c7)",
    owner:              "Caza Vision",
    entity:             "Caza_Vision",
    status:             "pendente",
    feeds:              ["DFC", "DRE", "KPI", "BU_Scoreboard"],
    confidence_status:  "unavailable",
    last_sync:          null,
    updated_at:         "2026-01-31",
    contamination_risk: "medium",
    contamination_note: "Documento pending — dados não entram em KPIs. Caza Vision opera com saldo snapshot não verificado.",
    dependent_kpis:     [],
    required_action:    "Processar via /awq/ingest. Caza Vision sem dados reais na base conciliada.",
    notes:              "Período: Jan 2026. Saldo snapshot: R$16.000. Aguardando processamento.",
  },

  // ── Snapshot / Planning sources ──────────────────────────────────────────────

  {
    integration_id:     "snapshot_awq_group",
    name:               "Snapshot AWQ Group (Planejamento Q1 2026)",
    description:        "Dados de planejamento / accrual codificados em lib/awq-group-data.ts. NÃO são dados bancários reais. Alimentam KPIs de planning.",
    type:               "manual",
    source_of_truth:    "lib/awq-group-data.ts → lib/awq-derived-metrics.ts",
    owner:              "AWQ Holding",
    entity:             "AWQ Group (consolidado)",
    status:             "ativo",
    feeds:              ["KPI", "BU_Scoreboard", "Budget", "Forecast"],
    confidence_status:  "probable",
    last_sync:          null,
    updated_at:         "2026-01-01",
    contamination_risk: "medium",
    contamination_note: "Risco: confusão entre snapshot e dado real. Mitigação: todos os KPIs snapshot são emitidos via snapshotMetric() e exibidos com badge 'snapshot'.",
    dependent_kpis:     ["totalRevenue", "ebitda", "ebitdaMargin", "netIncome", "grossMargin", "netMargin", "totalClients", "totalFTEs", "roic", "budgetVariance", "revenuePerClient", "revenuePerFTE"],
    required_action:    "Atualizar manualmente a cada fechamento de trimestre ou substituir por pipeline contábil real.",
    notes:              "Inclui BU breakdown: JACQES, Caza Vision, AWQ Ventures, Advisor. Holding consolida; BUs operam.",
  },

  {
    integration_id:     "snapshot_venture_enerdy",
    name:               "Contrato ENERDY — AWQ Venture",
    description:        "Contrato de advisory fee R$2.000/mês × 36 meses com ENERDY. Confirmado via transação bancária conciliada.",
    type:               "manual",
    source_of_truth:    "lib/awq-group-data.ts (ventureContracts) + transactions.json (cora_awq_t12)",
    owner:              "AWQ Venture",
    entity:             "AWQ_Venture",
    status:             "ativo",
    feeds:              ["KPI", "BU_Scoreboard", "Forecast"],
    confidence_status:  "confirmed",
    last_sync:          "2026-04-04",
    updated_at:         "2026-04-04",
    contamination_risk: "none",
    contamination_note: null,
    dependent_kpis:     ["dreReceitaCaixa", "cashInflows"],
    required_action:    null,
    notes:              "Única receita conciliada no DRE Final (base conciliada). R$2.000 crédito Apr 2026. ARR projetado: R$24.000. Contrato: 36 meses.",
  },

  // ── Notion integrations ──────────────────────────────────────────────────────

  {
    integration_id:     "notion_caza_crm",
    name:               "Notion CRM — Caza Vision",
    description:        "Banco de dados Notion com projetos, clientes e receita Caza Vision. Código pronto, aguardando NOTION_API_KEY.",
    type:               "notion",
    source_of_truth:    "Notion API v2022-06-28 (NOTION_API_KEY) → lib/notion-fetch.ts → app/api/caza/import",
    owner:              "Caza Vision",
    entity:             "Caza_Vision",
    status:             "pendente",
    feeds:              ["CRM", "BU_Scoreboard", "DRE"],
    confidence_status:  "unavailable",
    last_sync:          null,
    updated_at:         null,
    contamination_risk: "high",
    contamination_note: "Arrays Caza Vision atualmente vazios (cazaKpis, cazaRevenueData, projetos, cazaClients). Qualquer dado exibido para Caza é placeholder ou snapshot não verificado.",
    dependent_kpis:     [],
    required_action:    "1) Configurar NOTION_API_KEY + database IDs no .env.local. 2) Executar POST /api/caza/import. 3) Verificar dados retornados.",
    notes:              "lib/notion-fetch.ts suporta NEXT_PUBLIC_STATIC_DATA=1 fallback para GitHub Pages. Sem esse env, requer Notion API live.",
  },

  {
    integration_id:     "notion_venture_sales",
    name:               "Notion — Venture Sales Pipeline",
    description:        "Pipeline de leads Venture. Dados atuais são MOCK embutidos como fallback — não provêm do Notion real.",
    type:               "notion",
    source_of_truth:    "Notion API (pendente) — mock hardcoded em lib/notion-fetch.ts como fallback",
    owner:              "AWQ Venture",
    entity:             "AWQ_Venture",
    status:             "pendente",
    feeds:              ["Forecast", "BU_Scoreboard"],
    confidence_status:  "low",
    last_sync:          null,
    updated_at:         null,
    contamination_risk: "high",
    contamination_note: "Mock Q1 2026 (R$42.5k fechado, 481 leads) embutido como fallback. Não reflete pipeline real até Notion conectado.",
    dependent_kpis:     [],
    required_action:    "Configurar NOTION_API_KEY + database ID venture-sales. Remover mock após integração ativa.",
    notes:              "Bloqueador: env var NOTION_API_KEY ausente. Código pronto em lib/notion-fetch.ts.",
  },

  // ── Internal pipeline ────────────────────────────────────────────────────────

  {
    integration_id:     "ingest_pipeline",
    name:               "Pipeline de Ingestão (Claude PDF Parser)",
    description:        "Pipeline interno: PDF bancário → Claude API → extração de transações → classificação → financial-db.ts. Operacional.",
    type:               "internal",
    source_of_truth:    "app/api/ingest/upload + app/api/ingest/process → lib/financial-db.ts → public/data/financial/",
    owner:              "AWQ Holding",
    entity:             "AWQ Group",
    status:             "ativo",
    feeds:              ["DFC", "DRE", "KPI", "Reconciliacao"],
    confidence_status:  "confirmed",
    last_sync:          "2026-04-04",
    updated_at:         "2026-04-04",
    contamination_risk: "low",
    contamination_note: "Deduplicação SHA-256 previne duplicatas. Classificação automática requer revisão manual via /awq/reconciliation.",
    dependent_kpis:     ["cashInflows", "cashOutflows", "dfcVariacaoCaixa", "dreReceitaCaixa", "totalCashBalance"],
    required_action:    null,
    notes:              "POST /api/ingest/upload (multipart) → POST /api/ingest/process (SSE streaming). Processamento: lib/financial-classifier.ts. Conciliação: /awq/reconciliation.",
  },
];

// ─── KPI → Source map ─────────────────────────────────────────────────────────

export const KPI_SOURCE_MAP: KPISourceEntry[] = [
  // ── Real bank-sourced KPIs ───────────────────────────────────────────────────
  {
    kpi_id:             "cashInflows",
    kpi_label:          "Entradas de Caixa",
    integration_id:     "bank_cora_awq_holding",
    integration_name:   "Cora AWQ + Itaú AWQ",
    intermediate_layer: "financial-db.ts → financial-query.ts (consolidated.totalRevenue) → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis", "/awq/cashflow"],
    source_type:        "real",
  },
  {
    kpi_id:             "cashOutflows",
    kpi_label:          "Saídas de Caixa",
    integration_id:     "bank_cora_awq_holding",
    integration_name:   "Cora AWQ + Itaú AWQ",
    intermediate_layer: "financial-db.ts → financial-query.ts (consolidated.totalExpenses) → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis", "/awq/cashflow"],
    source_type:        "real",
  },
  {
    kpi_id:             "operationalNetCash",
    kpi_label:          "FCO Líquido (Operacional)",
    integration_id:     "bank_cora_awq_holding",
    integration_name:   "Cora AWQ + Itaú AWQ (conciliado)",
    intermediate_layer: "financial-db.ts → financial-query.ts (dfcStatement.conciliado.operacional.liquido) → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis", "/awq/cashflow"],
    source_type:        "real",
  },
  {
    kpi_id:             "totalCashBalance",
    kpi_label:          "Saldo de Caixa Total",
    integration_id:     "bank_cora_awq_holding",
    integration_name:   "Cora AWQ + Itaú AWQ",
    intermediate_layer: "financial-db.ts → financial-query.ts (consolidated.totalCashBalance) → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis", "/awq/cashflow"],
    source_type:        "real",
  },
  {
    kpi_id:             "dfcVariacaoCaixa",
    kpi_label:          "DFC — Variação de Caixa (CPC 03)",
    integration_id:     "bank_cora_awq_holding",
    integration_name:   "Cora AWQ + Itaú AWQ (conciliado)",
    intermediate_layer: "financial-db.ts → buildDFCTier(txsConciliado) → dfcStatement.conciliado.variacaoCaixa → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis", "/awq/cashflow"],
    source_type:        "real",
  },
  {
    kpi_id:             "dreReceitaCaixa",
    kpi_label:          "Receita Cash-Basis (DRE)",
    integration_id:     "bank_cora_awq_holding",
    integration_name:   "Cora AWQ (conciliado)",
    intermediate_layer: "financial-db.ts → buildDRETier(txsConciliado) → dreStatement.conciliado.receita → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis", "/awq/cashflow"],
    source_type:        "real",
  },
  {
    kpi_id:             "dreEbitdaCaixa",
    kpi_label:          "EBITDA Cash-Basis (proxy)",
    integration_id:     "bank_cora_awq_holding",
    integration_name:   "Cora AWQ + Itaú AWQ (conciliado)",
    intermediate_layer: "financial-db.ts → buildDRETier(txsConciliado) → dreStatement.conciliado.ebitda → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis", "/awq/cashflow"],
    source_type:        "real",
  },
  {
    kpi_id:             "dreMargemEbitdaCaixa",
    kpi_label:          "Margem EBITDA Cash-Basis",
    integration_id:     "bank_cora_awq_holding",
    integration_name:   "Cora AWQ + Itaú AWQ (conciliado)",
    intermediate_layer: "financial-db.ts → dreStatement.conciliado.ebitdaMargin → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis"],
    source_type:        "real",
  },

  // ── Snapshot-sourced KPIs ────────────────────────────────────────────────────
  {
    kpi_id:             "totalRevenue",
    kpi_label:          "Receita Total (planejamento)",
    integration_id:     "snapshot_awq_group",
    integration_name:   "Snapshot AWQ Group",
    intermediate_layer: "lib/awq-group-data.ts → consolidated.revenue → lib/awq-derived-metrics.ts → financial-metric-query.ts (snapshotMetric)",
    destination_pages:  ["/awq/kpis"],
    source_type:        "snapshot",
    warning:            "Dado de planejamento Q1 2026 — não é extrato bancário. Badge 'snapshot' obrigatório na UI.",
  },
  {
    kpi_id:             "ebitda",
    kpi_label:          "EBITDA (planejamento)",
    integration_id:     "snapshot_awq_group",
    integration_name:   "Snapshot AWQ Group",
    intermediate_layer: "lib/awq-group-data.ts → consolidated.ebitda → lib/awq-derived-metrics.ts → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis"],
    source_type:        "snapshot",
    warning:            "Planejamento — não é accrual GAAP.",
  },
  {
    kpi_id:             "ebitdaMargin",
    kpi_label:          "Margem EBITDA (planejamento)",
    integration_id:     "snapshot_awq_group",
    integration_name:   "Snapshot AWQ Group",
    intermediate_layer: "lib/awq-group-data.ts → consolidatedMargins.ebitdaMargin → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis"],
    source_type:        "snapshot",
    warning:            "Planejamento.",
  },
  {
    kpi_id:             "roic",
    kpi_label:          "ROIC (planejamento)",
    integration_id:     "snapshot_awq_group",
    integration_name:   "Snapshot AWQ Group",
    intermediate_layer: "lib/awq-group-data.ts → consolidatedRoic → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis"],
    source_type:        "snapshot",
    warning:            "Planejamento.",
  },
  {
    kpi_id:             "budgetVariance",
    kpi_label:          "Budget Variance (planejamento vs planejamento)",
    integration_id:     "snapshot_awq_group",
    integration_name:   "Snapshot AWQ Group",
    intermediate_layer: "lib/awq-group-data.ts → budgetVsActual → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis"],
    source_type:        "snapshot",
    warning:            "Compara snapshot vs snapshot — sem dado real de orçamento.",
  },
  {
    kpi_id:             "totalClients",
    kpi_label:          "Total de Clientes (planejamento)",
    integration_id:     "snapshot_awq_group",
    integration_name:   "Snapshot AWQ Group",
    intermediate_layer: "lib/awq-group-data.ts → consolidated.customers → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis"],
    source_type:        "snapshot",
    warning:            "Planejamento. Caza Vision: arrays vazios — sem dado real.",
  },
  {
    kpi_id:             "totalFTEs",
    kpi_label:          "Total FTEs (planejamento)",
    integration_id:     "snapshot_awq_group",
    integration_name:   "Snapshot AWQ Group",
    intermediate_layer: "lib/awq-group-data.ts → consolidated.ftes → financial-metric-query.ts",
    destination_pages:  ["/awq/kpis"],
    source_type:        "snapshot",
    warning:            "Planejamento.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getIntegrationById(id: string): Integration | undefined {
  return INTEGRATIONS.find((i) => i.integration_id === id);
}

export function getKPIsForIntegration(id: string): KPISourceEntry[] {
  return KPI_SOURCE_MAP.filter((k) => k.integration_id === id);
}

export function countByStatus(): Record<IntegrationStatus, number> {
  const counts: Record<IntegrationStatus, number> = { ativo: 0, parcial: 0, pendente: 0, bloqueado: 0 };
  for (const i of INTEGRATIONS) counts[i.status]++;
  return counts;
}
