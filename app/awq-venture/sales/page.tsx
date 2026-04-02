import Header from "@/components/Header";
import { DollarSign, TrendingUp, Users, Target, ArrowUpRight } from "lucide-react";

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

const monthlyData = [
  { month: "Jan/26", captacao: 0,          deals: 0, pipeline: 12_500_000 },
  { month: "Fev/26", captacao: 15_000_000, deals: 1, pipeline: 18_200_000 },
  { month: "Mar/26", captacao: 23_000_000, deals: 3, pipeline: 24_500_000 },
];

const metrics = [
  { label: "Captação YTD",    value: fmtR(38_000_000), icon: DollarSign, color: "text-emerald-600", bg: "bg-slate-100" },
  { label: "Pipeline Ativo",  value: fmtR(24_500_000), icon: TrendingUp, color: "text-brand-600",   bg: "bg-slate-100" },
  { label: "LPs em Diálogo",  value: "8",              icon: Users,      color: "text-violet-700",  bg: "bg-slate-100" },
  { label: "Meta First Close", value: fmtR(50_000_000), icon: Target,     color: "text-amber-700",   bg: "bg-slate-100" },
];

const channels = [
  { source: "Network pessoal",     lps: 3, valor: 28_000_000, pct: 74 },
  { source: "Indicação LP existente", lps: 1, valor: 5_000_000,  pct: 13 },
  { source: "Eventos",              lps: 1, valor: 5_000_000,  pct: 13 },
];

export default function SalesPage() {
  const totalCaptacao = monthlyData.reduce((s, m) => s + m.captacao, 0);
  const meta = 50_000_000;
  const pctMeta = ((totalCaptacao / meta) * 100).toFixed(0);

  return (
    <>
      <Header title="Sales — AWQ Venture" subtitle="Captação, pipeline de LPs e forecast" />
      <div className="px-8 py-6 space-y-6">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {metrics.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card-elevated p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}><Icon size={18} className={kpi.color} /></div>
                <div>
                  <div className="text-xl font-bold text-slate-800">{kpi.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress to first close */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800">Progresso até First Close</h2>
            <span className="text-xs font-bold text-brand-600">{pctMeta}% da meta</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-slate-700 to-slate-500 rounded-full transition-all" style={{ width: `${Math.min(Number(pctMeta), 100)}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
            <span>R$0</span>
            <span>{fmtR(totalCaptacao)} captado</span>
            <span>Meta: {fmtR(meta)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Monthly captação */}
          <div className="card-elevated p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Captação Mensal</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left py-2 px-3 text-xs font-bold">Mês</th>
                  <th className="text-right py-2 px-3 text-xs font-bold">Captação</th>
                  <th className="text-right py-2 px-3 text-xs font-bold">Deals</th>
                  <th className="text-right py-2 px-3 text-xs font-bold">Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m) => (
                  <tr key={m.month} className="border-b border-gray-100 even:bg-gray-50/60 hover:bg-gray-100 transition-colors">
                    <td className="py-2.5 px-3 text-xs font-medium text-gray-800">{m.month}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{m.captacao > 0 ? fmtR(m.captacao) : "—"}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-500">{m.deals}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-500">{fmtR(m.pipeline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Channels */}
          <div className="card-elevated p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Canais de Captação</h2>
            <div className="space-y-4">
              {channels.map((c) => (
                <div key={c.source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-800 font-medium">{c.source}</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-gray-500">{c.lps} LPs</span>
                      <span className="font-bold text-emerald-600">{fmtR(c.valor)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${c.pct}%` }} />
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
