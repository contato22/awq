// ─── /awq/epm — EPM Overview Dashboard ───────────────────────────────────────
//
// Aggregates data from:
//   • dre-query.ts      (P&L cash-basis from bank pipeline)
//   • epm-gl.ts         (accrual GL entries added manually)
//   • awq-derived-metrics (planning/budget snapshot)
// Shows the "EPM Hub" — quick status of all EPM modules.

import Header from "@/components/Header";
import Link from "next/link";
import {
  Layers, LineChart, Scale, Target, PieChart,
  ArrowDownLeft, ArrowUpRight, ListOrdered, Building2,
  ChevronRight, CheckCircle2, AlertTriangle, Database,
  TrendingUp, DollarSign, BarChart3, Landmark, BookOpen, LayoutGrid,
  Users, Receipt,
} from "lucide-react";
import { buildDreQuery } from "@/lib/dre-query";
import { getAllGLEntries, getBalanceSheet } from "@/lib/epm-gl";
import { budgetVsActual, consolidated, consolidatedMargins } from "@/lib/awq-derived-metrics";

function fmtBRL(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

// ─── Module Card ─────────────────────────────────────────────────────────────

interface ModuleCard {
  label:    string;
  sub:      string;
  href:     string;
  icon:     React.ElementType;
  color:    string;
  bg:       string;
  status:   "active" | "stub";
  badge?:   string;
}

const EPM_MODULES: ModuleCard[] = [
  { label: "P&L (DRE)",          sub: "Demonstração de Resultado",    href: "/awq/epm/pl",             icon: LineChart,     color: "text-emerald-600", bg: "bg-emerald-50",  status: "active" },
  { label: "Balanço Patrimonial", sub: "Activo = Passivo + PL",        href: "/awq/epm/balance-sheet",  icon: Scale,         color: "text-brand-600",   bg: "bg-brand-50",    status: "active" },
  { label: "Budget vs Actual",    sub: "Variance analysis",            href: "/awq/epm/budget",         icon: Target,        color: "text-violet-600",  bg: "bg-violet-50",   status: "active" },
  { label: "KPI Dashboard",       sub: "MRR, EBITDA, Runway…",         href: "/awq/epm/kpis",           icon: PieChart,      color: "text-cyan-700",    bg: "bg-cyan-50",     status: "active" },
  { label: "Contas a Pagar",      sub: "AP · Aging · DPO",             href: "/awq/epm/ap",                     icon: ArrowDownLeft, color: "text-red-600",     bg: "bg-red-50",      status: "active" },
  { label: "Contas a Receber",    sub: "AR · Aging · DSO",             href: "/awq/epm/ar",                     icon: ArrowUpRight,  color: "text-emerald-600", bg: "bg-emerald-50",  status: "active" },
  { label: "Razão Geral (GL)",    sub: "Lançamentos contábeis",        href: "/awq/epm/gl",                     icon: ListOrdered,   color: "text-amber-700",   bg: "bg-amber-50",    status: "active" },
  { label: "Consolidação",        sub: "Multi-entidade · Holding",     href: "/awq/epm/consolidation",          icon: Building2,     color: "text-violet-600",  bg: "bg-violet-50",   status: "active" },
  { label: "Conciliação Bancária",sub: "Auto-match transações × AP/AR",href: "/awq/epm/bank-reconciliation",    icon: Landmark,      color: "text-cyan-700",    bg: "bg-cyan-50",     status: "active" },
  { label: "Reconhec. de Receita",sub: "Competência · Caixa · Marco",  href: "/awq/epm/revenue-recognition",   icon: BookOpen,      color: "text-indigo-600",  bg: "bg-indigo-50",   status: "active" },
  { label: "Centros de Custo",    sub: "CC por BU e categoria",        href: "/awq/epm/cost-centers",          icon: LayoutGrid,    color: "text-orange-600",  bg: "bg-orange-50",   status: "active" },
  { label: "Fornecedores",        sub: "Cadastro de fornecedores",     href: "/awq/epm/suppliers",             icon: Building2,     color: "text-teal-600",    bg: "bg-teal-50",     status: "active" },
  { label: "Clientes",            sub: "Cadastro de clientes",         href: "/awq/epm/customers",             icon: Users,         color: "text-brand-600",   bg: "bg-brand-50",    status: "active" },
  { label: "AP Aging",            sub: "Vencimentos por faixa",        href: "/awq/epm/ap/aging",              icon: Receipt,       color: "text-amber-600",   bg: "bg-amber-50",    status: "active" },
  { label: "AR Aging",            sub: "Recebíveis por faixa",         href: "/awq/epm/ar/aging",              icon: Receipt,       color: "text-emerald-600", bg: "bg-emerald-50",  status: "active" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EpmOverviewPage() {
  const [dre, balanceSheet, glEntries] = await Promise.all([
    buildDreQuery("all"),
    Promise.resolve(getBalanceSheet()),
    Promise.resolve(getAllGLEntries()),
  ]);

  const bva       = budgetVsActual;
  const snap      = consolidated;
  const glCount   = glEntries.length;
  const glPeriods = [...new Set(glEntries.map((e) => e.period_code))].sort().reverse();

  // Derive summary numbers: prefer real DRE data, fall back to snapshot
  const revenue   = dre.hasData ? dre.dreRevenue     : snap.revenue;
  const ebitda    = dre.hasData ? dre.dreEBITDA      : snap.ebitda;
  const gmPct     = dre.hasData ? dre.dreGrossMargin : consolidatedMargins.grossMargin;
  const ebitdaPct = dre.hasData ? dre.dreEBITDAMargin        : consolidatedMargins.ebitdaMargin;
  const snapCogs  = snap.revenue - snap.grossProfit;
  const snapRevenueVariance = snap.revenue - snap.budgetRevenue;
  const dataLabel = dre.hasData ? "Base bancária real" : "Snapshot planejamento";

  return (
    <>
      <Header
        title="EPM — Enterprise Performance Management"
        subtitle={`AWQ Group · ${dataLabel} · ${dre.hasData && dre.periodStart ? dre.periodStart.slice(0, 7) : "2026"}`}
      />
      <div className="page-container">

        {/* ── Data source indicator ───────────────────────────────────────── */}
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium border ${
          dre.hasData
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          {dre.hasData
            ? <CheckCircle2 size={13} className="shrink-0" />
            : <AlertTriangle size={13} className="shrink-0" />}
          <span>
            {dre.hasData
              ? `Dados reais ativos — ${dre.transactionCount} transações bancárias · ${dre.periodStart?.slice(0,7)} → ${dre.periodEnd?.slice(0,7)}`
              : `Snapshot de planejamento ativo. Ingira extratos bancários em `}
          </span>
          {!dre.hasData && (
            <Link href="/awq/conciliacao" className="underline font-semibold">
              /awq/conciliacao
            </Link>
          )}
          {glCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
              +{glCount / 2} lançamentos GL manuais
            </span>
          )}
        </div>

        {/* ── P&L Summary Cards ────────────────────────────────────────────── */}
        <section>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            P&L Consolidado — Visão Rápida
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Receita",        value: fmtBRL(revenue),   icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "COGS",           value: fmtBRL(dre.hasData ? dre.dreCOGS : snapCogs),               icon: BarChart3, color: "text-red-600",     bg: "bg-red-50"     },
              { label: "Lucro Bruto",    value: fmtBRL(dre.hasData ? dre.dreGrossProfit : snap.grossProfit), icon: TrendingUp, color: "text-brand-600", bg: "bg-brand-50" },
              { label: "Margem Bruta",   value: gmPct !== null ? ((gmPct) * 100).toFixed(1) + "%" : "—",         icon: PieChart,   color: "text-brand-600",   bg: "bg-brand-50"   },
              { label: "EBITDA",         value: fmtBRL(ebitda),    icon: Target,     color: ebitda >= 0 ? "text-emerald-600" : "text-red-600", bg: ebitda >= 0 ? "bg-emerald-50" : "bg-red-50" },
              { label: "Margem EBITDA",  value: ebitdaPct !== null ? ((ebitdaPct) * 100).toFixed(1) + "%" : "—", icon: Layers,     color: "text-violet-600",  bg: "bg-violet-50"  },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="card p-4 flex flex-col gap-1">
                  <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <Icon size={13} className={card.color} />
                  </div>
                  <div className="text-base font-bold text-gray-900 tabular-nums mt-1">{card.value}</div>
                  <div className="text-[10px] text-gray-400 font-medium">{card.label}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Balance Sheet quick check ─────────────────────────────────────── */}
        {balanceSheet.hasData && (
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Scale size={14} className="text-brand-600" />
                <span className="text-sm font-semibold text-gray-900">Balanço — Check de Equilíbrio</span>
              </div>
              <Link href="/awq/epm/balance-sheet" className="text-xs text-brand-600 hover:underline font-medium">
                Ver completo →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Ativo Total",      value: fmtBRL(balanceSheet.totalAssets),      color: "text-brand-700"   },
                { label: "Passivo Total",     value: fmtBRL(balanceSheet.totalLiabilities), color: "text-red-700"     },
                { label: "Patrimônio Líquido",value: fmtBRL(balanceSheet.totalEquity),      color: "text-emerald-700" },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-xl py-4">
                  <div className={`text-lg font-bold tabular-nums ${item.color}`}>{item.value}</div>
                  <div className="text-[11px] text-gray-500 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
            <div className={`mt-3 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${
              balanceSheet.isBalanced
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {balanceSheet.isBalanced
                ? <><CheckCircle2 size={12} /> Equação patrimonial balanceada: Ativo = Passivo + PL</>
                : <><AlertTriangle size={12} /> Equação desequilibrada — verifique lançamentos GL</>}
            </div>
          </section>
        )}

        {/* ── Budget vs Actual ────────────────────────────────────────────── */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-violet-600" />
              <span className="text-sm font-semibold text-gray-900">Budget vs Actual — YTD 2026</span>
            </div>
            <Link href="/awq/epm/budget" className="text-xs text-brand-600 hover:underline font-medium">
              Detalhar →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Receita Real",    value: fmtBRL(snap.revenue),               color: "text-emerald-700" },
              { label: "Receita Budget",  value: fmtBRL(snap.budgetRevenue),          color: "text-gray-700"    },
              { label: "Variância R$",    value: fmtBRL(snapRevenueVariance),
                color: snapRevenueVariance >= 0 ? "text-emerald-600" : "text-red-600" },
              { label: "Variância %",     value: (bva >= 0 ? "+" : "") + bva.toFixed(1) + "%",
                color: bva >= 0 ? "text-emerald-600" : "text-red-600" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className={`text-sm font-bold tabular-nums ${item.color}`}>{item.value}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── GL quick status ──────────────────────────────────────────────── */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListOrdered size={14} className="text-amber-600" />
              <span className="text-sm font-semibold text-gray-900">Razão Geral (GL)</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/awq/epm/gl/add" className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-semibold transition-colors">
                + Lançamento
              </Link>
              <Link href="/awq/epm/gl" className="text-xs text-brand-600 hover:underline font-medium">
                Ver razão →
              </Link>
            </div>
          </div>
          {glCount === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Database size={28} className="text-gray-200" />
              <div className="text-sm text-gray-400">Nenhum lançamento GL manual ainda</div>
              <div className="text-xs text-gray-400">
                Os dados acima vêm dos extratos bancários. Use o GL para lançamentos accrual (provisões, depreciação, etc.)
              </div>
              <Link href="/awq/epm/gl/add"
                className="mt-2 text-xs px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-semibold transition-colors">
                Criar primeiro lançamento
              </Link>
            </div>
          ) : (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-500 pb-2 border-b border-gray-100">
                <span>{glCount / 2} journals · {glCount} linhas GL</span>
                <span>Períodos: {glPeriods.slice(0,3).join(", ")}</span>
              </div>
              {glEntries.slice(0, 5).map((e) => (
                <div key={e.gl_id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-400 shrink-0">{e.transaction_date}</span>
                    <span className="text-gray-600 truncate">{e.description}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{e.account_code}</span>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    {e.debit_amount  > 0 && <span className="text-red-600 font-semibold tabular-nums">D {fmtBRL(e.debit_amount)}</span>}
                    {e.credit_amount > 0 && <span className="text-emerald-600 font-semibold tabular-nums">C {fmtBRL(e.credit_amount)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Module Cards grid ────────────────────────────────────────────── */}
        <section>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Módulos EPM
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {EPM_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link key={mod.href} href={mod.href}
                  className="card-interactive p-4 flex flex-col gap-2 group">
                  <div className="flex items-center justify-between">
                    <div className={`w-8 h-8 rounded-lg ${mod.bg} flex items-center justify-center`}>
                      <Icon size={14} className={mod.color} />
                    </div>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900 group-hover:text-brand-700 transition-colors leading-tight">
                      {mod.label}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 truncate">{mod.sub}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

      </div>
    </>
  );
}
