"use client";

import Header from "@/components/Header";
import Link from "next/link";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  TrendingUp,
  ShieldAlert,
  Target,
  Activity,
  Zap,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  BookOpen,
  BarChart3,
  Scale,
} from "lucide-react";
import {
  femAssets,
  frontierPoints,
  specialPoints,
  currentPortfolio,
  optimalPortfolio,
  minVariancePortfolio,
  femKpis,
  femInsights,
  correlationMatrix,
} from "@/lib/fem-data";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(n: number, d = 1) {
  return n.toFixed(d) + "%";
}

// ─── Custom Tooltip for Scatter ──────────────────────────────────────────────

function FrontierTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xl text-xs">
      {data.label && (
        <div className="font-bold text-gray-900 mb-1">{data.label}</div>
      )}
      <div className="flex items-center gap-3">
        <span className="text-gray-500">
          Risco: <span className="font-semibold text-gray-900">{pct(data.risk)}</span>
        </span>
        <span className="text-gray-500">
          Retorno: <span className="font-semibold text-gray-900">{pct(data.return)}</span>
        </span>
      </div>
      {data.label && data.type === "asset" && (
        <div className="text-[10px] text-gray-400 mt-1">Ativo isolado</div>
      )}
    </div>
  );
}

// ─── Insight type config ─────────────────────────────────────────────────────

const insightConfig = {
  warning: {
    color: "text-amber-700",
    bg: "bg-amber-50 border border-amber-200",
    dot: "bg-amber-500",
  },
  opportunity: {
    color: "text-emerald-700",
    bg: "bg-emerald-50 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  info: {
    color: "text-brand-700",
    bg: "bg-brand-50 border border-brand-200",
    dot: "bg-brand-500",
  },
};

// ─── Correlation color ───────────────────────────────────────────────────────

