// ─── MetricSourceBadge — canonical UI for FinancialMetric provenance ─────────
//
// Server component (no interactivity needed).
// Renders source_type badge + optional detail row for any FinancialMetric.
//
// Usage:
//   import { MetricSourceBadge, MetricDetail } from "@/components/MetricSourceBadge";
//   <MetricSourceBadge sourceType="real" />
//   <MetricDetail metric={kpis.totalRevenue} />

import {
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_STYLE,
  CONFIDENCE_LABELS,
  RECONCILIATION_LABELS,
  type SourceType,
  type FinancialMetric,
} from "@/lib/financial-metric-registry";

// ─── Inline badge (fits inside card labels) ───────────────────────────────────

interface MetricSourceBadgeProps {
  sourceType: SourceType;
  size?: "xs" | "sm";
}

export function MetricSourceBadge({ sourceType, size = "xs" }: MetricSourceBadgeProps) {
  const s = SOURCE_TYPE_STYLE[sourceType];
  const textSize = size === "xs" ? "text-[9px]" : "text-[10px]";
  return (
    <span
      className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded border ${s.border} ${s.bg} ${s.text} ${textSize} ml-1 shrink-0`}
    >
      {SOURCE_TYPE_LABELS[sourceType]}
    </span>
  );
}

// ─── Detail row (shows source, period, confidence, reconciliation) ────────────

interface MetricDetailProps {
  metric:   FinancialMetric<unknown>;
  compact?: boolean;
}

export function MetricDetail({ metric, compact = true }: MetricDetailProps) {
  const s = SOURCE_TYPE_STYLE[metric.source_type];
  return (
    <div className={`text-[10px] text-gray-400 mt-1 space-y-0.5 ${compact ? "" : "border-t border-gray-100 pt-2 mt-2"}`}>
      <div className="flex items-center gap-1 flex-wrap">
        <span className={`font-bold ${s.text}`}>{SOURCE_TYPE_LABELS[metric.source_type]}</span>
        <span className="text-gray-300">·</span>
        <span>{metric.entity}</span>
        <span className="text-gray-300">·</span>
        <span>{metric.period}</span>
      </div>
      {!compact && (
        <>
          <div><span className="font-semibold text-gray-500">Fonte:</span> {metric.source_name}</div>
          <div><span className="font-semibold text-gray-500">Regra:</span> {metric.calculation_rule}</div>
          <div><span className="font-semibold text-gray-500">Confiança:</span> {CONFIDENCE_LABELS[metric.confidence_status]}</div>
          <div><span className="font-semibold text-gray-500">Reconciliação:</span> {RECONCILIATION_LABELS[metric.reconciliation_status]}</div>
          {metric.note && <div className="text-amber-600">{metric.note}</div>}
        </>
      )}
    </div>
  );
}

// ─── Empty state (for metrics with source_type === "empty") ───────────────────

interface MetricEmptyProps {
  label?: string;
  linkHref?: string;
  linkLabel?: string;
}

export function MetricEmpty({ label = "Sem dado confiável", linkHref, linkLabel }: MetricEmptyProps) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
      <span>{label}</span>
      {linkHref && (
        <>
          <span className="text-gray-300">·</span>
          <a href={linkHref} className="text-brand-500 hover:text-brand-400 underline">{linkLabel ?? linkHref}</a>
        </>
      )}
    </div>
  );
}
