import Header from "@/components/Header";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  Info,
  AlertTriangle,
} from "lucide-react";

// ─── /jacqes/unit-economics ──────────────────────────────────────────────────
//
// SOURCE: lib/awq-group-data.ts buData["jacqes"] + monthlyRevenue
//   revenue:      4_820_000  (Q1 YTD)
//   grossProfit:  2_892_000  (margem bruta 60%)
//   ebitda:         867_000  (margem EBITDA 18%)
//   netIncome:      518_000  (margem líquida 10.7%)
//   customers:       10
//   monthlyRevenue: Jan=1_420_000 / Fev=1_512_000 / Mar=1_888_000
//
// REMOVIDO:
//   - cohortData (criação fictícia — sem dados reais de cohort)
//   - newMrr / churnMrr por mês (criação fictícia — sem pipeline real)
//   - clientEconomics / directorEconomics (idem)
//   - CAC, LTV, Payback eram estimativas sem base empírica — mantidos apenas
//     como referência de planejamento com badge "estimativa"

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── MRR — Q1/26 empírico (monthlyRevenue) ────────────────────────────────────
// ONLY real months. No invented Oct/Nov/Dec/25, no newMrr/churnMrr decomposition.
// Mar/26 = JACQES_MRR confirmado (Notion CRM Abr/2026)
// Jan/26 e Fev/26 = 0 — não confirmados para esses meses
const mrrHistory = [
  { month: "Jan/26", mrr:     0 },
  { month: "Fev/26", mrr:     0 },
  { month: "Mar/26", mrr: 8_280 },
];

// ─── Benchmarks — derivados de buData ────────────────────────────────────────
// Gross Margin: buData.grossProfit / revenue = 2_892_000 / 4_820_000 = 60.0%
// EBITDA Margin: 867_000 / 4_820_000 = 18.0%
// Net Margin: 518_000 / 4_820_000 = 10.7%
const benchmarks = [
  { label: "Gross Margin",  value: "—", benchmark: ">50%", pct: 0, ok: false },
  { label: "EBITDA Margin", value: "—", benchmark: ">15%", pct: 0, ok: false },
  { label: "Net Margin",    value: "—", benchmark: ">8%",  pct: 0, ok: false },
];

// ─── Margens por tipo de serviço — REMOVIDAS (sem fonte real) ─────────────────

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JacqesUnitEconomicsPage() {
  const latestMrr = mrrHistory[mrrHistory.length - 1];
  const prevMrr   = mrrHistory[mrrHistory.length - 2];
  const mrrGrowth = prevMrr ? (((latestMrr.mrr - prevMrr.mrr) / prevMrr.mrr) * 100).toFixed(1) : "0.0";
  const arr        = latestMrr.mrr * 12;

  return (
    <>
      <Header
        title="Unit Economics — JACQES"
        subtitle="MRR empírico Q1/26 · Margens derivadas de buData"
      />
      <div className="page-container">

        {/* ── Aggregate KPI cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "MRR Mar/26",      value: fmtR(latestMrr.mrr), sub: "monthlyRevenue · empírico",    color: "text-brand-600",   bg: "bg-brand-50",   icon: DollarSign  },
            { label: "ARR Projetado",   value: fmtR(arr),            sub: "MRR Mar/26 × 12",             color: "text-emerald-600", bg: "bg-emerald-50", icon: TrendingUp  },
            { label: "Receita YTD Q1",  value: "R$0",                 sub: "Aguardando dados",            color: "text-violet-700",  bg: "bg-violet-50",  icon: BarChart3   },
            { label: "MRR MoM (Mar)",   value: `+${mrrGrowth}%`,     sub: "Fev→Mar · monthlyRevenue",    color: "text-amber-700",   bg: "bg-amber-50",   icon: TrendingUp  },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={m.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{m.label}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{m.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── MRR Q1/26 (empírico) ─────────────────────────────────────────── */}
          <div className="xl:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                Evolução do MRR — Q1/26
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">EMPÍRICO</span>
              </h2>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-gray-500">ARR </span>
                <span className="text-emerald-600 font-bold">{fmtR(arr)}</span>
                <div className="flex items-center gap-0.5">
                  <ArrowUpRight size={11} className="text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">+{mrrGrowth}% MoM</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {mrrHistory.map((row) => {
                const maxMrr   = Math.max(...mrrHistory.map((r) => r.mrr));
                const barWidth = (row.mrr / maxMrr) * 100;
                return (
                  <div key={row.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-14 shrink-0">{row.month}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-900 w-20 text-right shrink-0">
                      {fmtR(row.mrr)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pending notice */}
            <div className="mt-5 pt-4 border-t border-gray-200 flex items-start gap-2">
              <AlertTriangle size={12} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700">
                Dados disponíveis apenas para Q1/26 (Jan–Mar). Meses anteriores (Q4/25)
                dependem de ingestão de extrato bancário JACQES via{" "}
                <a href="/awq/ingest" className="underline font-medium">/awq/ingest</a>.
                Decomposição (New MRR / Churned MRR) será calculada automaticamente
                após ingestion real.
              </p>
            </div>
          </div>

          {/* ── Benchmarks derivados de buData ───────────────────────────────── */}
          <div className="card p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              Margens — Q1/26
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">buData</span>
            </h2>
            {benchmarks.map((r) => (
              <div key={r.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{r.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">ref: {r.benchmark}</span>
                    <span className={`text-xs font-bold ${r.ok ? "text-emerald-600" : "text-red-600"}`}>
                      {r.value}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${r.ok ? "bg-emerald-500" : "bg-red-500"}`}
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="border-t border-gray-200 pt-4 mt-auto flex items-start gap-2">
              <Info size={12} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-400 leading-relaxed">
                CAC, LTV, Payback e análise de cohort dependem de dados
                por cliente do CRM/Notion. Exibidos após ingestion real.
              </p>
            </div>
          </div>
        </div>

        {/* ── Removed data notice ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-3">
          <Info size={14} className="text-gray-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <strong>Dados removidos:</strong> cohorts por trimestre (Q1/2023–Q1/2025),
            decomposição mensal de New MRR / Churned MRR, CAC R$48K, LTV R$1.579M,
            Payback 3.8m, Magic Number e Rule of 40 eram <strong>criações fictícias</strong>{" "}
            sem origem em pipeline de vendas, CRM ou extrato bancário.
          </p>
        </div>

      </div>
    </>
  );
}
