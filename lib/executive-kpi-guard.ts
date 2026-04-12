// ─── Executive KPI Guard ──────────────────────────────────────────────────────
//
// Camada de validação que decide se um KPI pode ser exibido em dashboard
// executivo e em qual modo (full, badge, empty, blocked).
//
// REGRAS:
//   real + verified             → full   (exibe sem restrição)
//   manual + verified           → full   (exibe sem restrição)
//   import + verified           → full   (exibe sem restrição)
//   snapshot                    → badge  (exibe com badge explícito)
//   estimated                   → badge  (exibe como estimativa)
//   manual + pending/estimated  → badge  (exibe com aviso de pendência)
//   fallback                    → empty  (substitui por empty state)
//   mock                        → blocked (bloqueia completamente — nunca em produção)
//   fictitious                  → blocked
//   legacy + unknown            → empty  (empty state com motivo)
//   unknown                     → blocked
//   confidence_status=blocked   → blocked
//   confidence_status=invalid   → empty
//
// NUNCA quebra a página — sempre retorna um modo seguro.

import type {
  ExecutiveMetricMetadata,
  KpiGuardResult,
  DataQualityAlert,
  SourceType,
} from "./data-quality-types";
import { getMetricMetadata } from "./data-quality-registry";

// ─── Conjuntos de classificação ───────────────────────────────────────────────

const BLOCKED_SOURCES: SourceType[] = ["mock", "unknown"];
const EMPTY_SOURCES:   SourceType[] = ["fallback", "legacy"];
const BADGE_SOURCES:   SourceType[] = ["snapshot", "estimated"];
const FULL_SOURCES:    SourceType[] = ["real", "import"];

// ─── Guard logic ──────────────────────────────────────────────────────────────

/**
 * Avalia se um KPI pode ser exibido e em qual modo.
 *
 * @param metadata  Metadata da métrica (use getMetricMetadata() para buscar do registry)
 * @returns KpiGuardResult com { allow, mode, reason }
 */
export function evaluateKpi(metadata: ExecutiveMetricMetadata): KpiGuardResult {
  const { source_type, confidence_status, source_label } = metadata;

  // 1. Confidence blocked ou invalid → bloqueia sempre
  if (confidence_status === "blocked") {
    return {
      allow: false,
      mode: "blocked",
      reason: `Dado bloqueado: ${source_label}`,
    };
  }
  if (confidence_status === "invalid") {
    return {
      allow: false,
      mode: "empty",
      reason: `Dado inválido ou desatualizado: ${source_label}`,
    };
  }

  // 2. source_type determina modo base
  if (BLOCKED_SOURCES.includes(source_type)) {
    return {
      allow: false,
      mode: "blocked",
      reason: `source_type="${source_type}" nunca pode alimentar KPI executivo. Origem: ${source_label}`,
    };
  }

  if (source_type === "mock" || source_type === "unknown") {
    // redundante mas explícito
    return {
      allow: false,
      mode: "blocked",
      reason: `Dado fictício ou de origem desconhecida: ${source_label}`,
    };
  }

  if (EMPTY_SOURCES.includes(source_type)) {
    return {
      allow: false,
      mode: "empty",
      reason: `source_type="${source_type}" — substituir por empty state. Origem: ${source_label}`,
    };
  }

  if (BADGE_SOURCES.includes(source_type)) {
    return {
      allow: true,
      mode: "badge",
      reason: `${source_type === "snapshot" ? "Snapshot" : "Estimativa"}: ${source_label} · ${metadata.period}`,
    };
  }

  // manual com confidence pending/estimated → badge
  if (source_type === "manual" && (confidence_status === "pending" || confidence_status === "estimated")) {
    return {
      allow: true,
      mode: "badge",
      reason: `Dado manual pendente de validação: ${source_label}`,
    };
  }

  // real, import, manual+verified → full
  if (FULL_SOURCES.includes(source_type) || source_type === "manual") {
    return { allow: true, mode: "full" };
  }

  // fallback de segurança — nunca deve chegar aqui
  return {
    allow: false,
    mode: "empty",
    reason: `source_type="${source_type}" não classificado — exibindo empty state por segurança.`,
  };
}

/**
 * Avalia um KPI pelo seu ID no DATA_QUALITY_REGISTRY.
 * Atalho para uso em componentes de página.
 */
export function evaluateKpiById(metric_id: string): KpiGuardResult {
  const metadata = getMetricMetadata(metric_id);
  return evaluateKpi(metadata);
}

/**
 * Gera alerta de data quality para uma métrica problemática.
 * Registra no console em desenvolvimento; em produção, pode ser enviado para
 * um pipeline de observabilidade.
 */
export function emitDataQualityAlert(
  metric_id: string,
  metadata: ExecutiveMetricMetadata,
  bu: string
): DataQualityAlert {
  const alert: DataQualityAlert = {
    metric_id,
    source_type: metadata.source_type,
    confidence_status: metadata.confidence_status,
    reason: `[DQ ALERT] ${metric_id} — source_type=${metadata.source_type}, confidence=${metadata.confidence_status}, owner=${metadata.owner}`,
    timestamp: new Date().toISOString(),
    bu,
  };

  if (process.env.NODE_ENV === "development") {
    console.warn(alert.reason);
  }

  return alert;
}

/**
 * Valida um conjunto de métricas de uma página e retorna os resultados.
 * Útil para páginas que exibem múltiplos KPIs.
 */
export function evaluatePageKpis(
  metrics: Array<{ id: string; metadata?: ExecutiveMetricMetadata }>
): Record<string, KpiGuardResult> {
  const results: Record<string, KpiGuardResult> = {};
  for (const { id, metadata } of metrics) {
    const meta = metadata ?? getMetricMetadata(id);
    results[id] = evaluateKpi(meta);
  }
  return results;
}
