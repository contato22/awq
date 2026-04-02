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
const budgetData = [
  { mes: "Jan", realizado: 3_210_000, budget: 2_950_000, forecast: 3_100_000 },
  { mes: "Fev", realizado: 3_480_000, budget: 3_200_000, forecast: 3_300_000 },
  { mes: "Mar", realizado: 3_650_000, budget: 3_400_000, forecast: 3_500_000 },
  { mes: "Abr", realizado: 3_520_000, budget: 3_600_000, forecast: 3_580_000 },
  { mes: "Mai", realizado: 3_900_000, budget: 3_700_000, forecast: 3_850_000 },
  { mes: "Jun", realizado: 4_120_000, budget: 3_900_000, forecast: 4_000_000 },
  { mes: "Jul", realizado: 4_250_000, budget: 4_100_000, forecast: 4_200_000 },
  { mes: "Ago", realizado: 4_380_000, budget: 4_200_000, forecast: 4_350_000 },
  { mes: "Set", realizado: 4_510_000, budget: 4_300_000, forecast: 4_480_000 },
  { mes: "Out", realizado: 4_620_000, budget: 4_500_000, forecast: 4_600_000 },
  { mes: "Nov", realizado: 4_730_000, budget: 4_600_000, forecast: 4_700_000 },
  { mes: "Dez", realizado: 4_821_500, budget: 4_800_000, forecast: 4_810_000 },
];

// ─── EBITDA por BU ────────────────────────────────────────────────────────────
const ebitdaPorBU = [
  { bu: "JACQES", receita: 4_821_500, ebitda: 3_241_500, margem: 67.2, caixa: 890_000, roic: 42.1, status: "ativa" },
  { bu: "Caza Vision", receita: 2_420_000, ebitda: 980_000, margem: 40.5, caixa: 340_000, roic: 28.3, status: "ativa" },
  { bu: "AWQ Venture", receita: 0, ebitda: 0, margem: 0, caixa: 1_200_000, roic: 0, status: "desenvolvimento" },
  { bu: "Advisor", receita: 0, ebitda: 0, margem: 0, caixa: 0, roic: 0, status: "desenvolvimento" },
];

// ─── Alertas financeiros ──────────────────────────────────────────────────────
const alertasFinanceiros = [
  { tipo: "warning", titulo: "Concentração de Receita", detalhe: "JACQES representa 66% da receita total do grupo", bu: "Grupo" },
  { tipo: "success", titulo: "Budget Superado", detalhe: "Receita YTD 14.7% acima do budget consolidado", bu: "Grupo" },
  { tipo: "info", titulo: "Caza Vision — Dados Pendentes", detalhe: "Campos financeiros de Abr/2026 em breve", bu: "Caza Vision" },
];

