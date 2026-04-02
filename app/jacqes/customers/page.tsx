import Header from "@/components/Header";
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const customers = [
  { id: "JC001", name: "Ambev",          segment: "Bebidas & FMCG",        mrr: 420_000, ltv: 5_040_000, since: "2023-04-01", status: "Ativo",        churnRisk: "Baixo",  nps: 82 },
  { id: "JC002", name: "Natura",         segment: "Beleza & Sustentab.",   mrr: 310_000, ltv: 2_480_000, since: "2024-01-15", status: "Ativo",        churnRisk: "Baixo",  nps: 78 },
  { id: "JC003", name: "iFood",          segment: "Food & Tech",           mrr: 285_000, ltv: 1_710_000, since: "2024-06-01", status: "Ativo",        churnRisk: "Médio",  nps: 65 },
  { id: "JC004", name: "Samsung Brasil", segment: "Tecnologia",            mrr: 350_000, ltv: 4_200_000, since: "2023-03-10", status: "Ativo",        churnRisk: "Baixo",  nps: 91 },
  { id: "JC005", name: "Nike Brasil",    segment: "Esporte & Lifestyle",   mrr: 195_000, ltv: 2_340_000, since: "2024-01-20", status: "Ativo",        churnRisk: "Baixo",  nps: 88 },
  { id: "JC006", name: "Banco XP",       segment: "Finanças",              mrr: 230_000, ltv: 1_380_000, since: "2024-07-01", status: "Em Risco",     churnRisk: "Alto",   nps: 42 },
  { id: "JC007", name: "Nubank",         segment: "Fintech",               mrr: 175_000, ltv: 700_000,   since: "2025-01-10", status: "Ativo",        churnRisk: "Médio",  nps: 74 },
  { id: "JC008", name: "Arezzo",         segment: "Moda & Varejo",         mrr: 98_000,  ltv: 392_000,   since: "2025-02-15", status: "Ativo",        churnRisk: "Baixo",  nps: 79 },
  { id: "JC009", name: "Startup XYZ",    segment: "Tecnologia",            mrr: 0,       ltv: 145_000,   since: "2024-12-01", status: "Churned",      churnRisk: "—",      nps: 31 },
  { id: "JC010", name: "Magazine Luiza", segment: "Varejo",                mrr: 260_000, ltv: 1_040_000, since: "2025-03-01", status: "Ativo",        churnRisk: "Médio",  nps: 61 },
];

