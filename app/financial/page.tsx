import Header from "@/components/Header";
import { revenueData, channelData, kpis } from "@/lib/data";
import { DollarSign, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";

function fmt(n: number) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
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
