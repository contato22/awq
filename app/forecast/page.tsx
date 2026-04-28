// ─── /awq/forecast ────────────────────────────────────────────────────────────
//
// DATA INTEGRITY CONTRACT:
//   ALL numbers on this page are SNAPSHOT / PLANNING data.
//   Source: lib/awq-group-data.ts → lib/awq-derived-metrics.ts
//   Regime: accrual planning model — NOT cash-basis, NOT from bank statements.
//
//   OPTION C — ESTADO VAZIO HONESTO (implementado 2026-04-15c):
//   Projeções Abr–Dez e full-year foram removidas porque não tinham:
//     - base histórica documentada (run rate real: ~800K/mês; projeções: 3.6M–5.1M)
//     - metodologia de crescimento declarada
//     - premissas explícitas
//     - confidence_status atribuído
//   Esta página exibe referência de planejamento Q1 + requisitos para ativar forecast real.
//
//   forecastAccuracyHistory: cleared — histórico baseado em modelo incompatível.
//   buForecastScenarios: cleared — fullYear 238×–67% discrepante do run rate real.
//
// SOURCE CHAIN:
//   lib/awq-group-data.ts (canonical store) →
//   lib/awq-derived-metrics.ts (derivation layer) →
//   this page

import Header from "@/components/Header";
import {
  Target,
  AlertTriangle,
  Info,
  Database,
  XCircle,
} from "lucide-react";
import { buildFinancialQuery } from "@/lib/financial-query";
import {
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
const hasAccuracyHistory = forecastAccuracyHistory.length > 0;
const avgError    = hasAccuracyHistory
  ? forecastAccuracyHistory.reduce((s, r) => s + Math.abs(r.error), 0) / forecastAccuracyHistory.length
  : null;
const avgAccuracy = avgError !== null ? 100 - avgError : null;

// Q1 snapshot reference total (Jan + Fev + Mar — base=bull=bear, no model run)
const q1SnapshotTotal = revenueForecasts.reduce((s, r) => s + r.base, 0);

// Forecast requirements — every condition that must be met before projections can exist
const FORECAST_REQUIREMENTS = [
  { id: "hist",   label: "Base histórica real",          desc: "≥ 6 meses de extratos bancários ingeridos (status=done)"  },
  { id: "period", label: "Período declarado",             desc: "Horizonte de projeção com data de início e fim"           },
  { id: "premis", label: "Premissas explícitas",          desc: "Crescimento por BU, sazonalidade, novos contratos"        },
  { id: "method", label: "Metodologia documentada",       desc: "Regressão, rolling average, pipeline-based, etc."         },
  { id: "fonte",  label: "Fonte verificável",             desc: "financial-query.ts ou pipeline NF-e — não snapshot"       },
  { id: "regime", label: "Regime declarado",              desc: "Cash-basis ou accrual — não misto sem aviso"              },
  { id: "conf",   label: "confidence_status atribuído",   desc: "confirmed / probable / low / unavailable"                 },
  { id: "upd",    label: "Última atualização registrada", desc: "Data e responsável pelo modelo"                           },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqForecastPage() {
  // Real pipeline — queried only for status display. No real numbers available
  // until bank statements are ingested via /awq/conciliacao.
  const q = await buildFinancialQuery();
  const hasRealData = q.hasData;

  return (
    <>
      <Header
        title="Forecast — AWQ Group"
        subtitle="Estado vazio honesto · Requisitos para ativar forecast real · Q1 2026 referência snapshot"
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
                Regime: competência (accrual) · Período: YTD Jan–Mar 2026.
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                <strong>Projeções Abr–Dez e full-year foram removidas</strong> — sem base histórica, sem metodologia,
                sem premissas documentadas. Run rate atual ~800K/mês vs projeções removidas 3,6M–5,1M/mês.
                Para caixa real, acesse{" "}
                <a href="/cashflow" className="underline font-medium">/awq/cashflow</a>.
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
                  : "Forecast não disponível: aguardando histórico conciliado suficiente."}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {hasRealData
                  ? `Extratos ingeridos: ${q.dataQuality.doneDocuments} documento(s) · ${q.dataQuality.totalTransactions} transação(ões) · Período: ${q.consolidated.periodStart ?? "—"} → ${q.consolidated.periodEnd ?? "—"}`
                  : "Nenhum extrato bancário com status=done encontrado. Os valores abaixo são inteiramente de planejamento (snapshot)."}
                {" "}
                <a href="/conciliacao" className="underline text-brand-600 font-medium">Ingerir extratos →</a>
              </p>
            </div>
          </div>
        </div>

        {/* ── Summary: Q1 Reference + Option C Empty State ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Q1 Snapshot Reference Card */}
          <div className="card p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Target size={18} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <SourceBadge
                  variant="snapshot"
                  title="Referência de planejamento Q1 · awq-group-data.ts monthlyRevenue · NÃO é forecast"
                />
              </div>
              <div className="text-2xl font-bold text-gray-900">{fmtR(q1SnapshotTotal)}</div>
              <div className="text-xs font-medium text-gray-400 mt-0.5">Q1 2026 — Referência de Planejamento</div>
              <div className="text-[10px] text-gray-500 mt-1">
                Jan + Fev + Mar · accrual snapshot · base=bull=bear (sem modelo de cenários)
              </div>
            </div>
          </div>

          {/* Forecast Empty State — Option C */}
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <SourceBadge variant="empty" />
              <span className="text-sm font-semibold text-gray-700">
                Forecast FY 2026 — Não Disponível
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-3">
              Projeções Abr–Dez 2026 e cenários full-year foram removidos.
              As projeções anteriores (3,6M–5,1M/mês) não tinham base histórica verificável —
              o run rate atual é ~800K/mês. Exibir aqueles números como &ldquo;forecast&rdquo; era desonesto.
            </p>
            <p className="text-[10px] font-semibold text-gray-600 mb-2">
              Requisitos para ativar forecast real (0/8 atendidos):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {FORECAST_REQUIREMENTS.map((req) => (
                <div key={req.id} className="flex items-start gap-1.5">
                  <XCircle size={11} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-semibold text-gray-600">{req.label}</span>
                    <span className="text-[10px] text-gray-400"> — {req.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Lacunas de Dados ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-gray-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">
                Lacunas de Dados — O que falta para um forecast confiável
              </p>
              <ul className="text-[11px] text-gray-500 space-y-0.5 list-none">
                <li>• <strong>Extratos bancários ingeridos</strong>: nenhum documento com status=done. Ingira via <a href="/conciliacao" className="underline text-brand-600">/awq/conciliacao</a> para que realizados reais apareçam nesta página.</li>
                <li>• <strong>Pipeline de notas fiscais (NF-e)</strong>: não implementado. Necessário para receita accrual real (vs planejamento).</li>
                <li>• <strong>Modelo de forecast</strong>: não configurado. Projeções Abr–Dez removidas (sem metodologia, sem base histórica). Run rate atual: ~800K/mês.</li>
                <li>• <strong>Forecast Accuracy</strong>: vazio. Só faz sentido quando houver realizados reais de extrato bancário para comparar com forecasts emitidos.</li>
                <li>• <strong>Projeções por BU</strong>: removidas. JACQES run rate anualizado R$83K vs projeção anterior R$19,8M (238×). Caza R$7,25M vs R$12,1M sem metodologia.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Q1 Reference Table ────────────────────────────────────────────── */}
          <div className="xl:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Referência de Planejamento — Q1 2026
              </h2>
              <SourceBadge
                variant="snapshot"
                label="SNAPSHOT"
                title="Dados de planejamento accrual · awq-group-data.ts monthlyRevenue · NÃO são forecast nem realizados"
              />
            </div>

            <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 mb-3 text-[10px] text-amber-700">
              <span className="font-semibold">Referência:</span>{" "}
              <code className="font-mono bg-amber-100 rounded px-0.5">lib/awq-group-data.ts → monthlyRevenue[]</code>
              {" "}· regime: accrual planejamento · base=bull=bear (sem modelo de cenários) ·{" "}
              <span className="font-semibold text-amber-800">
                Estes valores são planejamento manual, não realizados nem forecasts.
              </span>
            </div>

            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-amber-600">Referência (Snap)</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-300">Realizado</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueForecasts.map((row) => (
                    <tr
                      key={row.month}
                      className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-xs font-medium text-gray-500">{row.month}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-medium text-amber-700">{fmtR(row.base)}</td>
                      {/* Realized column: always blocked — no ingested bank statements */}
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-gray-300 text-xs" title="Aguardando extrato bancário ingerido">—</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <SourceBadge
                          variant="snapshot"
                          label="SNAPSHOT"
                          title="Planejamento accrual · awq-group-data.ts monthlyRevenue"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2.5 px-3 text-xs font-bold text-gray-400">Q1 TOTAL</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-amber-700">{fmtR(q1SnapshotTotal)}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-300">—</td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={4} className="pt-2 pb-1 px-3">
                      <div className="rounded bg-gray-100 px-2 py-1.5 text-[10px] text-gray-500">
                        <strong>Abr–Dez 2026:</strong> projeções removidas — sem metodologia, sem base histórica verificável.
                        Run rate atual ~800K/mês vs projeção removida 3,6M–5,1M/mês (4–6× inflado).
                        Modelo de forecast não configurado.
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Right column ─────────────────────────────────────────────────── */}
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
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-4 text-center">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Sem histórico de acurácia disponível</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Os forecasts históricos foram emitidos com base em um modelo de negócio anterior
                    incompatível com os dados atuais (~800K/mês).
                    Comparar os dois produziria erros de ~−65% que medem a correção de modelo, não a qualidade do forecast.
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Este campo será populado quando novos forecasts forem emitidos com base no modelo atual
                    e realizados virem de <code className="font-mono">financial-query.ts</code>.
                  </p>
                </div>
              ) : (
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

            {/* Per-BU Forecast — Empty State */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-gray-900">Forecast por BU — Full Year 2026</h2>
                <SourceBadge
                  variant="empty"
                  title="buForecastScenarios[] cleared — projeções sem base histórica verificável"
                />
              </div>

              {buForecastScenarios.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    Projeções por BU não disponíveis
                  </p>
                  <p className="text-[10px] text-gray-400 leading-relaxed mb-3">
                    As projeções full-year foram removidas por inconsistência grave com o run rate real:
                  </p>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-1.5">
                      <XCircle size={11} className="text-red-400 shrink-0 mt-0.5" />
                      <span className="text-[10px] text-gray-500">
                        <strong>JACQES:</strong> run rate anualizado R$83K vs projeção anterior R$19,8M (238× discrepância — sem metodologia)
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <XCircle size={11} className="text-red-400 shrink-0 mt-0.5" />
                      <span className="text-[10px] text-gray-500">
                        <strong>Caza Vision:</strong> run rate anualizado R$7,25M vs projeção anterior R$12,1M (67% premium — sem base)
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <XCircle size={11} className="text-red-400 shrink-0 mt-0.5" />
                      <span className="text-[10px] text-gray-500">
                        <strong>Growth % declarado:</strong> &ldquo;vs 2025&rdquo; sem baseline 2025 verificável no data store
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Para ativar: construir modelo de forecast documentado com base histórica real
                    (≥ 6 meses de extratos ingeridos via{" "}
                    <a href="/conciliacao" className="underline text-brand-600">/awq/conciliacao</a>).
                  </p>
                </div>
              ) : (
                /* Fallback: renders if buForecastScenarios is ever re-populated */
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
                      <div className="flex items-center justify-between mb-2 rounded bg-gray-50 px-2 py-1">
                        <span className="text-[10px] text-gray-500">YTD (snapshot)</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-amber-700">{fmtR(bu.ytd)}</span>
                          <SourceBadge variant="snapshot" label="SNAP" title="YTD de planejamento derivado de buData" />
                        </div>
                      </div>
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
              )}
            </div>

          </div>
        </div>

        {/* ── Source Metadata Footer ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Metadados de Fonte — /awq/forecast</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[10px] text-gray-400">
            <div><span className="font-medium text-gray-500">source_type:</span> snapshot (NENHUM dado real · NENHUM forecast ativo nesta página)</div>
            <div><span className="font-medium text-gray-500">source_name:</span> lib/awq-group-data.ts via lib/awq-derived-metrics.ts</div>
            <div><span className="font-medium text-gray-500">regime:</span> accrual (competência) — não cash-basis</div>
            <div><span className="font-medium text-gray-500">period:</span> Q1 2026 Jan–Mar (referência snapshot) · Abr–Dez: modelo não configurado</div>
            <div><span className="font-medium text-gray-500">confidence_status:</span> probable (planejamento manual — não reconciliado)</div>
            <div><span className="font-medium text-gray-500">reconciliation_status:</span> not_applicable (sem extrato para reconciliar)</div>
            <div><span className="font-medium text-gray-500">real_pipeline:</span>{" "}
              {hasRealData
                ? `ativo — ${q.dataQuality.doneDocuments} doc(s), ${q.dataQuality.totalTransactions} txn(s)`
                : "sem dado — aguardando ingestão de extratos"}
            </div>
            <div>
              <span className="font-medium text-gray-500">auditado:</span>{" "}
              2026-04-15 · Opção C implementada · projeções Abr–Dez e full-year removidas ·
              buForecastScenarios cleared (238×–67% discrepância vs run rate)
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
