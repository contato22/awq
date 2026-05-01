// ─── /awq/epm/forecast — Cash Forecast + Driver-Based Forecasting ─────────────
//
// Two sections:
//   1. Rolling 13-week cash forecast (weekly granularity)
//   2. Driver-based forecasting (revenue drivers → P&L projection)

import Header from "@/components/Header";
import Link from "next/link";
import {
  TrendingUp, DollarSign, BarChart3, Target,
  Activity, AlertTriangle, Calculator,
} from "lucide-react";

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

// ── Rolling 13-week cash forecast ──────────────────────────────────────────────
// Base: current cash position R$412K (snapshot)
// Weekly inflows from AR pipeline; outflows from AP schedule + payroll
interface WeekForecast {
  week:            string;   // "W18", "W19" …
  start_date:      string;
  inflow:          number;
  outflow:         number;
  net:             number;
  cumulative_cash: number;
  type:            "actual" | "forecast";
}

function buildCashForecast(): WeekForecast[] {
  const startCash = 412_000;
  const weeks: Omit<WeekForecast, "net" | "cumulative_cash">[] = [
    // W18 – W20: actuals (past 3 weeks)
    { week: "W15", start_date: "2026-04-06", inflow:  68_000, outflow:  52_000, type: "actual"   },
    { week: "W16", start_date: "2026-04-13", inflow:  74_000, outflow:  61_000, type: "actual"   },
    { week: "W17", start_date: "2026-04-20", inflow:  55_000, outflow:  48_000, type: "actual"   },
    // W18–W30: forecast
    { week: "W18", start_date: "2026-04-27", inflow:  82_000, outflow:  55_000, type: "forecast" },
    { week: "W19", start_date: "2026-05-04", inflow:  65_000, outflow:  95_000, type: "forecast" }, // payroll
    { week: "W20", start_date: "2026-05-11", inflow:  90_000, outflow:  48_000, type: "forecast" },
    { week: "W21", start_date: "2026-05-18", inflow:  72_000, outflow:  52_000, type: "forecast" },
    { week: "W22", start_date: "2026-05-25", inflow: 110_000, outflow:  98_000, type: "forecast" }, // payroll
    { week: "W23", start_date: "2026-06-01", inflow:  68_000, outflow:  45_000, type: "forecast" },
    { week: "W24", start_date: "2026-06-08", inflow:  85_000, outflow:  55_000, type: "forecast" },
    { week: "W25", start_date: "2026-06-15", inflow:  75_000, outflow:  90_000, type: "forecast" }, // payroll
    { week: "W26", start_date: "2026-06-22", inflow:  95_000, outflow:  50_000, type: "forecast" },
    { week: "W27", start_date: "2026-06-29", inflow: 120_000, outflow: 100_000, type: "forecast" }, // payroll
    { week: "W28", start_date: "2026-07-06", inflow:  70_000, outflow:  48_000, type: "forecast" },
    { week: "W29", start_date: "2026-07-13", inflow:  88_000, outflow:  55_000, type: "forecast" },
    { week: "W30", start_date: "2026-07-20", inflow:  78_000, outflow:  52_000, type: "forecast" },
  ];

  let cum = startCash;
  // back-fill actuals to start
  cum = startCash - weeks.filter((w) => w.type === "actual").reduce((s, w) => s + w.inflow - w.outflow, 0);

  return weeks.map((w) => {
    const net = w.inflow - w.outflow;
    cum += net;
    return { ...w, net, cumulative_cash: cum };
  });
}

// ── Driver-based forecasting ──────────────────────────────────────────────────
interface Driver {
  label:       string;
  value:       number;
  unit:        string;
  impact_line: string;
}

interface DriverScenario {
  name:    "Bear" | "Base" | "Bull";
  color:   string;
  bg:      string;
  drivers: Driver[];
  projectedRevenue:  number;
  projectedEBITDA:   number;
  projectedCash:     number;
}