export default function FinancialPage() {
  const ytdReceita = revenueData.reduce((s, d) => s + d.revenue, 0);
  const ytdLucro = revenueData.reduce((s, d) => s + d.profit, 0);
  const margemMedia = ((ytdLucro / ytdReceita) * 100).toFixed(1);
  const ebitdaTotal = ebitdaPorBU.reduce((s, b) => s + b.ebitda, 0);
  const caixaTotal = ebitdaPorBU.reduce((s, b) => s + b.caixa, 0);
  const receitaTotal = ebitdaPorBU.reduce((s, b) => s + b.receita, 0);

  const ytdBudget = budgetData.reduce((s, d) => s + d.budget, 0);
  const variacaoBudget = (((ytdReceita - ytdBudget) / ytdBudget) * 100).toFixed(1);
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
                <div className="rounded-xl p-2 bg-slate-100">
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{card.value}</p>
              <p className="mt-1 text-sm text-gray-500">{card.label}</p>
              <p className="mt-0.5 text-xs text-emerald-600">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Alertas Financeiros */}
      <div className="card-elevated p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <h3 className="text-sm font-bold text-slate-800">Alertas Financeiros</h3>
          <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-xs text-amber-700">
            {alertasFinanceiros.length} ativos
          </span>
        </div>
        <div className="flex flex-col gap-2">
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
                <p className="text-sm font-medium text-slate-800">{a.titulo}</p>
                <p className="text-xs text-gray-500">{a.detalhe}</p>
              </div>
              <span className="ml-auto text-xs text-gray-500">{a.bu}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking de BUs por EBITDA */}
      <div className="card-elevated p-5">
        <h3 className="mb-4 text-sm font-bold text-slate-800">Ranking de BUs — Receita & EBITDA</h3>
        <div className="flex flex-col gap-3">
          {ebitdaPorBU
            .filter((b) => b.receita > 0)
            .map((bu, i) => {
              const pct = (bu.receita / receitaTotal) * 100;
              return (
                <div key={bu.bu} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">#{i + 1}</span>
                      <span className="text-sm font-medium text-slate-800">{bu.bu}</span>
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
                        Receita: <span className="text-emerald-600 font-bold">{fmt(bu.receita)}</span>
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
                  <p className="text-right text-xs text-gray-500">{pct.toFixed(1)}% da receita do grupo</p>
                </div>
              );
            })}
        </div>
      </div>

      {/* Budget vs Actual */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800">Budget vs Actual — AWQ Group (YTD 2026)</h3>
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
              <tr className="bg-slate-800">
                <th className="py-2 text-left font-bold text-white">Mês</th>
                <th className="py-2 text-right font-bold text-white">Realizado</th>
                <th className="py-2 text-right font-bold text-white">Budget</th>
                <th className="py-2 text-right font-bold text-white">Forecast</th>
                <th className="py-2 text-right font-bold text-white">Δ Budget</th>
                <th className="py-2 text-right font-bold text-white">Δ%</th>
              </tr>
            </thead>
            <tbody>
              {budgetData.map((row) => {
                const delta = row.realizado - row.budget;
                const deltaPct = ((delta / row.budget) * 100).toFixed(1);
                const positivo = delta >= 0;
                return (
                  <tr key={row.mes} className="border-b border-gray-100 even:bg-gray-50/60 hover:bg-gray-50">
                    <td className="py-2 font-medium text-slate-800">{row.mes}</td>
                    <td className="py-2 text-right text-emerald-600 font-bold">{fmt(row.realizado)}</td>
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
                <td className="py-2 text-slate-800">YTD Total</td>
                <td className="py-2 text-right text-emerald-600 font-bold">{fmt(ytdReceita)}</td>
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
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800">Evolução de Receita Mensal</h3>
          <span className="text-xs text-gray-500">Receita · Despesas · Lucro · Margem</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-left text-xs">
                <th className="py-2 font-bold text-white">Mês</th>
                <th className="py-2 text-right font-bold text-white">Receita</th>
                <th className="py-2 text-right font-bold text-white">Despesas</th>
                <th className="py-2 text-right font-bold text-white">Lucro</th>
                <th className="py-2 text-right font-bold text-white">Margem</th>
                <th className="py-2 text-right font-bold text-white">vs Budget</th>
              </tr>
            </thead>
            <tbody>
              {revenueData.map((row, idx) => {
                const margem = ((row.profit / row.revenue) * 100).toFixed(1);
                const margemNum = parseFloat(margem);
                const budgetRow = budgetData[idx];
                const delta = budgetRow
                  ? ((row.revenue - budgetRow.budget) / budgetRow.budget * 100).toFixed(1)
                  : null;
                return (
                  <tr key={row.month} className="border-b border-gray-100 even:bg-gray-50/60 hover:bg-gray-50">
                    <td className="py-2 font-medium text-slate-800">{row.month}</td>
                    <td className="py-2 text-right text-emerald-600 font-bold">{fmt(row.revenue)}</td>
                    <td className="py-2 text-right text-red-600">{fmt(row.expenses)}</td>
                    <td className="py-2 text-right text-emerald-600 font-bold">{fmt(row.profit)}</td>
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
      <div className="card-elevated p-5">
        <h3 className="mb-4 text-sm font-bold text-slate-800">Canais de Aquisição</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-left text-xs">
                <th className="py-2 font-bold text-white">Canal</th>
                <th className="py-2 text-right font-bold text-white">Sessões</th>
                <th className="py-2 text-right font-bold text-white">Conversões</th>
                <th className="py-2 text-right font-bold text-white">Receita</th>
                <th className="py-2 text-right font-bold text-white">CAC</th>
                <th className="py-2 text-right font-bold text-white">Conv. Rate</th>
              </tr>
            </thead>
            <tbody>
              {channelData.map((row) => {
                const convRate = ((row.conversions / row.sessions) * 100).toFixed(2);
                return (
                  <tr key={row.channel} className="border-b border-gray-100 even:bg-gray-50/60 hover:bg-gray-50">
                    <td className="py-2 font-medium text-slate-800">{row.channel}</td>
                    <td className="py-2 text-right text-slate-800/60">{row.sessions.toLocaleString()}</td>
                    <td className="py-2 text-right text-cyan-700">{row.conversions.toLocaleString()}</td>
                    <td className="py-2 text-right text-emerald-600 font-bold">{fmt(row.revenue)}</td>
                    <td className="py-2 text-right">
                      <span className={row.cac === 0 ? "text-emerald-600" : "text-slate-800/60"}>
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
