// ─── AWQ Cyber Security Core — Constants & Configuration ─────────────────────

import type { Severity, TrustLevel, MonitoringState, ActionPriority, RiskStatus } from "./types";

// ── Severity Display ─────────────────────────────────────────────────────────

export const SEVERITY_CONFIG: Record<Severity, {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  badge: string;
}> = {
  critical: {
    label: "Crítico",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-300",
    dot: "bg-red-600",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  high: {
    label: "Alto",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-600 border-red-200",
  },
  medium: {
    label: "Médio",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  low: {
    label: "Baixo",
    color: "text-brand-600",
    bg: "bg-brand-50",
    border: "border-brand-200",
    dot: "bg-brand-500",
    badge: "bg-brand-50 text-brand-600 border-brand-200",
  },
  info: {
    label: "Info",
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
    dot: "bg-gray-400",
    badge: "bg-gray-50 text-gray-500 border-gray-200",
  },
};

// ── Trust Level Display ──────────────────────────────────────────────────────

export const TRUST_CONFIG: Record<TrustLevel, {
  label: string;
  labelPt: string;
  color: string;
  bg: string;
  icon: string;
}> = {
  confirmed: {
    label: "Confirmed",
    labelPt: "Confirmado",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: "check-circle",
  },
  probable: {
    label: "Probable",
    labelPt: "Provável",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: "alert-circle",
  },
  ambiguous: {
    label: "Ambiguous",
    labelPt: "Ambíguo",
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200",
    icon: "help-circle",
  },
  not_verifiable: {
    label: "Not Verifiable",
    labelPt: "Não Verificável",
    color: "text-gray-500",
    bg: "bg-gray-50 border-gray-200",
    icon: "minus-circle",
  },
};

// ── Monitoring State Display ─────────────────────────────────────────────────

export const MONITORING_CONFIG: Record<MonitoringState, {
  label: string;
  color: string;
  bg: string;
  dot: string;
}> = {
  active: {
    label: "Ativo",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500 animate-pulse",
  },
  configured: {
    label: "Configurado",
    color: "text-brand-600",
    bg: "bg-brand-50",
    dot: "bg-brand-500",
  },
  planned: {
    label: "Planejado",
    color: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
  },
  not_available: {
    label: "Indisponível",
    color: "text-gray-500",
    bg: "bg-gray-50",
    dot: "bg-gray-400",
  },
};

// ── Risk Status Display ──────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<RiskStatus, {
  label: string;
  color: string;
  bg: string;
}> = {
  open: { label: "Aberto", color: "text-red-600", bg: "bg-red-50" },
  in_progress: { label: "Em Progresso", color: "text-amber-700", bg: "bg-amber-50" },
  mitigated: { label: "Mitigado", color: "text-brand-600", bg: "bg-brand-50" },
  resolved: { label: "Resolvido", color: "text-emerald-700", bg: "bg-emerald-50" },
  accepted: { label: "Aceito", color: "text-gray-600", bg: "bg-gray-50" },
  not_applicable: { label: "N/A", color: "text-gray-400", bg: "bg-gray-50" },
};

// ── Action Priority Display ──────────────────────────────────────────────────

export const PRIORITY_CONFIG: Record<ActionPriority, {
  label: string;
  color: string;
  bg: string;
}> = {
  p0_immediate: { label: "P0 — Imediato", color: "text-red-700", bg: "bg-red-50" },
  p1_urgent: { label: "P1 — Urgente", color: "text-amber-700", bg: "bg-amber-50" },
  p2_standard: { label: "P2 — Padrão", color: "text-brand-600", bg: "bg-brand-50" },
  p3_improvement: { label: "P3 — Melhoria", color: "text-gray-500", bg: "bg-gray-50" },
};

// ── Risk Category Labels ─────────────────────────────────────────────────────

export const RISK_CATEGORY_LABELS: Record<string, string> = {
  credential_exposure: "Exposição de Credenciais",
  access_control: "Controle de Acesso",
  data_exposure: "Exposição de Dados",
  dependency_risk: "Risco de Dependência",
  configuration: "Configuração",
  bu_isolation: "Isolamento entre BUs",
  hardcoded_data: "Dados Hardcoded",
  missing_auth: "Autenticação Ausente",
  insecure_fallback: "Fallback Inseguro",
  governance: "Governança",
};
