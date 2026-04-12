// ─── Data Quality Types ───────────────────────────────────────────────────────
//
// Contrato obrigatório de metadata para qualquer métrica executiva da AWQ.
//
// REGRA CENTRAL:
//   source_type mock | fallback | fictitious | legacy | unknown
//     → NÃO pode alimentar KPI executivo final
//     → deve aparecer como empty state ou placeholder explícito
//
//   source_type snapshot
//     → pode aparecer APENAS com badge explícito
//     → NÃO pode ser confundido com realizado
//
//   source_type estimated
//     → deve aparecer como estimativa
//     → NÃO pode ser somado em realizado sem separação
//
//   source_type real | import
//     → pode alimentar KPI final sem restrição
//     → deve ter source_module rastreável
//
// Holding consolida. BU opera.
// Nenhum KPI final pode usar mock/fallback/unknown como real.

// ─── Source type ──────────────────────────────────────────────────────────────

/** Classificação da origem do dado. */
export type SourceType =
  | "real"        // Dado confirmado (extrato bancário, CRM real, etc.)
  | "snapshot"    // Planejamento / accrual / período fechado — só com badge
  | "manual"      // Inserido manualmente, sem pipeline automático
  | "import"      // Importado de fonte externa (Notion, planilha, etc.)
  | "fallback"    // Substituto temporário quando dado real não está disponível
  | "estimated"   // Estimativa — separar de realizado
  | "mock"        // Fictício para desenvolvimento/testes — nunca em produção real
  | "legacy"      // Dado histórico não-migrado, semântica incerta
  | "unknown";    // Origem desconhecida — bloquear exibição em KPI final

// ─── Confidence status ────────────────────────────────────────────────────────

/** Status de confiabilidade do dado. */
export type ConfidenceStatus =
  | "verified"   // Confirmado por múltiplas fontes ou processo de fechamento
  | "pending"    // Aguardando validação ou conciliação
  | "estimated"  // Estimado — não confirmado
  | "invalid"    // Dado inválido, desatualizado ou contraditório
  | "blocked";   // Dado bloqueado de exibição (falta de origem, risco de ficção)

// ─── Accounting regime ────────────────────────────────────────────────────────

/** Regime contábil/operacional do dado. */
export type Regime =
  | "cash"          // Caixa — baseado em movimentos bancários reais
  | "accrual"       // Competência — baseado em notas, contratos, emissões
  | "hybrid"        // Misto — mistura caixa e competência (declarar explicitamente)
  | "operational"   // Operacional — contagem de entidades, não financeiro
  | "non_financial" // Não financeiro — NPS, headcount, taxa de entrega, etc.
  | "unknown";      // Regime desconhecido — não usar em KPI final

// ─── Metadata obrigatório para métrica executiva ──────────────────────────────

/**
 * Metadata completo exigido para qualquer KPI executivo da AWQ.
 * Todo valor que aparece em dashboard final deve carregar esta estrutura.
 */
export interface ExecutiveMetricMetadata {
  /** Tipo de origem do dado. */
  source_type: SourceType;

  /** Label legível da origem (ex.: "lib/awq-group-data.ts", "Neon Postgres", "Extrato Itaú"). */
  source_label: string;

  /** Status de confiabilidade. */
  confidence_status: ConfidenceStatus;

  /** Período de referência do dado (ex.: "Q1 2026", "Abr 2026", "Jan–Mar 2026"). */
  period: string;

  /** Regime contábil/operacional. */
  regime: Regime;

  /** BU ou módulo responsável pelo dado. */
  owner: string;

  /** ISO date string da última atualização conhecida. */
  last_updated: string;

  /** Arquivo ou módulo que gera este dado (ex.: "lib/awq-group-data.ts"). */
  source_module: string;

  /**
   * Se true, este dado pode alimentar um KPI final executivo.
   * false = só pode aparecer em tela operacional ou com badge forte.
   */
  can_feed_executive_kpi: boolean;
}

// ─── KPI Guard result ─────────────────────────────────────────────────────────

/** Resultado da validação de um KPI pelo ExecutiveKpiGuard. */
export type KpiGuardResult =
  | { allow: true;  mode: "full";    reason?: never }
  | { allow: true;  mode: "badge";   reason: string }
  | { allow: false; mode: "empty";   reason: string }
  | { allow: false; mode: "blocked"; reason: string };

// ─── Data quality alert ───────────────────────────────────────────────────────

/** Alerta de data quality gerado pelo guard. */
export interface DataQualityAlert {
  metric_id: string;
  source_type: SourceType;
  confidence_status: ConfidenceStatus;
  reason: string;
  timestamp: string;
  bu: string;
}
