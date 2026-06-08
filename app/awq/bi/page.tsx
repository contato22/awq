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

export default async function BiPage() {
  const [kpis, buData, treasury, venture] = await Promise.all([
    getAWQGroupKPIs(),
    getBUData(),
    getHoldingTreasury(),
    getVentureFeeMetrics(),
  ]);

  // ── MRR / ARR ────────────────────────────────────────────────────────────────
  const feeMRR    = venture.feeMRR.value as number;
  const mrr       = JACQES_MRR + feeMRR;
  const arr       = mrr * 12;

  // ── Revenue YTD (snapshot from buData) ──────────────────────────────────────
  const revenueYTD = buData.reduce((s, b) => s + b.revenue, 0);

  // ── Assets — real pipeline if available, else snapshot ──────────────────────
  const assetsReal   = kpis.hasRealData && kpis.totalCashBalance.value !== null
    ? (kpis.totalCashBalance.value as number)
    : null;
  const assetsSnapshot = buData.reduce((s, b) => s + b.cashBalance, 0) + holdingCash;
  const assetsValue    = assetsReal ?? assetsSnapshot;
  const assetsSource: "real" | "snapshot" = assetsReal !== null ? "real" : "snapshot";

  // ── BU bar chart setup ────────────────────────────────────────────────────────
  const maxRevenue = Math.max(...buData.map((b) => b.revenue), 1);

  // Monthly data (only jacqes + caza have values)
  const chartData = monthlyRevenue.map(({ month, jacqes, caza, total }) => ({
    month,
    jacqes,
    caza,
    total,
  }));

  return (
    <>
      <Header
        title="BI"
        subtitle="Business Intelligence · AWQ Group — receita, recorrência e posição patrimonial"
      />
      <div className="page-container">

        {/* ── Data source legend ──────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 px-1">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-emerald-600" />
            <span className="font-semibold text-emerald-700">REAL</span> = base bancária ingerida
          </span>
          <span className="flex items-center gap-1.5">
            <AlertCircle size={11} className="text-amber-500" />
            <span className="font-semibold text-amber-600">SNAPSHOT</span> = planejamento / Notion / prints
          </span>
        </div>

        {/* ── Hero KPI row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">

          {/* MRR */}
          <div className="card p-5 bg-brand-50/20 border-brand-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                <RotateCcw size={15} className="text-brand-600" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">MRR</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{fmtR(mrr)}</div>
            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              /mês recorrente
              <MetricSourceBadge sourceType="snapshot" />
            </div>
          </div>

          {/* ARR */}
          <div className="card p-5 bg-brand-50/20 border-brand-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                <TrendingUp size={15} className="text-brand-600" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">ARR</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{fmtR(arr)}</div>
            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              /ano recorrente
              <MetricSourceBadge sourceType="snapshot" />
            </div>
          </div>

          {/* MARGEM */}
          <div className="card p-5 bg-amber-50/20 border-amber-100 opacity-80">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <BarChart3 size={15} className="text-amber-500" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">MARGEM</span>
            </div>
            <div className="text-2xl font-bold text-gray-600">
              {kpis.ebitdaMargin.value > 0 ? fmtPct(kpis.ebitdaMargin.value) : "—"}
            </div>
            <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              EBITDA · aguarda custos
              <MetricSourceBadge sourceType="snapshot" />
            </div>
          </div>

          {/* ASSETS */}
          <div className={`card p-5 ${assetsSource === "real" ? "bg-emerald-50/20 border-emerald-100" : "bg-amber-50/20 border-amber-100 opacity-80"}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${assetsSource === "real" ? "bg-emerald-50" : "bg-amber-50"}`}>
                <Wallet size={15} className={assetsSource === "real" ? "text-emerald-600" : "text-amber-500"} />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">ASSETS</span>
            </div>
            <div className={`text-2xl font-bold ${assetsSource === "real" ? "text-gray-900" : "text-gray-600"}`}>
              {fmtR(assetsValue)}
            </div>
            <div className={`text-xs mt-1 flex items-center gap-1 ${assetsSource === "real" ? "text-gray-400" : "text-amber-600"}`}>
              Caixa total
              <MetricSourceBadge sourceType={assetsSource} />
            </div>
          </div>

          {/* INVESTIMENTOS */}
          <div className="card p-5 bg-amber-50/20 border-amber-100 opacity-80">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Landmark size={15} className="text-amber-600" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">INVEST.</span>
            </div>
            <div className="text-2xl font-bold text-gray-600">{fmtBRL(treasury.totalInvestedReal)}</div>
            <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              CDB DI · Itaú
              <MetricSourceBadge sourceType="snapshot" />
            </div>
          </div>

          {/* RECEITA YTD */}
          <div className="card p-5 bg-amber-50/20 border-amber-100 opacity-80">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <DollarSign size={15} className="text-amber-600" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">REC. YTD</span>
            </div>
            <div className="text-2xl font-bold text-gray-600">{fmtR(revenueYTD)}</div>
            <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              Jan–Abr 2026
              <MetricSourceBadge sourceType="snapshot" />
            </div>
          </div>

        </div>

        {/* ── Receita por BU ─────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <AlertCircle size={12} className="text-amber-500" />
            <h2 className="text-base font-semibold text-gray-900">Receita por BU</h2>
            <MetricSourceBadge sourceType="snapshot" />
            <span className="ml-auto text-xs text-gray-400">YTD Jan–Abr 2026</span>
          </div>

          <div className="space-y-4">
            {buData.map((bu) => (
              <div key={bu.id} className="flex items-center gap-3">
                <div className="w-24 shrink-0">
                  <span className="text-xs font-semibold text-gray-700 truncate block">{bu.name}</span>
                  <span className="text-[10px] text-gray-400 block truncate">{bu.sub.split(" · ")[0]}</span>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${bu.revenue > 0 ? bu.color : "bg-gray-200"}`}
                    style={{ width: `${(bu.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <div className="w-20 text-right shrink-0">
                  {bu.revenue > 0
                    ? <span className="text-xs font-bold text-gray-900">{fmtR(bu.revenue)}</span>
                    : <span className="text-xs text-gray-400">—</span>
                  }
                </div>
                <div className="w-10 text-right shrink-0">
                  <span className="text-xs text-gray-400">
                    {revenueYTD > 0 && bu.revenue > 0
                      ? Math.round((bu.revenue / revenueYTD) * 100) + "%"
                      : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Total:{" "}
              <span className="font-semibold text-gray-700">{fmtR(revenueYTD)}</span>
            </span>
            <Link href="/awq/kpis" className="text-xs text-brand-600 hover:text-brand-500 flex items-center gap-1">
              <ChevronRight size={11} /> KPIs completo
            </Link>
          </div>
        </div>

        {/* ── Evolução de Receita ─────────────────────────────────────────────── */}
        <div className="card p-5 opacity-80">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={12} className="text-amber-500" />
            <h2 className="text-base font-semibold text-gray-700">Evolução de Receita</h2>
            <MetricSourceBadge sourceType="snapshot" />
            <span className="ml-auto text-xs text-gray-400">Jan–Abr 2026 · por BU</span>
          </div>
          <BIRevenueChart data={chartData} />
        </div>

        {/* ── Composição do MRR ──────────────────────────────────────────────── */}
        <div className="card p-5 opacity-80">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={12} className="text-amber-500" />
            <h2 className="text-base font-semibold text-gray-700">Composição do MRR</h2>
            <MetricSourceBadge sourceType="snapshot" />
            <span className="ml-auto text-xs font-bold text-gray-700">{fmtR(mrr)}/mês</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-brand-50 border border-brand-100 p-4">
              <div className="text-xs font-semibold text-gray-500 mb-1">JACQES · Social Media</div>
              <div className="flex items-end gap-1">
                <span className="text-xl font-bold text-brand-700">{fmtBRL(JACQES_MRR)}</span>
                <span className="text-xs font-medium text-gray-400 mb-0.5">/mês</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">4 clientes recorrentes confirmados</div>
              <div className="mt-2 text-xs font-semibold text-brand-600">
                {Math.round((JACQES_MRR / mrr) * 100)}% do MRR total
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <div className="text-xs font-semibold text-gray-500 mb-1">AWQ Venture · Advisory ENERDY</div>
              <div className="flex items-end gap-1">
                <span className="text-xl font-bold text-amber-700">{fmtBRL(feeMRR)}</span>
                <span className="text-xs font-medium text-gray-400 mb-0.5">/mês</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">Contrato 36 meses · fee incubação</div>
              <div className="mt-2 text-xs font-semibold text-amber-600">
                {Math.round((feeMRR / mrr) * 100)}% do MRR total
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick links ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "KPIs",          href: "/awq/kpis",        icon: BarChart3,  color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "Financial",     href: "/awq/financial",   icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Investimentos", href: "/awq/investments", icon: Landmark,   color: "text-amber-600",   bg: "bg-amber-50"   },
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

      </div>
    </>
  );
}
