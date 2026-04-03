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
import { riskSignals, buData } from "@/lib/awq-derived-metrics";
import { buildFinancialQuery, fmtBRL, ENTITY_LABELS } from "@/lib/financial-query";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Extended risk data ───────────────────────────────────────────────────────

const riskCategories = [
  {
    id: "concentration",
    title: "Concentração de Cliente",
    icon: Users,
    color: "text-red-600",
    bg: "bg-red-50",
    borderColor: "border-red-200",
    severity: "high",
    details: [
      { label: "Ambev (JACQES)",      share: 20, mrr: 420_000, risk: "Alto"   },
      { label: "Samsung (JACQES)",    share: 16, mrr: 350_000, risk: "Alto"   },
      { label: "Natura (JACQES)",     share: 14, mrr: 310_000, risk: "Médio"  },
      { label: "Ambev + Samsung + Natura", share: 50, mrr: 1_080_000, risk: "Crítico", isTotal: true },
    ],
    threshold: "Limite: top-3 ≤ 40%",
    current:   "Top-3 = 50% do MRR JACQES",
    action:    "Diversificar carteira — 3+ novos clientes em Q2",
  },
  {
    id: "receivables",
    title: "Recebíveis em Aberto",
    icon: DollarSign,
    color: "text-red-600",
    bg: "bg-red-50",
    borderColor: "border-red-200",
    severity: "high",
    details: [
      { label: "CV002 — Banco XP (Caza)",    share: 0, mrr: 320_000, risk: "Alto",   days: 8  },
      { label: "CV008 — Nubank (Caza)",      share: 0, mrr: 145_000, risk: "Médio",  days: 5  },
      { label: "Banco XP Advisory",          share: 0, mrr: 42_000,  risk: "Baixo",  days: 3  },
    ],
    threshold: "Limite: total ≤ R$200K",
    current:   "Total em aberto: R$507K",
    action:    "Cobrança ativa Banco XP (CV002) — prazo expirado",
  },
  {
    id: "buDependency",
    title: "Dependência de BU Única",
    icon: Building2,
    color: "text-amber-700",
    bg: "bg-amber-50",
    borderColor: "border-amber-200",
    severity: "medium",
    details: [
      { label: "JACQES",      share: 55, mrr: 4_820_000, risk: "Atenção" },
      { label: "Caza Vision", share: 28, mrr: 2_418_000, risk: "OK"      },
      { label: "Advisor",     share: 18, mrr: 1_572_000, risk: "OK"      },
    ],
    threshold: "Limite: nenhuma BU > 50%",
    current:   "JACQES = 55% da receita",
    action:    "Acelerar Caza Vision e Advisor para reequilibrar",
  },
  {
    id: "marginCompression",
    title: "Compressão de Margem — JACQES",
    icon: TrendingDown,
    color: "text-amber-700",
    bg: "bg-amber-50",
    borderColor: "border-amber-200",
    severity: "medium",
    details: [
      { label: "Meta EBITDA 2026",  share: 22, mrr: 0, risk: "Meta"    },
      { label: "EBITDA Realizado",  share: 18, mrr: 0, risk: "Atual"   },
      { label: "Gap",               share: -4, mrr: 0, risk: "4pp gap" },
    ],
    threshold: "Meta: EBITDA ≥ 22%",
    current:   "Realizado: 18% EBITDA",
    action:    "Revisar mix de clientes e custos operacionais",
  },
  {
    id: "cashPressure",
    title: "Cash Pressure — AWQ Venture",
    icon: Zap,
    color: "text-amber-700",
    bg: "bg-amber-50",
    borderColor: "border-amber-200",
    severity: "medium",
    details: [
      { label: "Dry Powder atual",    share: 0, mrr: 6_200_000, risk: "Disponível" },
      { label: "Próximo investimento",share: 0, mrr: 8_000_000, risk: "Necessário" },
      { label: "Gap de funding",      share: 0, mrr: 1_800_000, risk: "A captar"   },
    ],
    threshold: "Dry powder ≥ próximo deploy",
    current:   "Gap: R$1.8M a captar",
    action:    "Avaliar distribuição de dividendos ou captação",
  },
  {
    id: "forecastDet",
    title: "Deterioração de Forecast",
    icon: ShieldAlert,
    color: "text-brand-600",
    bg: "bg-brand-50",
    borderColor: "border-brand-200",
    severity: "low",
    details: [
      { label: "Cenário base Q2",  share: 0, mrr: 11_550_000, risk: "Base"  },
      { label: "Cenário bear Q2",  share: 0, mrr: 10_020_000, risk: "Bear"  },
      { label: "Downside máximo",  share: 0, mrr: -1_530_000, risk: "-13.2%"},
    ],
    threshold: "Bear < -20% do base",
    current:   "Bear = -13.2%: dentro do tolerável",
    action:    "Monitorar — sem ação imediata necessária",
  },
];

