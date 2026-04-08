import Header from "@/components/Header";
import Link from "next/link";
import {
  Building2,
  TrendingUp,
  DollarSign,
  BarChart3,
  ChevronRight,
  ArrowUpRight,
  Wallet,
  Target,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { getDealHoldingSummaries } from "@/lib/deal-data";
import {
  buData,
  consolidated,
  consolidatedRoic,
  allocFlags,
  flagConfig,
} from "@/lib/awq-derived-metrics";
import { getPortfolioMetrics, fmtBRL } from "@/lib/financial-metric-query";

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

export default async function AwqPortfolioPage() {
  const pm  = await getPortfolioMetrics();
  const totalCap      = pm.totalCapitalAllocated.value;
  const totalNetIncome = pm.totalNetIncome.value;

  return (
    <>
      <Header
        title="Portfolio — AWQ Group"
        subtitle="Visão consolidada do grupo · Jan–Mar 2026"
      />
      <div className="page-container">

        {/* ── Group summary ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "BUs no Portfolio",        value: buData.length.toString(),             icon: Building2,  color: "text-brand-600",   bg: "bg-brand-50",   isReal: false },
            { label: "Capital Total",            value: fmtR(totalCap),                       icon: Wallet,     color: "text-amber-700",   bg: "bg-amber-50",   isReal: false },
            { label: pm.realCashBalance.source_type !== "empty" ? "Caixa Real (Pipeline)" : "Caixa (Pipeline)",
              value: pm.realCashBalance.source_type !== "empty" ? fmtBRL(pm.realCashBalance.value!) : "Aguardando extratos", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", isReal: true  },
            { label: "ROIC Consolidado",         value: `${consolidatedRoic.toFixed(1)}%`,    icon: TrendingUp, color: "text-violet-700",  bg: "bg-violet-50",  isReal: false },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className={`card p-5 flex items-start gap-4 ${(c as {isReal?: boolean}).isReal ? "border-emerald-200 bg-emerald-50/20" : ""}`}>
                <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={c.color} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{c.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5 flex items-center gap-1">
                    {c.label}
                    {(c as {isReal?: boolean}).isReal && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">REAL</span>
                    )}
                  </div>
                  {!(c as {isReal?: boolean}).isReal && (
                    <div className="text-[9px] text-amber-500 mt-0.5">snapshot</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── BU Cards ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {buData.map((bu) => {
            const flag    = allocFlags[bu.id];
            const flagCfg = flagConfig[flag];
            const capShare = totalCap > 0 ? ((bu.capitalAllocated / totalCap) * 100).toFixed(1) : "0";
            const grossMargin = bu.revenue > 0 ? ((bu.grossProfit / bu.revenue) * 100).toFixed(0) : null;
            const isVenture = bu.id === "venture";
            return (
              <div key={bu.id} className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${bu.color} flex items-center justify-center shrink-0`}>
                      <Building2 size={16} className="text-gray-900" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{bu.name}</div>
                      <div className="text-[11px] text-gray-500">{bu.sub}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${flagCfg.bg} ${flagCfg.color}`}>
                    {flagCfg.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    {
                      label: "Capital",
                      value: fmtR(bu.capitalAllocated),
                      sub: `${capShare}% do grupo`,
                    },
                    {
                      label: "Lucro Líquido",
                      value: fmtR(bu.netIncome),
                      sub: isVenture ? "Exit Saúde Digital" : (grossMargin ? `M. Bruta ${grossMargin}%` : "—"),
                    },
                    {
                      label: "ROIC",
                      value: `${bu.roic.toFixed(0)}%`,
                      sub: bu.roic >= 30 ? "Excelente" : bu.roic >= 15 ? "Bom" : "Em revisão",
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-3 rounded-lg bg-gray-100">
                      <div className={`text-lg font-bold ${bu.accentColor}`}>{stat.value}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{stat.label}</div>
                      <div className="text-[9px] text-gray-400 mt-0.5">{stat.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Capital bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Capital alocado</span>
                    <span>{capShare}% do portfólio</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${bu.color} rounded-full`} style={{ width: `${capShare}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <div className="flex gap-3 text-[10px] text-gray-400">
                    <span>Caixa: <span className="text-gray-400 font-semibold">{fmtR(bu.cashBalance)}</span><span className="ml-1 px-1 py-0.5 rounded text-[8px] font-semibold bg-amber-100 text-amber-700">snapshot</span></span>
                    <span>FTEs: <span className="text-gray-400 font-semibold">{bu.ftes}</span></span>
                  </div>
                  <Link
                    href={bu.hrefOverview}
                    className="text-[10px] text-brand-600 hover:text-brand-500 flex items-center gap-0.5 transition-colors"
                  >
                    Detalhes <ChevronRight size={10} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Capital allocation table ───────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-amber-700" />
            <h2 className="text-sm font-semibold text-gray-900">Alocação de Capital</h2>
            <Link href="/awq/allocations" className="ml-auto text-[11px] text-brand-600 hover:text-brand-500 flex items-center gap-1 transition-colors">
              Análise completa <ChevronRight size={12} />
            </Link>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-left  py-2 px-3 font-semibold">BU</th>
                  <th className="text-right py-2 px-3 font-semibold">Capital</th>
                  <th className="text-right py-2 px-3 font-semibold">% Portfolio</th>
                  <th className="text-right py-2 px-3 font-semibold">ROIC</th>
                  <th className="text-right py-2 px-3 font-semibold">Cash Gerado</th>
                  <th className="text-right py-2 px-3 font-semibold">Lucro Líq.</th>
                  <th className="text-left  py-2 px-3 font-semibold">Flag</th>
                </tr>
              </thead>
              <tbody>
                {[...buData]
                  .sort((a, b) => b.roic - a.roic)
                  .map((bu) => {
                    const flag    = allocFlags[bu.id];
                    const flagCfg = flagConfig[flag];
                    const share   = totalCap > 0 ? ((bu.capitalAllocated / totalCap) * 100).toFixed(1) : "0";
                    return (
                      <tr key={bu.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                            <span className="text-xs font-bold text-gray-900">{bu.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-gray-900">{fmtR(bu.capitalAllocated)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-400">{share}%</td>
                        <td className={`py-2.5 px-3 text-right font-bold ${bu.roic >= 30 ? "text-emerald-600" : bu.roic >= 15 ? "text-amber-700" : "text-red-600"}`}>
                          {bu.roic.toFixed(0)}%
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600">{fmtR(bu.cashGenerated)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-900">{fmtR(bu.netIncome)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${flagCfg.bg} ${flagCfg.color}`}>
                            {flagCfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                <tr className="border-t border-gray-300 bg-gray-50">
                  <td className="py-2.5 px-3 text-xs font-bold text-gray-400">TOTAL</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(totalCap)}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-400">100%</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{consolidatedRoic.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{fmtR(consolidated.cashGenerated)}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(totalNetIncome)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Quick nav ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Financial",   href: "/awq/financial",   icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Allocations", href: "/awq/allocations", icon: Wallet,     color: "text-amber-700",   bg: "bg-amber-50"   },
            { label: "KPIs",        href: "/awq/kpis",         icon: BarChart3,  color: "text-violet-700",  bg: "bg-violet-50"  },
            { label: "Control Tower",href: "/awq",             icon: Building2,  color: "text-brand-600",   bg: "bg-brand-50"   },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} className="card p-4 flex items-center gap-3 hover:border-gray-300 transition-all group">
                <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={14} className={item.color} />
                </div>
                <span className="text-xs font-semibold text-gray-900 group-hover:text-brand-500 transition-colors">{item.label}</span>
                <ChevronRight size={12} className="text-gray-400 group-hover:text-brand-600 ml-auto transition-colors" />
              </Link>
            );
          })}
        </div>

        {/* ── Deals AWQ Venture (resumo consolidado — read-only) ────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase size={14} className="text-violet-600" />
            <h2 className="text-sm font-semibold text-gray-900">Propostas de Aquisição — AWQ Venture</h2>
            <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">READ-ONLY</span>
            <Link href="/awq-venture/deals" className="ml-auto text-[11px] text-brand-600 hover:text-brand-500 flex items-center gap-1 transition-colors">
              Ver workspace <ChevronRight size={12} />
            </Link>
          </div>
          <p className="text-[11px] text-gray-400 mb-4">Resumo autorizado pela AWQ Venture. Origem e edição exclusivas na BU.</p>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {["Empresa","Setor","Stage","Valor Proposto","Valuation","Risco","Upside","Status","Responsável"].map((h) => (
                    <th key={h} className={`py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${h==="Valor Proposto"||h==="Upside"?"text-right":"text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {getDealHoldingSummaries().map((d) => (
                  <tr key={d.dealId} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-gray-900">{d.companyName}</div>
                      <div className="text-[10px] text-gray-400">{d.dealId}</div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">{d.sector}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] font-medium text-gray-700">{d.stage}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-600 tabular-nums">
                      {d.proposedValue >= 1_000_000 ? "R$"+(d.proposedValue/1_000_000).toFixed(1)+"M" : "R$"+(d.proposedValue/1_000).toFixed(0)+"K"}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-[11px]">{d.valuationRange}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        d.riskLevel==="Baixo"?"bg-emerald-50 text-emerald-700":
                        d.riskLevel==="Médio"?"bg-amber-50 text-amber-700":
                        "bg-red-50 text-red-700"
                      }`}>{d.riskLevel}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 tabular-nums">
                      {d.expectedUpside !== null ? `+${d.expectedUpside.toFixed(0)}%` : "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[11px] font-medium ${
                        d.sendStatus==="Aprovado"?"text-emerald-600":
                        d.sendStatus==="Enviado"||d.sendStatus==="Em Negociação"?"text-blue-600":
                        d.sendStatus==="Pronto para Envio"?"text-amber-600":
                        "text-gray-400"
                      }`}>{d.sendStatus}</span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">{d.assignee}</td>
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
