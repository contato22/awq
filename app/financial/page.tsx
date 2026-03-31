import type { Metadata } from "next";
import Header from "@/components/Header";
import { revenueData, channelData } from "@/lib/data";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Target,
  AlertTriangle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Financial — AWQ Group",
  description: "Receita, margem e canais de aquisição do AWQ Group.",
};

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Budget vs Actual ─────────────────────────────────────────────────────────

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
  { bu: "JACQES",     receita: 4_821_500, ebitda: 867_000,  margem: 18.0, roic: 21.6, status: "ativa" },
  { bu: "Caza Vision",receita: 2_418_000, ebitda: 653_000,  margem: 27.0, roic: 35.0, status: "ativa" },
  { bu: "Advisor",    receita: 1_572_000, ebitda: 723_000,  margem: 46.0, roic: 59.9, status: "ativa" },
  { bu: "AWQ Venture",receita: 0,         ebitda: 0,        margem:  0,   roic: 137.3,status: "investimento" },
];

// ─── Alertas financeiros ──────────────────────────────────────────────────────

const alertasFinanceiros = [
  { tipo: "warning", titulo: "Concentração de Receita", detalhe: "JACQES representa 55% da receita operacional do grupo", bu: "Grupo" },
  { tipo: "success", titulo: "Budget Superado",          detalhe: "Receita YTD 8.4% acima do budget consolidado",            bu: "Grupo" },
  { tipo: "info",    titulo: "Receivables em Aberto",    detalhe: "Caza Vision: R$465K em aberto (8+ dias)",                 bu: "Caza Vision" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinancialPage() {
  const ytdReceita  = revenueData.reduce((s, d) => s + d.revenue,   0);
  const ytdLucro    = revenueData.reduce((s, d) => s + d.profit,    0);
  const ytdBudget   = budgetData.reduce((s, d)  => s + d.budget,    0);
  const ebitdaTotal = ebitdaPorBU.reduce((s, b) => s + b.ebitda,    0);
  const receitaTotal = ebitdaPorBU.reduce((s, b) => s + b.receita,  0);
  const margemMedia = ytdReceita > 0 ? ((ytdLucro / ytdReceita) * 100).toFixed(1) : "0.0";
  const variacaoBudget   = ytdBudget > 0 ? (((ytdReceita - ytdBudget) / ytdBudget) * 100).toFixed(1) : "0.0";
  const variacaoAbsoluta = ytdReceita - ytdBudget;

  const summaryCards = [
    {
      label: "Receita Total (YTD)",
      value: fmt(ytdReceita),
      sub:   "+8.4% vs budget",
      icon:  DollarSign,
      color: "text-emerald-400",
      bg:    "bg-emerald-400/10",
    },
    {
      label: "EBITDA Consolidado",
      value: fmt(ebitdaTotal),
      sub:   `Margem ${margemMedia}%`,
      icon:  TrendingUp,
      color: "text-violet-400",
      bg:    "bg-violet-400/10",
    },
    {
      label: "Lucro Acumulado",
      value: fmt(ytdLucro),
      sub:   `Margem ${margemMedia}%`,
      icon:  BarChart3,
      color: "text-cyan-400",
      bg:    "bg-cyan-400/10",
    },
    {
      label: "Budget vs Actual",
      value: `+${variacaoBudget}%`,
      sub:   `${fmt(variacaoAbsoluta)} acima do orçamento`,
      icon:  Target,
      color: "text-amber-400",
      bg:    "bg-amber-400/10",
    },
  ];

  return (
    <>
      <Header
        title="Financial — AWQ Group"
        subtitle="Receita, margem e Budget vs Actual consolidado"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-white">{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="text-[10px] text-emerald-400 mt-1">{card.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Alertas Financeiros ────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Alertas Financeiros</h3>
            <span className="ml-auto badge badge-yellow">{alertasFinanceiros.length} ativos</span>
          </div>
          <div className="space-y-2">
            {alertasFinanceiros.map((a, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  a.tipo === "warning" ? "bg-amber-500/8 border border-amber-500/20" :
                  a.tipo === "success" ? "bg-emerald-500/8 border border-emerald-500/20" :
                  "bg-cyan-500/8 border border-cyan-500/20"
                }`}
              >
                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                  a.tipo === "warning" ? "bg-amber-400" :
                  a.tipo === "success" ? "bg-emerald-400" : "bg-cyan-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{a.titulo}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{a.detalhe}</p>
                </div>
                <span className="text-[10px] text-gray-600 shrink-0">{a.bu}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Ranking BUs por Receita & EBITDA ──────────────────────────────── */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Ranking de BUs — Receita & EBITDA</h3>
          <div className="space-y-4">
            {ebitdaPorBU
              .filter((b) => b.receita > 0)
              .map((bu, i) => {
                const pct = receitaTotal > 0 ? (bu.receita / receitaTotal) * 100 : 0;
                return (
                  <div key={bu.bu}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-600">#{i + 1}</span>
                        <span className="text-sm font-medium text-white">{bu.bu}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          bu.status === "ativa" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-500"
                        }`}>{bu.status}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-500">Receita: <span className="text-white font-semibold">{fmt(bu.receita)}</span></span>
                        <span className="text-gray-500">EBITDA: <span className="text-emerald-400 font-semibold">{bu.margem.toFixed(1)}%</span></span>
                        <span className="text-gray-500">ROIC: <span className="text-violet-400 font-semibold">{bu.roic > 0 ? bu.roic.toFixed(1) + "%" : "—"}</span></span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-right text-[10px] text-gray-600 mt-0.5">{pct.toFixed(1)}% da receita do grupo</p>
                  </div>
                );
              })}
          </div>
        </div>

        {/* ── Budget vs Actual ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Budget vs Actual — AWQ Group (Anual)</h3>
            <div className="flex gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-500 inline-block" /> Realizado</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600 inline-block" /> Budget</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Forecast</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500">
                  <th className="py-2 text-left font-semibold">Mês</th>
                  <th className="py-2 text-right font-semibold">Realizado</th>
                  <th className="py-2 text-right font-semibold">Budget</th>
                  <th className="py-2 text-right font-semibold">Forecast</th>
                  <th className="py-2 text-right font-semibold">Δ Budget</th>
                  <th className="py-2 text-right font-semibold">Δ%</th>
                </tr>
              </thead>
              <tbody>
                {budgetData.map((row) => {
                  const delta    = row.realizado - row.budget;
                  const deltaPct = ((delta / row.budget) * 100).toFixed(1);
                  const positivo = delta >= 0;
                  return (
                    <tr key={row.mes} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-2 font-medium text-gray-300">{row.mes}</td>
                      <td className="py-2 text-right text-white font-semibold">{fmt(row.realizado)}</td>
                      <td className="py-2 text-right text-gray-500">{fmt(row.budget)}</td>
                      <td className="py-2 text-right text-amber-400">{fmt(row.forecast)}</td>
                      <td className={`py-2 text-right font-semibold ${positivo ? "text-emerald-400" : "text-red-400"}`}>
                        {positivo ? "+" : ""}{fmt(Math.abs(delta))}
                      </td>
                      <td className={`py-2 text-right font-bold ${positivo ? "text-emerald-400" : "text-red-400"}`}>
                        {positivo ? "+" : ""}{deltaPct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700 font-semibold">
                  <td className="py-2 text-gray-300">YTD Total</td>
                  <td className="py-2 text-right text-white">{fmt(ytdReceita)}</td>
                  <td className="py-2 text-right text-gray-500">{fmt(ytdBudget)}</td>
                  <td className="py-2 text-right text-amber-400">—</td>
                  <td className="py-2 text-right text-emerald-400">+{fmt(variacaoAbsoluta)}</td>
                  <td className="py-2 text-right text-emerald-400">+{variacaoBudget}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Evolução Mensal ────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Evolução de Receita Mensal</h3>
            <span className="text-[11px] text-gray-500">Receita · Despesas · Lucro · Margem</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="py-2 font-semibold">Mês</th>
                  <th className="py-2 text-right font-semibold">Receita</th>
                  <th className="py-2 text-right font-semibold">Despesas</th>
                  <th className="py-2 text-right font-semibold">Lucro</th>
                  <th className="py-2 text-right font-semibold">Margem</th>
                  <th className="py-2 text-right font-semibold">vs Budget</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.map((row, idx) => {
                  const margem    = row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : "0.0";
                  const margemNum = parseFloat(margem);
                  const budgetRow = budgetData[idx];
                  const delta     = budgetRow
                    ? (((row.revenue - budgetRow.budget) / budgetRow.budget) * 100).toFixed(1)
                    : null;
                  return (
                    <tr key={row.month} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-2 font-medium text-gray-300">{row.month}</td>
                      <td className="py-2 text-right text-white font-semibold">{fmt(row.revenue)}</td>
                      <td className="py-2 text-right text-red-400">{fmt(row.expenses)}</td>
                      <td className="py-2 text-right text-emerald-400 font-semibold">{fmt(row.profit)}</td>
                      <td className="py-2 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          margemNum >= 65 ? "bg-emerald-500/15 text-emerald-400" :
                          margemNum >= 60 ? "bg-amber-500/15 text-amber-400" :
                          "bg-red-500/15 text-red-400"
                        }`}>{margem}%</span>
                      </td>
                      <td className={`py-2 text-right text-xs font-semibold ${
                        delta && parseFloat(delta) >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {delta ? (parseFloat(delta) >= 0 ? "+" : "") + delta + "%" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Canais de Aquisição ────────────────────────────────────────────── */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Canais de Aquisição</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="py-2 font-semibold">Canal</th>
                  <th className="py-2 text-right font-semibold">Sessões</th>
                  <th className="py-2 text-right font-semibold">Conversões</th>
                  <th className="py-2 text-right font-semibold">Receita</th>
                  <th className="py-2 text-right font-semibold">CAC</th>
                  <th className="py-2 text-right font-semibold">Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {channelData.map((row) => {
                  const convRate = row.sessions > 0
                    ? ((row.conversions / row.sessions) * 100).toFixed(2)
                    : "0.00";
                  return (
                    <tr key={row.channel} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-2 font-medium text-gray-300">{row.channel}</td>
                      <td className="py-2 text-right text-gray-400">{row.sessions.toLocaleString()}</td>
                      <td className="py-2 text-right text-cyan-400">{row.conversions.toLocaleString()}</td>
                      <td className="py-2 text-right text-white font-semibold">{fmt(row.revenue)}</td>
                      <td className="py-2 text-right">
                        <span className={row.cac === 0 ? "text-emerald-400 font-semibold" : "text-gray-400"}>
                          {row.cac === 0 ? "Orgânico" : "R$" + row.cac}
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-400">{convRate}%</td>
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
