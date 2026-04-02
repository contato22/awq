import Header from "@/components/Header";
import { Zap, TrendingUp, DollarSign, Users, ArrowUpRight, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

const metrics = [
  { label: "Capacidade Instalada", value: "12 MW",    icon: Zap,        color: "text-amber-700",   bg: "bg-amber-50" },
  { label: "Receita YTD",         value: fmtR(3_200_000), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Clientes Ativos",     value: "4",         icon: Users,      color: "text-violet-700",  bg: "bg-violet-50" },
  { label: "ROIC Projetado",      value: "18.5%",     icon: TrendingUp, color: "text-brand-600",   bg: "bg-brand-50" },
];

const assets = [
  { name: "UFV Lagoa Santa",  type: "Solar", capacity: "5 MW",  status: "Operacional", revenue: 1_400_000, irr: 22.3 },
  { name: "UFV Betim",        type: "Solar", capacity: "3 MW",  status: "Operacional", revenue: 840_000,   irr: 19.1 },
  { name: "UFV Contagem",     type: "Solar", capacity: "4 MW",  status: "Em construção", revenue: 0,       irr: 24.0 },
  { name: "PCH Rio Doce",     type: "Hidro", capacity: "8 MW",  status: "Em diligência", revenue: 0,       irr: 16.5 },
];

const milestones = [
  { label: "SPE constituída — UFV Lagoa Santa",    done: true,  date: "Q3/25" },
  { label: "Conexão à rede — Lagoa Santa + Betim", done: true,  date: "Q4/25" },
  { label: "Início obras — UFV Contagem",          done: true,  date: "Q1/26" },
  { label: "Comissionamento — UFV Contagem",        done: false, date: "Q2/26" },
  { label: "Due diligence — PCH Rio Doce",         done: false, date: "Q2/26" },
  { label: "Target: 20 MW instalados",             done: false, date: "Q4/26" },
];

const statusBadge: Record<string, string> = {
  "Operacional":    "bg-emerald-50 text-emerald-600 border border-emerald-200",
  "Em construção":  "bg-amber-50 text-amber-700 border border-amber-200",
  "Em diligência":  "bg-brand-50 text-brand-600 border border-brand-200",
};

export default function GrupoEnergdyPage() {
  const totalRevenue = assets.reduce((s, a) => s + a.revenue, 0);

  return (
    <>
      <Header title="Grupo Energdy" subtitle="Sleeve de energia — ativos renováveis e geração distribuída" />
      <div className="px-8 py-6 space-y-6">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {metrics.map((kpi) => {
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Ativos de Geração</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Ativo</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Capacidade</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita YTD</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">IRR</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.name} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 text-xs font-medium text-gray-800">{a.name}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-500">{a.type}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{a.capacity}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{a.revenue > 0 ? fmtR(a.revenue) : "—"}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-500">{a.irr.toFixed(1)}%</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge[a.status] ?? "bg-gray-100 text-gray-500"}`}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Roadmap de Expansão</h2>
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.done ? "bg-emerald-100" : "bg-gray-100"}`}>
                    {m.done ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Clock size={12} className="text-gray-400" />}
                  </div>
                  <div>
                    <div className={`text-xs font-medium ${m.done ? "text-gray-800" : "text-gray-400"}`}>{m.label}</div>
                    <div className="text-[10px] text-gray-400">{m.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-amber-800 mb-2">
            <AlertTriangle size={13} />
            <span className="font-semibold">Risco de concentração</span>
          </div>
          <div className="text-[11px] text-gray-600 leading-relaxed">
            Sleeve de energia tem ciclo longo e iliquidez alta. Atual dependência de PPAs regionais (MG).
            Expansão para outros estados é condição para diluir risco regulatório e geográfico.
            Impacto no caixa da holding: neutro até Q3/26 (capex financiado via project finance).
          </div>
        </div>
      </div>
    </>
  );
}
