// ─── /awq/risk — Risk Management Dashboard ───────────────────────────────────
//
// DATA SOURCE:
//   Risk signals   → lib/awq-derived-metrics → lib/awq-group-data (SNAPSHOT)
//   Cash position  → lib/financial-query (REAL — bank statement pipeline)
//
// ALL riskCategories data lives in lib/awq-group-data.ts.
// Zero financial values may be hardcoded in this file.
// Summary card totals are derived from riskCategories at runtime.

import Header from "@/components/Header";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  Users,
  TrendingDown,
  DollarSign,
  Zap,
  Building2,
  ChevronRight,
} from "lucide-react";
import {
  riskSignals,
  riskCategories,
  buData,
  type RiskCategory,
} from "@/lib/awq-derived-metrics";
import { getAWQGroupKPIs, getEntityCashMetrics, fmtBRL, ENTITY_LABELS, fmtR } from "@/lib/financial-metric-query";

// ─── Icon mapping (UI concern — maps canonical iconKey → Lucide component) ───

const ICON_MAP = {
  "users":         Users,
  "dollar":        DollarSign,
  "building":      Building2,
  "trending-down": TrendingDown,
  "zap":           Zap,
  "shield-alert":  ShieldAlert,
} as const;

// ─── Color mapping (UI concern) ───────────────────────────────────────────────

const COLOR_MAP = {
  red:   { text: "text-red-600",   bg: "bg-red-50",   border: "border-red-200"   },
  amber: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  brand: { text: "text-brand-600", bg: "bg-brand-50", border: "border-brand-200" },
} as const;

// ─── Severity config ──────────────────────────────────────────────────────────

const severityConfig = {
  high:   { color: "text-red-600",   bg: "bg-red-50",   border: "border-red-500/30",   dot: "bg-red-500",   badge: "bg-red-50 text-red-600 border-red-200"     },
  medium: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-500/30", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  low:    { color: "text-brand-600", bg: "bg-brand-50", border: "border-brand-500/30", dot: "bg-brand-500", badge: "bg-brand-50 text-brand-600 border-brand-200"  },
};

// ─── Summary derivations from canonical data (no hardcoding) ─────────────────

