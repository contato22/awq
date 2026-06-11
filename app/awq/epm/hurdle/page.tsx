// ─── /awq/epm/hurdle — Hurdle Rate · 6 zonas analíticas ──────────────────────
//
// Zona 1: Confidence   — staleness dos inputs (Selic, ERP)
// Zona 2: Verdict      — weighted spread, NPV total, EVA total, funding gap
// Zona 3: The Bar      — build-up do custo de capital por BU
// Zona 4: Candidates   — projetos capital + PPM vs hurdle
// Zona 5: Constraint   — AR/AP, DSO/DPO, CCC, capital aplicado
// Zona 6: Sensitivity  — sliders Rf / ERP / buRisk (client component)
// Audit              — metodologia + proveniência

import Header from "@/components/Header";
import Link from "next/link";
import React from "react";
import {
  Percent, TrendingUp, TrendingDown, CheckCircle2,
  XCircle, AlertTriangle, Info, BarChart3, Clock,
  Database, Layers, ArrowUpRight, ArrowDownRight, Wallet,
  ShieldAlert, Target, Activity, GitBranch, ChevronDown,
} from "lucide-react";
import {
  getHurdleAnalysis, computeHurdleSummary,
  getPPMHurdleRows, getBUCashContext, HURDLE_CONFIG,
  type BuHurdleConfig, type HurdleProject,
  type HurdleStatus, type PpmHurdleRow, type BuCashContext,
} from "@/lib/epm-hurdle";
import { HurdleSensitivity } from "@/components/HurdleSensitivity";
import {
  BuildupWaterfall, BulletChart, BubbleScatter,
  DivergingBarProjects, CashRunwayChart, FundingGaugeChart, TornadoChart,
  ApprovalDonut,
  type ChartProject,
} from "@/components/HurdleCharts";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0) + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR");
}

function fmtPct(n: number | null | undefined, decimals = 1): string {
  return n != null ? n.toFixed(decimals) + "%" : "—";
}

function spreadLabel(sp: number | null): string {
  if (sp === null) return "—";
  return (sp >= 0 ? "+" : "") + sp.toFixed(1) + "pp";
}