const DRIVER_SCENARIOS: DriverScenario[] = [
  {
    name: "Bear",
    color: "text-red-700",
    bg:    "bg-red-50",
    drivers: [
      { label: "Novos contratos JACQES",  value: 1,    unit: "contratos",   impact_line: "Receita" },
      { label: "Ticket médio JACQES",     value: 28_000, unit: "R$/mês",    impact_line: "MRR"     },
      { label: "Churn rate",              value: 8,    unit: "%/ano",        impact_line: "Receita" },
      { label: "Headcount adicional",     value: 0,    unit: "FTEs",        impact_line: "OPEX"    },
      { label: "COGS % da Receita",       value: 55,   unit: "%",           impact_line: "Margem"  },
    ],
    projectedRevenue: 3_600_000,
    projectedEBITDA:  180_000,
    projectedCash:    220_000,
  },
  {
    name: "Base",
    color: "text-brand-700",
    bg:    "bg-brand-50",
    drivers: [
      { label: "Novos contratos JACQES",  value: 3,    unit: "contratos",   impact_line: "Receita" },
      { label: "Ticket médio JACQES",     value: 35_000, unit: "R$/mês",    impact_line: "MRR"     },
      { label: "Churn rate",              value: 5,    unit: "%/ano",        impact_line: "Receita" },
      { label: "Headcount adicional",     value: 2,    unit: "FTEs",        impact_line: "OPEX"    },
      { label: "COGS % da Receita",       value: 45,   unit: "%",           impact_line: "Margem"  },
    ],
    projectedRevenue: 5_040_000,
    projectedEBITDA:  756_000,
    projectedCash:    412_000,
  },
  {
    name: "Bull",
    color: "text-emerald-700",
    bg:    "bg-emerald-50",
    drivers: [
      { label: "Novos contratos JACQES",  value: 6,    unit: "contratos",   impact_line: "Receita" },
      { label: "Ticket médio JACQES",     value: 45_000, unit: "R$/mês",    impact_line: "MRR"     },
      { label: "Churn rate",              value: 2,    unit: "%/ano",        impact_line: "Receita" },
      { label: "Headcount adicional",     value: 4,    unit: "FTEs",        impact_line: "OPEX"    },
      { label: "COGS % da Receita",       value: 38,   unit: "%",           impact_line: "Margem"  },
    ],
    projectedRevenue: 7_200_000,
    projectedEBITDA:  1_440_000,
    projectedCash:    890_000,
  },
];

