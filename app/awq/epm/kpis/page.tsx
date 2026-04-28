// ─── /awq/epm/kpis — EPM KPI Dashboard ───────────────────────────────────────
//
// Aggregates KPIs from:
//   • financial-metric-query.ts (real cash-basis + snapshot KPIs)
//   • epm-gl.ts                 (GL-based KPIs: balance sheet ratios)
// Shows full EPM KPI scorecard: P&L, liquidity, efficiency, growth.

import Header from "@/components/Header";
import Link from "next/link";
import {
  PieChart, TrendingUp, DollarSign, Target, BarChart3,
  Activity, ChevronRight, AlertTriangle, CheckCircle2,
} from "lucide-react";
import {
  getAWQGroupKPIs,
  fmtBRL,
  fmtPct,
} from "@/lib/financial-metric-query";
import { MetricSourceBadge, MetricDetail } from "@/components/MetricSourceBadge";
import { buildDreQuery } from "@/lib/dre-query";
import { getBalanceSheet } from "@/lib/epm-gl";
import {
  consolidated,
  consolidatedMargins,
  consolidatedRoic,
  budgetVsActual,
  ventureFeeMRR,
  ventureFeeARR,
} from "@/lib/awq-derived-metrics";

function fmtR(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

interface KpiCard {
  label:        string;
  value:        string;
  sub?:         string;
  status:       "good" | "warn" | "bad" | "neutral";
  sourceType:   "real" | "snapshot" | "empty";
  threshold?:   string;
}

function StatusDot({ status }: { status: KpiCard["status"] }) {
  const cfg = {
    good:    "bg-emerald-400",
    warn:    "bg-amber-400",
    bad:     "bg-red-500",
    neutral: "bg-gray-300",
  }[status];
  return <span className={`w-2 h-2 rounded-full ${cfg} shrink-0`} />;
}

function KpiTile({ kpi }: { kpi: KpiCard }) {
  const border = {
    good:    "border-emerald-200",
    warn:    "border-amber-200",
    bad:     "border-red-200",
    neutral: "border-gray-200",
  }[kpi.status];

  return (
    <div className={`card p-4 border ${border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest truncate">
          {kpi.label}
        </span>
        <div className="flex items-center gap-1.5">
          <StatusDot status={kpi.status} />
          <MetricSourceBadge sourceType={kpi.sourceType} />
        </div>
      </div>
      <div className="text-xl font-bold text-gray-900 tabular-nums">{kpi.value}</div>
      {kpi.sub && <div className="text-[11px] text-gray-400 mt-0.5">{kpi.sub}</div>}
      {kpi.threshold && (
        <div className="text-[10px] text-gray-300 mt-1">Target: {kpi.threshold}</div>
      )}
    </div>
  );
}

// ─── Section heading ─────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string;
  icon:  React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-brand-600" />
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-widest">{title}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {children}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EpmKpisPage() {
  const [kpis, dre, bs] = await Promise.all([
    getAWQGroupKPIs(),
    buildDreQuery("all"),
    Promise.resolve(getBalanceSheet()),
  ]);

  const snap = consolidated;

  // ── P&L KPIs ──────────────────────────────────────────────────────────────
  const revenue      = dre.hasData ? dre.dreRevenue        : snap.revenue;
  const ebitda       = dre.hasData ? dre.dreEBITDA          : snap.ebitda;
  const ebitdaMargin = dre.hasData
    ? (dre.dreRevenue > 0 ? dre.dreEBITDA / dre.dreRevenue * 100 : 0)
    : consolidatedMargins.ebitdaMargin * 100;
  const grossMargin  = dre.hasData
    ? (dre.dreRevenue > 0 ? dre.dreGrossProfit / dre.dreRevenue * 100 : 0)
    : consolidatedMargins.grossMargin * 100;
  const netMargin    = dre.hasData
    ? (dre.dreRevenue > 0 ? dre.dreNetResult / dre.dreRevenue * 100 : 0)
    : consolidatedMargins.netMargin * 100;

  const plKpis: KpiCard[] = [
    {
      label: "Receita Total",
      value: fmtR(revenue),
      sub:   dre.hasData ? `${dre.periodStart?.slice(0,7)} → ${dre.periodEnd?.slice(0,7)}` : "Snapshot YTD",
      status: "neutral",
      sourceType: dre.hasData ? "real" : "snapshot",
    },
    {
      label: "EBITDA",
      value: fmtR(ebitda),
      sub:   `Margem: ${ebitdaMargin.toFixed(1)}%`,
      status: ebitdaMargin >= 15 ? "good" : ebitdaMargin >= 5 ? "warn" : "bad",
      sourceType: dre.hasData ? "real" : "snapshot",
      threshold: "≥15%",
    },
    {
      label: "Margem Bruta",
      value: `${grossMargin.toFixed(1)}%`,
      sub:   dre.hasData ? `COGS: ${fmtR(dre.dreCOGS)}` : undefined,
      status: grossMargin >= 50 ? "good" : grossMargin >= 30 ? "warn" : "bad",
      sourceType: dre.hasData ? "real" : "snapshot",
      threshold: "≥50%",
    },
    {
      label: "Margem Líquida",
      value: `${netMargin.toFixed(1)}%`,
      status: netMargin >= 10 ? "good" : netMargin >= 0 ? "warn" : "bad",
      sourceType: dre.hasData ? "real" : "snapshot",
    },
  ];

  // ── Recurring Revenue KPIs ─────────────────────────────────────────────────
  const mrr = ventureFeeMRR;
  const arr = ventureFeeARR;

  const revenueVarPct = budgetVsActual; // number: (actual - budget) / budget * 100

  const recurringKpis: KpiCard[] = [
    {
      label: "MRR",
      value: fmtR(mrr),
      sub:   "Fee recorrente Venture",
      status: mrr > 0 ? "good" : "warn",
      sourceType: "snapshot",
    },
    {
      label: "ARR",
      value: fmtR(arr),
      sub:   "MRR × 12",
      status: arr > 0 ? "good" : "warn",
      sourceType: "snapshot",
    },
    {
      label: "Budget Var. Receita",
      value: `${revenueVarPct >= 0 ? "+" : ""}${revenueVarPct.toFixed(1)}%`,
      sub:   `Actual ${fmtR(snap.revenue)} vs Budget ${fmtR(snap.budgetRevenue)}`,
      status: revenueVarPct >= 0 ? "good" : revenueVarPct > -10 ? "warn" : "bad",
      sourceType: "snapshot",
      threshold: "≥0%",
    },
    {
      label: "Rule of 40",
      value: `${(ebitdaMargin).toFixed(0)}`,
      sub:   `EBITDA ${ebitdaMargin.toFixed(0)}% (crescimento n/d)`,
      status: ebitdaMargin >= 40 ? "good" : "warn",
      sourceType: dre.hasData ? "real" : "snapshot",
      threshold: "≥40",
    },
  ];

  // ── Cash & Liquidity KPIs ─────────────────────────────────────────────────
  const cashBalance   = kpis.totalCashBalance.value ?? 0;
  const burnRate      = dre.hasData ? dre.dreOperatingExpenses : (snap.revenue - snap.ebitda);
  const cashRunway    = burnRate > 0 ? cashBalance / burnRate : null;
  const workingCap    = bs.hasData ? (bs.totalAssets - bs.totalLiabilities) : null;

  const cashKpis: KpiCard[] = [
    {
      label: "Caixa Consolidado",
      value: kpis.totalCashBalance.value !== null ? fmtR(kpis.totalCashBalance.value) : "—",
      sub:   "Saldo total por extrato",
      status: kpis.totalCashBalance.value !== null && kpis.totalCashBalance.value > 0 ? "good" : "neutral",
      sourceType: kpis.totalCashBalance.value !== null ? "real" : "empty",
    },
    {
      label: "FCO Líquido",
      value: kpis.operationalNetCash.value !== null ? fmtR(kpis.operationalNetCash.value) : "—",
      sub:   "Entradas − Saídas operacionais",
      status: kpis.operationalNetCash.value !== null
        ? ((kpis.operationalNetCash.value as number) >= 0 ? "good" : "bad")
        : "neutral",
      sourceType: kpis.operationalNetCash.value !== null ? "real" : "empty",
    },
    {
      label: "Cash Runway",
      value: cashRunway !== null ? `${cashRunway.toFixed(1)}m` : "—",
      sub:   "Caixa / Burn Rate mensal",
      status: cashRunway === null ? "neutral" : cashRunway >= 6 ? "good" : cashRunway >= 3 ? "warn" : "bad",
      sourceType: cashBalance > 0 ? "real" : "snapshot",
      threshold: "≥3 meses",
    },
    {
      label: "Capital de Giro",
      value: workingCap !== null ? fmtR(workingCap) : "—",
      sub:   bs.hasData ? "Ativo Circ. − Passivo Circ." : "Sem dados GL",
      status: workingCap === null ? "neutral" : workingCap > 0 ? "good" : "bad",
      sourceType: bs.hasData ? "real" : "empty",
    },
  ];

  // ── Operational Efficiency ────────────────────────────────────────────────
  const efficiencyKpis: KpiCard[] = [
    {
      label: "ROIC",
      value: `${consolidatedRoic.toFixed(0)}%`,
      sub:   "Return on Invested Capital",
      status: consolidatedRoic >= 20 ? "good" : consolidatedRoic >= 10 ? "warn" : "bad",
      sourceType: "snapshot",
      threshold: "≥20%",
    },
    {
      label: "Total Clientes",
      value: String(snap.customers),
      sub:   "All BUs combinadas",
      status: snap.customers > 5 ? "good" : snap.customers > 0 ? "warn" : "bad",
      sourceType: "snapshot",
    },
    {
      label: "FTEs",
      value: String(snap.ftes ?? 1),
      sub:   "Full-time equivalents",
      status: "neutral",
      sourceType: "snapshot",
    },
    {
      label: "Rev. por FTE",
      value: fmtR((snap.ftes ?? 1) > 0 ? revenue / (snap.ftes ?? 1) : 0),
      sub:   "Receita / FTE",
      status: "neutral",
      sourceType: dre.hasData ? "real" : "snapshot",
    },
  ];

  const dataLabel = dre.hasData
    ? `Base bancária real · ${dre.transactionCount} txns`
    : "Snapshot de planejamento";

  return (
    <>
      <Header
        title="KPI Dashboard"
        subtitle={`EPM · AWQ Group · ${dataLabel}`}
      />
      <div className="page-container">

        {/* ── Source banner ─────────────────────────────────────────── */}
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs border ${
          dre.hasData
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          {dre.hasData
            ? <CheckCircle2 size={12} className="shrink-0" />
            : <AlertTriangle size={12} className="shrink-0" />}
          <span className="font-medium">
            {dre.hasData
              ? "KPIs reais ativos (cash-basis)"
              : "KPIs de planejamento (snapshot) — ingerir extratos para dados reais"}
          </span>
          <span className="ml-auto text-[10px] opacity-70">
            <MetricSourceBadge sourceType={dre.hasData ? "real" : "snapshot"} />
          </span>
        </div>

        {/* ── KPI Sections ──────────────────────────────────────────── */}
        <Section title="P&L — Lucratividade" icon={DollarSign}>
          {plKpis.map((k) => <KpiTile key={k.label} kpi={k} />)}
        </Section>

        <Section title="Receita Recorrente & Crescimento" icon={TrendingUp}>
          {recurringKpis.map((k) => <KpiTile key={k.label} kpi={k} />)}
        </Section>

        <Section title="Caixa & Liquidez" icon={Activity}>
          {cashKpis.map((k) => <KpiTile key={k.label} kpi={k} />)}
        </Section>

        <Section title="Eficiência Operacional" icon={BarChart3}>
          {efficiencyKpis.map((k) => <KpiTile key={k.label} kpi={k} />)}
        </Section>

        {/* ── Legend ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-5 text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Bom</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Atenção</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Crítico</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300" /> Neutro</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/pl" className="text-brand-600 hover:underline">P&L →</Link>
          <Link href="/awq/epm/budget" className="text-brand-600 hover:underline">Budget →</Link>
        </div>

      </div>
    </>
  );
}
