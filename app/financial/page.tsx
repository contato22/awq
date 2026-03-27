import Header from "@/components/Header";
import { revenueData, channelData, kpis } from "@/lib/data";
import { DollarSign, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";

function fmt(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
}

export default function FinancialPage() {
    const revenue = kpis.find((k) => k.id === "revenue");
    const margin = kpis.find((k) => k.id === "margin");

  const totalRevenue = revenueData.reduce((s, d) => s + d.revenue, 0) / 12;
    const totalProfit = revenueData.reduce((s, d) => s + d.profit, 0) / 12;
    const lastMonth = revenueData[revenueData.length - 1];

  const summaryCards = [
    {
            label: "Receita Total (Ano)",
            value: "$4.82M",
            sub: "YTD · Março 2026",
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
            sub: "Melhor mês do ano",
            icon: BarChart3,
            color: "text-violet-400",
            bg: "bg-violet-500/10",
            up: true,
            delta: "+2.0%",
    },
    {
            label: "Lucro Dezembro",
            value: fmt(lastMonth.profit),
            sub: `Despesas: ${fmt(lastMonth.expenses)}`,
            icon: DollarSign,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            up: true,
            delta: "+2.2%",
    },
      ];

  return (
        <>
              <Header title="Financial" subtitle="Receita, margem e canais de aquisição · AWQ Group" />
              <div className="px-8 py-6 space-y-6">
              
                {/* Summary KPI cards */}
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                        {summaryCards.map((card) => {
                      const Icon = card.icon;
                      return (
                                      <div key={card.label} className="card p-5 flex items-start gap-4">
                                                      <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                                                                        <Icon size={18} className={card.color} />
                                                      </div>div>
                                                      <div className="flex-1 min-w-0">
                                                                        <div className="text-2xl font-bold text-white">{card.value}</div>div>
                                                                        <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>div>
                                                                        <div className="flex items-center gap-1 mt-1">
                                                                          {card.up ? (
                                                              <ArrowUpRight size={11} className="text-emerald-400" />
                                                            ) : (
                                                              <ArrowDownRight size={11} className="text-red-400" />
                                                            )}
                                                                                            <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-400" : "text-red-400"}`}>
                                                                                              {card.delta}
                                                                                              </span>span>
                                                                                            <span className="text-[10px] text-gray-600">{card.sub}</span>span>
                                                                        </div>div>
                                                      </div>div>
                                      </div>div>
                                    );
        })}
                      </div>div>
              
                {/* Revenue table */}
                      <div className="card p-5">
                                <h2 className="text-sm font-semibold text-white mb-4">Evolução de Receita Mensal</h2>h2>
                                <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                          <thead>
                                                                          <tr className="border-b border-gray-800">
                                                                                            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>th>
                                                                                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>th>
                                                                                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Despesas</th>th>
                                                                                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro</th>th>
                                                                                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Margem</th>th>
                                                                          </tr>tr>
                                                          </thead>thead>
                                                          <tbody>
                                                            {revenueData.map((row) => {
                            const marginPct = ((row.profit / row.revenue) * 100).toFixed(1);
                            return (
                                                  <tr key={row.month} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                                                        <td className="py-2.5 px-3 text-gray-300 font-medium">{row.month}</td>td>
                                                                        <td className="py-2.5 px-3 text-right text-white font-semibold">{fmt(row.revenue)}</td>td>
                                                                        <td className="py-2.5 px-3 text-right text-red-400">{fmt(row.expenses)}</td>td>
                                                                        <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">{fmt(row.profit)}</td>td>
                                                                        <td className="py-2.5 px-3 text-right">
                                                                                                <span className="badge badge-green">{marginPct}%</span>span>
                                                                        </td>td>
                                                  </tr>tr>
                                                );
        })}
                                                          </tbody>tbody>
                                            </table>table>
                                </div>div>
                      </div>div>
              
                {/* Acquisition channels */}
                      <div className="card p-5">
                                <h2 className="text-sm font-semibold text-white mb-4">Canais de Aquisição</h2>h2>
                                <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                          <thead>
                                                                          <tr className="border-b border-gray-800">
                                                                                            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Canal</th>th>
                                                                                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Sessões</th>th>
                                                                                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Conversões</th>th>
                                                                                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>th>
                                                                                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">CAC</th>th>
                                                                          </tr>tr>
                                                          </thead>thead>
                                                          <tbody>
                                                            {channelData.map((ch) => (
                            <tr key={ch.channel} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                                <td className="py-2.5 px-3 text-gray-300 font-medium">{ch.channel}</td>td>
                                                <td className="py-2.5 px-3 text-right text-gray-400">{ch.sessions.toLocaleString()}</td>td>
                                                <td className="py-2.5 px-3 text-right text-brand-400">{ch.conversions.toLocaleString()}</td>td>
                                                <td className="py-2.5 px-3 text-right text-white font-semibold">{fmt(ch.revenue)}</td>td>
                                                <td className="py-2.5 px-3 text-right text-gray-400">
                                                  {ch.cac === 0 ? <span className="text-emerald-400">Orgânico</span>span> : `$${ch.cac}`}
                                                </td>td>
                            </tr>tr>
                          ))}
                                                          </tbody>tbody>
                                            </table>table>
                                </div>div>
                      </div>div>
              
              </div>div>
        </>>
      );
}</>
