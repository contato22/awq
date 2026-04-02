import Header from "@/components/Header";
import { customers } from "@/lib/data";
import { Users, DollarSign, AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n;
}

const statusColor: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  "at-risk": "bg-amber-50 text-amber-700 border border-amber-200",
  churned: "bg-red-50 text-red-600 border border-red-200",
};

const statusLabel: Record<string, string> = {
  active: "Ativo",
  "at-risk": "Em risco",
  churned: "Churned",
};

const segmentColor: Record<string, string> = {
  Enterprise: "text-violet-700",
  SMB: "text-brand-600",
  Startup: "text-amber-700",
};

export default function CarteiraPage() {
  const totalLtv = customers.reduce((s, c) => s + c.ltv, 0);
  const active = customers.filter((c) => c.status === "active");
  const atRisk = customers.filter((c) => c.status === "at-risk");
  const avgLtv = totalLtv / customers.length;

  const bySegment = ["Enterprise", "SMB", "Startup"].map((seg) => {
    const segCustomers = customers.filter((c) => c.segment === seg);
    return {
      segment: seg,
      count: segCustomers.length,
      ltv: segCustomers.reduce((s, c) => s + c.ltv, 0),
      pct: ((segCustomers.reduce((s, c) => s + c.ltv, 0) / totalLtv) * 100).toFixed(0),
    };
  });

  return (
    <>
      <Header title="Carteira" subtitle="Gestão de carteira de clientes — JACQES" />
      <div className="px-8 py-6 space-y-6">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Total Clientes", value: String(customers.length), icon: Users, color: "text-brand-600", bg: "bg-brand-50" },
            { label: "LTV Total", value: fmtCurrency(totalLtv), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "LTV Médio", value: fmtCurrency(avgLtv), icon: TrendingUp, color: "text-violet-700", bg: "bg-violet-50" },
            { label: "Em Risco", value: String(atRisk.length), icon: AlertTriangle, color: "text-amber-700", bg: "bg-amber-50" },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}><Icon size={18} className={kpi.color} /></div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Client table */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Base de Clientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Cliente</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Segmento</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">País</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">LTV</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Último Pedido</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.sort((a, b) => b.ltv - a.ltv).map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="text-xs font-medium text-gray-800">{c.name}</div>
                      <div className="text-[10px] text-gray-400">{c.company}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs font-semibold ${segmentColor[c.segment] ?? "text-gray-500"}`}>{c.segment}</span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-500">{c.country}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtCurrency(c.ltv)}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-500">{c.lastOrder}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor[c.status]}`}>{statusLabel[c.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Segment breakdown */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Distribuição por Segmento</h2>
            <div className="space-y-4">
              {bySegment.map((seg) => (
                <div key={seg.segment}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${segmentColor[seg.segment] ?? "text-gray-800"}`}>{seg.segment}</span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-gray-500">{seg.count} contas</span>
                      <span className="font-bold text-gray-900">{fmtCurrency(seg.ltv)}</span>
                      <span className="text-gray-400">{seg.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${seg.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* At-risk alert */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Alertas de Risco</h2>
            <div className="space-y-3">
              {atRisk.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={12} className="text-amber-700" />
                    <span className="text-xs font-semibold text-amber-800">{c.name} — {c.company}</span>
                  </div>
                  <div className="text-[11px] text-amber-700">
                    LTV: {fmtCurrency(c.ltv)} · Último pedido: {c.lastOrder} · Segmento: {c.segment}
                  </div>
                </div>
              ))}
              {customers.filter((c) => c.status === "churned").map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownRight size={12} className="text-red-600" />
                    <span className="text-xs font-semibold text-red-700">{c.name} — {c.company}</span>
                  </div>
                  <div className="text-[11px] text-red-600">
                    Churned · LTV perdido: {fmtCurrency(c.ltv)} · Último pedido: {c.lastOrder}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