export default function ForecastPage() {
  const cashForecast = buildCashForecast();
  const minCash      = Math.min(...cashForecast.map((w) => w.cumulative_cash));
  const maxCash      = Math.max(...cashForecast.map((w) => w.cumulative_cash));
  const endCash      = cashForecast[cashForecast.length - 1].cumulative_cash;
  const isCashRisk   = minCash < 100_000;

  // Normalize cash bar chart
  const chartMin  = Math.max(0, minCash - 50_000);
  const chartMax  = maxCash + 50_000;
  const chartRange = chartMax - chartMin;

  return (
    <>
      <Header
        title="Previsão & Forecasting"
        subtitle="EPM · Rolling 13-Week Cash Forecast · Driver-Based Scenarios"
      />
      <div className="page-container">

        {/* ── Cash forecast summary ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Caixa Atual",          value: fmtBRL(412_000),    color: "text-brand-700"   },
            { label: "Caixa Projetado (13w)", value: fmtBRL(endCash),   color: endCash > 300_000 ? "text-emerald-700" : "text-red-700" },
            { label: "Mínimo Projetado",      value: fmtBRL(minCash),   color: minCash < 150_000 ? "text-red-700" : "text-amber-700" },
            { label: "Máximo Projetado",      value: fmtBRL(maxCash),   color: "text-gray-700"    },
          ].map((card) => (
            <div key={card.label} className="card p-4">
              <div className={`text-xl font-bold tabular-nums ${card.color}`}>{card.value}</div>
              <div className="text-xs text-gray-400 mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {isCashRisk && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <AlertTriangle size={13} className="shrink-0" />
            <strong>Alerta de caixa:</strong> projeção atinge mínimo de {fmtBRL(minCash)} — abaixo do buffer mínimo recomendado de R$150K.
          </div>
        )}

        {/* ── Rolling 13-week cash chart ────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">
              Rolling 13-Week Cash Forecast
            </span>
            <span className="ml-auto text-xs text-gray-400">Base: {fmtBRL(412_000)} em 28/04/2026</span>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1 h-28 mb-2">
            {cashForecast.map((w) => {
              const barH = chartRange > 0
                ? ((w.cumulative_cash - chartMin) / chartRange) * 100
                : 50;
              const isLow = w.cumulative_cash < 150_000;
              return (
                <div key={w.week} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div
                    className={`w-full rounded-t transition-all ${
                      w.type === "actual"
                        ? "bg-brand-400"
                        : isLow
                        ? "bg-red-300"
                        : "bg-brand-200"
                    }`}
                    style={{ height: `${barH}%` }}
                    title={`${w.week}: ${fmtBRL(w.cumulative_cash)}`}
                  />
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="flex gap-1">
            {cashForecast.map((w) => (
              <div key={w.week} className="flex-1 text-center text-[9px] text-gray-400 truncate">
                {w.week}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-brand-400 inline-block" /> Realizado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-brand-200 inline-block" /> Projetado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-red-300 inline-block" /> Risco de caixa
            </span>
          </div>
        </div>

        {/* ── Weekly detail table ───────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <BarChart3 size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">Detalhe Semanal</span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Semana</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Início</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Entradas</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Saídas</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Net</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Saldo Cumulativo</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {cashForecast.map((w) => {
                  const netPos  = w.net >= 0;
                  const cashLow = w.cumulative_cash < 150_000;
                  return (
                    <tr key={w.week} className={`border-b border-gray-50 hover:bg-gray-50 ${cashLow ? "bg-red-50/50" : ""}`}>
                      <td className="py-2 px-3 font-semibold text-gray-700">{w.week}</td>
                      <td className="py-2 px-3 text-gray-500">{w.start_date}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-emerald-600 font-semibold">{fmtBRL(w.inflow)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-red-600 font-semibold">{fmtBRL(w.outflow)}</td>
                      <td className={`py-2 px-3 text-right tabular-nums font-bold ${netPos ? "text-emerald-700" : "text-red-700"}`}>
                        {netPos ? "+" : ""}{fmtBRL(w.net)}
                      </td>
                      <td className={`py-2 px-3 text-right tabular-nums font-bold ${cashLow ? "text-red-700" : "text-gray-900"}`}>
                        {fmtBRL(w.cumulative_cash)}
                        {cashLow && <AlertTriangle size={10} className="inline ml-1 text-red-500" />}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          w.type === "actual"
                            ? "bg-brand-100 text-brand-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {w.type === "actual" ? "Realizado" : "Projeção"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Driver-based forecasting ──────────────────────────────── */}
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={14} className="text-violet-600" />
            <h2 className="text-sm font-bold text-gray-900">Driver-Based Forecasting — Cenários FY2026</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {DRIVER_SCENARIOS.map((s) => (
              <div key={s.name} className={`card p-5 ${s.name === "Base" ? "ring-2 ring-brand-300" : ""}`}>
                <div className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 ${s.bg} ${s.color}`}>
                  {s.name} Case
                  {s.name === "Base" && <span className="ml-1">· Ativo</span>}
                </div>

                {/* Projected outcomes */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Receita",  value: fmtBRL(s.projectedRevenue)  },
                    { label: "EBITDA",   value: fmtBRL(s.projectedEBITDA)   },
                    { label: "Caixa YE", value: fmtBRL(s.projectedCash)     },
                  ].map((m) => (
                    <div key={m.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <div className={`text-xs font-bold tabular-nums ${s.color}`}>{m.value}</div>
                      <div className="text-[10px] text-gray-400">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Drivers */}
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    Drivers
                  </div>
                  {s.drivers.map((d) => (
                    <div key={d.label} className="flex items-center justify-between text-xs border-b border-gray-50 pb-1.5">
                      <div>
                        <div className="text-gray-700">{d.label}</div>
                        <div className="text-[10px] text-gray-400">{d.impact_line}</div>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold tabular-nums ${s.color}`}>
                          {d.unit === "R$/mês" ? fmtBRL(d.value) : d.value}
                        </span>
                        <span className="text-gray-400 ml-1">{d.unit !== "R$/mês" ? d.unit : "/mês"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sensitivity analysis ──────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-amber-600" />
            <span className="text-sm font-semibold text-gray-900">Análise de Sensibilidade — Receita vs Drivers</span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Driver</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-center">Bear</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-center bg-brand-50">Base ✓</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-center">Bull</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Impacto/Contrato</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-700">Novos contratos</td>
                  <td className="py-2 px-3 text-center text-red-600 font-bold">1</td>
                  <td className="py-2 px-3 text-center text-brand-700 font-bold bg-brand-50">3</td>
                  <td className="py-2 px-3 text-center text-emerald-700 font-bold">6</td>
                  <td className="py-2 px-3 text-right text-gray-700">~{fmtBRL(420_000)}/ano</td>
                </tr>
                <tr className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-700">Ticket médio</td>
                  <td className="py-2 px-3 text-center text-red-600 font-bold">R$28K</td>
                  <td className="py-2 px-3 text-center text-brand-700 font-bold bg-brand-50">R$35K</td>
                  <td className="py-2 px-3 text-center text-emerald-700 font-bold">R$45K</td>
                  <td className="py-2 px-3 text-right text-gray-700">+R$1K = +{fmtBRL(36_000)}/ano</td>
                </tr>
                <tr className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-700">Churn anual</td>
                  <td className="py-2 px-3 text-center text-red-600 font-bold">8%</td>
                  <td className="py-2 px-3 text-center text-brand-700 font-bold bg-brand-50">5%</td>
                  <td className="py-2 px-3 text-center text-emerald-700 font-bold">2%</td>
                  <td className="py-2 px-3 text-right text-gray-700">-1pp = +{fmtBRL(50_000)}/ano</td>
                </tr>
                <tr className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-700">COGS %</td>
                  <td className="py-2 px-3 text-center text-red-600 font-bold">55%</td>
                  <td className="py-2 px-3 text-center text-brand-700 font-bold bg-brand-50">45%</td>
                  <td className="py-2 px-3 text-center text-emerald-700 font-bold">38%</td>
                  <td className="py-2 px-3 text-right text-gray-700">-1pp = +{fmtBRL(50_400)} EBITDA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/budget" className="text-brand-600 hover:underline">Budget →</Link>
          <Link href="/awq/epm/kpis" className="text-brand-600 hover:underline">KPIs →</Link>
        </div>

      </div>
    </>
  );
}
