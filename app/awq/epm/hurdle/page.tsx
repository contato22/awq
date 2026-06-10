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
import {
  Percent, TrendingUp, TrendingDown, CheckCircle2,
  XCircle, AlertTriangle, Info, BarChart3, Clock,
  Database, Layers, ArrowUpRight, ArrowDownRight, Wallet,
  ShieldAlert, Target, Activity, GitBranch,
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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={10} />{cfg.label}
    </span>
  );
}

function SpreadChip({ spread }: { spread: number | null }) {
  if (spread === null) return <span className="text-gray-300 text-xs">—</span>;
  const color = spread >= 2 ? "bg-emerald-500" : spread >= 0 ? "bg-amber-400" : "bg-red-500";
  const width = Math.min(Math.abs(spread) * 4, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${spread >= 0 ? "text-emerald-600" : "text-red-600"}`}>
        {spreadLabel(spread)}
      </span>
    </div>
  );
}

// ─── Zone 3: The Bar — BU build-up card ──────────────────────────────────────

function BuBarCard({ bu }: { bu: BuHurdleConfig }) {
  const hasEva = bu.eva !== undefined && bu.capitalAllocated !== undefined;
  const evaColor = (bu.eva ?? 0) >= 0 ? "text-emerald-700" : "text-red-700";
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-sm text-gray-900">{bu.bu}</div>
          <div className="text-xs text-gray-400 mt-0.5 capitalize">{bu.regime}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold tabular-nums text-brand-600">{fmtPct(bu.hurdle)}</div>
          <div className="text-xs text-gray-400">hurdle (Ke)</div>
        </div>
      </div>

      {/* Build-up breakdown */}
      <div className="space-y-1 text-xs mb-3">
        {[
          { label: "Rf (Selic)",          val: bu.rf,              color: "text-blue-700"  },
          { label: "ERP (Damodaran)",      val: bu.matureERP,       color: "text-indigo-700"},
          { label: "Prêmio tamanho",       val: bu.sizePremium,     color: "text-purple-700"},
          { label: "Prêmio específico",    val: bu.specificPremium, color: "text-violet-700"},
          { label: "Prêmio BU",            val: bu.buRiskPremium,   color: bu.buRiskPremium >= 0 ? "text-orange-700" : "text-emerald-700" },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex justify-between items-center py-0.5 border-b border-gray-50">
            <span className="text-gray-500">{label}</span>
            <span className={`font-mono font-semibold tabular-nums ${color}`}>
              {val >= 0 ? "+" : ""}{val.toFixed(2)}%
            </span>
          </div>
        ))}
        <div className="flex justify-between items-center pt-1">
          <span className="font-semibold text-gray-700">= Ke (hurdle)</span>
          <span className="font-bold tabular-nums text-brand-700">{fmtPct(bu.hurdle)}</span>
        </div>
      </div>

      {/* ROIC vs Hurdle (separate!) */}
      {bu.roicReal !== undefined && (
        <div className="border-t border-gray-100 pt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-indigo-50 rounded-lg p-2">
            <div className="text-indigo-400 mb-0.5">ROIC real</div>
            <div className="font-semibold text-indigo-700">{fmtPct(bu.roicReal)}</div>
          </div>
          {hasEva && (
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-gray-400 mb-0.5">EVA</div>
              <div className={`font-semibold tabular-nums ${evaColor}`}>{fmtBRL(bu.eva!)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Zone 4: Capital project row ─────────────────────────────────────────────

function ProjectRow({ p }: { p: HurdleProject }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
      <td className="py-3 pl-4 pr-2">
        <div className="font-medium text-sm text-gray-900">{p.name}</div>
        <div className="text-xs text-gray-400 mt-0.5">{p.id} · {p.bu}</div>
        <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{p.description}</div>
      </td>
      <td className="py-3 px-3 text-right text-sm font-semibold tabular-nums text-gray-700">{fmtBRL(p.capex)}</td>
      <td className="py-3 px-3 text-right">
        <div className="text-sm font-semibold tabular-nums text-gray-900">{fmtPct(p.irrAnnualized)}</div>
        <div className="text-xs text-gray-400">hurdle: {fmtPct(p.hurdle)}</div>
        {p.durationMo != null && <div className="text-xs text-gray-300">{p.durationMo}m duração</div>}
      </td>
      <td className="py-3 px-3"><SpreadChip spread={p.spread} /></td>
      <td className="py-3 px-3 text-right text-sm tabular-nums text-gray-600">
        {p.npvApprox != null ? fmtBRL(p.npvApprox) : "—"}
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
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
      <td className="py-3 pl-4 pr-2">
        <div className="font-medium text-sm text-gray-900">{p.name}</div>
        <div className="text-xs text-gray-400 mt-0.5">{p.code} · {p.bu}</div>
        <div className="text-xs text-gray-400 mt-0.5 capitalize">{p.type.replace("_", " ")} · {p.phase}</div>
      </td>
      <td className="py-3 px-3 text-right text-sm tabular-nums text-gray-700">
        <div className="font-semibold">{fmtBRL(p.contractRev)}</div>
        <div className="text-xs text-gray-400">custo: {fmtBRL(p.budgetCost)}</div>
      </td>
      <td className="py-3 px-3 text-right">
        <div className="text-sm font-semibold tabular-nums text-gray-900">{fmtPct(p.irrAnnualized)}</div>
        <div className="text-xs text-gray-400">hurdle: {fmtPct(p.hurdle)}</div>
        {p.durationMo != null && <div className="text-xs text-gray-300">{p.durationMo.toFixed(0)}m</div>}
      </td>
      <td className="py-3 px-3"><SpreadChip spread={p.spread} /></td>
      <td className="py-3 px-3 text-right">
        <div className="text-sm tabular-nums text-gray-600">{p.completionPct}%</div>
        <div className={`text-xs ${p.health === "green" ? "text-emerald-600" : p.health === "red" ? "text-red-600" : "text-amber-600"}`}>
          {p.health}
        </div>
      </td>
      <td className="py-3 pr-4 pl-3"><StatusBadge status={p.status} /></td>
    </tr>
  );
}

// ─── Zone 5: Cash constraint row ─────────────────────────────────────────────

function CashRow({ buName, ctx }: { buName: string; ctx: BuCashContext }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors text-xs">
      <td className="py-3 pl-4 pr-2 font-medium text-gray-900">{buName}</td>
      <td className="py-3 px-3 text-right">
        <div className="font-semibold text-emerald-700 tabular-nums">{fmtBRL(ctx.arOutstanding)}</div>
        {ctx.arOverdue > 0 && <div className="text-red-500 tabular-nums">{fmtBRL(ctx.arOverdue)} vencido</div>}
      </td>
      <td className="py-3 px-3 text-right">
        <div className="font-semibold text-red-700 tabular-nums">{fmtBRL(ctx.apOutstanding)}</div>
        {ctx.apOverdue > 0 && <div className="text-red-500 tabular-nums">{fmtBRL(ctx.apOverdue)} vencido</div>}
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-gray-700">{ctx.dso !== null ? `${ctx.dso.toFixed(0)}d` : "—"}</td>
      <td className="py-3 px-3 text-right tabular-nums text-gray-700">{ctx.dpo !== null ? `${ctx.dpo.toFixed(0)}d` : "—"}</td>
      <td className="py-3 px-3 text-right tabular-nums text-indigo-700 font-semibold">
        {ctx.capitalDeployed > 0 ? fmtBRL(ctx.capitalDeployed) : "—"}
      </td>
      <td className="py-3 px-3 text-right tabular-nums">
        {ctx.fundingGap !== null ? (
          <span className={ctx.fundingGap > 0 ? "text-amber-700 font-semibold" : "text-emerald-700 font-semibold"}>
            {ctx.fundingGap > 0 ? "+" : ""}{fmtBRL(ctx.fundingGap)}
          </span>
        ) : "—"}
      </td>
      <td className="py-3 pr-4 pl-3 tabular-nums">
        {ctx.ccc !== null ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border text-xs
            ${ctx.ccc <= 30 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : ctx.ccc <= 60 ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-red-50 text-red-700 border-red-200"}`}>
            {ctx.ccc.toFixed(0)}d
          </span>
        ) : "—"}
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
      buHurdles: [], projects: [], dataSource: "static" as const,
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

  const { buHurdles, projects, dataSource, inputsMeta } = analysis;
  const { total, approved, rejected, watch, totalCapex, approvedCapex, approvalRate,
          weightedSpread, totalNPV, totalEVA } = summary;

  const cashRows = buHurdles
    .map((h) => ({ bu: h, ctx: cashCtx[h.bu_id] }))
    .filter(({ ctx }) => ctx != null);
  const hasCashData = cashRows.some(
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
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Veredicto do Portfolio</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Spread Ponderado",
                value: weightedSpread !== null ? spreadLabel(weightedSpread) : "—",
                sub: `${approved} aprovados / ${total} projetos`,
                icon: Activity,
                color: weightedSpread !== null && weightedSpread >= 0 ? "text-emerald-600" : "text-red-600",
              },
              {
                label: "NPV Estimado",
                value: fmtBRL(totalNPV),
                sub: `${approvalRate.toFixed(0)}% taxa aprovação`,
                icon: TrendingUp,
                color: totalNPV >= 0 ? "text-emerald-600" : "text-red-600",
              },
              {
                label: "EVA Total BUs",
                value: fmtBRL(totalEVA),
                sub: "ROIC vs Hurdle × Capital",
                icon: BarChart3,
                color: totalEVA >= 0 ? "text-emerald-600" : "text-red-600",
              },
              {
                label: "Funding Gap",
                value: globalFundingGap !== 0 ? fmtBRL(globalFundingGap) : "—",
                sub: `CAPEX aprovado ${fmtBRL(approvedCapex)} · aplicado`,
                icon: Wallet,
                color: globalFundingGap > 0 ? "text-amber-600" : "text-gray-500",
              },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">{label}</span>
                  <Icon size={13} className={color} />
                </div>
                <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
                <div className="text-xs text-gray-400 mt-1">{sub}</div>
              </div>
            ))}
          </div>
          {watch > 0 && (
            <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
              <AlertTriangle size={11} />
              <span><strong>{watch} projeto{watch > 1 ? "s" : ""} em atenção</strong> — spread entre −2pp e 0pp. Revisar premissas.</span>
            </div>
          )}
          {rejected > 0 && (
            <div className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">
              <XCircle size={11} />
              <span><strong>{rejected} projeto{rejected > 1 ? "s" : ""} reprovado{rejected > 1 ? "s" : ""}</strong> — IRR anualizado abaixo do hurdle da BU.</span>
            </div>
          )}
        </section>

        {/* ── ZONA 3: The Bar ───────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">The Bar — Custo de Capital por BU</span>
          </div>
          {buHurdles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {buHurdles.map((bu) => <BuBarCard key={bu.bu_id} bu={bu} />)}
            </div>
          ) : (
            <div className="card p-6 text-center text-xs text-gray-400">
              Dados de hurdle indisponíveis. Configure o banco de dados.
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Ke = Rf + ERP + Prêmio Tamanho + Prêmio Específico + Prêmio BU.
            Simples Nacional: T = 0 (sem escudo fiscal). ROIC exibido separado — nunca usado como Ke.
          </p>

          {/* Build-up waterfall + Bullet side by side */}
          {buHurdles.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="card p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Composição do Hurdle por BU</div>
                <BuildupWaterfall buHurdles={buHurdles} />
              </div>
              <div className="card p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Hurdle vs ROIC Real</div>
                <BulletChart buHurdles={buHurdles} />
              </div>
            </div>
          )}
        </section>

        {/* ── ZONA 4: Candidates ───────────────────────────────────────── */}

        {/* Projetos de capital */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Projetos de Capital — IRR a.a. vs Hurdle</span>
          </div>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left py-2.5 pl-4 pr-2 text-xs font-semibold text-gray-500">Projeto</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">CAPEX</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">IRR a.a.</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-gray-500">Spread</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">NPV ≈</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Payback</th>
                  <th className="py-2.5 pr-4 pl-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {(["approved","watch","rejected","pending"] as HurdleStatus[]).flatMap((st) =>
                  projects.filter((p) => p.status === st).map((p) => <ProjectRow key={p.id} p={p} />)
                )}
                {projects.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-gray-400">Nenhum projeto cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            IRR a.a. = (1 + ROI_total)^(12/duração_meses) − 1. Spread = IRR a.a. − Hurdle BU.
            NPV ≈ (IRR−hurdle)/hurdle × CAPEX.
          </p>
        </section>

        {/* PPM projetos operacionais */}
        {ppmErr ? (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={14} className="text-brand-600" />
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">PPM — Projetos Operacionais vs Hurdle</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs bg-amber-50 border border-amber-200 text-amber-700">
              <AlertTriangle size={12} /> <span>Dados PPM indisponíveis no momento.</span>
            </div>
          </section>
        ) : ppmRows.length > 0 ? (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-brand-600" />
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">PPM — Projetos Operacionais vs Hurdle</span>
            </div>
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="text-left py-2.5 pl-4 pr-2 text-xs font-semibold text-gray-500">Projeto</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Receita / Custo</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">IRR a.a.</th>
                    <th className="py-2.5 px-3 text-xs font-semibold text-gray-500">Spread</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Conclusão</th>
                    <th className="py-2.5 pr-4 pl-3 text-xs font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(["approved","watch","rejected","pending"] as HurdleStatus[]).flatMap((st) =>
                    ppmRows.filter((r) => r.status === st).map((r) => <PpmRow key={r.id} p={r} />)
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              IRR a.a. derivado do ROI contratual anualizado pela duração do projeto (start → end).
            </p>
          </section>
        ) : null}

        {/* Bubble scatter + Diverging bar */}
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
              <div className="card p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Pipeline — Capital × Spread</div>
                <BubbleScatter projects={unified} />
              </div>
              <div className="card p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Spread por Projeto</div>
                <DivergingBarProjects projects={unified} />
              </div>
            </div>
          );
        })()}

        {/* ── ZONA 5: Constraint ───────────────────────────────────────── */}
        {cashErr ? (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={14} className="text-brand-600" />
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">AR · AP · Capital Aplicado</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs bg-amber-50 border border-amber-200 text-amber-700">
              <AlertTriangle size={12} /> <span>Dados AR/AP/Cash indisponíveis no momento.</span>
            </div>
          </section>
        ) : hasCashData ? (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={14} className="text-brand-600" />
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">AR · AP · Capital Aplicado — Restrição de Caixa</span>
            </div>
            <div className="card overflow-hidden p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="text-left py-2.5 pl-4 pr-2 font-semibold text-gray-500">BU</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-500">
                      <div className="flex items-center justify-end gap-1"><ArrowUpRight size={10} className="text-emerald-500" />AR</div>
                    </th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-500">
                      <div className="flex items-center justify-end gap-1"><ArrowDownRight size={10} className="text-red-500" />AP</div>
                    </th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-500">DSO</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-500">DPO</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-500">Capital Aplicado</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-500">Funding Gap</th>
                    <th className="text-right py-2.5 pr-4 pl-3 font-semibold text-gray-500">CCC</th>
                  </tr>
                </thead>
                <tbody>
                  {cashRows.map(({ bu, ctx }) => (
                    <CashRow key={bu.bu_id} buName={bu.bu} ctx={ctx} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              DSO/DPO = prazo médio recebimento/pagamento · CCC = DSO − DPO · Funding Gap = CAPEX aprovado − capital já aplicado.
            </p>

            {/* Cash Runway + Funding Gauge */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="card p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Runway de Caixa (6m)</div>
                <CashRunwayChart cashRows={cashRows} approvedCapex={approvedCapex} />
              </div>
              <div className="card p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Funding Gap por BU</div>
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
        <section className="card p-4 bg-gray-50/60">
          <div className="flex items-center gap-2 mb-3">
            <Info size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Metodologia & Proveniência</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
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
