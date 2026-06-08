import Header from "@/components/Header";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  Wallet,
  Landmark,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  ArrowUpRight,
} from "lucide-react";
import {
  getAWQGroupKPIs,
  getVentureFeeMetrics,
  fmtBRL,
  fmtR,
  fmtPct,
} from "@/lib/financial-metric-query";
import { getBUData, getHoldingTreasury } from "@/lib/epm-planning-db";
import { JACQES_MRR, monthlyRevenue, holdingCash } from "@/lib/awq-group-data";
import { MetricSourceBadge } from "@/components/MetricSourceBadge";
import BIRevenueChart from "@/components/BIRevenueChart";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

// ─── Accent strip colours per card slot ───────────────────────────────────────
const CARD_ACCENTS = [
  { from: "#1d4ed8", to: "#3b82f6" },   // MRR          — brand blue
  { from: "#0891b2", to: "#22d3ee" },   // ARR          — cyan
  { from: "#d97706", to: "#fbbf24" },   // MARGEM       — amber
  { from: "#059669", to: "#34d399" },   // ASSETS       — emerald (real)
  { from: "#b45309", to: "#f59e0b" },   // INVESTIMENTOS — warm amber
  { from: "#7c3aed", to: "#a78bfa" },   // RECEITA YTD  — violet
];

