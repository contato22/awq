import Header from "@/components/Header";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Shield,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const portfolios = [
  {
    id: "PF01",
    client: "Família Andrade",
    type: "Family Office",
    aum: 42_800_000,
    strategy: "Multi-Market",
    retorno: 16.2,
    benchmark: 9.2,
    risk: "Moderado",
    since: "2024-06-01",
    status: "Ativo",
  },
  {
    id: "PF02",
    client: "Holding Ribeiro",
    type: "Family Office",
    aum: 31_200_000,
    strategy: "Renda Variável",
    retorno: 22.4,
    benchmark: 9.2,
    risk: "Agressivo",
    since: "2024-09-15",
    status: "Ativo",
  },
  {
    id: "PF03",
    client: "InvestCorp Brasil",
    type: "Institucional",
    aum: 28_560_000,
    strategy: "Renda Fixa",
    retorno: 11.8,
    benchmark: 10.5,
    risk: "Conservador",
    since: "2025-01-10",
    status: "Ativo",
  },
  {
    id: "PF04",
    client: "Dr. Paulo Mendes",
    type: "PF Qualificado",
    aum: 18_400_000,
    strategy: "Multi-Market",
    retorno: 14.6,
    benchmark: 9.2,
    risk: "Moderado",
    since: "2025-03-01",
    status: "Ativo",
  },
  {
    id: "PF05",
    client: "Tech Ventures LLC",
    type: "Institucional",
    aum: 14_280_000,
    strategy: "Real Estate (FII)",
    retorno: 12.1,
    benchmark: 8.4,
    risk: "Moderado",
    since: "2025-06-20",
    status: "Ativo",
  },
  {
    id: "PF06",
    client: "Grupo Serafim",
    type: "Family Office",
    aum: 7_560_000,
    strategy: "Renda Fixa",
    retorno: 9.8,
    benchmark: 10.5,
    risk: "Conservador",
    since: "2026-01-15",
    status: "Ativo",
  },
];

const totalAum = portfolios.reduce((s, p) => s + p.aum, 0);

const riskBadge: Record<string, string> = {
  "Conservador": "bg-emerald-50 text-emerald-600 border border-emerald-200",
  "Moderado":    "bg-amber-50 text-amber-700 border border-amber-200",
  "Agressivo":   "bg-red-50 text-red-600 border border-red-200",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdvisorPortfolioPage() {
  const avgRetorno = portfolios.reduce((s, p) => s + p.retorno * p.aum, 0) / totalAum;
  const topClient = portfolios[0];
  const topConcentration = (topClient.aum / totalAum) * 100;

  return (
    <>
      <Header
        title="Portfólio — Advisor"
        subtitle={`${portfolios.length} carteiras · ${fmtR(totalAum)} sob gestão`}
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "AUM Total",            value: fmtR(totalAum),                 icon: Briefcase,  color: "text-violet-700" },
            { label: "Carteiras Ativas",     value: String(portfolios.length),       icon: Users,      color: "text-brand-600" },
            { label: "Retorno Médio Pond.",  value: `+${avgRetorno.toFixed(1)}%`,   icon: TrendingUp, color: "text-emerald-600" },
            { label: "Maior Concentração",   value: `${topConcentration.toFixed(0)}%`, icon: AlertTriangle, color: "text-amber-700" },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon size={18} className={kpi.color} />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-800">{kpi.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Portfolio Table ───────────────────────────────────────────────── */}
        <div className="card-elevated p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Carteiras sob Gestão</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-white">Cliente</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-white">Tipo</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-white">Estratégia</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-white">AUM</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-white">% Total</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-white">Retorno</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-white">Benchmark</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-white">Risco</th>
                </tr>
              </thead>
              <tbody>
                {portfolios.map((p, idx) => {
                  const share = ((p.aum / totalAum) * 100).toFixed(1);
                  const alpha = p.retorno - p.benchmark;
                  return (
                    <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 1 ? "bg-gray-50/60" : ""}`}>
                      <td className="py-2.5 px-3">
                        <div className="text-xs font-medium text-gray-800">{p.client}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">Desde {new Date(p.since).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</div>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{p.type}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{p.strategy}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{fmtR(p.aum)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{share}%</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.retorno > p.benchmark
                            ? <ArrowUpRight size={10} className="text-emerald-600" />
                            : <ArrowDownRight size={10} className="text-red-600" />}
                          <span className={`text-xs font-bold ${p.retorno > p.benchmark ? "text-emerald-600" : "text-red-600"}`}>
                            +{p.retorno}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">
                        {p.benchmark}%
                        <span className={`ml-1 text-[10px] font-semibold ${alpha > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          ({alpha > 0 ? "+" : ""}{alpha.toFixed(1)}pp)
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${riskBadge[p.risk] ?? ""}`}>
                          <Shield size={9} />
                          {p.risk}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Concentration bars ───────────────────────────────────────────── */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Concentração por Cliente</h2>
            {topConcentration > 25 && (
              <div className="flex items-center gap-1">
                <AlertTriangle size={12} className="text-amber-700" />
                <span className="text-[10px] text-amber-700 font-semibold">Top client &gt;25% do AUM</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {portfolios.map((p) => {
              const pct = (p.aum / totalAum) * 100;
              const isRisky = pct > 25;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-800 font-medium">{p.client}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isRisky ? "text-red-600" : "text-slate-800"}`}>{pct.toFixed(1)}%</span>
                      <span className="text-[11px] text-gray-500">{fmtR(p.aum)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isRisky ? "bg-red-400" : "bg-gradient-to-r from-slate-600 to-slate-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </>
  );
}