const severityOrder = { high: 0, medium: 1, low: 2 };
const sortedRisks   = [...riskCategories].sort(
  (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
);

const highCount   = riskCategories.filter((r) => r.severity === "high").length;
const mediumCount = riskCategories.filter((r) => r.severity === "medium").length;
const lowCount    = riskCategories.filter((r) => r.severity === "low").length;

// Derived from canonical data — no hardcoded monetary values in this file
const receivablesTotal = (riskCategories.find((r) => r.id === "receivables")?.details ?? [])
  .reduce((s, d) => s + d.mrr, 0);

const mrrAtRisk = riskCategories
  .find((r) => r.id === "concentration")?.details
  .find((d) => d.isTotal)?.mrr ?? 0;

// ─── Risk card component ──────────────────────────────────────────────────────

function RiskCard({ risk }: { risk: RiskCategory }) {
  const Icon    = ICON_MAP[risk.iconKey];
  const colors  = COLOR_MAP[risk.colorKey];
  const sev     = severityConfig[risk.severity];

  return (
    <div className={`card p-5 border ${sev.border}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
          <Icon size={16} className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-900">{risk.title}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.badge}`}>
              {risk.severity === "high" ? "Alto" : risk.severity === "medium" ? "Médio" : "Baixo"}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">{risk.current}</div>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {risk.details.map((d, i) => (
          <div
            key={i}
            className={`flex items-center justify-between py-1 px-2 rounded ${d.isTotal ? "bg-gray-100" : ""}`}
          >
            <span className={`text-[11px] ${d.isTotal ? "font-bold text-gray-400" : "text-gray-500"}`}>
              {d.label}
              {d.days !== undefined && (
                <span className="ml-1 text-[10px] text-amber-600">({d.days}d)</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {d.mrr !== 0 && (
                <span className={`text-[11px] font-semibold ${d.mrr < 0 ? "text-red-600" : "text-gray-900"}`}>
                  {fmtR(d.mrr)}
                </span>
              )}
              {d.share !== 0 && (
                <span className={`text-[11px] font-semibold ${d.share < 0 ? "text-red-600" : "text-gray-400"}`}>
                  {d.share > 0 ? d.share + "%" : d.share + "pp"}
                </span>
              )}
              <span className={`text-[10px] font-bold ${
                d.risk === "Crítico" || d.risk === "Alto" ? "text-red-600"
                  : d.risk === "Médio" || d.risk === "Atenção" ? "text-amber-700"
                  : "text-emerald-600"
              }`}>
                {d.risk}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-gray-200 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400">Limite:</span>
          <span className="text-[10px] text-gray-400">{risk.threshold}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <AlertTriangle size={9} className={`${colors.text} shrink-0 mt-0.5`} />
          <span className={`text-[10px] font-semibold ${colors.text}`}>{risk.action}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqRiskPage() {
  const kpis     = getAWQGroupKPIs();
  const entities = getEntityCashMetrics();

  // Risk score derived from severity counts (simple weighted formula)
  const riskScore = ((highCount * 3 + mediumCount * 2 + lowCount * 1) /
    (riskCategories.length * 3) * 10).toFixed(1);

  return (
    <>
      <Header
        title="Risk — AWQ Group"
        subtitle="Risk signals · Concentração · Recebíveis · Margem · Cash · Forecast"
      />
      <div className="page-container">

        {/* ── Snapshot notice ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">
                Sinais de risco qualitativos — dados de planejamento (snapshot), não derivados da base bancária.
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Concentração, recebíveis e margens abaixo são análise de planejamento gerencial.
                Posição de caixa real aparece na seção inferior (pipeline bancário).
              </p>
            </div>
          </div>
        </div>

        {/* ── Risk Summary ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: "Riscos Altos",   value: highCount,             color: "text-red-600",   bg: "bg-red-50"   },
            { label: "Riscos Médios",  value: mediumCount,           color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Riscos Baixos",  value: lowCount,              color: "text-brand-600", bg: "bg-brand-50" },
            { label: "Recebíveis",     value: fmtR(receivablesTotal),color: "text-red-600",   bg: "bg-red-50"   },
            { label: "MRR em Risco",   value: fmtR(mrrAtRisk),       color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Score de Risco", value: `${riskScore}/10`,     color: "text-amber-700", bg: "bg-amber-50" },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Risk Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {sortedRisks.map((risk) => (
            <RiskCard key={risk.id} risk={risk} />
          ))}
        </div>

        {/* ── Cash Position Real ───────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            Posição de Caixa Real por Entidade
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">REAL</span>
          </h2>
          <p className="text-[11px] text-gray-400 mb-4">
            FCO e caixa da base bancária ingerida — os sinais de risco acima usam snapshot de planejamento.
          </p>
          {!kpis.hasRealData ? (
            <div className="text-xs text-amber-600 flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={12} />
              Aguardando extratos bancários —{" "}
              <Link href="/awq/ingest" className="underline">ingerir via /awq/ingest</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Consolidado AWQ</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Entradas</span>
                    <span className="text-emerald-600 font-semibold">{fmtBRL(kpis.cashInflows.value ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Saídas</span>
                    <span className="text-red-600">{fmtBRL(kpis.cashOutflows.value ?? 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1">
                    <span className="font-semibold text-gray-700">FCO</span>
                    <span className={`font-bold ${(kpis.operationalNetCash.value ?? 0) >= 0 ? "text-gray-900" : "text-red-600"}`}>
                      {fmtBRL(kpis.operationalNetCash.value ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Caixa</span>
                    <span className="font-semibold text-brand-700">{fmtBRL(kpis.totalCashBalance.value ?? 0)}</span>
                  </div>
                </div>
              </div>
              {entities.map((e) => (
                <div key={e.entity} className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">
                    {e.label}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Entradas</span>
                      <span className="text-emerald-600 font-semibold">{fmtBRL(e.cashInflows.value)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Saídas</span>
                      <span className="text-red-600">{fmtBRL(e.cashOutflows.value)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1">
                      <span className="font-semibold text-gray-700">FCO</span>
                      <span className={`font-bold ${e.operationalNetCash.value >= 0 ? "text-gray-900" : "text-red-600"}`}>
                        {fmtBRL(e.operationalNetCash.value)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Caixa</span>
                      <span className="font-semibold text-brand-700">{fmtBRL(e.totalCashBalance.value)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Risk Heatmap by BU ────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Risk Exposure por BU</h2>
          <p className="text-[11px] text-gray-400 mb-4">Avaliação qualitativa — snapshot de planejamento.</p>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">BU</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Concentração</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Recebíveis</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Margem</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Cash</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Forecast</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Score Geral</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "JACQES",       concentration: "Alto",  receivables: "Baixo", margin: "Médio", cash: "Baixo", forecast: "Baixo", score: "Médio" },
                  { name: "Caza Vision",  concentration: "Baixo", receivables: "Alto",  margin: "Baixo", cash: "Baixo", forecast: "Baixo", score: "Médio" },
                  { name: "Advisor",      concentration: "Médio", receivables: "Baixo", margin: "Baixo", cash: "Baixo", forecast: "Baixo", score: "Baixo" },
                  { name: "AWQ Venture",  concentration: "Baixo", receivables: "Baixo", margin: "N/A",   cash: "Médio", forecast: "Médio", score: "Médio" },
                ].map((row) => {
                  const riskCell = (v: string) => {
                    const color = v === "Alto"  ? "bg-red-50 text-red-600"
                      : v === "Médio"           ? "bg-amber-50 text-amber-700"
                      : v === "N/A"             ? "text-gray-400"
                      : "bg-emerald-50 text-emerald-600";
                    return (
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{v}</span>
                      </td>
                    );
                  };
                  const bu = buData.find((b) => b.name === row.name);
                  return (
                    <tr key={row.name} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${bu?.color ?? "bg-gray-500"}`} />
                          <span className={`text-xs font-medium ${bu?.accentColor ?? "text-gray-400"}`}>{row.name}</span>
                        </div>
                      </td>
                      {riskCell(row.concentration)}
                      {riskCell(row.receivables)}
                      {riskCell(row.margin)}
                      {riskCell(row.cash)}
                      {riskCell(row.forecast)}
                      {riskCell(row.score)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-amber-600 mt-2">
            ⚠ Avaliação qualitativa baseada em análise de planejamento — não derivada da base bancária.
          </p>
        </div>

        {/* ── Quick links ───────────────────────────────────────────────────── */}
        <div className="flex gap-3 flex-wrap">
          <Link href="/awq/cashflow" className="text-xs px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium">
            → Caixa Real (cashflow)
          </Link>
          <Link href="/awq/financial" className="text-xs px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            → Financial (pipeline)
          </Link>
          <Link href="/awq/management" className="text-xs px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            → Governança
          </Link>
        </div>

      </div>
    </>
  );
}
