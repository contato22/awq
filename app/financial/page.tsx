import type { Metadata } from "next";
import Header from "@/components/Header";
import { revenueData, channelData } from "@/lib/data";
import { DollarSign, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Financial — AWQ Group",
  description: "Receita, margem e canais de aquisição do AWQ Group.",
};

function fmt(n: number) {
import type { Metadata } from "next";
  import Header from "@/components/Header";
  import { revenueData, channelData } from "@/lib/data";
  import { DollarSign, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight, Target, Zap, AlertTriangle } from "lucide-react";
  
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
      const lastMonth = revenueData[revenueData.length - 1];
      const ytdReceita = revenueData.reduce((s, d) => s + d.revenue, 0);
      const ytdLucro = revenueData.reduce((s, d) => s + d.profit, 0);
      const ytdDespesas = revenueData.reduce((s, d) => s + d.expenses, 0);
      const margemMedia = ((ytdLucro / ytdReceita) * 100).toFixed(1);
      const ebitdaTotal = ebitdaPorBU.reduce((s, b) => s + b.ebitda, 0);
      const caixaTotal = ebitdaPorBU.reduce((s, b) => s + b.caixa, 0);
      const receitaTotal = ebitdaPorBU.reduce((s, b) => s + b.receita, 0);
    
      // Budget vs Actual YTD
      const ytdBudget = budgetData.reduce((s, d) => s + d.budget, 0);
      const variacaoBudget = (((ytdReceita - ytdBudget) / ytdBudget) * 100).toFixed(1);
      const variacaoAbsoluta = ytdReceita - ytdBudget;
    
      const summaryCards = [
        {
                label: "Receita Total (Ano)",
                value: fmt(ytdReceita),
                sub: `+14.7% YTD Março 2026`,
                icon: DollarSign,
                color: "text-emerald-400",
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
                sub: `Todas as BUs ativas`,
                icon: BarChart3,
                color: "text-cyan-400",
                bg: "bg-cyan-400/10",
        },
        {
                label: "Budget vs Actual",
                value: `+${variacaoBudget}%`,
                sub: `${fmt(variacaoAbsoluta)} acima do orçamento`,
                icon: Target,
                color: "text-amber-400",
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
                                      <div key={card.label} className="rounded-2xl border border-white/5 bg-white/3 p-5">
                                                    <div className="flex items-start justify-between mb-3">
                                                                    <div className={`rounded-xl p-2 ${card.bg}`}>
                                                                                      <Icon className={`h-5 w-5 ${card.color}`} />
                                                                    </div>div>
                                                    </div>div>
                                                    <p className="text-2xl font-bold text-white">{card.value}</p>p>
                                                    <p className="mt-1 text-sm text-white/50">{card.label}</p>p>
                                                    <p className="mt-0.5 text-xs text-emerald-400">{card.sub}</p>p>
                                      </div>div>
                                    );
            })}
                  </div>div>
            
              {/* Alertas Financeiros */}
                  <div className="rounded-2xl border border-white/5 bg-white/3 p-5">
                          <div className="flex items-center gap-2 mb-4">
                                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                                    <h3 className="text-sm font-semibold text-white">Alertas Financeiros</h3>h3>
                                    <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-xs text-amber-400">{alertasFinanceiros.length} ativos</span>span>
                          </div>div>
                          <div className="flex flex-col gap-2">
                            {alertasFinanceiros.map((a, i) => (
                          <div key={i} className={`flex items-start gap-3 rounded-xl p-3 ${
                                          a.tipo === "warning" ? "bg-amber-400/8 border border-amber-400/20" :
                                          a.tipo === "success" ? "bg-emerald-400/8 border border-emerald-400/20" :
                                          "bg-cyan-400/8 border border-cyan-400/20"
                          }`}>
                                        <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                                            a.tipo === "warning" ? "bg-amber-400" :
                                            a.tipo === "success" ? "bg-emerald-400" : "bg-cyan-400"
                          }`} />
                                        <div>
                                                        <p className="text-sm font-medium text-white">{a.titulo}</p>p>
                                                        <p className="text-xs text-white/50">{a.detalhe}</p>p>
                                        </div>div>
                                        <span className="ml-auto text-xs text-white/30">{a.bu}</span>span>
                          </div>div>
                        ))}
                          </div>div>
                  </div>div>
            
              {/* Ranking de BUs por EBITDA */}
                  <div className="rounded-2xl border border-white/5 bg-white/3 p-5">
                          <h3 className="mb-4 text-sm font-semibold text-white">Ranking de BUs — Receita & EBITDA</h3>h3>
                          <div className="flex flex-col gap-3">
                            {ebitdaPorBU.filter(b => b.receita > 0).map((bu, i) => {
                          const pct = (bu.receita / receitaTotal) * 100;
                          return (
                                          <div key={bu.bu} className="flex flex-col gap-1">
                                                          <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="text-xs text-white/30">#{i + 1}</span>span>
                                                                                                <span className="text-sm font-medium text-white">{bu.bu}</span>span>
                                                                                                <span className={`rounded-full px-2 py-0.5 text-xs ${
                                                                  bu.status === "ativa" ? "bg-emerald-400/20 text-emerald-400" : "bg-white/10 text-white/40"
                                          }`}>{bu.status}</span>span>
                                                                            </div>div>
                                                                            <div className="flex items-center gap-4 text-xs">
                                                                                                <span className="text-white/50">Receita: <span className="text-white">{fmt(bu.receita)}</span>span></span>span>
                                                                                                <span className="text-white/50">EBITDA: <span className="text-emerald-400">{bu.margem.toFixed(1)}%</span>span></span>span>
                                                                                                <span className="text-white/50">ROIC: <span className="text-purple-400">{bu.roic > 0 ? bu.roic.toFixed(1) + "%" : "—"}</span>span></span>span>
                                                                            </div>div>
                                                          </div>div>
                                                          <div className="h-1.5 w-full rounded-full bg-white/5">
                                                                            <div
                                                                                                  className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                                                                                  style={{ width: `${pct}%` }}
                                                                                                />
                                                          </div>div>
                                                          <p className="text-right text-xs text-white/30">{pct.toFixed(1)}% da receita do grupo</p>p>
                                          </div>div>
                                        );
            })}
                          </div>div>
                  </div>div>
            
              {/* Budget vs Actual */}
                  <div className="rounded-2xl border border-white/5 bg-white/3 p-5">
                          <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-white">Budget vs Actual — AWQ Group (YTD 2026)</h3>h3>
                                    <div className="flex gap-2 text-xs">
                                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-400" /> Realizado</span>span>
                                                <span className="flex items-center gap-1 text-white/40"><span className="h-2 w-2 rounded-full bg-white/30" /> Budget</span>span>
                                                <span className="flex items-center gap-1 text-white/40"><span className="h-2 w-2 rounded-full bg-amber-400" /> Forecast</span>span>
                                    </div>div>
                          </div>div>
                          <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                                <thead>
                                                              <tr className="text-white/30 border-b border-white/5">
                                                                              <th className="py-2 text-left font-medium">Mês</th>th>
                                                                              <th className="py-2 text-right font-medium">Realizado</th>th>
                                                                              <th className="py-2 text-right font-medium">Budget</th>th>
                                                                              <th className="py-2 text-right font-medium">Forecast</th>th>
                                                                              <th className="py-2 text-right font-medium">Δ Budget</th>th>
                                                                              <th className="py-2 text-right font-medium">Δ%</th>th>
                                                              </tr>tr>
                                                </thead>thead>
                                                <tbody>
                                                  {budgetData.map((row) => {
                              const delta = row.realizado - row.budget;
                              const deltaPct = ((delta / row.budget) * 100).toFixed(1);
                              const positivo = delta >= 0;
                              return (
                                                  <tr key={row.mes} className="border-b border-white/3 hover:bg-white/3">
                                                                      <td className="py-2 font-medium text-white">{row.mes}</td>td>
                                                                      <td className="py-2 text-right text-white">{fmt(row.realizado)}</td>td>
                                                                      <td className="py-2 text-right text-white/40">{fmt(row.budget)}</td>td>
                                                                      <td className="py-2 text-right text-amber-400">{fmt(row.forecast)}</td>td>
                                                                      <td className={`py-2 text-right font-medium ${positivo ? "text-emerald-400" : "text-red-400"}`}>
                                                                        {positivo ? "+" : ""}{fmt(Math.abs(delta))}
                                                                      </td>td>
                                                                      <td className={`py-2 text-right font-semibold ${positivo ? "text-emerald-400" : "text-red-400"}`}>
                                                                        {positivo ? "+" : ""}{deltaPct}%
                                                                      </td>td>
                                                  </tr>tr>
                                                );
            })}
                                                </tbody>tbody>
                                                <tfoot>
                                                              <tr className="border-t border-white/10 font-semibold">
                                                                              <td className="py-2 text-white">YTD Total</td>td>
                                                                              <td className="py-2 text-right text-white">{fmt(ytdReceita)}</td>td>
                                                                              <td className="py-2 text-right text-white/40">{fmt(ytdBudget)}</td>td>
                                                                              <td className="py-2 text-right text-amber-400">—</td>td>
                                                                              <td className="py-2 text-right text-emerald-400">+{fmt(variacaoAbsoluta)}</td>td>
                                                                              <td className="py-2 text-right text-emerald-400">+{variacaoBudget}%</td>td>
                                                              </tr>tr>
                                                </tfoot>tfoot>
                                    </table>table>
                          </div>div>
                  </div>div>
            
              {/* Evolução de Receita Mensal — versão expandida */}
                  <div className="rounded-2xl border border-white/5 bg-white/3 p-5">
                          <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-white">Evolução de Receita Mensal</h3>h3>
                                    <span className="text-xs text-white/30">Receita · Despesas · Lucro · Margem</span>span>
                          </div>div>
                          <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                                <thead>
                                                              <tr className="border-b border-white/5 text-left text-xs text-white/30">
                                                                              <th className="py-2 font-medium">Mês</th>th>
                                                                              <th className="py-2 text-right font-medium">Receita</th>th>
                                                                              <th className="py-2 text-right font-medium">Despesas</th>th>
                                                                              <th className="py-2 text-right font-medium">Lucro</th>th>
                                                                              <th className="py-2 text-right font-medium">Margem</th>th>
                                                                              <th className="py-2 text-right font-medium">vs Budget</th>th>
                                                              </tr>tr>
                                                </thead>thead>
                                                <tbody>
                                                  {revenueData.map((row, idx) => {
                              const margem = ((row.profit / row.revenue) * 100).toFixed(1);
                              const margemNum = parseFloat(margem);
                              const budgetRow = budgetData[idx];
                              const delta = budgetRow ? ((row.revenue - budgetRow.budget) / budgetRow.budget * 100).toFixed(1) : null;
                              return (
                                                  <tr key={row.month} className="border-b border-white/3 hover:bg-white/2">
                                                                      <td className="py-2 font-medium text-white">{row.month}</td>td>
                                                                      <td className="py-2 text-right text-white">{fmt(row.revenue)}</td>td>
                                                                      <td className="py-2 text-right text-red-400">{fmt(row.expenses)}</td>td>
                                                                      <td className="py-2 text-right text-emerald-400">{fmt(row.profit)}</td>td>
                                                                      <td className="py-2 text-right">
                                                                                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                                            margemNum >= 65 ? "bg-emerald-400/20 text-emerald-400" :
                                                                            margemNum >= 60 ? "bg-amber-400/20 text-amber-400" :
                                                                            "bg-red-400/20 text-red-400"
                                                  }`}>{margem}%</span>span>
                                                                      </td>td>
                                                                      <td className={`py-2 text-right text-xs font-medium ${delta && parseFloat(delta) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                                        {delta ? (parseFloat(delta) >= 0 ? "+" : "") + delta + "%" : "—"}
                                                                      </td>td>
                                                  </tr>tr>
                                                );
            })}
                                                </tbody>tbody>
                                    </table>table>
                          </div>div>
                  </div>div>
            
              {/* Canais de Aquisição */}
                  <div className="rounded-2xl border border-white/5 bg-white/3 p-5">
                          <h3 className="mb-4 text-sm font-semibold text-white">Canais de Aquisição</h3>h3>
                          <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                                <thead>
                                                              <tr className="border-b border-white/5 text-left text-xs text-white/30">
                                                                              <th className="py-2 font-medium">Canal</th>th>
                                                                              <th className="py-2 text-right font-medium">Sessões</th>th>
                                                                              <th className="py-2 text-right font-medium">Conversões</th>th>
                                                                              <th className="py-2 text-right font-medium">Receita</th>th>
                                                                              <th className="py-2 text-right font-medium">CAC</th>th>
                                                                              <th className="py-2 text-right font-medium">Conv. Rate</th>th>
                                                              </tr>tr>
                                                </thead>thead>
                                                <tbody>
                                                  {channelData.map((row) => {
                              const convRate = ((row.conversions / row.sessions) * 100).toFixed(2);
                              return (
                                                  <tr key={row.channel} className="border-b border-white/3 hover:bg-white/2">
                                                                      <td className="py-2 font-medium text-white">{row.channel}</td>td>
                                                                      <td className="py-2 text-right text-white/60">{row.sessions.toLocaleString()}</td>td>
                                                                      <td className="py-2 text-right text-cyan-400">{row.conversions.toLocaleString()}</td>td>
                                                                      <td className="py-2 text-right text-white">{fmt(row.revenue)}</td>td>
                                                                      <td className="py-2 text-right">
                                                                                            <span className={row.cac === 0 ? "text-emerald-400" : "text-white/60"}>
                                                                                              {row.cac === 0 ? "Orgânico" : "$" + row.cac}
                                                                                              </span>span>
                                                                      </td>td>
                                                                      <td className="py-2 text-right text-white/50">{convRate}%</td>td>
                                                  </tr>tr>
                                                );
            })}
                                                </tbody>tbody>
                                    </table>table>
                          </div>div>
                  </div>div>
            </div>div>
          );
  }</div>if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
      if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
      return "$" + n;
}

export default function FinancialPage() {
      const lastMonth = revenueData[revenueData.length - 1];

  const summaryCards = [
      {
                label: "Receita Total (Ano)",
                value: "$4.82M",
                sub: "YTD Marco 2026",
                icon: DollarSign,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
                up: true,
                delta: "+14.7%",
      },
      {
                label: "Lucro Total (Ano)",
                value: "$3.24M",
                sub: "Margem 67.4%",
                icon: TrendingUp,
                color: "text-brand-400",
                bg: "bg-brand-500/10",
                up: true,
                delta: "+11.2%",
      },
      {
                label: "Receita Dezembro",
                value: fmt(lastMonth.revenue),
                sub: "Melhor mes do ano",
                icon: BarChart3,
                color: "text-violet-400",
                bg: "bg-violet-500/10",
                up: true,
                delta: "+2.0%",
      },
      {
                label: "Lucro Dezembro",
                value: fmt(lastMonth.profit),
                sub: "Despesas: " + fmt(lastMonth.expenses),
                icon: DollarSign,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
                up: true,
                delta: "+2.2%",
      },
        ];

  return (
          <>
                <Header title="Financial" subtitle="Receita, margem e canais de aquisicao - AWQ Group" />
                <div className="px-8 py-6 space-y-6">
                
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                            {summaryCards.map((card) => {
                          const Icon = card.icon;
                          return (
                                            <div key={card.label} className="card p-5 flex items-start gap-4">
                                                            <div className={"w-10 h-10 rounded-xl " + card.bg + " flex items-center justify-center shrink-0"}>
                                                                              <Icon size={18} className={card.color} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                              <div className="text-2xl font-bold text-white">{card.value}</div>
                                                                              <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                                                                              <div className="flex items-center gap-1 mt-1">
                                                                                  {card.up ? (
                                                                      <ArrowUpRight size={11} className="text-emerald-400" />
                                                                    ) : (
                                                                      <ArrowDownRight size={11} className="text-red-400" />
                                                                    )}
                                                                                                  <span className={"text-[10px] font-semibold " + (card.up ? "text-emerald-400" : "text-red-400")}>
                                                                                                      {card.delta}
                                                                                                      </span>
                                                                                                  <span className="text-[10px] text-gray-600">{card.sub}</span>
                                                                              </div>
                                                            </div>
                                            </div>
                                          );
          })}
                        </div>
                
                        <div className="card p-5">
                                  <h2 className="text-sm font-semibold text-white mb-4">Evolucao de Receita Mensal</h2>
                                  <div className="overflow-x-auto">
                                              <table className="w-full text-sm">
                                                            <thead>
                                                                            <tr className="border-b border-gray-800">
                                                                                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Mes</th>
                                                                                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>
                                                                                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Despesas</th>
                                                                                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro</th>
                                                                                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Margem</th>
                                                                            </tr>
                                                            </thead>
                                                            <tbody>
                                                                {revenueData.map((row) => {
                                const marginPct = ((row.profit / row.revenue) * 100).toFixed(1);
                                return (
                                                        <tr key={row.month} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                                                              <td className="py-2.5 px-3 text-gray-300 font-medium">{row.month}</td>
                                                                              <td className="py-2.5 px-3 text-right text-white font-semibold">{fmt(row.revenue)}</td>
                                                                              <td className="py-2.5 px-3 text-right text-red-400">{fmt(row.expenses)}</td>
                                                                              <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">{fmt(row.profit)}</td>
                                                                              <td className="py-2.5 px-3 text-right">
                                                                                                      <span className="badge badge-green">{marginPct}%</span>
                                                                                  </td>
                                                        </tr>
                                                      );
          })}
                                                            </tbody>
                                              </table>
                                  </div>
                        </div>
                
                        <div className="card p-5">
                                  <h2 className="text-sm font-semibold text-white mb-4">Canais de Aquisicao</h2>
                                  <div className="overflow-x-auto">
                                              <table className="w-full text-sm">
                                                            <thead>
                                                                            <tr className="border-b border-gray-800">
                                                                                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Canal</th>
                                                                                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Sessoes</th>
                                                                                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Conversoes</th>
                                                                                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>
                                                                                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">CAC</th>
                                                                            </tr>
                                                            </thead>
                                                            <tbody>
                                                                {channelData.map((ch) => (
                                <tr key={ch.channel} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                                    <td className="py-2.5 px-3 text-gray-300 font-medium">{ch.channel}</td>
                                                    <td className="py-2.5 px-3 text-right text-gray-400">{ch.sessions.toLocaleString()}</td>
                                                    <td className="py-2.5 px-3 text-right text-brand-400">{ch.conversions.toLocaleString()}</td>
                                                    <td className="py-2.5 px-3 text-right text-white font-semibold">{fmt(ch.revenue)}</td>
                                                    <td className="py-2.5 px-3 text-right text-gray-400">
                                                        {ch.cac === 0 ? <span className="text-emerald-400">Organico</span> : "$" + ch.cac}
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
