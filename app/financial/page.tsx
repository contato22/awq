import type { Metadata } from "next";
import Header from "@/components/Header";
import { revenueData, channelData } from "@/lib/data";
import { DollarSign, TrendingUp, BarChart3, Target, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Financial — AWQ Group",
  description: "Receita, margem e canais de aquisição do AWQ Group.",
};

function fmt(n: number) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n;
}

function fmtBRL(n: number) {
  if (n >= 1_000_000) return "R$ " + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$ " + (n / 1_000).toFixed(1) + "k";
  return "R$ " + n;
}

// ─── Budget vs Actual data (AWQ Group consolidado) ───────────────────────────
const budgetData: { mes: string; realizado: number; budget: number; forecast: number }[] = [];

// ─── EBITDA por BU ────────────────────────────────────────────────────────────
const ebitdaPorBU: { bu: string; receita: number; ebitda: number; margem: number; caixa: number; roic: number; status: string }[] = [];

// ─── Alertas financeiros ──────────────────────────────────────────────────────
const alertasFinanceiros: { tipo: string; titulo: string; detalhe: string; bu: string }[] = [];

export default function FinancialPage() {
  const ytdReceita = revenueData.reduce((s, d) => s + d.revenue, 0);
  const ytdLucro = revenueData.reduce((s, d) => s + d.profit, 0);
  const margemMedia = ytdReceita > 0 ? ((ytdLucro / ytdReceita) * 100).toFixed(1) : "0.0";
  const ebitdaTotal = ebitdaPorBU.reduce((s, b) => s + b.ebitda, 0);
  const caixaTotal = ebitdaPorBU.reduce((s, b) => s + b.caixa, 0);
  const receitaTotal = ebitdaPorBU.reduce((s, b) => s + b.receita, 0);

  const ytdBudget = budgetData.reduce((s, d) => s + d.budget, 0);
  const variacaoBudget = ytdBudget > 0 ? (((ytdReceita - ytdBudget) / ytdBudget) * 100).toFixed(1) : "0.0";
  const variacaoAbsoluta = ytdReceita - ytdBudget;

  const summaryCards = [
    {
      label: "Receita Total (Ano)",
      value: fmt(ytdReceita),
      sub: "+14.7% YTD Março 2026",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-400/10",
    },
    {
      label: "EBITDA Consolidado",
      value: fmt(ebitdaTotal),
      sub: `Margem ${margemMedia}%`,
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      label: "Caixa Total do Grupo",
      value: fmtBRL(caixaTotal),
      sub: "Todas as BUs ativas",
      icon: BarChart3,
      color: "text-cyan-700",
      bg: "bg-cyan-400/10",
    },
    {
      label: "Budget vs Actual",
      value: `+${variacaoBudget}%`,
      sub: `${fmt(variacaoAbsoluta)} acima do orçamento`,
      icon: Target,
      color: "text-amber-700",
      bg: "bg-amber-400/10",
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header
        title="Financial"
        subtitle="Receita, margem e canais de aquisição - AWQ Group"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`rounded-xl p-2 ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="mt-1 text-sm text-gray-500">{card.label}</p>
              <p className="mt-0.5 text-xs text-emerald-600">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Alertas Financeiros */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <h3 className="text-sm font-semibold text-gray-900">Alertas Financeiros</h3>
          <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-xs text-amber-700">
            {alertasFinanceiros.length} ativos
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {alertasFinanceiros.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Sem alertas registrados</p>
          )}
          {alertasFinanceiros.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-xl p-3 ${
                a.tipo === "warning"
                  ? "bg-amber-400/8 border border-amber-400/20"
                  : a.tipo === "success"
                  ? "bg-emerald-400/8 border border-emerald-400/20"
                  : "bg-cyan-400/8 border border-cyan-400/20"
              }`}
            >
              <div
                className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                  a.tipo === "warning"
                    ? "bg-amber-400"
                    : a.tipo === "success"
                    ? "bg-emerald-400"
                    : "bg-cyan-400"
                }`}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{a.titulo}</p>
                <p className="text-xs text-gray-500">{a.detalhe}</p>
              </div>
              <span className="ml-auto text-xs text-gray-400">{a.bu}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking de BUs por EBITDA */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Ranking de BUs — Receita & EBITDA</h3>
        <div className="flex flex-col gap-3">
          {ebitdaPorBU.filter((b) => b.receita > 0).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Sem dados disponíveis</p>
          )}
          {ebitdaPorBU
            .filter((b) => b.receita > 0)
            .map((bu, i) => {
              const pct = (bu.receita / receitaTotal) * 100;
              return (
                <div key={bu.bu} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">#{i + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{bu.bu}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          bu.status === "ativa"
                            ? "bg-emerald-400/20 text-emerald-600"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {bu.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-500">
                        Receita: <span className="text-gray-900">{fmt(bu.receita)}</span>
                      </span>
                      <span className="text-gray-500">
                        EBITDA: <span className="text-emerald-600">{bu.margem.toFixed(1)}%</span>
                      </span>
                      <span className="text-gray-500">
                        ROIC: <span className="text-purple-400">{bu.roic > 0 ? bu.roic.toFixed(1) + "%" : "—"}</span>
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-50">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-gray-400">{pct.toFixed(1)}% da receita do grupo</p>
                </div>
              );
            })}
        </div>
      </div>

      {/* Budget vs Actual */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Budget vs Actual — AWQ Group (YTD 2026)</h3>
          <div className="flex gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-400" /> Realizado
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <span className="h-2 w-2 rounded-full bg-white/30" /> Budget
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Forecast
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="py-2 text-left font-medium">Mês</th>
                <th className="py-2 text-right font-medium">Realizado</th>
                <th className="py-2 text-right font-medium">Budget</th>
                <th className="py-2 text-right font-medium">Forecast</th>
                <th className="py-2 text-right font-medium">Δ Budget</th>
                <th className="py-2 text-right font-medium">Δ%</th>
              </tr>
            </thead>
            <tbody>
              {budgetData.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">Sem dados disponíveis</td></tr>
              )}
              {budgetData.map((row) => {
                const delta = row.realizado - row.budget;
                const deltaPct = ((delta / row.budget) * 100).toFixed(1);
                const positivo = delta >= 0;
                return (
                  <tr key={row.mes} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-900">{row.mes}</td>
                    <td className="py-2 text-right text-gray-900">{fmt(row.realizado)}</td>
                    <td className="py-2 text-right text-gray-500">{fmt(row.budget)}</td>
                    <td className="py-2 text-right text-amber-700">{fmt(row.forecast)}</td>
                    <td className={`py-2 text-right font-medium ${positivo ? "text-emerald-600" : "text-red-600"}`}>
                      {positivo ? "+" : ""}{fmt(Math.abs(delta))}
                    </td>
                    <td className={`py-2 text-right font-semibold ${positivo ? "text-emerald-600" : "text-red-600"}`}>
                      {positivo ? "+" : ""}{deltaPct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-semibold">
                <td className="py-2 text-gray-900">YTD Total</td>
                <td className="py-2 text-right text-gray-900">{fmt(ytdReceita)}</td>
                <td className="py-2 text-right text-gray-500">{fmt(ytdBudget)}</td>
                <td className="py-2 text-right text-amber-700">—</td>
                <td className="py-2 text-right text-emerald-600">+{fmt(variacaoAbsoluta)}</td>
                <td className="py-2 text-right text-emerald-600">+{variacaoBudget}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Evolução de Receita Mensal */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Evolução de Receita Mensal</h3>
          <span className="text-xs text-gray-400">Receita · Despesas · Lucro · Margem</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="py-2 font-medium">Mês</th>
                <th className="py-2 text-right font-medium">Receita</th>
                <th className="py-2 text-right font-medium">Despesas</th>
                <th className="py-2 text-right font-medium">Lucro</th>
                <th className="py-2 text-right font-medium">Margem</th>
                <th className="py-2 text-right font-medium">vs Budget</th>
              </tr>
            </thead>
            <tbody>
              {revenueData.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">Sem dados disponíveis</td></tr>
              )}
              {revenueData.map((row, idx) => {
                const margem = ((row.profit / row.revenue) * 100).toFixed(1);
                const margemNum = parseFloat(margem);
                const budgetRow = budgetData[idx];
                const delta = budgetRow
                  ? ((row.revenue - budgetRow.budget) / budgetRow.budget * 100).toFixed(1)
                  : null;
                return (
                  <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-900">{row.month}</td>
                    <td className="py-2 text-right text-gray-900">{fmt(row.revenue)}</td>
                    <td className="py-2 text-right text-red-600">{fmt(row.expenses)}</td>
                    <td className="py-2 text-right text-emerald-600">{fmt(row.profit)}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          margemNum >= 65
                            ? "bg-emerald-400/20 text-emerald-600"
                            : margemNum >= 60
                            ? "bg-amber-400/20 text-amber-700"
                            : "bg-red-400/20 text-red-600"
                        }`}
                      >
                        {margem}%
                      </span>
                    </td>
                    <td
                      className={`py-2 text-right text-xs font-medium ${
                        delta && parseFloat(delta) >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {delta ? (parseFloat(delta) >= 0 ? "+" : "") + delta + "%" : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Canais de Aquisição */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Canais de Aquisição</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="py-2 font-medium">Canal</th>
                <th className="py-2 text-right font-medium">Sessões</th>
                <th className="py-2 text-right font-medium">Conversões</th>
                <th className="py-2 text-right font-medium">Receita</th>
                <th className="py-2 text-right font-medium">CAC</th>
                <th className="py-2 text-right font-medium">Conv. Rate</th>
              </tr>
            </thead>
            <tbody>
              {channelData.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">Sem dados disponíveis</td></tr>
              )}
              {channelData.map((row) => {
                const convRate = ((row.conversions / row.sessions) * 100).toFixed(2);
                return (
                  <tr key={row.channel} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-900">{row.channel}</td>
                    <td className="py-2 text-right text-gray-900/60">{row.sessions.toLocaleString()}</td>
                    <td className="py-2 text-right text-cyan-700">{row.conversions.toLocaleString()}</td>
                    <td className="py-2 text-right text-gray-900">{fmt(row.revenue)}</td>
                    <td className="py-2 text-right">
                      <span className={row.cac === 0 ? "text-emerald-600" : "text-gray-900/60"}>
                        {row.cac === 0 ? "Orgânico" : "$" + row.cac}
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-500">{convRate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
