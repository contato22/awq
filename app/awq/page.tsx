import Header from "@/components/Header";
import AwqDataBanner from "@/components/AwqDataBanner";
import AwqEmptyState from "@/components/AwqEmptyState";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Users,
  Zap,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Activity,
  Wallet,
  Target,
  Building2,
  Scale,
} from "lucide-react";
import {
  buData,
  consolidated,
  riskSignals,
  allocFlags,
  flagConfig,
  monthlyRevenue,
  DATA_VERIFIED,
} from "@/lib/awq-group-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n === 0) return "—";
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function pct(n: number) {
  if (n === 0) return "—";
  return (n * 100).toFixed(1) + "%";
}

const severityConfig = {
  high:   { color: "text-red-600",    bg: "bg-red-50 border border-red-200",    dot: "bg-red-500"    },
  medium: { color: "text-amber-700",  bg: "bg-amber-50 border border-amber-200", dot: "bg-amber-500"  },
  low:    { color: "text-brand-600",  bg: "bg-brand-50 border border-brand-200", dot: "bg-brand-500"  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqGroupPage() {
  const hasFinancialData = consolidated.revenue > 0;
  const hasRiskData = riskSignals.length > 0;
  const hasMonthlyData = monthlyRevenue.length > 0;

  return (
    <>
      <Header
        title="AWQ Group — Control Tower"
        subtitle="Holding · Visao consolidada"
      />
      <AwqDataBanner />
      <div className="px-8 py-6 space-y-6">

        {/* ── Financial Summary ─────────────────────────────────────────────── */}
        {!hasFinancialData ? (
          <div className="card p-5">
            <AwqEmptyState
              title="Dados financeiros nao disponiveis"
              message="Os KPIs consolidados da AWQ ainda nao foram internalizados. Aguardando integracao com fonte financeira confiavel (ERP, contabilidade ou base interna verificada)."
            />
          </div>
        ) : null}

        {/* ── BU Scoreboard ─────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">BU Scoreboard</h2>
            </div>
            <Link href="/business-units" className="text-[11px] text-brand-600 hover:text-brand-500 flex items-center gap-1 transition-colors">
              Detalhes <ChevronRight size={12} />
            </Link>
          </div>
          {!hasFinancialData ? (
            <div className="py-8 text-center">
              <p className="text-xs text-gray-400">Sem dados financeiros por BU no momento</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">BU</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">M. Bruta</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">EBITDA</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro Liq.</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Clientes</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">ROIC</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Flag</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Drill</th>
                  </tr>
                </thead>
                <tbody>
                  {buData.map((bu) => {
                    const flag = allocFlags[bu.id];
                    const flagCfg = flagConfig[flag];
                    return (
                      <tr key={bu.id} className="border-b border-gray-100 hover:bg-gray-100 transition-colors group">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                            <div>
                              <div className="text-xs font-bold text-gray-900">{bu.name}</div>
                              <div className="text-[10px] text-gray-400">{bu.sub.split(" · ")[0]}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-400">{fmtR(bu.revenue)}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-400">—</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-400">—</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-400">{fmtR(bu.netIncome)}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-400">{bu.customers || "—"}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-400">{bu.roic > 0 ? bu.roic.toFixed(0) + "%" : "—"}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${flagCfg.bg} ${flagCfg.color}`}>
                            {flagCfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <Link href={bu.hrefFinancial} className="text-[10px] text-brand-600 hover:text-brand-500 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            P&L <ChevronRight size={10} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Risk Panel ───────────────────────────────────────────────────── */}
          <div className="xl:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} className="text-red-600" />
                <h2 className="text-sm font-semibold text-gray-900">Risk Signals</h2>
              </div>
              <Link href="/awq/risk" className="text-[11px] text-brand-600 hover:text-brand-500 flex items-center gap-1 transition-colors">
                Ver todos <ChevronRight size={12} />
              </Link>
            </div>
            {!hasRiskData ? (
              <div className="py-8 text-center">
                <p className="text-xs text-gray-400">Sem sinais de risco cadastrados no momento</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {riskSignals.map((risk) => {
                  const cfg = severityConfig[risk.severity];
                  return (
                    <div key={risk.id} className={`flex items-start gap-3 p-3 rounded-lg ${cfg.bg}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0 mt-1.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-semibold ${cfg.color}`}>{risk.title}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">{risk.bu}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{risk.description}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-[10px] font-bold ${cfg.color}`}>{risk.metric}</div>
                        <div className="text-[10px] text-gray-400">{risk.threshold}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Capital Allocation ───────────────────────────────────────────── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={14} className="text-amber-700" />
                <h2 className="text-sm font-semibold text-gray-900">Capital Allocation</h2>
              </div>
              <Link href="/awq/allocations" className="text-[11px] text-brand-600 hover:text-brand-500 flex items-center gap-1 transition-colors">
                Detalhes <ChevronRight size={12} />
              </Link>
            </div>
            {!hasFinancialData ? (
              <div className="py-8 text-center">
                <p className="text-xs text-gray-400">Sem dados de capital verificados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {buData.map((bu) => {
                  const flag = allocFlags[bu.id];
                  const flagCfg = flagConfig[flag];
                  return (
                    <div key={bu.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                          <span className="text-xs text-gray-400">{bu.name}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${flagCfg.color} ${flagCfg.bg} px-1.5 py-0.5 rounded`}>
                          {flagCfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Revenue Trend ─────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Receita Consolidada por BU</h2>
            <Link href="/awq/financial" className="text-[11px] text-brand-600 hover:text-brand-500 flex items-center gap-1 transition-colors">
              Ver P&L completo <ChevronRight size={12} />
            </Link>
          </div>
          {!hasMonthlyData ? (
            <div className="py-8 text-center">
              <p className="text-xs text-gray-400">Sem dados mensais de receita disponiveis</p>
            </div>
          ) : (
            <div className="space-y-2">
              {monthlyRevenue.map((m) => {
                const maxTotal = Math.max(...monthlyRevenue.map((r) => r.total));
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-12 shrink-0">{m.month}</span>
                    <div className="flex-1 flex h-5 rounded-full overflow-hidden gap-0.5">
                      {[
                        { value: m.jacqes,  bg: "bg-brand-500"   },
                        { value: m.caza,    bg: "bg-emerald-500" },
                        { value: m.advisor, bg: "bg-violet-500"  },
                      ].map((seg, i) => (
                        <div
                          key={i}
                          className={`${seg.bg} h-full`}
                          style={{ width: `${(seg.value / maxTotal) * 100 * (seg.value / m.total)}%` }}
                          title={fmtR(seg.value)}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-gray-900 w-20 text-right shrink-0">{fmtR(m.total)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Drill-Down Navigation ─────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-900">Drill-Down por BU</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {buData.map((bu) => (
              <div key={bu.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-6 h-6 rounded-lg ${bu.color} flex items-center justify-center shrink-0`}>
                    <Building2 size={11} className="text-gray-900" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">{bu.name}</div>
                    <div className="text-[10px] text-gray-400">{bu.sub.split(" · ")[0]}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  {[
                    { label: "Visao Geral",    href: bu.hrefOverview   },
                    { label: "Financial",       href: bu.hrefFinancial  },
                    { label: "Customers",       href: bu.hrefCustomers  },
                    { label: "Unit Economics",  href: bu.hrefUnitEcon   },
                    { label: "Budget",          href: bu.hrefBudget     },
                  ].map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <span className="text-[11px] text-gray-500 group-hover:text-gray-400 transition-colors">{link.label}</span>
                      <ChevronRight size={10} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick Nav to AWQ Sub-pages ────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: "Financial",    sub: "P&L consolidado",         href: "/awq/financial",   icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Cash Flow",    sub: "Fluxo de caixa",           href: "/awq/cashflow",    icon: Zap,        color: "text-cyan-700",    bg: "bg-cyan-50"    },
            { label: "Budget",       sub: "Budget vs Actual",         href: "/awq/budget",      icon: Scale,      color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "Forecast",     sub: "Cenarios 2026",            href: "/awq/forecast",    icon: TrendingUp, color: "text-violet-700",  bg: "bg-violet-50"  },
            { label: "Allocations",  sub: "Capital por BU",           href: "/awq/allocations", icon: Wallet,     color: "text-amber-700",   bg: "bg-amber-50"   },
            { label: "Risk",         sub: "Risk signals",             href: "/awq/risk",        icon: AlertTriangle, color: "text-red-600",  bg: "bg-red-50"     },
            { label: "BUs",          sub: "Todas as unidades",         href: "/business-units",  icon: Activity,   color: "text-gray-400",    bg: "bg-gray-500/10"    },
            { label: "AWQ Venture",  sub: "Portfolio de investimentos",href: "/awq-venture",     icon: BarChart3,  color: "text-amber-700",   bg: "bg-amber-50"   },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="card p-4 flex items-center gap-3 hover:border-gray-300 transition-all group"
              >
                <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={14} className={item.color} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900 group-hover:text-brand-500 transition-colors">{item.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{item.sub}</div>
                </div>
                <ChevronRight size={12} className="text-gray-400 group-hover:text-brand-600 ml-auto transition-colors" />
              </Link>
            );
          })}
        </div>

      </div>
    </>
  );
}