const STATUS_CFG: Record<HurdleStatus, {
  label: string; icon: React.ElementType; bg: string; text: string; border: string;
}> = {
  approved: { label: "Aprovado",  icon: CheckCircle2,  bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  rejected: { label: "Reprovado", icon: XCircle,       bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200"     },
  watch:    { label: "Atenção",   icon: AlertTriangle, bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"   },
  pending:  { label: "Pendente",  icon: Info,          bg: "bg-gray-50",    text: "text-gray-500",    border: "border-gray-200"    },
};

function StatusBadge({ status }: { status: HurdleStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.text.replace("text-","bg-")}`} />
      {cfg.label}
    </span>
  );
}

function SpreadChip({ spread }: { spread: number | null }) {
  if (spread === null) return <span className="text-gray-300 text-xs">—</span>;
  const positive = spread >= 0;
  const color = spread >= 2 ? "bg-emerald-500" : spread >= 0 ? "bg-amber-400" : "bg-red-500";
  const width = Math.min(Math.abs(spread) * 5, 100);
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums w-12 text-right ${positive ? "text-emerald-600" : "text-red-600"}`}>
        {spreadLabel(spread)}
      </span>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, color = "text-brand-600" }: {
  icon: React.ElementType; title: string; count?: number; color?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} className={color} />
      <span className="text-sm font-bold text-gray-700 tracking-tight">{title}</span>
      {count !== undefined && (
        <span className="ml-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Zone 3: The Bar — BU build-up card ──────────────────────────────────────

function BuBarCard({ bu }: { bu: BuHurdleConfig }) {
  const hasRoic = bu.roicReal !== undefined;
  const evaPositive = (bu.eva ?? 0) >= 0;
  const spreadVsRoic = hasRoic ? (bu.roicReal! - bu.hurdle) : null;

  const posLayers = [
    { val: bu.rf,              color: "#3b82f6", label: "Rf" },
    { val: bu.matureERP,       color: "#6366f1", label: "ERP" },
    { val: bu.sizePremium,     color: "#8b5cf6", label: "Sz" },
    { val: bu.specificPremium, color: "#a855f7", label: "Sp" },
    ...(bu.buRiskPremium > 0 ? [{ val: bu.buRiskPremium, color: "#f97316", label: "BU" }] : []),
  ];

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-gray-900 text-sm leading-tight">{bu.bu}</div>
          <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">{bu.regime}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tabular-nums leading-none" style={{ color: "#023373" }}>
            {bu.hurdle.toFixed(1)}<span className="text-sm font-semibold text-brand-400">%</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">hurdle · Ke</div>
        </div>
      </div>

      {/* Stacked CSS bar */}
      <div>
        <div className="flex h-2 rounded-full overflow-hidden gap-[1px] bg-gray-100">
          {posLayers.map((l) => (
            <div
              key={l.label}
              className="h-full transition-all"
              style={{ flex: l.val, backgroundColor: l.color }}
            />
          ))}
          {bu.buRiskPremium < 0 && (
            <div className="h-full" style={{ flex: Math.abs(bu.buRiskPremium), backgroundColor: "#10b981" }} />
          )}
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-gray-400">
          <span>Rf {bu.rf}%</span>
          <span>ERP {bu.matureERP}%</span>
          <span>BU {bu.buRiskPremium >= 0 ? "+" : ""}{bu.buRiskPremium}%</span>
        </div>
      </div>

      {/* Build-up detail */}
      <div className="space-y-0.5">
        {[
          { label: "Rf (Selic)",        val: bu.rf,              dot: "bg-blue-500" },
          { label: "ERP (Damodaran)",   val: bu.matureERP,       dot: "bg-indigo-500" },
          { label: "Prêmio tamanho",    val: bu.sizePremium,     dot: "bg-purple-500" },
          { label: "Prêmio específico", val: bu.specificPremium, dot: "bg-violet-500" },
          { label: "Prêmio BU",         val: bu.buRiskPremium,   dot: bu.buRiskPremium >= 0 ? "bg-orange-500" : "bg-emerald-500" },
        ].map(({ label, val, dot }) => (
          <div key={label} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
              <span className="text-gray-500">{label}</span>
            </div>
            <span className="font-mono font-semibold tabular-nums text-gray-700">
              {val >= 0 ? "+" : ""}{val.toFixed(2)}%
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between text-[11px] border-t border-gray-100 pt-1 mt-1">
          <span className="font-bold text-gray-700">= Ke</span>
          <span className="font-black tabular-nums text-brand-700">{fmtPct(bu.hurdle)}</span>
        </div>
      </div>

      {/* ROIC vs Hurdle (if available) */}
      {hasRoic && (
        <div className="border-t border-gray-100 pt-2.5 grid grid-cols-2 gap-2">
          <div className={`rounded-lg p-2 ${spreadVsRoic !== null && spreadVsRoic >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
            <div className={`text-[10px] font-semibold mb-0.5 ${spreadVsRoic !== null && spreadVsRoic >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              ROIC real
            </div>
            <div className={`text-sm font-black tabular-nums ${spreadVsRoic !== null && spreadVsRoic >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {fmtPct(bu.roicReal)}
            </div>
            {spreadVsRoic !== null && (
              <div className={`text-[10px] tabular-nums ${spreadVsRoic >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {spreadVsRoic >= 0 ? "+" : ""}{spreadVsRoic.toFixed(1)}pp vs hurdle
              </div>
            )}
          </div>
          {bu.eva !== undefined && (
            <div className={`rounded-lg p-2 ${evaPositive ? "bg-blue-50" : "bg-amber-50"}`}>
              <div className={`text-[10px] font-semibold mb-0.5 ${evaPositive ? "text-blue-500" : "text-amber-500"}`}>EVA</div>
              <div className={`text-sm font-black tabular-nums ${evaPositive ? "text-blue-700" : "text-amber-700"}`}>
                {fmtBRL(bu.eva!)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Zone 4: Capital project row ─────────────────────────────────────────────

function ProjectRow({ p }: { p: HurdleProject }) {
  const borderColor = p.status === "approved" ? "border-l-emerald-400" : p.status === "rejected" ? "border-l-red-400" : p.status === "watch" ? "border-l-amber-400" : "border-l-gray-200";
  return (
    <tr className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors border-l-2 ${borderColor}`}>
      <td className="py-3 pl-3 pr-2">
        <div className="font-semibold text-sm text-gray-900 leading-tight">{p.name}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">{p.id} · {p.bu}</div>
        {p.description && <div className="text-[11px] text-gray-400 mt-0.5 max-w-xs truncate">{p.description}</div>}
      </td>
      <td className="py-3 px-3 text-right">
        <div className="text-sm font-bold tabular-nums text-gray-800">{fmtBRL(p.capex)}</div>
      </td>
      <td className="py-3 px-3 text-right">
        <div className="text-sm font-bold tabular-nums text-gray-900">{fmtPct(p.irrAnnualized)}</div>
        <div className="text-[11px] text-gray-400">bar: {fmtPct(p.hurdle)}</div>
      </td>
      <td className="py-3 px-3"><SpreadChip spread={p.spread} /></td>
      <td className="py-3 px-3 text-right text-sm tabular-nums text-gray-600">
        {p.npvApprox != null ? <span className={p.npvApprox >= 0 ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>{fmtBRL(p.npvApprox)}</span> : "—"}
      </td>
      <td className="py-3 px-3 text-right text-sm tabular-nums text-gray-600">
        {p.paybackMo != null ? `${p.paybackMo}m` : "—"}
      </td>
      <td className="py-3 pr-4 pl-3"><StatusBadge status={p.status} /></td>
    </tr>
  );
}

// ─── Zone 4: PPM row ─────────────────────────────────────────────────────────

function PpmRow({ p }: { p: PpmHurdleRow }) {
  const borderColor = p.status === "approved" ? "border-l-emerald-400" : p.status === "rejected" ? "border-l-red-400" : p.status === "watch" ? "border-l-amber-400" : "border-l-gray-200";
  const healthDot = p.health === "green" ? "bg-emerald-400" : p.health === "red" ? "bg-red-400" : "bg-amber-400";
  return (
    <tr className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors border-l-2 ${borderColor}`}>
      <td className="py-3 pl-3 pr-2">
        <div className="font-semibold text-sm text-gray-900 leading-tight">{p.name}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">{p.code} · {p.bu}</div>
        <div className="text-[11px] text-gray-400 mt-0.5 capitalize">{p.type.replace("_"," ")} · {p.phase}</div>
      </td>
      <td className="py-3 px-3 text-right">
        <div className="text-sm font-bold tabular-nums text-gray-800">{fmtBRL(p.contractRev)}</div>
        <div className="text-[11px] text-gray-400">custo {fmtBRL(p.budgetCost)}</div>
      </td>
      <td className="py-3 px-3 text-right">
        <div className="text-sm font-bold tabular-nums text-gray-900">{fmtPct(p.irrAnnualized)}</div>
        <div className="text-[11px] text-gray-400">bar: {fmtPct(p.hurdle)}</div>
      </td>
      <td className="py-3 px-3"><SpreadChip spread={p.spread} /></td>
      <td className="py-3 px-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${healthDot}`} />
          <span className="text-sm tabular-nums text-gray-700 font-semibold">{p.completionPct}%</span>
        </div>
      </td>
      <td className="py-3 pr-4 pl-3"><StatusBadge status={p.status} /></td>
    </tr>
  );
}

// ─── Zone 5: Cash constraint row ─────────────────────────────────────────────

function CashRow({ buName, ctx, isGroup = false }: { buName: string; ctx: BuCashContext; isGroup?: boolean }) {
  const cccBg = ctx.ccc === null ? "" : ctx.ccc <= 30 ? "bg-emerald-50 text-emerald-700" : ctx.ccc <= 60 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
  return (
    <tr className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors text-xs${isGroup ? " bg-brand-50/30 border-t-2 border-t-brand-100" : ""}`}>
      <td className="py-3 pl-4 pr-3">
        <span className={`font-semibold ${isGroup ? "text-brand-700 italic" : "text-gray-800"}`}>{buName}</span>
      </td>
      <td className="py-3 px-3 text-right">
        <div className="font-bold text-emerald-700 tabular-nums">{fmtBRL(ctx.arOutstanding)}</div>
        {ctx.arOverdue > 0 && <div className="text-red-500 tabular-nums text-[10px]">{fmtBRL(ctx.arOverdue)} vencido</div>}
      </td>
      <td className="py-3 px-3 text-right">
        <div className="font-bold text-red-700 tabular-nums">{fmtBRL(ctx.apOutstanding)}</div>
        {ctx.apOverdue > 0 && <div className="text-red-500 tabular-nums text-[10px]">{fmtBRL(ctx.apOverdue)} vencido</div>}
      </td>
      <td className="py-3 px-3 text-right tabular-nums font-medium text-gray-700">{ctx.dso !== null ? `${ctx.dso.toFixed(0)}d` : "—"}</td>
      <td className="py-3 px-3 text-right tabular-nums font-medium text-gray-700">{ctx.dpo !== null ? `${ctx.dpo.toFixed(0)}d` : "—"}</td>
      <td className="py-3 px-3 text-right tabular-nums font-bold text-brand-700">
        {ctx.capitalDeployed > 0 ? fmtBRL(ctx.capitalDeployed) : <span className="text-gray-300">—</span>}
      </td>
      <td className="py-3 px-3 text-right tabular-nums">
        {ctx.fundingGap !== null ? (
          <span className={`font-bold ${ctx.fundingGap > 0 ? "text-amber-700" : "text-emerald-700"}`}>
            {ctx.fundingGap > 0 ? "+" : ""}{fmtBRL(ctx.fundingGap)}
          </span>
        ) : <span className="text-gray-300">—</span>}
      </td>
      <td className="py-3 pr-4 pl-3">
        {ctx.ccc !== null ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] ${cccBg}`}>
            {ctx.ccc.toFixed(0)}d
          </span>
        ) : <span className="text-gray-300">—</span>}
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HurdlePage() {
  // ── Parallel data fetch ──────────────────────────────────────────────────
  let analysis;
  let summary;
  let ppmRows:  PpmHurdleRow[]               = [];
  let cashCtx:  Record<string, BuCashContext> = {};
  let analysisErr  = false;
  let ppmErr       = false;
  let cashErr      = false;

  try {
    analysis = await getHurdleAnalysis();
    summary  = computeHurdleSummary(analysis);
  } catch {
    analysisErr = true;
    analysis = {
      buHurdles: [], projects: [], dataSource: "static" as const, dbUp: false,
      projectsFromDb: false,
      inputsMeta: { rfDaysAgo: 0, erpDaysAgo: 0, stale: false, rfSource: "", erpSource: "" },
    };
    summary = {
      total: 0, approved: 0, rejected: 0, watch: 0,
      totalCapex: 0, approvedCapex: 0, approvalRate: 0, avgIrr: null,
      weightedSpread: null, totalNPV: 0, totalEVA: 0, avgHurdle: 0,
    };
  }

  const approvedCapexByBu: Record<string, number> = {};
  for (const p of analysis.projects.filter((x) => x.status === "approved")) {
    approvedCapexByBu[p.bu_id] = (approvedCapexByBu[p.bu_id] ?? 0) + p.capex;
  }

  [ppmRows, cashCtx] = await Promise.all([
    getPPMHurdleRows(analysis.buHurdles).catch(() => { ppmErr = true; return []; }),
    getBUCashContext(approvedCapexByBu).catch(() => { cashErr = true; return {}; }),
  ]);

  const { buHurdles, projects, dataSource, dbUp, projectsFromDb, inputsMeta } = analysis;
  const { total, approved, rejected, watch, totalCapex, approvedCapex, approvalRate,
          weightedSpread, totalNPV, totalEVA } = summary;

  // Hurdle consolidado do grupo = média simples das BUs operacionais
  // AWQ Holding não é BU — é o acúmulo de todas as BUs
  const grupoHurdle = buHurdles.length > 0
    ? buHurdles.reduce((s, h) => s + h.hurdle, 0) / buHurdles.length
    : 0;

  // BUs operacionais nas linhas de caixa (Holding separada abaixo)
  const cashRows = buHurdles
    .map((h) => ({ bu: h, ctx: cashCtx[h.bu_id] }))
    .filter(({ ctx }) => ctx != null);
  const holdingCtx = cashCtx["holding"] ?? null;
  const holdingHasCash = holdingCtx !== null &&
    (holdingCtx.arOutstanding > 0 || holdingCtx.apOutstanding > 0 || holdingCtx.capitalDeployed > 0);
  const hasCashData = holdingHasCash || cashRows.some(
    ({ ctx }) => ctx.arOutstanding > 0 || ctx.apOutstanding > 0 || ctx.capitalDeployed > 0,
  );

  const globalFundingGap = Object.values(cashCtx).reduce(
    (s, c) => s + (c.fundingGap ?? 0), 0,
  );

  return (
    <>
      <Header title="Hurdle Rate" subtitle="EPM · Custo de Capital Build-up · Avaliação de Projetos" />
      <div className="page-container">

        {/* ── ZONA 1: Confidence ───────────────────────────────────────── */}
        {analysisErr ? (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <span><strong>Erro ao carregar dados.</strong> Verifique a conexão com o banco de dados.</span>
          </div>
        ) : inputsMeta.stale ? (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs bg-amber-50 border border-amber-200 text-amber-700">
            <Clock size={12} className="shrink-0 mt-0.5" />
            <span>
              <strong>Inputs desatualizados.</strong>{" "}
              Rf há {inputsMeta.rfDaysAgo}d ({inputsMeta.rfSource}) · ERP há {inputsMeta.erpDaysAgo}d ({inputsMeta.erpSource}).{" "}
              Atualize <code className="bg-amber-100 px-1 rounded">HURDLE_CONFIG</code> em <code className="bg-amber-100 px-1 rounded">lib/epm-hurdle.ts</code>.
            </span>
          </div>
        ) : dataSource === "db" ? (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs bg-emerald-50 border border-emerald-100 text-emerald-700">
            <Database size={12} className="shrink-0" />
            <span>
              Dados ao vivo · Rf há {inputsMeta.rfDaysAgo}d ({inputsMeta.rfSource}) · ERP há {inputsMeta.erpDaysAgo}d ({inputsMeta.erpSource})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs bg-amber-50 border border-amber-100 text-amber-700">
            <Layers size={12} className="shrink-0" />
            <span>
              Snapshot estático — DB indisponível. Configure via{" "}
              <code className="bg-amber-100 px-1 rounded">/api/setup/migrate</code>.
            </span>
          </div>
        )}

        {/* ── ZONA 2: Verdict ──────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={Target} title="Veredicto do Portfolio" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: KPI grid */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-3">
              {[
                {
                  label: "Spread Ponderado",
                  value: weightedSpread !== null ? spreadLabel(weightedSpread) : "—",
                  sub: `${approved} aprovados · ${total} projetos`,
                  icon: Activity,
                  valueColor: weightedSpread !== null ? (weightedSpread >= 0 ? "text-emerald-600" : "text-red-600") : "text-gray-400",
                  bg: weightedSpread !== null ? (weightedSpread >= 0 ? "bg-emerald-50/60" : "bg-red-50/60") : "bg-gray-50/40",
                },
                {
                  label: "NPV Total Estimado",
                  value: totalNPV !== 0 ? fmtBRL(totalNPV) : "—",
                  sub: `${approvalRate.toFixed(0)}% taxa aprovação`,
                  icon: TrendingUp,
                  valueColor: totalNPV >= 0 ? "text-emerald-600" : "text-red-600",
                  bg: "bg-white",
                },
                {
                  label: "EVA Total BUs",
                  value: totalEVA !== 0 ? fmtBRL(totalEVA) : "—",
                  sub: "ROIC − Hurdle × Capital",
                  icon: BarChart3,
                  valueColor: totalEVA >= 0 ? "text-emerald-600" : "text-red-600",
                  bg: "bg-white",
                },
                {
                  label: "Funding Gap",
                  value: globalFundingGap !== 0 ? fmtBRL(globalFundingGap) : "—",
                  sub: `CAPEX aprovado: ${fmtBRL(approvedCapex)}`,
                  icon: Wallet,
                  valueColor: globalFundingGap > 0 ? "text-amber-600" : "text-gray-400",
                  bg: globalFundingGap > 0 ? "bg-amber-50/40" : "bg-white",
                },
              ].map(({ label, value, sub, icon: Icon, valueColor, bg }) => (
                <div key={label} className={`card p-4 ${bg}`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight">{label}</span>
                    <Icon size={12} className={valueColor + " shrink-0 mt-0.5"} />
                  </div>
                  <div className={`text-2xl font-black tabular-nums ${valueColor}`}>{value}</div>
                  <div className="text-[11px] text-gray-400 mt-1.5">{sub}</div>
                </div>
              ))}
            </div>

            {/* Right: Approval donut */}
            <div className="card p-5 flex flex-col items-center justify-center gap-4">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest self-start">Taxa de Aprovação</div>
              <ApprovalDonut approved={approved} total={total > 0 ? total : ppmRows.length} label="aprovados" />
              <div className="w-full space-y-1.5">
                {[
                  { label: "Aprovados",  count: approved + ppmRows.filter(r=>r.status==="approved").length, color: "bg-emerald-400" },
                  { label: "Em atenção", count: watch + ppmRows.filter(r=>r.status==="watch").length,       color: "bg-amber-400"  },
                  { label: "Reprovados", count: rejected + ppmRows.filter(r=>r.status==="rejected").length, color: "bg-red-400"    },
                  { label: "Pendentes",  count: (total - approved - rejected - watch) + ppmRows.filter(r=>r.status==="pending").length, color: "bg-gray-300" },
                ].filter(s => s.count > 0).map(s => (
                  <div key={s.label} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${s.color} shrink-0`} />
                    <span className="text-gray-600 flex-1">{s.label}</span>
                    <span className="font-bold tabular-nums text-gray-800">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alert pills */}
          {(watch > 0 || rejected > 0) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {watch > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <AlertTriangle size={11} />
                  <strong>{watch} em atenção</strong> — spread −2pp a 0pp
                </div>
              )}
              {rejected > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  <XCircle size={11} />
                  <strong>{rejected} reprovado{rejected > 1?"s":""}</strong> — IRR abaixo do hurdle
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── ZONA 3: The Bar ───────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={ShieldAlert} title="The Bar — Custo de Capital por BU" count={buHurdles.length} />
          <div className="mb-2 flex items-center gap-2 text-[11px] text-gray-400">
            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">Ke = Rf + ERP + Tamanho + Específico + BU</span>
            <span>· Simples: T = 0 · ROIC ≠ Ke</span>
          </div>
          {buHurdles.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {buHurdles.map((bu) => <BuBarCard key={bu.bu_id} bu={bu} />)}
              </div>
              {/* Grupo AWQ = consolidação das BUs (não é BU operacional) */}
              <div className="mt-3 flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl bg-brand-50/60 border border-brand-100">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-brand-500 mb-0.5">Grupo AWQ — Hurdle Consolidado</div>
                  <div className="text-[11px] text-gray-400">
                    Média simples das {buHurdles.length} BUs operacionais · aplicado a projetos PPM da Holding
                  </div>
                </div>
                <div className="ml-auto text-2xl font-black tabular-nums text-brand-700">
                  {fmtPct(grupoHurdle)}
                </div>
                <div className="text-[10px] text-gray-400">
                  AWQ Holding = acúmulo das BUs — não possui hurdle próprio
                </div>
              </div>
            </>
          ) : (
            <div className="card p-8 text-center">
              <ShieldAlert size={24} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Dados de hurdle indisponíveis</p>
            </div>
          )}

          {buHurdles.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="card p-4">
                <div className="text-xs font-bold text-gray-600 mb-1">Composição do Hurdle por BU</div>
                <div className="text-[11px] text-gray-400 mb-3">Cada camada do build-up empilhada</div>
                <BuildupWaterfall buHurdles={buHurdles} />
              </div>
              <div className="card p-4">
                <div className="text-xs font-bold text-gray-600 mb-1">Hurdle vs ROIC Real</div>
                <div className="text-[11px] text-gray-400 mb-3">Barra cinza = hurdle · barra colorida = ROIC</div>
                <BulletChart buHurdles={buHurdles} />
              </div>
            </div>
          )}
        </section>

        {/* ── ZONA 4: Candidates ───────────────────────────────────────── */}

        {/* Projetos de capital */}
        <section>
          <SectionHeader icon={BarChart3} title="Projetos de Capital" count={projects.length} />
          <div className="card overflow-hidden p-0 border-none shadow-sm ring-1 ring-gray-200/80">
            <div className="bg-gray-50/80 border-b border-gray-100 px-4 py-2 flex items-center gap-3">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">IRR a.a. vs Hurdle Rate</span>
              <span className="text-[11px] text-gray-400">· spread = IRR − hurdle · NPV ≈ spread/hurdle × CAPEX</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pl-4 pr-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Projeto</th>
                  <th className="text-right py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">CAPEX</th>
                  <th className="text-right py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">IRR a.a.</th>
                  <th className="py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Spread</th>
                  <th className="text-right py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">NPV ≈</th>
                  <th className="text-right py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Payback</th>
                  <th className="py-2 pr-4 pl-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {(["approved","watch","rejected","pending"] as HurdleStatus[]).flatMap((st) =>
                  projects.filter((p) => p.status === st).map((p) => <ProjectRow key={p.id} p={p} />)
                )}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <BarChart3 size={28} className="text-gray-100 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-500">Nenhum projeto de capital cadastrado</p>
                      {dbUp ? (
                        <p className="text-xs text-gray-400 mt-1">
                          Insira projetos em <code className="bg-gray-100 px-1 rounded font-mono">epm_hurdle_projects</code> para análise de IRR vs hurdle.
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-gray-400 mt-1">
                            Insira em <code className="bg-gray-100 px-1 rounded font-mono">epm_hurdle_projects</code>
                          </p>
                          <p className="text-xs text-amber-500 mt-2">
                            DATABASE_URL não configurado — tabelas EPM não acessíveis.
                          </p>
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* PPM projetos operacionais */}
        {ppmErr ? (
          <section>
            <SectionHeader icon={BarChart3} title="Projetos Operacionais — PPM" />
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs bg-amber-50 border border-amber-200 text-amber-700">
              <AlertTriangle size={12} /> <span>Dados PPM indisponíveis no momento.</span>
            </div>
          </section>
        ) : ppmRows.length > 0 ? (
          <section>
            <SectionHeader icon={BarChart3} title="Projetos Operacionais — PPM" count={ppmRows.length} />
            <div className="card overflow-hidden p-0 border-none shadow-sm ring-1 ring-gray-200/80">
              <div className="bg-gray-50/80 border-b border-gray-100 px-4 py-2 flex items-center gap-3">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">ROI Contratual Anualizado vs Hurdle</span>
                <span className="text-[11px] text-gray-400">· IRR a.a. = (1+ROI)^(12/dur) − 1</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pl-4 pr-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Projeto</th>
                    <th className="text-right py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Receita / Custo</th>
                    <th className="text-right py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">IRR a.a.</th>
                    <th className="py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Spread</th>
                    <th className="text-right py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Conclusão</th>
                    <th className="py-2 pr-4 pl-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(["approved","watch","rejected","pending"] as HurdleStatus[]).flatMap((st) =>
                    ppmRows.filter((r) => r.status === st).map((r) => <PpmRow key={r.id} p={r} />)
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* Bubble scatter + Diverging bar — Pipeline view */}
        {(projects.length > 0 || ppmRows.length > 0) && (() => {
          const unified: ChartProject[] = [
            ...projects.map((p) => ({
              name: p.name, bu_id: p.bu_id, irrAnnualized: p.irrAnnualized,
              spread: p.spread, status: p.status, capex: p.capex, npvApprox: p.npvApprox,
            })),
            ...ppmRows.map((p) => ({
              name: p.name, bu_id: p.bu_id, irrAnnualized: p.irrAnnualized,
              spread: p.spread, status: p.status, capex: p.budgetCost, npvApprox: undefined,
            })),
          ];
          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-5">
                <div className="text-xs font-bold text-gray-700 mb-0.5">Visão do Pipeline — Capital × Spread</div>
                <div className="text-[11px] text-gray-400 mb-3">X = spread (pp) · Y = CAPEX · tamanho ∝ |NPV|</div>
                <BubbleScatter projects={unified} />
              </div>
              <div className="card p-5">
                <div className="text-xs font-bold text-gray-700 mb-0.5">Spread por Projeto</div>
                <div className="text-[11px] text-gray-400 mb-3">Centrado em 0 · verde = cria valor · vermelho = destrói</div>
                <DivergingBarProjects projects={unified} />
              </div>
            </div>
          );
        })()}

        {/* ── ZONA 5: Constraint ───────────────────────────────────────── */}
        {cashErr ? (
          <section>
            <SectionHeader icon={Wallet} title="Restrição de Caixa — AR · AP · Capital" />
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs bg-amber-50 border border-amber-200 text-amber-700">
              <AlertTriangle size={12} /> <span>Dados AR/AP/Cash indisponíveis no momento.</span>
            </div>
          </section>
        ) : hasCashData ? (
          <section>
            <SectionHeader icon={Wallet} title="Restrição de Caixa — AR · AP · Capital" />
            <div className="card overflow-hidden p-0 border-none shadow-sm ring-1 ring-gray-200/80">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="text-left py-2.5 pl-4 pr-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">BU</th>
                    <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      <div className="flex items-center justify-end gap-1"><ArrowUpRight size={9} className="text-emerald-500"/>AR</div>
                    </th>
                    <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      <div className="flex items-center justify-end gap-1"><ArrowDownRight size={9} className="text-red-500"/>AP</div>
                    </th>
                    <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">DSO</th>
                    <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">DPO</th>
                    <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Capital Aplicado</th>
                    <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Funding Gap</th>
                    <th className="text-right py-2.5 pr-4 pl-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">CCC</th>
                  </tr>
                </thead>
                <tbody>
                  {cashRows.map(({ bu, ctx }) => <CashRow key={bu.bu_id} buName={bu.bu} ctx={ctx} />)}
                  {holdingHasCash && holdingCtx && (
                    <CashRow buName="AWQ Holding (grupo)" ctx={holdingCtx} isGroup />
                  )}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="card p-5">
                <div className="text-xs font-bold text-gray-700 mb-0.5">Runway de Caixa (6m)</div>
                <div className="text-[11px] text-gray-400 mb-3">AR → AP → CAPEX aprovado (estimativa)</div>
                <CashRunwayChart cashRows={cashRows} approvedCapex={approvedCapex} />
              </div>
              <div className="card p-5">
                <div className="text-xs font-bold text-gray-700 mb-0.5">Funding Gap por BU</div>
                <div className="text-[11px] text-gray-400 mb-3">CAPEX aprovado × capital aplicado</div>
                <FundingGaugeChart cashRows={cashRows} approvedCapexByBu={approvedCapexByBu} />
              </div>
            </div>
          </section>
        ) : null}

        {/* ── ZONA 6: Sensitivity ──────────────────────────────────────── */}
        {buHurdles.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <GitBranch size={14} className="text-brand-600" />
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Análise de Sensibilidade</span>
            </div>
            <HurdleSensitivity buHurdles={buHurdles} allProjects={projects} ppmRows={ppmRows} />

            {/* Tornado */}
            <div className="card p-4 mt-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Tornado — Impacto de ±1.5pp por Parâmetro</div>
              <TornadoChart
                projects={[
                  ...projects.map((p) => ({ irrAnnualized: p.irrAnnualized, spread: p.spread, hurdle: p.hurdle, status: p.status, bu_id: p.bu_id })),
                  ...ppmRows.map((p)  => ({ irrAnnualized: p.irrAnnualized, spread: p.spread, hurdle: p.hurdle, status: p.status, bu_id: p.bu_id })),
                ]}
                buHurdles={buHurdles}
              />
            </div>
          </section>
        )}

        {/* ── Audit / Metodologia ──────────────────────────────────────── */}
        <section>
          <details className="card p-4 bg-gray-50/40 group">
            <summary className="flex items-center gap-2 cursor-pointer list-none">
              <Info size={13} className="text-gray-400 shrink-0" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Metodologia &amp; Proveniência</span>
              <ChevronDown size={12} className="text-gray-400 ml-auto group-open:rotate-180 transition-transform" />
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600 mt-4">
              <div>
                <div className="font-semibold text-gray-700 mb-1">Build-up Ke (Simples Nacional)</div>
                <div className="font-mono bg-white border border-gray-200 rounded px-2 py-1 mb-1.5 text-xs">
                  Ke = Rf + ERP + Size + Specific + BuRisk
                </div>
                <div className="text-gray-400 space-y-0.5">
                  <div>• T = 0 (Simples — sem escudo fiscal)</div>
                  <div>• afterTaxKd = Kd (sem (1−T))</div>
                  <div>• Ke = hurdle rate diretamente</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 mb-1">IRR Anualizado</div>
                <div className="font-mono bg-white border border-gray-200 rounded px-2 py-1 mb-1.5 text-xs">
                  IRR_aa = (1 + ROI)^(12/dur) − 1
                </div>
                <div className="text-gray-400 space-y-0.5">
                  <div>• ROI total → IRR equivalente a.a.</div>
                  <div>• Comparado ao hurdle anual da BU</div>
                  <div>• PPM: dur = end_date − start_date</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 mb-1">Inputs ({new Date().getFullYear()})</div>
                <div className="font-mono bg-white border border-gray-200 rounded px-2 py-1 mb-1.5 text-xs">
                  Rf = {HURDLE_CONFIG.rf}% · ERP = {HURDLE_CONFIG.matureERP}%
                </div>
                <div className="text-gray-400 space-y-0.5">
                  <div>• {HURDLE_CONFIG.rfSource}</div>
                  <div>• {HURDLE_CONFIG.erpSource}</div>
                  <div>• Size = {HURDLE_CONFIG.sizePremium}% · Specific = {HURDLE_CONFIG.specificPremium}%</div>
                </div>
              </div>
            </div>
          </details>
        </section>

        {/* ── Navigation ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/budget" className="text-brand-600 hover:underline">Budget vs Actual →</Link>
          <Link href="/awq/epm/kpis"   className="text-brand-600 hover:underline">KPI Dashboard →</Link>
        </div>

      </div>
    </>
  );
}
