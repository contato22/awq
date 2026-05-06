import Header from "@/components/Header";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  BarChart3,
  DollarSign,
  ArrowUpRight,
  ChevronRight,
  Zap,
  AlertTriangle,
} from "lucide-react";
import {
  buData,
  operatingBus,
  consolidated,
  allocFlags,
  flagConfig,
  PAYBACK_ESTIMATES,
} from "@/lib/awq-derived-metrics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(1) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqAllocationsPage() {
  const totalCap = buData.reduce((s, b) => s + b.capitalAllocated, 0);

  // Rankings
  const byMargin  = [...operatingBus].sort((a, b) => (b.grossProfit / b.revenue) - (a.grossProfit / a.revenue));
  const byCash    = [...buData].sort((a, b) => b.cashGenerated - a.cashGenerated);
  const byRoic    = [...buData].sort((a, b) => b.roic - a.roic);

  return (
    <>
      <Header
        title="Allocations — AWQ Group"
        subtitle="Capital por BU · ROIC · Payback · Expand / Maintain / Review / Cut"
      />
      <div className="page-container">

        {/* ── Snapshot notice ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">
                Capital alocado, ROIC e Cash Gerado são dados de planejamento (snapshot).
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Não derivados da base bancária. Para fluxo de caixa real por entidade, acesse{" "}
                <a href="/awq/cashflow" className="underline font-medium">/awq/cashflow</a>{" "}
                ou{" "}
                <a href="/awq/financial" className="underline font-medium">/awq/financial</a>.
              </p>
            </div>
          </div>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const roicMedio     = operatingBus.reduce((s, b) => s + b.roic, 0) / operatingBus.length;
            const bestRoicBU    = buData.reduce((a, b) => a.roic > b.roic ? a : b);
            const expandBUs     = buData.filter((b) => allocFlags[b.id] === "expand");
            const expandNames   = expandBUs.map((b) => b.name).join(" + ");
            return [
              {
                label: "Capital Total Alocado",
                value: fmtR(totalCap),
                sub:   `${buData.length} BUs`,
                delta: `snapshot Q1 2026`,
                icon:  Wallet,
                color: "text-amber-700",
                bg:    "bg-amber-50",
              },
              {
                label: "ROIC Médio (Ops)",
                value: `${roicMedio.toFixed(1)}%`,
                sub:   "excl. Venture",
                delta: "snapshot accrual",
                icon:  TrendingUp,
                color: "text-emerald-600",
                bg:    "bg-emerald-50",
              },
              {
                label: "Melhor ROIC",
                value: bestRoicBU.name,
                sub:   `${bestRoicBU.roic.toFixed(0)}% ROIC`,
                delta: `lidera entre ${buData.length} BUs`,
                icon:  BarChart3,
                color: "text-violet-700",
                bg:    "bg-violet-50",
              },
              {
                label: "BUs p/ Expandir",
                value: `${expandBUs.length}`,
                sub:   expandNames || "nenhuma",
                delta: "capital adicional sinalizado",
                icon:  Zap,
                color: "text-brand-600",
                bg:    "bg-brand-50",
              },
            ];
          })().map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight size={11} className="text-emerald-600" />
                    <span className="text-[10px] font-semibold text-emerald-600">{card.delta}</span>
                    <span className="text-[10px] text-gray-400">{card.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Capital Allocation Table ──────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Capital por BU — ROIC, Payback e Decisão</h2>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">BU</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Capital Alocado</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">% do Total</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro Líq. YTD</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">ROIC</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Payback (est.)</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Cash Gen.</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Flag</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Drill</th>
                </tr>
              </thead>
              <tbody>
                {[...buData].sort((a, b) => b.roic - a.roic).map((bu) => {
                  const flag    = allocFlags[bu.id];
                  const flagCfg = flagConfig[flag];
                  const share   = (bu.capitalAllocated / totalCap) * 100;
                  const pb      = PAYBACK_ESTIMATES[bu.id];
                  return (
                    <tr key={bu.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                          <span className={`text-xs font-bold ${bu.accentColor}`}>{bu.name}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 ml-4">{bu.sub.split(" · ")[0]}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(bu.capitalAllocated)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{share.toFixed(0)}%</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(bu.netIncome)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold">
                        <span className={bu.roic >= 50 ? "text-emerald-600" : bu.roic >= 20 ? "text-amber-700" : "text-red-600"}>
                          {bu.roic.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold">
                        {pb ? (
                          <span className={pb <= 12 ? "text-emerald-600" : pb <= 24 ? "text-amber-700" : "text-red-600"}>
                            {pb}m
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-emerald-600">{fmtR(bu.cashGenerated)}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${flagCfg.bg} ${flagCfg.color}`}>
                          {flagCfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Link href={bu.hrefFinancial} className="text-[10px] text-brand-600 hover:text-brand-500 flex items-center gap-0.5 transition-colors">
                          Detalhe <ChevronRight size={10} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Rankings ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {[
            { title: "Ranking por Margem Bruta", items: byMargin, getValue: (b: typeof buData[0]) => b.revenue > 0 ? `${((b.grossProfit / b.revenue) * 100).toFixed(0)}%` : "—" },
            { title: "Ranking por Cash Generation", items: byCash, getValue: (b: typeof buData[0]) => fmtR(b.cashGenerated) },
            { title: "Ranking por ROIC", items: byRoic, getValue: (b: typeof buData[0]) => `${b.roic.toFixed(0)}%` },
          ].map((ranking) => (
            <div key={ranking.title} className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">{ranking.title}</h2>
              <div className="space-y-2.5">
                {ranking.items.map((bu, i) => {
                  const flag    = allocFlags[bu.id];
                  const flagCfg = flagConfig[flag];
                  return (
                    <div key={bu.id} className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-bold text-gray-400 w-5 shrink-0">#{i + 1}</span>
                      <div className={`w-2 h-2 rounded-full ${bu.color} shrink-0`} />
                      <span className="text-xs text-gray-400 flex-1">{bu.name}</span>
                      <span className={`text-[10px] font-bold ${flagCfg.color}`}>{flagCfg.label}</span>
                      <span className={`text-xs font-bold ${bu.accentColor}`}>{ranking.getValue(bu)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Capital allocation visual ──────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Distribuição de Capital</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-3">
              {buData.map((bu) => {
                const share = (bu.capitalAllocated / totalCap) * 100;
                const flag  = allocFlags[bu.id];
                const flagCfg = flagConfig[flag];
                return (
                  <div key={bu.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                        <span className="text-xs text-gray-500">{bu.name}</span>
                        <span className={`text-[10px] font-bold ${flagCfg.color}`}>{flagCfg.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${bu.roic >= 30 ? "text-emerald-600" : "text-amber-700"}`}>
                          ROIC {bu.roic.toFixed(0)}%
                        </span>
                        <span className="text-xs text-gray-900 font-semibold">{fmtR(bu.capitalAllocated)}</span>
                        <span className="text-[10px] text-gray-400">{share.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${bu.color} rounded-full`} style={{ width: `${share}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-900 mb-3">Decisões de Alocação</div>
              {Object.entries(flagConfig).map(([key, cfg]) => {
                const busWithFlag = buData.filter((b) => allocFlags[b.id] === key);
                if (busWithFlag.length === 0) return null;
                return (
                  <div key={key} className={`p-3 rounded-lg ${cfg.bg}`}>
                    <div className={`text-xs font-bold ${cfg.color} mb-1`}>{cfg.label}</div>
                    <div className="text-[11px] text-gray-500">
                      {busWithFlag.map((b) => b.name).join(", ")}
                    </div>
                    <div className={`text-[10px] mt-1 ${cfg.color} opacity-70`}>
                      Capital: {fmtR(busWithFlag.reduce((s, b) => s + b.capitalAllocated, 0))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
