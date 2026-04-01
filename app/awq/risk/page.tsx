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
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { riskSignals, buData } from "@/lib/awq-group-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Extended risk data ───────────────────────────────────────────────────────

const riskCategories: {
  id: string; title: string; icon: React.ElementType; color: string; bg: string; borderColor: string;
  severity: string; details: { label: string; share: number; mrr: number; risk: string; isTotal?: boolean; days?: number }[];
  threshold: string; current: string; action: string;
}[] = [];

const severityOrder = { high: 0, medium: 1, low: 2 };
const sortedRisks = [...riskCategories].sort((a, b) =>
  severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]
);

const severityConfig = {
  high:   { color: "text-red-600",   bg: "bg-red-50",   border: "border-red-500/30",   dot: "bg-red-500",   badge: "bg-red-50 text-red-600 border-red-200"     },
  medium: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-500/30", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  low:    { color: "text-brand-600", bg: "bg-brand-50", border: "border-brand-500/30", dot: "bg-brand-500", badge: "bg-brand-50 text-brand-600 border-brand-200"  },
};

const riskHeatmapRows: { name: string; concentration: string; receivables: string; margin: string; cash: string; forecast: string; score: string }[] = [];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqRiskPage() {
  const highCount   = riskCategories.filter((r) => r.severity === "high").length;
  const mediumCount = riskCategories.filter((r) => r.severity === "medium").length;
  const lowCount    = riskCategories.filter((r) => r.severity === "low").length;

  return (
    <>
      <Header
        title="Risk — AWQ Group"
        subtitle="Risk signals · Concentração · Recebíveis · Margem · Cash · Forecast"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Risk Summary ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: "Riscos Altos",   value: highCount,   color: "text-red-600",   bg: "bg-red-50"   },
            { label: "Riscos Médios",  value: mediumCount, color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Riscos Baixos",  value: lowCount,    color: "text-brand-600", bg: "bg-brand-50" },
            { label: "Recebíveis",     value: fmtR(507_000), color: "text-red-600", bg: "bg-red-50"  },
            { label: "MRR em Risco",   value: fmtR(1_080_000), color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Score de Risco", value: "6.8/10",    color: "text-amber-700", bg: "bg-amber-50" },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Risk Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {sortedRisks.length === 0 && (
            <div className="xl:col-span-2 py-12 text-center text-gray-400">
              <p className="text-sm font-medium">Sem dados disponíveis</p>
              <p className="text-xs mt-1 opacity-70">Nenhum sinal de risco registrado</p>
            </div>
          )}
          {sortedRisks.map((risk) => {
            const Icon   = risk.icon;
            const sev    = severityConfig[risk.severity as keyof typeof severityConfig];
            return (
              <div key={risk.id} className={`card p-5 border ${sev.border}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl ${risk.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={16} className={risk.color} />
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

                {/* Details */}
                <div className="space-y-1 mb-3">
                  {risk.details.map((d, i) => (
                    <div key={i} className={`flex items-center justify-between py-1 px-2 rounded ${(d as { isTotal?: boolean }).isTotal ? "bg-gray-100" : ""}`}>
                      <span className={`text-[11px] ${(d as { isTotal?: boolean }).isTotal ? "font-bold text-gray-400" : "text-gray-500"}`}>
                        {d.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {d.mrr !== 0 && (
                          <span className={`text-[11px] font-semibold ${d.mrr < 0 ? "text-red-600" : "text-gray-900"}`}>
                            {d.mrr < 0 ? "" : ""}{fmtR(d.mrr)}
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

                {/* Threshold + Action */}
                <div className="pt-2 border-t border-gray-200 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400">Limite:</span>
                    <span className="text-[10px] text-gray-400">{risk.threshold}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle size={9} className={`${risk.color} shrink-0 mt-0.5`} />
                    <span className={`text-[10px] font-semibold ${risk.color}`}>{risk.action}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Risk Heatmap by BU ────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Risk Exposure por BU</h2>
          <div className="overflow-x-auto">
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
                {riskHeatmapRows.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">Sem dados disponíveis</td></tr>
                )}
                {riskHeatmapRows.map((row) => {
                  const riskCell = (v: string) => {
                    const color = v === "Alto" ? "bg-red-50 text-red-600"
                      : v === "Médio" ? "bg-amber-50 text-amber-700"
                      : v === "N/A"  ? "text-gray-400"
                      : "bg-emerald-50 text-emerald-600";
                    return (
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{v}</span>
                      </td>
                    );
                  };
                  const bu = buData.find((b) => b.name === row.name);
                  return (
                    <tr key={row.name} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
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
        </div>

      </div>
    </>
  );
}