const churnHistory = [
  { month: "Out/25", novos: 2, churned: 1, net: 1 },
  { month: "Nov/25", novos: 1, churned: 0, net: 1 },
  { month: "Dez/25", novos: 3, churned: 1, net: 2 },
  { month: "Jan/26", novos: 2, churned: 1, net: 1 },
  { month: "Fev/26", novos: 1, churned: 0, net: 1 },
  { month: "Mar/26", novos: 2, churned: 0, net: 2 },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<string, string> = {
  "Ativo":    "badge badge-green",
  "Em Risco": "badge badge-yellow",
  "Churned":  "bg-red-50 text-red-600 border border-red-200 text-[10px] font-semibold px-2 py-0.5 rounded-full",
};

const churnRiskColor: Record<string, string> = {
  "Baixo": "text-emerald-600",
  "Médio": "text-amber-700",
  "Alto":  "text-red-600",
  "—":     "text-gray-500",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JacqesCustomersPage() {
  const ativos   = customers.filter((c) => c.status === "Ativo").length;
  const churned  = customers.filter((c) => c.status === "Churned").length;
  const emRisco  = customers.filter((c) => c.status === "Em Risco").length;
  const totalMrr = customers.filter((c) => c.status === "Ativo" || c.status === "Em Risco")
    .reduce((s, c) => s + c.mrr, 0);
  const totalLtv = customers.reduce((s, c) => s + c.ltv, 0);
  const avgLtv   = Math.round(totalLtv / customers.length);
  const churnRate = ((churned / customers.length) * 100).toFixed(1);
  const avgNps    = Math.round(
    customers.filter((c) => c.nps > 0).reduce((s, c) => s + c.nps, 0) /
    customers.filter((c) => c.nps > 0).length
  );

  return (
    <>
      <Header
        title="Customers — JACQES"
        subtitle="Carteira de clientes · LTV · Churn · NPS"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "MRR Total",       value: fmtR(totalMrr),    sub: `${ativos} clientes ativos`,    icon: DollarSign,    color: "text-emerald-600", bg: "bg-emerald-50", delta: "+14.2%", up: true  },
            { label: "LTV Médio",        value: fmtR(avgLtv),      sub: `Carteira: ${fmtR(totalLtv)}`, icon: TrendingUp,    color: "text-brand-600",   bg: "bg-brand-50",   delta: "+8.7%",  up: true  },
            { label: "Churn Rate",       value: churnRate + "%",   sub: "últimos 12 meses",            icon: TrendingDown,  color: "text-red-600",     bg: "bg-red-50",     delta: "-0.5pp", up: true  },
            { label: "NPS Médio",        value: String(avgNps),    sub: `${emRisco} em risco`,         icon: Users,         color: "text-violet-700",  bg: "bg-violet-50",  delta: "+3pts",  up: true  },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-slate-800">{card.value}</div>
                  <div className="text-xs font-medium text-gray-500 mt-0.5">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {card.up
                      ? <ArrowUpRight size={11} className="text-emerald-600" />
                      : <ArrowDownRight size={11} className="text-red-600" />}
                    <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-600" : "text-red-600"}`}>{card.delta}</span>
                    <span className="text-[10px] text-gray-500">{card.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Customer Table ────────────────────────────────────────────────── */}
          <div className="xl:col-span-2 card-elevated p-5">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-4">Carteira de Clientes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="text-left  py-2 px-3 text-xs font-bold text-white">Cliente</th>
                    <th className="text-left  py-2 px-3 text-xs font-bold text-white">Segmento</th>
                    <th className="text-right py-2 px-3 text-xs font-bold text-white">MRR</th>
                    <th className="text-right py-2 px-3 text-xs font-bold text-white">LTV</th>
                    <th className="text-right py-2 px-3 text-xs font-bold text-white">NPS</th>
                    <th className="text-left  py-2 px-3 text-xs font-bold text-white">Risco</th>
                    <th className="text-left  py-2 px-3 text-xs font-bold text-white">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 even:bg-gray-50/60 hover:bg-gray-100/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="text-gray-500 font-medium text-xs">{c.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">desde {c.since.split("-")[0]}</div>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{c.segment}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-slate-800">
                        {c.mrr > 0 ? fmtR(c.mrr) : <span className="text-gray-500">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-emerald-600">
                        {fmtR(c.ltv)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        {c.nps > 0 ? (
                          <span className={`font-bold ${c.nps >= 70 ? "text-emerald-600" : c.nps >= 50 ? "text-amber-700" : "text-red-600"}`}>
                            {c.nps}
                          </span>
                        ) : <span className="text-gray-500">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-xs">
                        <span className={`font-semibold ${churnRiskColor[c.churnRisk]}`}>{c.churnRisk}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={statusConfig[c.status] ?? "badge"}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2.5 px-3 text-xs font-bold text-gray-500">TOTAL</td>
                    <td />
                    <td className="py-2.5 px-3 text-right text-slate-800 font-bold text-xs">{fmtR(totalMrr)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold text-xs">{fmtR(totalLtv)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Churn History + Alerts ────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="card-elevated p-5">
              <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-4">Movimentação de Clientes</h2>
              <div className="space-y-1">
                <div className="grid grid-cols-4 pb-2 border-b border-gray-200">
                  <span className="text-[10px] text-gray-500">Mês</span>
                  <span className="text-[10px] text-gray-500 text-center">Novos</span>
                  <span className="text-[10px] text-gray-500 text-center">Churn</span>
                  <span className="text-[10px] text-gray-500 text-center">Net</span>
                </div>
                {churnHistory.map((row) => (
                  <div key={row.month} className="grid grid-cols-4 py-1.5 border-b border-gray-200/30 last:border-0">
                    <span className="text-xs text-gray-500">{row.month}</span>
                    <span className="text-xs text-emerald-600 text-center font-semibold">+{row.novos}</span>
                    <span className="text-xs text-red-600 text-center font-semibold">{row.churned > 0 ? `-${row.churned}` : "—"}</span>
                    <span className={`text-xs text-center font-bold ${row.net > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {row.net > 0 ? `+${row.net}` : row.net}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-elevated p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-700" />
                <h2 className="text-sm font-bold text-slate-800 tracking-tight">Alertas de Churn</h2>
              </div>
              <div className="space-y-3">
                {customers.filter((c) => c.churnRisk === "Alto" || c.status === "Em Risco").map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                    <AlertTriangle size={12} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-gray-500">{c.name}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        MRR em risco: {fmtR(c.mrr)} · NPS: {c.nps}
                      </div>
                    </div>
                  </div>
                ))}
                {customers.filter((c) => c.churnRisk === "Médio").slice(0, 2).map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                    <Clock size={12} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-gray-500">{c.name}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Risco médio · NPS: {c.nps}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <CheckCircle2 size={12} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-gray-500">{ativos - emRisco} clientes saudáveis</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Baixo risco de churn</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
