// ─── /awq/forecast ────────────────────────────────────────────────────────────
//
// DATA INTEGRITY CONTRACT:
//   ALL numbers on this page are SNAPSHOT / PLANNING data.
//   Source: lib/awq-group-data.ts → lib/awq-derived-metrics.ts
//   Regime: accrual planning model — NOT cash-basis, NOT from bank statements.
//
//   "Realizado" (actual) values in the monthly table are planning estimates
//   for Jan–Mar 2026. They are NOT verified via financial-query.ts.
//   Real transactional data requires bank statement ingestion via /awq/ingest.
//
//   forecastAccuracyHistory compares SNAPSHOT forecast vs SNAPSHOT actual.
//   Both sides are planning data. This is NOT a real-vs-plan comparison.
//
//   buForecastScenarios.ytd values are the YTD snapshot from buData.
//   Forward-looking base/bull/bear are planning model projections.
//
// SOURCE CHAIN:
//   lib/awq-group-data.ts (canonical store) →
//   lib/awq-derived-metrics.ts (derivation layer) →
//   this page

import Header from "@/components/Header";
import {
  TrendingUp,
  BarChart3,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Info,
  Database,
} from "lucide-react";
import { buildFinancialQuery } from "@/lib/financial-query";
import {
  consolidated,
  revenueForecasts,
  forecastAccuracyHistory,
  buForecastScenarios,
} from "@/lib/awq-derived-metrics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Source metadata badge ────────────────────────────────────────────────────
//
// Every card, row, and metric carries a SourceBadge.
// This is the visual enforcement of the data integrity contract.

type BadgeVariant = "snapshot" | "forecast" | "real" | "empty" | "inconsistent";

