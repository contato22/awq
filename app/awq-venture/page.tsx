import Header from "@/components/Header";
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtMult(x: number) {
  return x.toFixed(2) + "×";
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const portfolio = [
  { id: "AV001", company: "TechFlow Soluções", sector: "B2B SaaS",  stage: "Series A", invested: 8_000_000,  currentVal: 22_400_000, returned: 0,          entryDate: "Mar 2022", status: "Ativo",            irr: 38.4, ownership: 18.5 },
  { id: "AV002", company: "Verde Energia",     sector: "CleanTech", stage: "Series B", invested: 12_000_000, currentVal: 31_200_000, returned: 0,          entryDate: "Jul 2021", status: "Ativo",            irr: 28.6, ownership: 12.0 },
  { id: "AV003", company: "Saúde Digital",     sector: "HealthTech",stage: "Exit",     invested: 5_000_000,  currentVal: 0,          returned: 18_500_000, entryDate: "Mai 2020", status: "Exitado",          irr: 52.1, ownership: 0    },
  { id: "AV004", company: "AgriSmart",         sector: "AgTech",    stage: "Seed",     invested: 2_000_000,  currentVal: 4_600_000,  returned: 0,          entryDate: "Set 2023", status: "Ativo",            irr: 31.2, ownership: 22.0 },
  { id: "AV005", company: "FinBridge",         sector: "Fintech",   stage: "Series A", invested: 6_500_000,  currentVal: 5_200_000,  returned: 0,          entryDate: "Jan 2023", status: "Em monitoramento", irr: -6.2, ownership: 15.0 },
  { id: "AV006", company: "Logística Plus",    sector: "LogTech",   stage: "Series A", invested: 7_000_000,  currentVal: 14_700_000, returned: 0,          entryDate: "Nov 2022", status: "Ativo",            irr: 24.8, ownership: 20.0 },
];

const pipeline = [
  { company: "MedIA Health",  sector: "HealthTech", stage: "Due Diligence", ticket: 4_000_000,  eta: "Q2 2026" },
  { company: "EduFlow",       sector: "EdTech",     stage: "Term Sheet",    ticket: 3_000_000,  eta: "Q2 2026" },
  { company: "CarbonX",       sector: "CleanTech",  stage: "Prospecção",    ticket: 8_000_000,  eta: "Q3 2026" },
];

const alerts = [
  { id: 1, type: "warning", message: "FinBridge: IRR negativo — revisão Q2 agendada" },
  { id: 2, type: "success", message: "Saúde Digital exit concluído — R$18.5M retornados" },
  { id: 3, type: "info",    message: "MedIA Health: due diligence em andamento" },
];

const statusIcon: Record<string, React.ElementType> = {
  "Ativo":            CheckCircle2,
  "Exitado":          Zap,
  "Em monitoramento": AlertTriangle,
};

const statusBadge: Record<string, string> = {
  "Ativo":            "badge badge-green",
  "Exitado":          "badge badge-blue",
  "Em monitoramento": "badge badge-yellow",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqVenturePage() {
  const totalInvested   = portfolio.reduce((s, p) => s + p.invested, 0);
  const totalCurrentVal = portfolio.reduce((s, p) => s + p.currentVal, 0);
  const totalReturned   = portfolio.reduce((s, p) => s + p.returned, 0);
  const totalValue      = totalCurrentVal + totalReturned;
  const moic            = totalValue / totalInvested;
  const avgIrr          = portfolio.reduce((s, p) => s + p.irr, 0) / portfolio.length;
  const ativos          = portfolio.filter((p) => p.status === "Ativo").length;

  return (
    <>
      <Header
        title="AWQ Venture"
        subtitle="Visão Geral · Investimentos · AWQ Group · Q1 2026"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: "Capital Investido",
              value: fmtR(totalInvested),
              sub: `${portfolio.length} investimentos`,
              delta: "+R$15M em 2026",
              up: true,
              icon: DollarSign,
              color: "text-amber-400",
              bg: "bg-amber-500/10",
            },
            {
              label: "Valor do Portfólio",
              value: fmtR(totalValue),
              sub: "atual + retornado",
              delta: `MOIC ${fmtMult(moic)}`,
              up: true,
              icon: BarChart3,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
            },
            {
              label: "IRR Médio",
              value: `+${avgIrr.toFixed(1)}%`,
              sub: "anualizado · portfólio",
              delta: `${ativos} investimentos ativos`,
              up: true,
              icon: TrendingUp,
              color: "text-brand-400",
              bg: "bg-brand-500/10",
            },
            {
              label: "Capital Retornado",
              value: fmtR(totalReturned),
              sub: "1 exit concluído",
              delta: "Saúde Digital 3.7×",
              up: true,
              icon: Zap,
              color: "text-violet-400",
              bg: "bg-violet-500/10",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-white">{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {card.up
                      ? <ArrowUpRight size={11} className="text-emerald-400" />
                      : <ArrowDownRight size={11} className="text-red-400" />}
                    <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-400" : "text-red-400"}`}>{card.delta}</span>
                    <span className="text-[10px] text-gray-600">{card.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Portfolio + Alerts ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Portfolio table */}
          <div className="xl:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Portfólio Ativo</h2>
              <Link
                href="/awq-venture/portfolio"
                className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                Ver todos <ChevronRight size={11} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left  py-2 px-2 text-xs font-semibold text-gray-500">Empresa</th>
                    <th className="text-left  py-2 px-2 text-xs font-semibold text-gray-500">Setor</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Investido</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Valor Atual</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">IRR</th>
                    <th className="text-left  py-2 px-2 text-xs font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((p) => {
                    const Icon = statusIcon[p.status] ?? Clock;
                    return (
                      <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="py-2.5 px-2">
                          <div className="text-xs font-medium text-gray-200">{p.company}</div>
                          <div className="text-[10px] text-gray-600">{p.stage}</div>
                        </td>
                        <td className="py-2.5 px-2 text-xs text-gray-400">{p.sector}</td>
                        <td className="py-2.5 px-2 text-right text-xs font-semibold text-white">{fmtR(p.invested)}</td>
                        <td className="py-2.5 px-2 text-right text-xs font-semibold">
                          {p.status === "Exitado"
                            ? <span className="text-violet-400">{fmtR(p.returned)}</span>
                            : <span className="text-white">{fmtR(p.currentVal)}</span>}
                        </td>
                        <td className="py-2.5 px-2 text-right text-xs font-bold">
                          <span className={p.irr >= 0 ? "text-emerald-400" : "text-red-400"}>
                            {p.irr >= 0 ? "+" : ""}{p.irr.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-flex items-center gap-1 ${statusBadge[p.status] ?? "badge"}`}>
                            <Icon size={9} />
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Alerts */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Alertas</h2>
                <span className="badge badge-yellow">{alerts.length}</span>
              </div>
              <div className="space-y-2.5">
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5">
                    <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                      a.type === "warning" ? "bg-yellow-400" :
                      a.type === "success" ? "bg-emerald-400" : "bg-brand-400"
                    }`} />
                    <span className="text-xs text-gray-400">{a.message}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline preview */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Pipeline</h2>
                <Link
                  href="/awq-venture/pipeline"
                  className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  Ver <ChevronRight size={11} />
                </Link>
              </div>
              <div className="space-y-3">
                {pipeline.map((deal) => (
                  <div key={deal.company} className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-gray-200">{deal.company}</div>
                      <div className="text-[10px] text-gray-600">{deal.sector} · {deal.eta}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-amber-400">{fmtR(deal.ticket)}</div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{deal.stage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stage Breakdown ────────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Distribuição por Stage</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Seed",     count: portfolio.filter((p) => p.stage === "Seed").length,     color: "bg-amber-500" },
              { label: "Series A", count: portfolio.filter((p) => p.stage === "Series A").length, color: "bg-brand-500" },
              { label: "Series B", count: portfolio.filter((p) => p.stage === "Series B").length, color: "bg-emerald-500" },
              { label: "Exit",     count: portfolio.filter((p) => p.stage === "Exit").length,     color: "bg-violet-500" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40">
                <div className={`w-3 h-3 rounded-full ${s.color} shrink-0`} />
                <div>
                  <div className="text-lg font-bold text-white">{s.count}</div>
                  <div className="text-[10px] text-gray-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
