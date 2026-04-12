"use client";

// ─── DataQualityBadge ─────────────────────────────────────────────────────────
//
// Badge visual que indica a qualidade e origem de um dado exibido em dashboard.
//
// QUANDO USAR:
//   - Sempre que um KPI vier de snapshot, estimativa ou dado manual pendente
//   - Nunca omitir badge em dados que não sejam real+verified
//   - Nunca usar badge para esconder ficção — se é mock, usar empty state
//
// VARIANTES:
//   snapshot   → azul   "Snapshot · <período>"
//   estimated  → âmbar  "Estimativa · <origem>"
//   manual     → cinza  "Manual · <label>"
//   import     → índigo "Importado · <origem>"
//   real       → verde  (sem badge — dado limpo não precisa de aviso)
//   fallback   → não usa badge — usa EmptyState
//   mock       → não usa badge — nunca em produção
//   unknown    → não usa badge — bloquear exibição

import type { SourceType } from "@/lib/data-quality-types";
import { AlertTriangle, Database, FileInput, PenLine, Info } from "lucide-react";

interface DataQualityBadgeProps {
  source_type: SourceType;
  label: string;
  period?: string;
  /** Tamanho do badge. Default: "sm" */
  size?: "xs" | "sm";
  /** Exibir ícone. Default: true */
  showIcon?: boolean;
}

const BADGE_CONFIG: Record<
  SourceType,
  { bg: string; border: string; text: string; Icon: React.ElementType; prefix: string } | null
> = {
  real:       null, // sem badge
  import:     { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", Icon: FileInput,     prefix: "Importado" },
  manual:     { bg: "bg-gray-50",   border: "border-gray-200",   text: "text-gray-600",   Icon: PenLine,        prefix: "Manual" },
  snapshot:   { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   Icon: Database,       prefix: "Snapshot" },
  estimated:  { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  Icon: AlertTriangle,  prefix: "Estimativa" },
  fallback:   null, // não usar badge — use EmptyState
  mock:       null, // nunca em produção
  legacy:     { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", Icon: AlertTriangle,  prefix: "Legado" },
  unknown:    { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    Icon: Info,           prefix: "Origem desconhecida" },
};

export default function DataQualityBadge({
  source_type,
  label,
  period,
  size = "sm",
  showIcon = true,
}: DataQualityBadgeProps) {
  const config = BADGE_CONFIG[source_type];
  if (!config) return null; // dados reais ou fallback/mock não exibem badge

  const { bg, border, text, Icon, prefix } = config;
  const iconSize = size === "xs" ? 9 : 11;
  const textClass = size === "xs" ? "text-[10px]" : "text-xs";
  const padding   = size === "xs" ? "px-2 py-0.5" : "px-3 py-1";

  const displayText = period
    ? `${prefix} · ${period}`
    : `${prefix} · ${label}`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} rounded-full ${bg} border ${border} ${textClass} ${text} font-medium`}
      title={`Fonte: ${label}${period ? ` — Período: ${period}` : ""}`}
    >
      {showIcon && <Icon size={iconSize} />}
      {displayText}
    </span>
  );
}
