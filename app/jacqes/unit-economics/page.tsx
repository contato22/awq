import Header from "@/components/Header";
import {
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Target,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const unitMetrics = [
  {
    label: "CAC",
    value: "—",
    sub: "Custo de Aquisição",
    delta: "—",
    up: true,
    icon: Users,
    color: "text-brand-600",
    bg: "bg-brand-50",
    description: "Inclui marketing, comercial e onboarding",
  },
  {
    label: "LTV Médio",
    value: "—",
    sub: "Lifetime Value",
    delta: "—",
    up: true,
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    description: "Baseado em 36 meses de vida média",
  },
  {
    label: "LTV / CAC",
    value: "—",
    sub: "Referência: >3×",
    delta: "—",
    up: true,
    icon: TrendingUp,
    color: "text-violet-700",
    bg: "bg-violet-50",
    description: "Retorno por real investido em aquisição",
  },
  {
    label: "Payback",
    value: "—",
    sub: "Referência: <12 meses",
    delta: "—",
    up: true,
    icon: Target,
    color: "text-amber-700",
    bg: "bg-amber-50",
    description: "Meses para recuperar o CAC",
  },
];

const mrrHistory: { month: string; mrr: number; newMrr: number; churnMrr: number; expansionMrr: number }[] = [];

const cohortData: { cohort: string; clientes: number; retencao12m: number; retencao24m: number; ltvMedio: number }[] = [];

function retencaoColor(v: number) {
  if (v >= 90) return "text-emerald-600";
  if (v >= 70) return "text-amber-700";
  if (v > 0)   return "text-red-600";
  return "text-gray-400";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JacqesUnitEconomicsPage() {
  const latestMrr = mrrHistory.length > 0 ? mrrHistory[mrrHistory.length - 1] : null;
  const prevMrr   = mrrHistory.length > 1 ? mrrHistory[mrrHistory.length - 2] : null;
  const mrrGrowth = latestMrr && prevMrr && prevMrr.mrr > 0
    ? (((latestMrr.mrr - prevMrr.mrr) / prevMrr.mrr) * 100).toFixed(1)
    : "0.0";
  const arr = latestMrr ? latestMrr.mrr * 12 : 0;

  return (
    <>
      <Header
        title="Unit Economics — JACQES"
        subtitle="CAC · LTV · Payback · MRR · Cohortes"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Unit Metric Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {unitMetrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={m.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-900">{m.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{m.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {m.up
                      ? <ArrowUpRight size={11} className="text-emerald-600" />
                      : <ArrowDownRight size={11} className="text-red-600" />}
                    <span className={`text-[10px] font-semibold ${m.up ? "text-emerald-600" : "text-red-600"}`}>{m.delta}</span>
                    <span className="text-[10px] text-gray-400">{m.sub}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">{m.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── MRR History ──────────────────────────────────────────────────── */}
          <div className="xl:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Evolução do MRR</h2>
              <div className="flex items-center gap-3 text-[11px]">
                <div>
                  <span className="text-gray-500">MRR Atual </span>
                  <span className="text-gray-900 font-bold">{latestMrr ? fmtR(latestMrr.mrr) : "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">ARR </span>
                  <span className="text-emerald-600 font-bold">{fmtR(arr)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpRight size={11} className="text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">+{mrrGrowth}% MoM</span>
                </div>
              </div>
            </div>

            {/* Visual MRR bars */}
            <div className="space-y-3">
              {mrrHistory.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Sem dados disponíveis</p>
              )}
              {mrrHistory.map((row) => {
                const maxMrr = Math.max(...mrrHistory.map((r) => r.mrr));
                const barWidth = (row.mrr / maxMrr) * 100;
                return (
                  <div key={row.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-12 shrink-0">{row.month}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-900 w-20 text-right shrink-0">{fmtR(row.mrr)}</span>
                    {row.newMrr > 0 && (
                      <span className="text-[10px] text-emerald-600 w-16 text-right shrink-0">+{fmtR(row.newMrr)}</span>
                    )}
                    {row.churnMrr > 0 && (
                      <span className="text-[10px] text-red-600 w-16 text-right shrink-0">-{fmtR(row.churnMrr)}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* MRR Decomposition */}
            {latestMrr && (
              <div className="mt-5 pt-4 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-400 mb-3">Decomposição MRR — Último mês</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "New MRR",       value: latestMrr.newMrr,      color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Churned MRR",   value: -latestMrr.churnMrr,   color: "text-red-600",     bg: "bg-red-50"     },
                    { label: "Net New MRR",   value: latestMrr.newMrr - latestMrr.churnMrr, color: "text-brand-600", bg: "bg-brand-50" },
                  ].map((d) => (
                    <div key={d.label} className={`rounded-lg ${d.bg} p-3 text-center`}>
                      <div className={`text-base font-bold ${d.color}`}>{d.value >= 0 ? "+" : ""}{fmtR(Math.abs(d.value))}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{d.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Key Ratios ───────────────────────────────────────────────────── */}
          <div className="card p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-900">Benchmarks</h2>
            {[
              { label: "LTV / CAC",         value: "36.3×", benchmark: ">3×",   status: "great", pct: 100 },
              { label: "Gross Margin",      value: "60.0%", benchmark: ">50%",  status: "great", pct: 100 },
              { label: "Net Revenue Retention", value: "112%", benchmark: ">100%", status: "great", pct: 100 },
              { label: "Payback (meses)",   value: "3.8",   benchmark: "<12",   status: "great", pct: 100 },
              { label: "Magic Number",      value: "1.8",   benchmark: ">1.0",  status: "great", pct: 100 },
              { label: "Rule of 40",        value: "58",    benchmark: ">40",   status: "great", pct: 100 },
            ].map((r) => (
              <div key={r.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{r.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">ref: {r.benchmark}</span>
                    <span className="text-xs font-bold text-emerald-600">{r.value}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}

            <div className="border-t border-gray-200 pt-4 mt-auto">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={13} className="text-brand-600" />
                <span className="text-xs font-semibold text-gray-400">Margens por Tipo de Serviço</span>
              </div>
              {[
                { label: "Retainer Mensal",  margin: 72 },
                { label: "Projetos Spot",    margin: 58 },
                { label: "Consultoria",      margin: 81 },
                { label: "Performance",      margin: 65 },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-gray-500 w-28 shrink-0">{s.label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${s.margin}%` }} />
                  </div>
                  <span className="text-[10px] font-semibold text-brand-600 w-8 text-right">{s.margin}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Cohort Analysis ──────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Análise de Cohort — Retenção por Trimestre de Entrada</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Cohort</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Clientes</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Retenção 12m</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Retenção 24m</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">LTV Médio</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">Sem dados disponíveis</td></tr>
                )}
                {cohortData.map((row) => (
                  <tr key={row.cohort} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                    <td className="py-2.5 px-3 text-xs font-medium text-gray-400">{row.cohort}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-400">{row.clientes}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-semibold">
                      <span className={retencaoColor(row.retencao12m)}>{row.retencao12m}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs font-semibold">
                      {row.retencao24m > 0
                        ? <span className={retencaoColor(row.retencao24m)}>{row.retencao24m}%</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs font-semibold text-emerald-600">
                      {fmtR(row.ltvMedio)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
