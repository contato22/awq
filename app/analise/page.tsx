import Header from "@/components/Header";
import { revenueData, topProducts, customers, channelData, regionData } from "@/lib/data";
import { Activity, TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, Users, BarChart3, Target } from "lucide-react";

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n;
}

export default function AnalisePage() {
  const totalRevenue = revenueData.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = revenueData.reduce((s, m) => s + m.expenses, 0);
  const totalProfit = revenueData.reduce((s, m) => s + m.profit, 0);
  const avgMargin = ((totalProfit / totalRevenue) * 100).toFixed(1);
  const avgGrowth = revenueData.slice(1).reduce((s, m, i) => {
    const prev = revenueData[i];
    return s + ((m.revenue - prev.revenue) / prev.revenue) * 100;
  }, 0) / (revenueData.length - 1);

  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const atRisk = customers.filter((c) => c.status === "at-risk").length;
  const churned = customers.filter((c) => c.status === "churned").length;
  const avgLtv = customers.reduce((s, c) => s + c.ltv, 0) / customers.length;

  const trendingProducts = topProducts.filter((p) => p.status === "trending");
  const decliningProducts = topProducts.filter((p) => p.status === "declining");

  const totalSessions = channelData.reduce((s, c) => s + c.sessions, 0);
  const totalConversions = channelData.reduce((s, c) => s + c.conversions, 0);
  const conversionRate = ((totalConversions / totalSessions) * 100).toFixed(2);

  return (
    <>
      <Header title="Análise" subtitle="Análise avançada de dados — JACQES" />
      <div className="px-8 py-6 space-y-6">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Receita Total", value: fmtCurrency(totalRevenue), icon: DollarSign, color: "text-brand-600", bg: "bg-brand-50", delta: `+${avgGrowth.toFixed(1)}% avg` },
            { label: "Margem Média", value: `${avgMargin}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", delta: null },
            { label: "LTV Médio", value: fmtCurrency(avgLtv), icon: Users, color: "text-violet-700", bg: "bg-violet-50", delta: null },
            { label: "Taxa Conversão", value: `${conversionRate}%`, icon: Target, color: "text-amber-700", bg: "bg-amber-50", delta: null },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}><Icon size={18} className={kpi.color} /></div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
                  {kpi.delta && (
                    <div className="flex items-center gap-1 mt-1">
                      <ArrowUpRight size={11} className="text-emerald-600" />
                      <span className="text-[10px] font-semibold text-emerald-600">{kpi.delta}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* P&L Summary */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Evolução P&L — 12 Meses</h2>
          <div className="grid grid-cols-4 xl:grid-cols-6 gap-3">
            {revenueData.slice(-6).map((m, i) => {
              const margin = ((m.profit / m.revenue) * 100).toFixed(0);
              const prev = revenueData[revenueData.length - 7 + i];
              const growth = prev ? ((m.revenue - prev.revenue) / prev.revenue * 100).toFixed(1) : "0";
              const up = Number(growth) >= 0;
              return (
                <div key={m.month} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-gray-500 mb-1">{m.month}</div>
                  <div className="text-sm font-bold text-gray-900">{fmtCurrency(m.revenue)}</div>
                  <div className="text-[10px] text-gray-400">Margem {margin}%</div>
                  <div className="flex items-center gap-1 mt-1">
                    {up ? <ArrowUpRight size={10} className="text-emerald-600" /> : <ArrowDownRight size={10} className="text-red-600" />}
                    <span className={`text-[10px] font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>{growth}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Customer Health */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Saúde da Base de Clientes</h2>
            <div className="space-y-4">
              {[
                { label: "Ativos", count: activeCustomers, pct: ((activeCustomers / customers.length) * 100).toFixed(0), color: "bg-emerald-500", textColor: "text-emerald-600" },
                { label: "Em risco", count: atRisk, pct: ((atRisk / customers.length) * 100).toFixed(0), color: "bg-amber-500", textColor: "text-amber-700" },
                { label: "Churned", count: churned, pct: ((churned / customers.length) * 100).toFixed(0), color: "bg-red-500", textColor: "text-red-600" },
              ].map((seg) => (
                <div key={seg.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-800 font-medium">{seg.label}</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-gray-500">{seg.count} contas</span>
                      <span className={`font-semibold ${seg.textColor}`}>{seg.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${seg.color} rounded-full`} style={{ width: `${seg.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-[11px] text-gray-600">
                <span className="font-semibold">Concentração:</span> Top 3 clientes representam{" "}
                <span className="font-bold text-gray-900">
                  {((customers.sort((a, b) => b.ltv - a.ltv).slice(0, 3).reduce((s, c) => s + c.ltv, 0) / customers.reduce((s, c) => s + c.ltv, 0)) * 100).toFixed(0)}%
                </span> do LTV total
              </div>
            </div>
          </div>

          {/* Channel Performance */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Performance por Canal</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Canal</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Sessões</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Conv.</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">CAC</th>
                </tr>
              </thead>
              <tbody>
                {channelData.map((c) => (
                  <tr key={c.channel} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 text-xs font-medium text-gray-800">{c.channel}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-500">{c.sessions.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-500">{c.conversions.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtCurrency(c.revenue)}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-500">{c.cac > 0 ? `$${c.cac}` : "Orgânico"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product insights */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Insights de Produto</h2>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-xs font-semibold text-emerald-700 mb-2">Em Alta ({trendingProducts.length})</div>
              {trendingProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-gray-800">{p.name}</span>
                  <span className="text-xs font-bold text-emerald-600">+{p.growth}%</span>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="text-xs font-semibold text-red-700 mb-2">Em Queda ({decliningProducts.length})</div>
              {decliningProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-gray-800">{p.name}</span>
                  <span className="text-xs font-bold text-red-600">{p.growth}%</span>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="text-xs font-semibold text-gray-700 mb-2">Concentração de Receita</div>
              {topProducts.slice(0, 3).map((p) => {
                const pct = ((p.revenue / topProducts.reduce((s, pp) => s + pp.revenue, 0)) * 100).toFixed(0);
                return (
                  <div key={p.id} className="mb-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] text-gray-600">{p.name}</span>
                      <span className="text-[11px] font-semibold text-gray-800">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