export default async function BiPage() {
  const [kpis, buData, treasury, venture] = await Promise.all([
    getAWQGroupKPIs(),
    getBUData(),
    getHoldingTreasury(),
    getVentureFeeMetrics(),
  ]);

  // ── MRR / ARR ──────────────────────────────────────────────────────────────
  const feeMRR = venture.feeMRR.value as number;
  const mrr    = JACQES_MRR + feeMRR;
  const arr    = mrr * 12;

  // ── Revenue YTD ────────────────────────────────────────────────────────────
  const revenueYTD = buData.reduce((s, b) => s + b.revenue, 0);

  // ── Assets ─────────────────────────────────────────────────────────────────
  const assetsReal = kpis.hasRealData && kpis.totalCashBalance.value !== null
    ? (kpis.totalCashBalance.value as number)
    : null;
  const assetsValue  = assetsReal ?? (buData.reduce((s, b) => s + b.cashBalance, 0) + holdingCash);
  const assetsSource: "real" | "snapshot" = assetsReal !== null ? "real" : "snapshot";

  // ── BU bar chart ───────────────────────────────────────────────────────────
  const maxRevenue = Math.max(...buData.map((b) => b.revenue), 1);

  const chartData = monthlyRevenue.map(({ month, jacqes, caza, total }) => ({
    month, jacqes, caza, total,
  }));

  const heroCards = [
    {
      label:   "MRR",
      value:   fmtR(mrr),
      sub:     "/mês recorrente",
      source:  "snapshot" as const,
      icon:    RotateCcw,
      accent:  CARD_ACCENTS[0],
    },
    {
      label:   "ARR",
      value:   fmtR(arr),
      sub:     "/ano recorrente",
      source:  "snapshot" as const,
      icon:    TrendingUp,
      accent:  CARD_ACCENTS[1],
    },
    {
      label:   "MARGEM",
      value:   kpis.ebitdaMargin.value > 0 ? fmtPct(kpis.ebitdaMargin.value) : "—",
      sub:     "EBITDA — aguarda custos",
      source:  "snapshot" as const,
      icon:    BarChart3,
      accent:  CARD_ACCENTS[2],
      dimmed:  true,
    },
    {
      label:   "ASSETS",
      value:   fmtR(assetsValue),
      sub:     "Caixa total",
      source:  assetsSource,
      icon:    Wallet,
      accent:  assetsSource === "real" ? CARD_ACCENTS[3] : CARD_ACCENTS[2],
    },
    {
      label:   "INVEST.",
      value:   fmtBRL(treasury.totalInvestedReal),
      sub:     "CDB DI · Itaú",
      source:  "snapshot" as const,
      icon:    Landmark,
      accent:  CARD_ACCENTS[4],
    },
    {
      label:   "REC. YTD",
      value:   fmtR(revenueYTD),
      sub:     "Jan–Abr 2026",
      source:  "snapshot" as const,
      icon:    DollarSign,
      accent:  CARD_ACCENTS[5],
    },
  ];

  return (
    <>
      {/* ── Page-scoped animations ────────────────────────────────────────── */}
      <style>{`
        @keyframes bi-fadein {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bi-fadeup {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bi-bar {
          from { width: 0; }
        }
        @keyframes bi-number {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes bi-stripe-slide {
          from { background-position: 200% center; }
          to   { background-position: -200% center; }
        }
        .bi-card {
          animation: bi-fadein 0.45s cubic-bezier(0.22,1,0.36,1) both;
        }
        .bi-number {
          animation: bi-number 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        .bi-section {
          animation: bi-fadeup 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        .bi-bar-fill {
          animation: bi-bar 1s cubic-bezier(0.22,1,0.36,1) both;
        }
        .bi-card:hover .bi-card-accent {
          opacity: 1;
        }
        .bi-card-accent {
          opacity: 0.85;
          transition: opacity 0.2s ease;
        }
      `}</style>

      <Header
        title="BI"
        subtitle="Business Intelligence · AWQ Group — receita, recorrência e posição patrimonial"
      />

      <div className="page-container">

        {/* ── Data source legend ─────────────────────────────────────────── */}
        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500 px-0.5 bi-section"
          style={{ animationDelay: "0ms" }}
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-emerald-500" />
            <span className="font-semibold text-emerald-700">REAL</span>
            <span className="text-gray-400">= base bancária ingerida</span>
          </span>
          <span className="flex items-center gap-1.5">
            <AlertCircle size={11} className="text-amber-400" />
            <span className="font-semibold text-amber-600">SNAPSHOT</span>
            <span className="text-gray-400">= Notion / prints / planejamento</span>
          </span>
        </div>

        {/* ── Hero KPI cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {heroCards.map((card, i) => {
            const Icon = card.icon;
            const isReal = card.source === "real";
            return (
              <div
                key={card.label}
                className={`bi-card card-hover relative overflow-hidden rounded-xl bg-white border cursor-default select-none
                  ${isReal ? "border-emerald-200/60" : "border-gray-200/80"}
                `}
                style={{ animationDelay: `${60 + i * 55}ms` }}
              >
                {/* colour accent strip at top */}
                <div
                  className="bi-card-accent h-0.5 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${card.accent.from}, ${card.accent.to})`,
                  }}
                />

                <div className="px-4 pt-3.5 pb-4">
                  {/* label row */}
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {card.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <MetricSourceBadge sourceType={card.source} />
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: `${card.accent.from}18` }}
                      >
                        <Icon size={12} style={{ color: card.accent.from }} />
                      </div>
                    </div>
                  </div>

                  {/* value */}
                  <div
                    className={`bi-number text-[1.6rem] font-black leading-none tracking-tight
                      ${card.dimmed ? "text-gray-400" : "text-gray-900"}
                    `}
                    style={{ animationDelay: `${120 + i * 55}ms` }}
                  >
                    {card.value}
                  </div>

                  {/* subtitle */}
                  <div className="mt-1.5 text-[11px] text-gray-400 font-medium leading-tight">
                    {card.sub}
                  </div>
                </div>

                {/* real-data subtle glow bg */}
                {isReal && (
                  <div className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-emerald-400/20 bg-emerald-50/10" />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Receita por BU ────────────────────────────────────────────── */}
        <div
          className="bi-section card overflow-hidden"
          style={{ animationDelay: "440ms" }}
        >
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">Receita por BU</h2>
              <MetricSourceBadge sourceType="snapshot" />
              <span className="ml-auto text-[11px] text-gray-400 font-medium">YTD Jan–Abr 2026</span>
            </div>
            <p className="text-[11px] text-gray-400">Receita operacional confirmada por unidade de negócio</p>
          </div>

          <div className="divide-y divide-gray-50">
            {buData.map((bu, i) => {
              const pct = revenueYTD > 0 && bu.revenue > 0
                ? Math.round((bu.revenue / revenueYTD) * 100)
                : 0;
              const barPct = Math.round((bu.revenue / maxRevenue) * 100);
              return (
                <div
                  key={bu.id}
                  className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50/60 transition-colors group"
                >
                  {/* colour dot + name */}
                  <div className="w-28 shrink-0 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${bu.revenue > 0 ? bu.color : "bg-gray-200"}`} />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-gray-800 block truncate">{bu.name}</span>
                      <span className="text-[10px] text-gray-400 block">{bu.sub.split(" · ")[0]}</span>
                    </div>
                  </div>

                  {/* bar */}
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`bi-bar-fill h-full rounded-full ${bu.revenue > 0 ? bu.color : "bg-transparent"}`}
                      style={{
                        width: `${barPct}%`,
                        animationDelay: `${520 + i * 80}ms`,
                        animationDuration: "0.9s",
                      }}
                    />
                  </div>

                  {/* value */}
                  <div className="w-16 text-right shrink-0">
                    {bu.revenue > 0
                      ? <span className="text-xs font-bold text-gray-900">{fmtR(bu.revenue)}</span>
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </div>

                  {/* share pill */}
                  <div className="w-11 shrink-0 flex justify-end">
                    {pct > 0
                      ? (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                          ${pct >= 50 ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-500"}`}
                        >
                          {pct}%
                        </span>
                      )
                      : null
                    }
                  </div>
                </div>
              );
            })}
          </div>

          {/* footer */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/40">
            <span className="text-xs text-gray-500">
              Total operacional:{" "}
              <span className="font-bold text-gray-800">{fmtR(revenueYTD)}</span>
            </span>
            <Link
              href="/awq/kpis"
              className="text-xs text-brand-600 hover:text-brand-500 flex items-center gap-0.5 font-semibold transition-colors"
            >
              KPIs completo <ArrowUpRight size={11} />
            </Link>
          </div>
        </div>

        {/* ── Evolução de Receita ────────────────────────────────────────── */}
        <div
          className="bi-section card p-5"
          style={{ animationDelay: "500ms" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Evolução de Receita</h2>
            <MetricSourceBadge sourceType="snapshot" />
            <span className="ml-auto text-[11px] text-gray-400 font-medium">Jan–Abr 2026 · por BU</span>
          </div>
          <p className="text-[11px] text-gray-400 mb-5">Receita mensal confirmada — JACQES (recorrente) e Caza Vision (projetos)</p>
          <BIRevenueChart data={chartData} />
        </div>

        {/* ── Composição do MRR ─────────────────────────────────────────── */}
        <div
          className="bi-section card p-5"
          style={{ animationDelay: "560ms" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Composição do MRR</h2>
            <MetricSourceBadge sourceType="snapshot" />
            <span className="ml-auto text-xs font-black text-gray-800">{fmtR(mrr)}<span className="font-medium text-gray-400">/mês</span></span>
          </div>
          <p className="text-[11px] text-gray-400 mb-5">Fontes de receita recorrente confirmadas</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* JACQES */}
            <div className="rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">JACQES</div>
                  <div className="text-xs text-gray-500 mt-0.5">Social Media Management</div>
                </div>
                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-100 rounded-full px-2 py-0.5">
                  {Math.round((JACQES_MRR / mrr) * 100)}% do MRR
                </span>
              </div>
              <div className="text-2xl font-black text-brand-700 tracking-tight">
                {fmtBRL(JACQES_MRR)}
                <span className="text-sm font-medium text-gray-400">/mês</span>
              </div>
              <div className="text-xs text-gray-400 mt-1 mb-3">4 clientes recorrentes confirmados</div>
              {/* share bar */}
              <div className="h-1 bg-brand-100 rounded-full overflow-hidden">
                <div
                  className="bi-bar-fill h-full bg-brand-500 rounded-full"
                  style={{ width: `${Math.round((JACQES_MRR / mrr) * 100)}%`, animationDelay: "700ms" }}
                />
              </div>
            </div>

            {/* ENERDY fee */}
            <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">AWQ VENTURE</div>
                  <div className="text-xs text-gray-500 mt-0.5">Advisory ENERDY</div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                  {Math.round((feeMRR / mrr) * 100)}% do MRR
                </span>
              </div>
              <div className="text-2xl font-black text-amber-700 tracking-tight">
                {fmtBRL(feeMRR)}
                <span className="text-sm font-medium text-gray-400">/mês</span>
              </div>
              <div className="text-xs text-gray-400 mt-1 mb-3">Contrato 36 meses · fee de incubação</div>
              {/* share bar */}
              <div className="h-1 bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="bi-bar-fill h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.round((feeMRR / mrr) * 100)}%`, animationDelay: "780ms" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick links ───────────────────────────────────────────────── */}
        <div
          className="bi-section grid grid-cols-1 sm:grid-cols-3 gap-3"
          style={{ animationDelay: "620ms" }}
        >
          {[
            { label: "KPIs",          sub: "Scorecard consolidado",  href: "/awq/kpis",        icon: BarChart3,  accent: "#1d4ed8" },
            { label: "Financial",     sub: "Posição de caixa real",  href: "/awq/financial",   icon: DollarSign, accent: "#059669" },
            { label: "Investimentos", sub: "Portfólio CDB & renda",  href: "/awq/investments", icon: Landmark,   accent: "#b45309" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="card card-hover p-4 flex items-center gap-3 group transition-all"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                  style={{ background: `${item.accent}18` }}
                >
                  <Icon size={15} style={{ color: item.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{item.label}</div>
                  <div className="text-[10px] text-gray-400 truncate">{item.sub}</div>
                </div>
                <ChevronRight
                  size={13}
                  className="text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </Link>
            );
          })}
        </div>

      </div>
    </>
  );
}