function SourceBadge({
  variant,
  label,
  title,
}: {
  variant: BadgeVariant;
  label?: string;
  title?: string;
}) {
  const styles: Record<BadgeVariant, string> = {
    snapshot:     "border-amber-200 bg-amber-50 text-amber-700",
    forecast:     "border-blue-200 bg-blue-50 text-blue-700",
    real:         "border-emerald-200 bg-emerald-50 text-emerald-700",
    empty:        "border-gray-200 bg-gray-100 text-gray-500",
    inconsistent: "border-red-200 bg-red-50 text-red-700",
  };
  const defaultLabels: Record<BadgeVariant, string> = {
    snapshot:     "SNAPSHOT",
    forecast:     "FORECAST",
    real:         "REAL",
    empty:        "SEM DADO",
    inconsistent: "INCONSISTENTE",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold border ${styles[variant]}`}
      title={title}
    >
      {label ?? defaultLabels[variant]}
    </span>
  );
}

// ─── Derived from canonical stores ───────────────────────────────────────────

// Guard: forecastAccuracyHistory may be empty (cleared when historical data was invalid).
// If empty, accuracy metrics are unavailable — show empty state, do not divide by zero.
const hasAccuracyHistory = forecastAccuracyHistory.length > 0;
const avgError    = hasAccuracyHistory
  ? forecastAccuracyHistory.reduce((s, r) => s + Math.abs(r.error), 0) / forecastAccuracyHistory.length
  : null;
const avgAccuracy = avgError !== null ? 100 - avgError : null;

const fullYearBase = revenueForecasts.reduce((s, r) => s + r.base, 0);
const fullYearBull = revenueForecasts.reduce((s, r) => s + r.bull, 0);
const fullYearBear = revenueForecasts.reduce((s, r) => s + r.bear, 0);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqForecastPage() {
  // ── Query real data pipeline ───────────────────────────────────────────────
  // Result is used ONLY to show real data status. No real numbers are available
  // until bank statements are ingested (status="done") via /awq/ingest.
  const q = await buildFinancialQuery();
  const hasRealData = q.hasData;

  return (
    <>
      <Header
        title="Forecast — AWQ Group"
        subtitle="Receita · Cenários base / bull / bear · Forecast Accuracy · 2026"
      />
      <div className="page-container">

        {/* ── Data Integrity Banners ─────────────────────────────────────── */}

        {/* Banner 1: SNAPSHOT notice */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">
                SNAPSHOT — Todos os números são dados de planejamento (accrual), não derivados de extrato bancário.
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Fonte: <code className="font-mono bg-amber-100 px-0.5 rounded">lib/awq-group-data.ts</code> via{" "}
                <code className="font-mono bg-amber-100 px-0.5 rounded">lib/awq-derived-metrics.ts</code>.
                Regime: competência (accrual) · Período: YTD Jan–Abr 2026 + projeção anual.
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Coluna &ldquo;Realiz. (snapshot)&rdquo; contém estimativas do modelo de planejamento — <strong>não transações conciliadas</strong>.
                Para caixa real, acesse{" "}
                <a href="/awq/cashflow" className="underline font-medium">/awq/cashflow</a>.
              </p>
            </div>
          </div>
        </div>

        {/* Banner 2: Real data pipeline status */}
        <div className={`rounded-xl border px-4 py-3 ${
          hasRealData
            ? "border-emerald-200 bg-emerald-50"
            : "border-gray-200 bg-gray-50"
        }`}>
          <div className="flex items-start gap-2">
            <Database size={14} className={`shrink-0 mt-0.5 ${hasRealData ? "text-emerald-600" : "text-gray-400"}`} />
            <div>
              <p className={`text-xs font-semibold ${hasRealData ? "text-emerald-800" : "text-gray-600"}`}>
                {hasRealData
                  ? "Pipeline ativo — dados reais disponíveis para parte do período"
                  : "Forecast não confiável: aguardando histórico conciliado suficiente."}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {hasRealData
                  ? `Extratos ingeridos: ${q.dataQuality.doneDocuments} documento(s) · ${q.dataQuality.totalTransactions} transação(ões) · Período: ${q.consolidated.periodStart ?? "—"} → ${q.consolidated.periodEnd ?? "—"}`
                  : "Nenhum extrato bancário com status=done encontrado. Os valores abaixo são inteiramente de planejamento (snapshot)."}
                {" "}
                <a href="/awq/ingest" className="underline text-brand-600 font-medium">Ingerir extratos →</a>
              </p>
              {!hasRealData && q.dataQuality.coverageGaps.length > 0 && (
                <p className="text-[10px] text-gray-400 mt-1">
                  Lacunas: {q.dataQuality.coverageGaps.join(" · ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label:   "Forecast Receita 2026 (Base)",
              value:   fmtR(fullYearBase),
              sub:     "Modelo de planejamento",
              delta:   `Bull: ${fmtR(fullYearBull)} · Bear: ${fmtR(fullYearBear)}`,
              icon:    Target,
              color:   "text-brand-600",
              bg:      "bg-brand-50",
              variant: "forecast" as BadgeVariant,
              badgeTitle: "Projeção anual (soma base mensal) · awq-group-data.ts revenueForecasts",
              isNegative: false,
            },
            {
              label:   "Cenário Bull 2026",
              value:   fmtR(fullYearBull),
              sub:     "+10% sobre base",
              delta:   `Upside: ${fmtR(fullYearBull - fullYearBase)} vs base`,
              icon:    TrendingUp,
              color:   "text-emerald-600",
              bg:      "bg-emerald-50",
              variant: "forecast" as BadgeVariant,
              badgeTitle: "Cenário otimista · awq-group-data.ts revenueForecasts[*].bull",
              isNegative: false,
            },
            {
              label:   "Cenário Bear 2026",
              value:   fmtR(fullYearBear),
              sub:     "-20% sobre base (risk)",
              delta:   `Downside: −${fmtR(fullYearBase - fullYearBear)} vs base`,
              icon:    BarChart3,
              color:   "text-red-600",
              bg:      "bg-red-50",
              variant: "forecast" as BadgeVariant,
              badgeTitle: "Cenário pessimista · awq-group-data.ts revenueForecasts[*].bear",
              isNegative: true,
            },
            {
              label:   "Forecast Accuracy",
              value:   avgAccuracy !== null ? `${avgAccuracy.toFixed(1)}%` : "—",
              sub:     avgAccuracy !== null ? "SNAPSHOT vs SNAPSHOT" : "Sem histórico válido",
              delta:   avgAccuracy !== null
                ? `Erro médio: ±${avgError!.toFixed(1)}% (base: planejamento, não real)`
                : "Histórico limpo — modelo anterior incompatível com dados atuais",
              icon:    Info,
              color:   "text-gray-500",
              bg:      "bg-gray-50",
              variant: avgAccuracy !== null ? ("snapshot" as BadgeVariant) : ("empty" as BadgeVariant),
              badgeTitle: "forecastAccuracyHistory[] — vazio: dados históricos baseados em escala de negócio anterior, removidos em 2026-04-15",
              isNegative: false,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <SourceBadge variant={card.variant} title={card.badgeTitle} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {card.isNegative
                      ? <ArrowDownRight size={11} className="text-red-500" />
                      : <ArrowUpRight size={11} className="text-gray-500" />
                    }
                    <span className="text-[10px] text-gray-500">{card.delta}</span>
                    <span className="text-[10px] text-gray-400">{card.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Lacunas de Dados (new section) ────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-gray-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">
                Lacunas de Dados — O que falta para um forecast confiável
              </p>
              <ul className="text-[11px] text-gray-500 space-y-0.5 list-none">
                <li>• <strong>Extratos bancários ingeridos</strong>: nenhum documento com status=done. Ingira via <a href="/awq/ingest" className="underline text-brand-600">/awq/ingest</a> para substituir snapshot por caixa real.</li>
                <li>• <strong>Pipeline de notas fiscais (NF-e)</strong>: não implementado. Necessário para receita accrual real (vs planejamento).</li>
                <li>• <strong>Realizados mensais verificados</strong>: os valores na coluna &quot;Realiz. (snapshot)&quot; são estimativas de planejamento, não confirmados contra extrato.</li>
                <li>• <strong>Forecast Accuracy real</strong>: o indicador de acurácia compara dois conjuntos de dados de planejamento — não é uma medida válida até que haja realizados reais.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Monthly Forecast Table ────────────────────────────────────────── */}
          <div className="xl:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Receita Mensal — Planejamento + Forecast 2026
              </h2>
              <div className="flex items-center gap-1.5">
                <SourceBadge variant="snapshot" label="JAN–MAR" title="Estimativas de planejamento (awq-group-data.ts) — não verificadas vs extrato bancário" />
                <SourceBadge variant="forecast" label="ABR–DEZ" title="Projeções do modelo de planejamento (awq-group-data.ts)" />
              </div>
            </div>

            {/* Source metadata row */}
            <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 mb-3 text-[10px] text-amber-700">
              <span className="font-semibold">Fonte:</span>{" "}
              <code className="font-mono bg-amber-100 rounded px-0.5">lib/awq-group-data.ts → revenueForecasts[]</code>
              {" "}· regime: accrual planejamento · confiança: probable (não reconciliado vs banco)
              {" "}· <span className="font-semibold text-amber-800">Coluna &ldquo;Realiz.&rdquo; = snapshot, não extrato bancário.</span>
            </div>

            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Base</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-emerald-600">Bull</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-red-600">Bear</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-amber-700">Realiz. (snapshot)</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueForecasts.map((row) => {
                    const isActual = row.actual !== undefined;
                    return (
                      <tr
                        key={row.month}
                        className={`border-b border-gray-100 hover:bg-gray-50/80 transition-colors ${!isActual ? "opacity-80" : ""}`}
                      >
                        <td className="py-2.5 px-3 text-xs font-medium text-gray-500">{row.month}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-500">{fmtR(row.base)}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-emerald-600">{fmtR(row.bull)}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-red-600">{fmtR(row.bear)}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-amber-800">
                          {isActual
                            ? fmtR(row.actual!)
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {isActual
                            ? <SourceBadge variant="snapshot" label="SNAPSHOT" title="Estimativa de planejamento — não verificada vs extrato bancário" />
                            : <SourceBadge variant="forecast" label="FORECAST" title="Projeção do modelo de planejamento" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2.5 px-3 text-xs font-bold text-gray-400">2026 TOTAL</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(fullYearBase)}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{fmtR(fullYearBull)}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-red-600">{fmtR(fullYearBear)}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-amber-700">
                      <span title={`YTD snapshot (accrual) — awq-group-data.ts consolidated.revenue = ${fmtR(consolidated.revenue)}`}>
                        {fmtR(consolidated.revenue)}
                        <span className="ml-1"><SourceBadge variant="snapshot" label="YTD snap" /></span>
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Accuracy + BU Forecasts ───────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Forecast Accuracy */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-gray-900">Forecast Accuracy</h2>
                <SourceBadge
                  variant={hasAccuracyHistory ? "snapshot" : "empty"}
                  title="forecastAccuracyHistory[] · awq-group-data.ts"
                />
              </div>

              {!hasAccuracyHistory ? (
                /* Empty state: history was cleared because it was based on an incompatible model */
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-4 text-center">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Sem histórico de acurácia disponível</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Os forecasts históricos foram emitidos com base em um modelo de negócio anterior
                    (escala Caza ~1.7M/mês) incompatível com os dados atuais (~800K/mês).
                    Comparar os dois produziria erros de ~−65% que medem a correção de modelo, não a qualidade do forecast.
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Este campo será populado quando novos forecasts forem emitidos com base no modelo atual
                    e realizados virem de <code className="font-mono">financial-query.ts</code>.
                  </p>
                </div>
              ) : (
                /* Has history: show with disclaimer */
                <>
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 mb-3">
                    <strong>Atenção:</strong> Esta métrica compara forecast de planejamento vs realizados de planejamento.
                    Não é uma medida de acurácia real até que existam realizados de extrato bancário.
                  </p>
                  <div className="space-y-3">
                    {forecastAccuracyHistory.map((row) => {
                      const acc   = 100 - Math.abs(row.error);
                      const isPos = row.error >= 0;
                      return (
                        <div key={row.month}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">{row.month}</span>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-gray-400">Plan: {fmtR(row.forecast)}</span>
                              <span className={`font-bold ${isPos ? "text-emerald-600" : "text-red-600"}`}>
                                {row.error >= 0 ? "+" : ""}{row.error}%
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${acc}%` }} />
                          </div>
                          <div className="text-[10px] text-gray-400 text-right mt-0.5">{acc.toFixed(1)}% acurácia (planejamento)</div>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Média (snapshot vs snapshot)</span>
                      <span className="text-xs font-bold text-amber-600">{avgAccuracy!.toFixed(1)}%</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Per-BU Forecast Scenarios */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-gray-900">Forecast por BU — Full Year 2026</h2>
                <SourceBadge variant="forecast" title="Projeções de planejamento por BU · awq-group-data.ts buForecastScenarios" />
              </div>
              <p className="text-[10px] text-gray-400 mb-3">
                YTD = dados de planejamento (snapshot) · base/bull/bear = projeção modelo
              </p>
              <div className="space-y-3">
                {buForecastScenarios.map((bu) => (
                  <div key={bu.bu} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                        <span className={`text-xs font-semibold ${bu.accent}`}>{bu.bu}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-emerald-600 font-bold">+{bu.growth}% vs 2025</span>
                        <SourceBadge variant="forecast" label="PLAN" />
                      </div>
                    </div>
                    {/* YTD row */}
                    <div className="flex items-center justify-between mb-2 rounded bg-gray-50 px-2 py-1">
                      <span className="text-[10px] text-gray-500">YTD (snapshot)</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-amber-700">{fmtR(bu.ytd)}</span>
                        <SourceBadge variant="snapshot" label="SNAP" title="YTD de planejamento derivado de buData — não extrato bancário" />
                      </div>
                    </div>
                    {/* Scenarios */}
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div>
                        <div className="text-xs font-bold text-emerald-600">{fmtR(bu.fullYearBull)}</div>
                        <div className="text-[9px] text-gray-400">Bull</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">{fmtR(bu.fullYearBase)}</div>
                        <div className="text-[9px] text-gray-400">Base</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-red-600">{fmtR(bu.fullYearBear)}</div>
                        <div className="text-[9px] text-gray-400">Bear</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── Source Metadata Footer ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Metadados de Fonte — /awq/forecast</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[10px] text-gray-400">
            <div><span className="font-medium text-gray-500">source_type:</span> snapshot / forecast (NENHUM dado real nesta página)</div>
            <div><span className="font-medium text-gray-500">source_name:</span> lib/awq-group-data.ts via lib/awq-derived-metrics.ts</div>
            <div><span className="font-medium text-gray-500">regime:</span> accrual (competência) — não cash-basis</div>
            <div><span className="font-medium text-gray-500">period:</span> YTD Jan–Abr 2026 (snapshot) + projeção FY 2026</div>
            <div><span className="font-medium text-gray-500">confidence_status:</span> probable (planejamento manual — não reconciliado)</div>
            <div><span className="font-medium text-gray-500">reconciliation_status:</span> not_applicable (sem extrato para reconciliar)</div>
            <div><span className="font-medium text-gray-500">real_pipeline:</span>{" "}
              {hasRealData
                ? `ativo — ${q.dataQuality.doneDocuments} doc(s), ${q.dataQuality.totalTransactions} txn(s)`
                : "sem dado — aguardando ingestão de extratos"}
            </div>
            <div><span className="font-medium text-gray-500">snapshot_registry:</span> lib/snapshot-registry.ts → awq-group-data (active)</div>
          </div>
        </div>

      </div>
    </>
  );
}
