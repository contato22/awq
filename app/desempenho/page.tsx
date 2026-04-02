import Header from "@/components/Header";
import { revenueData, topProducts, regionData } from "@/lib/data";
import { TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, Users, BarChart3 } from "lucide-react";

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n;
}

const statusColor: Record<string, string> = {
  trending: "text-emerald-600",
  stable: "text-gray-500",
  declining: "text-red-600",
};

const statusLabel: Record<string, string> = {
  trending: "Em alta",
  stable: "Estável",
  declining: "Em queda",
};

export default function DesempenhoPage() {
  const lastMonth = revenueData[revenueData.length - 1];
  const prevMonth = revenueData[revenueData.length - 2];
  const revGrowth = (((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100).toFixed(1);
  const marginPct = ((lastMonth.profit / lastMonth.revenue) * 100).toFixed(1);
  const totalRevenue = revenueData.reduce((s, m) => s + m.revenue, 0);

  return (
    <>
      <Header title="Desempenho" subtitle="Métricas de desempenho operacional — JACQES" />
      <div className="px-8 py-6 space-y-6">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Receita Anual", value: fmtCurrency(totalRevenue), icon: DollarSign, color: "text-brand-600", bg: "bg-brand-50", delta: `+${revGrowth}%` },
            { label: "Margem Atual", value: `${marginPct}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", delta: "+4.3pp" },
            { label: "Produtos Ativos", value: String(topProducts.length), icon: BarChart3, color: "text-violet-700", bg: "bg-violet-50", delta: null },
            { label: "Regiões", value: String(regionData.length), icon: Users, color: "text-amber-700", bg: "bg-amber-50", delta: null },
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

        {/* Revenue trend */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Tendência de Receita — 12 Meses</h2>
          <div className="grid grid-cols-4 xl:grid-cols-6 gap-3">
            {revenueData.slice(-6).map((m, i) => {
              const prev = revenueData[revenueData.length - 7 + i];
              const growth = prev ? ((m.revenue - prev.revenue) / prev.revenue * 100).toFixed(1) : "0";
              const up = Number(growth) >= 0;
              return (
                <div key={m.month} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-gray-500 mb-1">{m.month}</div>
                  <div className="text-sm font-bold text-gray-900">{fmtCurrency(m.revenue)}</div>
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
          {/* Products */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Desempenho por Produto</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Produto</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Crescimento</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="text-xs font-medium text-gray-800">{p.name}</div>
                      <div className="text-[10px] text-gray-400">{p.category}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtCurrency(p.revenue)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`text-xs font-bold ${p.growth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {p.growth >= 0 ? "+" : ""}{p.growth}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-semibold ${statusColor[p.status]}`}>{statusLabel[p.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Regions */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Desempenho Regional</h2>
            <div className="space-y-4">
              {regionData.map((r) => {
                const maxRev = regionData[0].revenue;
                const pct = (r.revenue / maxRev) * 100;
                return (
                  <div key={r.region}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-800 font-medium">{r.region}</span>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-gray-500">{r.customers.toLocaleString()} clientes</span>
                        <span className="text-emerald-600 font-semibold">+{r.growth}%</span>
                        <span className="font-bold text-gray-900">{fmtCurrency(r.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