function corrColor(v: number): string {
  if (v >= 1.0) return "bg-brand-600 text-white";
  if (v >= 0.5) return "bg-red-200 text-red-900";
  if (v >= 0.3) return "bg-amber-100 text-amber-900";
  if (v >= 0.15) return "bg-emerald-100 text-emerald-900";
  return "bg-gray-100 text-gray-600";
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FemPage() {
  const bestAsset = femKpis.bestRiskReturn;

  // Allocation comparison data
  const allocationData = femAssets.map((a) => ({
    name: a.name,
    atual: a.currentWeight,
    otimo: a.optimalWeight,
    diff: a.optimalWeight - a.currentWeight,
    color: a.color,
    accentColor: a.accentColor,
  }));

  return (
    <>
      <Header
        title="FEM — Fronteira de Eficiência"
        subtitle="AWQ Group · Alocação estratégica risco-retorno · Markowitz Adaptado"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Header badges ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="badge bg-brand-100 text-brand-700 border border-brand-200">
            <Activity size={10} className="mr-1" /> {femAssets.length} Ativos Estratégicos
          </span>
          <span className="badge bg-emerald-100 text-emerald-700 border border-emerald-200">
            <Target size={10} className="mr-1" /> Melhor Sharpe: {bestAsset.name}
          </span>
          <span className="badge bg-amber-100 text-amber-700 border border-amber-200">
            <ShieldAlert size={10} className="mr-1" /> Selic Proxy: {pct(femKpis.riskFreeRate)}
          </span>
          <span className="badge bg-violet-100 text-violet-700 border border-violet-200">
            <Scale size={10} className="mr-1" /> Eficiência: {(femKpis.efficiencyIndex * 100).toFixed(0)}%
          </span>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
          {[
            {
              label: "Retorno Esperado",
              value: pct(femKpis.currentReturn),
              sub: "Portfolio atual",
              icon: TrendingUp,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "Risco (Vol.)",
              value: pct(femKpis.currentRisk),
              sub: "Portfolio atual",
              icon: ShieldAlert,
              color: "text-red-600",
              bg: "bg-red-50",
            },
            {
              label: "Sharpe Ratio",
              value: femKpis.currentSharpe.toFixed(2) + "x",
              sub: "Atual vs Selic",
              icon: BarChart3,
              color: "text-brand-600",
              bg: "bg-brand-50",
            },
            {
              label: "Retorno Ótimo",
              value: pct(femKpis.optimalReturn),
              sub: "Portfolio ótimo",
              icon: Target,
              color: "text-violet-700",
              bg: "bg-violet-50",
            },
            {
              label: "Risco Ótimo",
              value: pct(femKpis.optimalRisk),
              sub: "Portfolio ótimo",
              icon: Activity,
              color: "text-amber-700",
              bg: "bg-amber-50",
            },
            {
              label: "Sharpe Ótimo",
              value: femKpis.optimalSharpe.toFixed(2) + "x",
              sub: "Ótimo vs Selic",
              icon: Zap,
              color: "text-cyan-700",
              bg: "bg-cyan-50",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-[11px] font-medium text-gray-400 mt-0.5 leading-tight">{card.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{card.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Main Frontier Chart ────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-brand-600" />
              <h2 className="text-sm font-semibold text-gray-900">Fronteira de Eficiência — AWQ Group</h2>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-brand-400 inline-block" /> Fronteira
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Atual
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Ótimo
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Min. Var.
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Ativos
              </span>
            </div>
          </div>

          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 40, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="risk"
                  type="number"
                  name="Risco"
                  unit="%"
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  label={{
                    value: "Risco (Volatilidade %)",
                    position: "insideBottom",
                    offset: -10,
                    style: { fontSize: 11, fill: "#6b7280", fontWeight: 600 },
                  }}
                />
                <YAxis
                  dataKey="return"
                  type="number"
                  name="Retorno"
                  unit="%"
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  label={{
                    value: "Retorno Esperado (%)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    style: { fontSize: 11, fill: "#6b7280", fontWeight: 600 },
                  }}
                />
                <Tooltip content={<FrontierTooltip />} />

                {/* Frontier cloud */}
                <Scatter
                  name="Fronteira"
                  data={frontierPoints}
                  fill="#818cf8"
                  fillOpacity={0.35}
                  r={3}
                />

                {/* Current portfolio */}
                <Scatter
                  name="Atual"
                  data={specialPoints.filter((p) => p.type === "current")}
                  fill="#ef4444"
                  shape="square"
                  r={7}
                />

                {/* Optimal portfolio */}
                <Scatter
                  name="Otimo"
                  data={specialPoints.filter((p) => p.type === "optimal")}
                  fill="#10b981"
                  shape="diamond"
                  r={7}
                />

                {/* Min variance */}
                <Scatter
                  name="Min. Variancia"
                  data={specialPoints.filter((p) => p.type === "minVar")}
                  fill="#f59e0b"
                  shape="triangle"
                  r={6}
                />

                {/* Individual assets */}
                <Scatter
                  name="Ativos"
                  data={specialPoints.filter((p) => p.type === "asset")}
                  fill="#6b7280"
                  fillOpacity={0.7}
                  r={5}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Chart annotation */}
          <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-sm shrink-0" />
              <div>
                <span className="text-gray-500">Atual:</span>{" "}
                <span className="font-semibold text-gray-900">
                  {pct(currentPortfolio.risk)} risco · {pct(currentPortfolio.return)} retorno
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-sm shrink-0" />
              <div>
                <span className="text-gray-500">Ótimo:</span>{" "}
                <span className="font-semibold text-gray-900">
                  {pct(optimalPortfolio.risk)} risco · {pct(optimalPortfolio.return)} retorno
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-sm shrink-0" />
              <div>
                <span className="text-gray-500">Min. Var.:</span>{" "}
                <span className="font-semibold text-gray-900">
                  {pct(minVariancePortfolio.risk)} risco · {pct(minVariancePortfolio.return)} retorno
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Portfolio Allocation Comparison ──────────────────────────────── */}
          <div className="xl:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-brand-600" />
                <h2 className="text-sm font-semibold text-gray-900">Composicao do Portfolio</h2>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-gray-400 inline-block" /> Atual
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-brand-500 inline-block" /> Otimo
                </span>
              </div>
            </div>

            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={allocationData}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    unit="%"
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(1)}%`,
                      name === "atual" ? "Atual" : "Otimo",
                    ]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="atual" name="Atual" fill="#9ca3af" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="otimo" name="Otimo" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Delta table */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                Ajuste sugerido de alocacao
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                {allocationData.map((a) => (
                  <div
                    key={a.name}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50"
                  >
                    <span className="text-xs text-gray-600 font-medium">{a.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400">{pct(a.atual, 1)}</span>
                      <ChevronRight size={8} className="text-gray-400" />
                      <span className="text-[10px] font-semibold text-gray-900">{pct(a.otimo, 1)}</span>
                      <span
                        className={`text-[10px] font-bold ${
                          a.diff > 0 ? "text-emerald-600" : a.diff < 0 ? "text-red-600" : "text-gray-400"
                        }`}
                      >
                        {a.diff > 0 ? "+" : ""}
                        {pct(a.diff, 1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Correlation Matrix ───────────────────────────────────────────── */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-violet-700" />
              <h2 className="text-sm font-semibold text-gray-900">Matriz de Correlacao</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="p-1" />
                    {femAssets.map((a) => (
                      <th
                        key={a.id}
                        className="p-1 text-[9px] font-bold text-gray-500 text-center"
                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", minWidth: 28 }}
                      >
                        {a.name.length > 8 ? a.name.substring(0, 7) + "." : a.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {femAssets.map((row, i) => (
                    <tr key={row.id}>
                      <td className="p-1 text-[9px] font-bold text-gray-500 whitespace-nowrap text-right pr-2">
                        {row.name.length > 8 ? row.name.substring(0, 7) + "." : row.name}
                      </td>
                      {femAssets.map((col, j) => {
                        const val = correlationMatrix[i][j];
                        return (
                          <td key={col.id} className="p-0.5">
                            <div
                              className={`w-7 h-7 rounded flex items-center justify-center text-[8px] font-bold ${corrColor(val)}`}
                              title={`${row.name} × ${col.name}: ${val.toFixed(2)}`}
                            >
                              {val === 1 ? "1" : val.toFixed(1).replace("0.", ".")}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-[9px] text-gray-400 mb-2 font-semibold uppercase tracking-widest">Legenda</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "< 0.15", cls: "bg-gray-100 text-gray-600" },
                  { label: "0.15–0.30", cls: "bg-emerald-100 text-emerald-900" },
                  { label: "0.30–0.50", cls: "bg-amber-100 text-amber-900" },
                  { label: "> 0.50", cls: "bg-red-200 text-red-900" },
                ].map((l) => (
                  <span
                    key={l.label}
                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${l.cls}`}
                  >
                    {l.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Key correlations */}
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
              <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-widest">Destaques</div>
              <div className="text-[10px] text-gray-500">
                <span className="font-semibold text-red-700">Alta:</span> Founder × Advisor (0.62), Founder × JACQES (0.55)
              </div>
              <div className="text-[10px] text-gray-500">
                <span className="font-semibold text-emerald-700">Baixa:</span> Enerdy × Caza (0.08), Enerdy × Advisor (0.10)
              </div>
            </div>
          </div>
        </div>

        {/* ── Executive Insights ──────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-600" />
              <h2 className="text-sm font-semibold text-gray-900">Insights Executivos</h2>
            </div>
            <span className="text-[10px] text-gray-400">{femInsights.length} insights identificados</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {femInsights.map((insight) => {
              const cfg = insightConfig[insight.type];
              return (
                <div key={insight.id} className={`flex items-start gap-3 p-3.5 rounded-lg ${cfg.bg}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0 mt-1.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold ${cfg.color}`}>{insight.title}</span>
                      {insight.metric && (
                        <span className="text-[10px] font-bold text-gray-500 shrink-0 bg-white/60 px-1.5 py-0.5 rounded">
                          {insight.metric}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                      {insight.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Asset detail table ──────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-900">Detalhe por Ativo Estrategico</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Ativo</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Categoria</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Retorno</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Volatilidade</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Sharpe</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Peso Atual</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Peso Otimo</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Delta</th>
                </tr>
              </thead>
              <tbody>
                {femAssets
                  .sort(
                    (a, b) =>
                      b.expectedReturn / b.volatility -
                      a.expectedReturn / a.volatility
                  )
                  .map((asset) => {
                    const sharpe = (asset.expectedReturn - femKpis.riskFreeRate) / asset.volatility;
                    const delta = asset.optimalWeight - asset.currentWeight;
                    return (
                      <tr
                        key={asset.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${asset.color}`} />
                            <span className="text-xs font-bold text-gray-900">{asset.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-500">{asset.category}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-emerald-600">
                          {pct(asset.expectedReturn)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-red-600">
                          {pct(asset.volatility)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right text-xs font-bold ${
                            sharpe >= 2 ? "text-emerald-600" : sharpe >= 1 ? "text-amber-700" : "text-red-600"
                          }`}
                        >
                          {sharpe.toFixed(2)}x
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-600">
                          {pct(asset.currentWeight)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">
                          {pct(asset.optimalWeight)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              delta > 0
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : delta < 0
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {delta > 0 ? "+" : ""}
                            {pct(delta)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Methodology Card ────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={14} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Metodologia — Fronteira de Markowitz Adaptada</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 text-xs text-gray-600 leading-relaxed">
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">O que e a FEM?</div>
              <p>
                A Fronteira de Eficiencia de Markowitz (FEM) e um modelo de otimizacao de portfolio que identifica
                combinacoes de ativos que maximizam o retorno esperado para cada nivel de risco. Originalmente
                criada para mercados financeiros, foi adaptada aqui ao contexto de alocacao estrategica da AWQ.
              </p>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Como interpretar?</div>
              <p>
                Cada ponto no grafico representa uma combinacao possivel de alocacao entre as BUs, deals e
                iniciativas da AWQ. Pontos mais a esquerda tem menos risco. Pontos mais acima tem mais retorno.
                O portfolio otimo (verde) oferece o melhor equilibrio risco-retorno. Se o portfolio atual
                (vermelho) esta abaixo da fronteira, ha espaco para melhorar a eficiencia.
              </p>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Limitacoes</div>
              <p>
                Este modelo e uma ferramenta de apoio a decisao, nao uma verdade absoluta. Os retornos e
                volatilidades sao estimativas baseadas em dados historicos e projecoes. Correlacoes podem mudar.
                Use os insights como ponto de partida para discussao estrategica, combinando com contexto
                qualitativo e visao do fundador.
              </p>
            </div>
          </div>
        </div>

        {/* ── Quick Nav ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: "Control Tower", sub: "Visao consolidada", href: "/awq", icon: Target, color: "text-brand-600", bg: "bg-brand-50" },
            { label: "Risk", sub: "Risk signals", href: "/awq/risk", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
            { label: "Allocations", sub: "Capital por BU", href: "/awq/allocations", icon: Scale, color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Portfolio", sub: "Visao do portfolio", href: "/awq/portfolio", icon: BarChart3, color: "text-violet-700", bg: "bg-violet-50" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} className="card p-4 flex items-center gap-3 hover:border-gray-300 transition-all group">
                <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={14} className={item.color} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900 group-hover:text-brand-500 transition-colors">{item.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{item.sub}</div>
                </div>
                <ChevronRight size={12} className="text-gray-400 group-hover:text-brand-600 ml-auto transition-colors" />
              </Link>
            );
          })}
        </div>

      </div>
    </>
  );
}
