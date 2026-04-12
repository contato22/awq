"use client";

// ─── ExecutiveKpiGuard ────────────────────────────────────────────────────────
//
// Componente wrapper que valida metadata antes de renderizar um KPI executivo.
//
// COMPORTAMENTO:
//   mode="full"    → renderiza children sem restrição
//   mode="badge"   → renderiza children + DataQualityBadge acima
//   mode="empty"   → renderiza EmptyState com motivo
//   mode="blocked" → renderiza blocked state (dado nunca deve aparecer como real)
//
// NUNCA quebra a página.
// NUNCA esconde dado problemático sem aviso.
// NUNCA deixa mock/fallback/unknown passar como KPI final.
//
// USO BÁSICO:
//   <ExecutiveKpiGuard metricId="jacqes.mrr">
//     <KpiCard value={mrr} label="MRR" />
//   </ExecutiveKpiGuard>
//
// USO AVANÇADO (metadata inline):
//   <ExecutiveKpiGuard metadata={customMetadata}>
//     <KpiCard value={x} label="Custom" />
//   </ExecutiveKpiGuard>

import type { ExecutiveMetricMetadata } from "@/lib/data-quality-types";
import { evaluateKpiById, evaluateKpi } from "@/lib/executive-kpi-guard";
import DataQualityBadge from "./DataQualityBadge";
import { AlertTriangle, ShieldOff } from "lucide-react";
import { getMetricMetadata } from "@/lib/data-quality-registry";

interface ExecutiveKpiGuardProps {
  /** ID do metric no DATA_QUALITY_REGISTRY. Use isto OU metadata. */
  metricId?: string;
  /** Metadata inline. Use isto OU metricId. */
  metadata?: ExecutiveMetricMetadata;
  /** Conteúdo a renderizar se o guard permitir. */
  children: React.ReactNode;
  /** Título do KPI para exibição no empty/blocked state. */
  label?: string;
  /** Se true, sempre renderiza children mesmo com badge (útil em telas operacionais). */
  operationalMode?: boolean;
}

export default function ExecutiveKpiGuard({
  metricId,
  metadata,
  children,
  label = "KPI",
  operationalMode = false,
}: ExecutiveKpiGuardProps) {
  // Resolve metadata
  const resolvedMeta: ExecutiveMetricMetadata = metadata
    ? metadata
    : metricId
    ? getMetricMetadata(metricId)
    : {
        source_type: "unknown",
        source_label: "Nenhum metricId ou metadata fornecido ao ExecutiveKpiGuard",
        confidence_status: "blocked",
        period: "n/a",
        regime: "unknown",
        owner: "unknown",
        last_updated: "n/a",
        source_module: "unknown",
        can_feed_executive_kpi: false,
      };

  const result = evaluateKpi(resolvedMeta);

  // Em modo operacional: sempre exibe o conteúdo, mas com badge se necessário
  if (operationalMode) {
    return (
      <div className="space-y-1">
        {result.mode !== "full" && (
          <DataQualityBadge
            source_type={resolvedMeta.source_type}
            label={resolvedMeta.source_label}
            period={resolvedMeta.period !== "n/a" ? resolvedMeta.period : undefined}
            size="xs"
          />
        )}
        {children}
      </div>
    );
  }

  // Modo executivo: aplica regras completas
  if (!result.allow) {
    if (result.mode === "blocked") {
      return (
        <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-center">
          <ShieldOff size={16} className="text-red-500" />
          <div className="text-xs font-semibold text-red-700">{label}</div>
          <div className="text-[10px] text-red-500 max-w-xs">
            Dado bloqueado — não pode ser exibido como KPI executivo.
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="text-[9px] text-red-400 font-mono mt-1 max-w-xs break-all">
              {result.reason}
            </div>
          )}
        </div>
      );
    }

    // mode="empty"
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-gray-50 border border-gray-200 text-center">
        <AlertTriangle size={14} className="text-amber-500" />
        <div className="text-xs font-medium text-gray-500">{label}</div>
        <div className="text-[10px] text-gray-400 max-w-xs">{result.reason}</div>
      </div>
    );
  }

  // mode="badge" → exibe com badge
  if (result.mode === "badge") {
    return (
      <div className="space-y-1.5">
        <DataQualityBadge
          source_type={resolvedMeta.source_type}
          label={resolvedMeta.source_label}
          period={resolvedMeta.period !== "n/a" ? resolvedMeta.period : undefined}
          size="xs"
        />
        {children}
      </div>
    );
  }

  // mode="full" → sem restrição
  return <>{children}</>;
}