const severityOrder = { high: 0, medium: 1, low: 2 };
const sortedRisks = [...riskCategories].sort((a, b) =>
  severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]
);

const severityConfig = {
  high:   { color: "text-red-600",   bg: "bg-red-50",   border: "border-red-500/30",   dot: "bg-red-500",   badge: "bg-red-50 text-red-600 border-red-200"     },
  medium: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-500/30", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  low:    { color: "text-brand-600", bg: "bg-brand-50", border: "border-brand-500/30", dot: "bg-brand-500", badge: "bg-brand-50 text-brand-600 border-brand-200"  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqRiskPage() {
  const q = buildFinancialQuery();
  const c = q.consolidated;
  const highCount   = riskCategories.filter((r) => r.severity === "high").length;
  const mediumCount = riskCategories.filter((r) => r.severity === "medium").length;
  const lowCount    = riskCategories.filter((r) => r.severity === "low").length;
  const operationalEntities = q.entities.filter((e) =>
    ["AWQ_Holding", "JACQES", "Caza_Vision"].includes(e.entity)
  );

  return (
    <>
      <Header
        title="Risk — AWQ Group"
        subtitle="Risk signals · Concentração · Recebíveis · Margem · Cash · Forecast"
      />
      <div className="page-container">

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

        {/* ── Cash Position Real ───────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            Posição de Caixa Real por Entidade
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">REAL</span>
          </h2>
          <p className="text-[11px] text-gray-400 mb-4">
            FCO e caixa da base bancária ingerida — os sinais de risco qualitativos acima usam snapshot.
          </p>
          {!q.hasData ? (
            <div className="text-xs text-amber-600 flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={12} />
              Aguardando extratos bancários —{" "}
              <a href="/awq/ingest" className="underline">ingerir via /awq/ingest</a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Consolidado AWQ</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Entradas</span>
                    <span className="text-emerald-600 font-semibold">{fmtBRL(c.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Saídas</span>
                    <span className="text-red-600">{fmtBRL(c.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1">
                    <span className="font-semibold text-gray-700">FCO</span>
                    <span className={`font-bold ${c.operationalNetCash >= 0 ? "text-gray-900" : "text-red-600"}`}>
                      {fmtBRL(c.operationalNetCash)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Caixa</span>
                    <span className="font-semibold text-brand-700">{fmtBRL(c.totalCashBalance)}</span>
                  </div>
                </div>
              </div>
              {operationalEntities.map((e) => (
                <div key={e.entity} className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">
                    {ENTITY_LABELS[e.entity]}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Entradas</span>
                      <span className="text-emerald-600 font-semibold">{fmtBRL(e.operationalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Saídas</span>
                      <span className="text-red-600">{fmtBRL(e.operationalExpenses)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1">
                      <span className="font-semibold text-gray-700">FCO</span>
                      <span className={`font-bold ${e.operationalNetCash >= 0 ? "text-gray-900" : "text-red-600"}`}>
                        {fmtBRL(e.operationalNetCash)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Caixa</span>
                      <span className="font-semibold text-brand-700">{fmtBRL(e.totalCashBalance)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Risk Heatmap by BU ────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Risk Exposure por BU</h2>
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
        </div>

      </div>
    </>
  );
}
