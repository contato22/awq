import Header from "@/components/Header";
import {
  TrendingUp,
  BarChart3,
  Target,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import {
  operatingBus,
  consolidated,
  revenueForecasts,
} from "@/lib/awq-group-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Forecast accuracy ────────────────────────────────────────────────────────

const accuracyHistory = [
  { month: "Jan/26", forecast: 2_580_000, actual: 2_640_000, error: 2.3  },
  { month: "Fev/26", forecast: 2_900_000, actual: 2_838_000, error: -2.1 },
  { month: "Mar/26", forecast: 3_280_000, actual: 3_332_000, error: 1.6  },
];

const avgError = accuracyHistory.reduce((s, r) => s + Math.abs(r.error), 0) / accuracyHistory.length;
const avgAccuracy = 100 - avgError;

// ─── Full-year forecast ───────────────────────────────────────────────────────

const fullYearBase = revenueForecasts.reduce((s, r) => s + r.base, 0);
const fullYearBull = revenueForecasts.reduce((s, r) => s + r.bull, 0);
const fullYearBear = revenueForecasts.reduce((s, r) => s + r.bear, 0);

// ─── BU-level forecasts ────────────────────────────────────────────────────────

const buForecasts = [
  {
    bu: "JACQES",       color: "bg-brand-500",   accent: "text-brand-600",
    ytd: 4_820_000,  fullYearBase: 19_800_000, fullYearBull: 21_780_000, fullYearBear: 16_830_000, growth: 12.4,
  },
  {
    bu: "Caza Vision",  color: "bg-emerald-500", accent: "text-emerald-600",
    ytd: 2_418_000,  fullYearBase: 12_100_000, fullYearBull: 13_310_000, fullYearBear: 9_680_000,  growth: 28.3,
  },
  {
    bu: "Advisor",      color: "bg-violet-500",  accent: "text-violet-700",
    ytd: 1_572_000,  fullYearBase:  7_200_000, fullYearBull:  7_920_000, fullYearBear: 5_760_000,  growth: 18.6,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqForecastPage() {
  const actualMonths = revenueForecasts.filter((r) => r.actual !== undefined);
  const forecastMonths = revenueForecasts.filter((r) => r.actual === undefined);

  return (
    <>
      <Header
        title="Forecast — AWQ Group"
        subtitle="Receita · Cenários base / bull / bear · Forecast Accuracy · 2026"
      />
      <div className="page-content">

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: "Forecast Receita 2026 (Base)",
              value: fmtR(fullYearBase),
              sub:   "Cenário base",
              delta: `+${((fullYearBase / (consolidated.revenue * 4) - 1) * 100).toFixed(0)}% vs ritmo atual`,
              icon:  Target,
              color: "text-brand-600",
              bg:    "bg-brand-50",
            },
            {
              label: "Cenário Bull 2026",
              value: fmtR(fullYearBull),
              sub:   "+10% sobre base",
              delta: `${fmtR(fullYearBull - fullYearBase)} adicional`,
              icon:  TrendingUp,
              color: "text-emerald-600",
              bg:    "bg-emerald-50",
            },
            {
              label: "Cenário Bear 2026",
              value: fmtR(fullYearBear),
              sub:   "-20% sobre base",
              delta: `Downside: ${fmtR(fullYearBase - fullYearBear)}`,
              icon:  BarChart3,
              color: "text-red-600",
              bg:    "bg-red-50",
            },
            {
              label: "Forecast Accuracy",
              value: `${avgAccuracy.toFixed(1)}%`,
              sub:   "Média últimos 3m",
              delta: `Erro médio: ±${avgError.toFixed(1)}%`,
              icon:  CheckCircle2,
              color: "text-amber-700",
              bg:    "bg-amber-50",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight size={11} className="text-emerald-600" />
                    <span className="text-[10px] font-semibold text-emerald-600">{card.delta}</span>
                    <span className="text-[10px] text-gray-400">{card.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Monthly Forecast Table ────────────────────────────────────────── */}
          <div className="xl:col-span-2 card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Receita Mensal — Realizado + Forecast 2026</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Base</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-emerald-600">Bull</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-red-600">Bear</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-900">Realizado</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueForecasts.map((row) => {
                    const isActual   = row.actual !== undefined;
                    const maxBarVal  = Math.max(...revenueForecasts.map((r) => r.bull));
                    const barWidth   = ((row.actual ?? row.base) / maxBarVal) * 100;
                    return (
                      <tr key={row.month} className={`border-b border-gray-100 hover:bg-gray-100 transition-colors ${!isActual ? "opacity-75" : ""}`}>
                        <td className="py-2.5 px-3 text-xs font-medium text-gray-400">{row.month}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-400">{fmtR(row.base)}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-emerald-600">{fmtR(row.bull)}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-red-600">{fmtR(row.bear)}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">
                          {isActual ? fmtR(row.actual!) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {isActual
                            ? <span className="badge badge-green">Realizado</span>
                            : <span className="badge">Forecast</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2.5 px-3 text-xs font-bold text-gray-400">2026 TOTAL</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(fullYearBase)}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{fmtR(fullYearBull)}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-red-600">{fmtR(fullYearBear)}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-brand-600">{fmtR(consolidated.revenue)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Accuracy + BU Forecasts ───────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Forecast Accuracy</h2>
              <div className="space-y-3">
                {accuracyHistory.map((row) => {
                  const acc  = 100 - Math.abs(row.error);
                  const isPos = row.error >= 0;
                  return (
                    <div key={row.month}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">{row.month}</span>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-gray-500">Forecast: {fmtR(row.forecast)}</span>
                          <span className={`font-bold ${isPos ? "text-emerald-600" : "text-red-600"}`}>
                            {row.error >= 0 ? "+" : ""}{row.error}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${acc}%` }} />
                      </div>
                      <div className="text-[10px] text-gray-400 text-right mt-0.5">{acc.toFixed(1)}% accuracy</div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Média</span>
                  <span className="text-xs font-bold text-brand-600">{avgAccuracy.toFixed(1)}% accuracy</span>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Forecast por BU — Full Year 2026</h2>
              <div className="space-y-3">
                {buForecasts.map((bu) => (
                  <div key={bu.bu} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                        <span className={`text-xs font-semibold ${bu.accent}`}>{bu.bu}</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold">+{bu.growth}% vs 2025</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div>
                        <div className="text-xs font-bold text-emerald-600">{fmtR(bu.fullYearBull)}</div>
                        <div className="text-[9px] text-gray-400">Bull</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">{fmtR(bu.fullYearBase)}</div>
                        <div className="text-[9px] text-gray-400">Base</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-red-600">{fmtR(bu.fullYearBear)}</div>
                        <div className="text-[9px] text-gray-400">Bear</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
