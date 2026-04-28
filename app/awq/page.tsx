import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import Link from "next/link";
import { ExpandableQuickNav } from "@/components/ExpandableQuickNav";
import {
  DollarSign, TrendingUp, BarChart3, Zap, ArrowUpRight, ArrowDownRight,
  ChevronRight, ShieldAlert, Activity, Wallet, Target, Building2,
  Scale, CheckCircle, AlertTriangle, Database, Clock, GitMerge, Layers,
} from "lucide-react";
import { riskSignals, buData, allocFlags, flagConfig } from "@/lib/awq-derived-metrics";
import { MetricSourceBadge } from "@/components/MetricSourceBadge";
import {
  buildFinancialQuery,
  fmtBRL,
  ENTITY_LABELS,
  type FinancialQueryResult,
  type EntitySummary,
} from "@/lib/financial-query";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number) { return (n * 100).toFixed(1) + "%"; }

const severityConfig = {
  high:   { color: "text-red-700",   bg: "bg-red-50",   border: "border-red-200/60",   dot: "bg-red-500",   icon: AlertTriangle },
  medium: { color: "text-amber-800", bg: "bg-amber-50", border: "border-amber-200/60", dot: "bg-amber-500", icon: AlertTriangle },
  low:    { color: "text-brand-700", bg: "bg-brand-50", border: "border-brand-200/60", dot: "bg-brand-500", icon: CheckCircle   },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, delta, up, icon: Icon, color, bg, empty = false,
}: {
  label: string; value: string; sub: string; delta?: string;
  up?: boolean; icon: React.ElementType; color: string; bg: string; empty?: boolean;
}) {
  return (
    <div className="card-elevated p-4 lg:p-5 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={16} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        {empty ? (
          <div className="text-xs text-gray-400 mt-1 italic">—</div>
        ) : (
          <div className="text-lg lg:text-xl font-bold text-gray-900 tabular-nums">{value}</div>
        )}
        <div className="text-[11px] font-medium text-gray-500 mt-0.5 leading-tight truncate">{label}</div>
        {!empty && delta && (
          <div className="flex items-center gap-1 mt-1.5">
            {up
              ? <ArrowUpRight size={11} className="text-emerald-600 shrink-0" />
              : <ArrowDownRight size={11} className="text-red-600 shrink-0" />}
            <span className={`text-[11px] font-semibold ${up ? "text-emerald-600" : "text-red-600"} truncate`}>
              {delta}
            </span>
          </div>
        )}
        {empty && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
        {!empty && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// "Aguardando extratos" banner
function NoDataBanner() {
  return (
    <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="flex items-center gap-3">
        <Database size={16} className="text-amber-600 shrink-0" />
        <div>
          <div className="text-sm font-semibold text-amber-800">Base financeira aguardando extratos</div>
          <div className="text-xs text-amber-700 mt-0.5">
            Nenhum extrato bancário foi processado ainda. Os números abaixo virão
            automaticamente após ingestão de PDFs reais.
          </div>
        </div>
      </div>
      <Link
        href="/awq/conciliacao"
        className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 ml-4"
      >
        <Database size={12} /> Ingerir Extratos
      </Link>
    </div>
  );
}

// Data source badge shown when pipeline data is live
function PipelineBadge({ q }: { q: FinancialQueryResult }) {
  const { doneDocuments, totalTransactions, confirmedCount } = q.dataQuality;
  const coverage = totalTransactions > 0
    ? ((confirmedCount / totalTransactions) * 100).toFixed(0)
    : "0";
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
      <Database size={12} className="shrink-0" />
      <span className="font-semibold">Dados reais</span>
      <span className="text-emerald-600">·</span>
      <span>{doneDocuments} extrato{doneDocuments !== 1 ? "s" : ""}</span>
      <span className="text-emerald-600">·</span>
      <span>{totalTransactions} transações</span>
      <span className="text-emerald-600">·</span>
      <span>{coverage}% classificado</span>
    </div>
  );
}

// Cash panel for one entity
function EntityCashCard({ e }: { e: EntitySummary }) {
  const netPositive = e.operationalNetCash >= 0;
  const ambiguousPct = e.transactionCount > 0
    ? ((e.ambiguousCount / e.transactionCount) * 100).toFixed(0)
    : "0";
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-500" />
          <span className="text-xs font-bold text-gray-900">{e.label}</span>
          <span className="text-[10px] text-gray-400">
            {e.accounts.map((a) => a.bank).join(", ")}
          </span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${netPositive ? "text-emerald-600" : "text-red-600"}`}>
          {fmtBRL(e.operationalNetCash)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-emerald-50 rounded-lg py-2">
          <div className="text-xs font-bold text-emerald-700 tabular-nums">{fmtBRL(e.operationalRevenue)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Entradas</div>
        </div>
        <div className="bg-red-50 rounded-lg py-2">
          <div className="text-xs font-bold text-red-700 tabular-nums">{fmtBRL(e.operationalExpenses)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Saídas</div>
        </div>
        <div className="bg-gray-50 rounded-lg py-2">
          <div className="text-xs font-bold text-gray-700 tabular-nums">{fmtBRL(e.totalCashBalance)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Saldo</div>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-100">
        <span>{e.transactionCount} transações · {ambiguousPct}% ambíguo</span>
        <span>{e.periodStart && e.periodEnd ? `${e.periodStart.slice(0, 7)} → ${e.periodEnd.slice(0, 7)}` : "—"}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqGroupPage() {
  const q = await buildFinancialQuery();
  const highRisks   = riskSignals.filter((r) => r.severity === "high").length;
  const mediumRisks = riskSignals.filter((r) => r.severity === "medium").length;

  // Operational entities (AWQ_Holding, JACQES, Caza_Vision)
  const opEntities = q.entities.filter((e) =>
    ["AWQ_Holding", "JACQES", "Caza_Vision"].includes(e.entity)
  );

  // Monthly bridge: group by month across all entities for trend bars
  const monthlyConsolidated = q.monthlyBridge
    .reduce((acc, m) => {
      const existing = acc.find((x) => x.month === m.month);
      if (existing) {
        existing.revenue  += m.revenue;
        existing.expenses += m.expenses;
        existing.netCash  += m.netCash;
      } else {
        acc.push({ month: m.month, revenue: m.revenue, expenses: m.expenses, netCash: m.netCash });
      }
      return acc;
    }, [] as { month: string; revenue: number; expenses: number; netCash: number }[])
    .sort((a, b) => a.month.localeCompare(b.month));

  // Period label
  const period = q.consolidated.periodStart && q.consolidated.periodEnd
    ? `${q.consolidated.periodStart.slice(0, 7)} → ${q.consolidated.periodEnd.slice(0, 7)}`
    : "Período não definido";

  return (
    <>
      <Header
        title="AWQ Group — Control Tower"
        subtitle={q.hasData ? `Base bancária real · ${period}` : "Holding · Visão consolidada · Aguardando extratos"}
      />
      <div className="page-container">

        {/* ── Data source banner ─────────────────────────────────────────── */}
        {q.hasData ? <PipelineBadge q={q} /> : <NoDataBanner />}

        {/* ── Primary financial metrics (base bancária real) ─────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Visão de Caixa — Base Bancária Real
            </span>
            {q.hasData && (
              <span className="text-[10px] text-emerald-600 font-medium px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-200">
                conciliado
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <MetricCard
              label="Entradas Operacionais"
              value={fmtBRL(q.consolidated.totalRevenue)}
              sub={q.hasData ? `${q.consolidated.periodStart?.slice(0,7) ?? "?"} → ${q.consolidated.periodEnd?.slice(0,7) ?? "?"}` : "Aguardando extratos"}
              delta={q.hasData ? `${q.dataQuality.doneDocuments} extrato(s)` : undefined}
              up icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50"
              empty={!q.hasData}
            />
            <MetricCard
              label="Saídas Operacionais"
              value={fmtBRL(q.consolidated.totalExpenses)}
              sub={q.hasData ? "excl. intercompany" : "Aguardando extratos"}
              delta={q.hasData ? `${q.dataQuality.confirmedCount} confirmados` : undefined}
              up={false} icon={TrendingUp} color="text-red-600" bg="bg-red-50"
              empty={!q.hasData}
            />
            <MetricCard
              label="Fluxo Líquido Operacional"
              value={fmtBRL(q.consolidated.operationalNetCash)}
              sub={q.hasData ? "Entradas − Saídas" : "Aguardando extratos"}
              delta={q.hasData
                ? (q.consolidated.operationalNetCash >= 0 ? "Positivo" : "Negativo")
                : undefined}
              up={q.consolidated.operationalNetCash >= 0}
              icon={BarChart3} color="text-brand-600" bg="bg-brand-50"
              empty={!q.hasData}
            />
            <MetricCard
              label="Caixa Consolidado"
              value={fmtBRL(q.consolidated.totalCashBalance)}
              sub={q.hasData ? "Saldo de fechamento" : "Aguardando extratos"}
              delta={q.hasData ? "Saldo real por extrato" : undefined}
              up icon={Wallet} color="text-cyan-700" bg="bg-cyan-50"
              empty={!q.hasData}
            />
            <MetricCard
              label="Intercompany Eliminado"
              value={fmtBRL(q.consolidated.intercompanyEliminated)}
              sub={q.hasData ? "Não infla consolidado" : "Aguardando extratos"}
              delta={q.hasData ? "conciliado e removido" : undefined}
              up icon={GitMerge} color="text-violet-600" bg="bg-violet-50"
              empty={!q.hasData}
            />
          </div>
        </section>

        {/* ── Secondary metrics ──────────────────────────────────────────── */}
        {q.hasData && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Retiradas do Sócio"
                value={fmtBRL(q.consolidated.partnerWithdrawals)}
                sub="Pró-labore / retirada"
                icon={Activity} color="text-amber-700" bg="bg-amber-50"
              />
              <MetricCard
                label="Despesas Pessoais Mistas"
                value={fmtBRL(q.consolidated.personalExpenses)}
                sub="Pendente separação"
                icon={AlertTriangle} color="text-orange-600" bg="bg-orange-50"
              />
              <MetricCard
                label="Movimentos Financeiros"
                value={fmtBRL(q.consolidated.financialMovements)}
                sub="Aplicações / resgates"
                icon={Scale} color="text-violet-600" bg="bg-violet-50"
              />
              <MetricCard
                label="Ambíguo / Pendente"
                value={fmtBRL(q.consolidated.ambiguousAmount)}
                sub={`${q.dataQuality.ambiguousCount} txns pendentes`}
                icon={Clock} color="text-gray-500" bg="bg-gray-100"
              />
            </div>
          </section>
        )}

        {/* ── Entity breakdown (base bancária real) ─────────────────────── */}
        <section className="card p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader
              icon={<Building2 size={15} />}
              title="Consolidação por Entidade — Base Bancária"
            />
            <Link href="/awq/conciliacao" className="text-xs text-brand-600 hover:underline font-medium">
              Ingerir extratos →
            </Link>
          </div>

          {!q.hasData ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Database size={32} className="text-gray-200" />
              <div className="text-sm font-semibold text-gray-400">Sem dados bancários</div>
              <div className="text-xs text-gray-400 max-w-xs">
                Ingira extratos Cora (AWQ / JACQES) e Itaú (Caza Vision) para
                ver a consolidação por entidade com rastreabilidade completa.
              </div>
            </div>
          ) : opEntities.length === 0 ? (
            <div className="text-sm text-amber-700 bg-amber-50 px-4 py-3 rounded-lg">
              Documentos processados, mas nenhuma entidade operacional identificada.
              Verifique se os campos banco/conta estão corretos no ingest.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {opEntities.map((e) => <EntityCashCard key={e.entity} e={e} />)}
            </div>
          )}

          {/* Intercompany + Socio_PF extras */}
          {q.hasData && q.entities.filter((e) =>
            ["Intercompany", "Socio_PF", "Unknown"].includes(e.entity)
          ).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Fora do consolidado operacional
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {q.entities
                  .filter((e) => ["Intercompany", "Socio_PF", "Unknown"].includes(e.entity))
                  .map((e) => (
                    <div key={e.entity} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-600">{e.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{e.transactionCount} transações</div>
                      </div>
                      <div className="text-xs font-bold text-gray-500 tabular-nums">
                        {fmtBRL(e.totalCashBalance)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Monthly cash bridge ────────────────────────────────────────── */}
        <section className="card p-5 lg:p-6">
          <SectionHeader
            title={q.hasData ? "Fluxo Mensal — Base Bancária Real" : "Receita Mensal — Aguardando Extratos"}
            linkLabel="Ver Cash Flow"
            linkHref="/awq/cashflow"
          />
          {!q.hasData || monthlyConsolidated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <BarChart3 size={28} className="text-gray-200" />
              <div className="text-xs text-gray-400">
                {q.hasData
                  ? "Sem transações datadas suficientes para bridge mensal"
                  : "Ingira extratos para ver o fluxo mensal real"}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {monthlyConsolidated.map((m) => {
                const maxAmt = Math.max(...monthlyConsolidated.map((x) => Math.max(x.revenue, x.expenses)));
                const revW   = maxAmt > 0 ? (m.revenue  / maxAmt) * 100 : 0;
                const expW   = maxAmt > 0 ? (m.expenses / maxAmt) * 100 : 0;
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 shrink-0 font-medium tabular-nums">{m.month}</span>
                    <div className="flex-1 space-y-0.5">
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${revW}%` }} />
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${expW}%` }} />
                      </div>
                    </div>
                    <div className="text-right w-28 shrink-0">
                      <div className="text-[10px] text-emerald-600 font-semibold tabular-nums">{fmtBRL(m.revenue)}</div>
                      <div className="text-[10px] text-red-600 tabular-nums">{fmtBRL(m.expenses)}</div>
                    </div>
                    <div className={`text-xs font-bold w-20 text-right shrink-0 tabular-nums ${m.netCash >= 0 ? "text-gray-900" : "text-red-600"}`}>
                      {fmtBRL(m.netCash)}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-5 pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" /> Entradas operacionais
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Saídas operacionais
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ── Risk + Capital Allocation (snapshot — business intelligence) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          <section className="xl:col-span-2 card p-5 lg:p-6">
            <div className="flex items-center justify-between mb-1">
              <SectionHeader
                icon={<ShieldAlert size={15} className="text-red-500" />}
                title="Risk Signals"
                badge={
                  <div className="flex items-center gap-1.5 ml-1">
                    <span className="badge-red">{highRisks} alto</span>
                    <span className="badge-yellow">{mediumRisks} médio</span>
                    <MetricSourceBadge sourceType="snapshot" />
                  </div>
                }
                linkLabel="Ver todos"
                linkHref="/awq/risk"
              />
            </div>
            <div className="text-[10px] text-amber-600 font-medium mb-3">
              Análise qualitativa (snapshot) — não derivada de extratos bancários
            </div>
            <div className="space-y-2">
              {riskSignals.map((risk) => {
                const cfg = severityConfig[risk.severity];
                return (
                  <div key={risk.id} className={`flex items-start gap-3 p-3 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0 mt-1.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold ${cfg.color}`}>{risk.title}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{risk.bu}</span>
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5">{risk.description}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-[10px] font-bold ${cfg.color}`}>{risk.metric}</div>
                      <div className="text-[10px] text-gray-400">{risk.threshold}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card p-5 lg:p-6">
            <div className="flex items-center justify-between mb-1">
              <SectionHeader
                icon={<Wallet size={15} className="text-amber-600" />}
                title="Capital Allocation"
                badge={<MetricSourceBadge sourceType="snapshot" />}
                linkLabel="Detalhes"
                linkHref="/awq/allocations"
              />
            </div>
            <div className="text-[10px] text-amber-600 font-medium mb-3">
              Alocação estratégica (snapshot) — planejamento accrual, não derivado de extratos
            </div>
            <div className="space-y-3.5">
              {[...buData].sort((a, b) => b.roic - a.roic).map((bu) => {
                const flag    = allocFlags[bu.id];
                const flagCfg = flagConfig[flag];
                const totalCap = buData.reduce((s, b) => s + b.capitalAllocated, 0);
                const share    = (bu.capitalAllocated / totalCap) * 100;
                return (
                  <div key={bu.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                        <span className="text-xs text-gray-600 font-medium">{bu.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${flagCfg.color} ${flagCfg.bg} px-1.5 py-0.5 rounded`}>
                          {flagCfg.label}
                        </span>
                        {bu.economicType === "pre_revenue" ? (
                          <span className="text-[10px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
                            Pré-receita
                          </span>
                        ) : bu.economicType === "hybrid_investment" ? (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Investimento
                          </span>
                        ) : (
                          <span className={`text-xs font-bold ${bu.roic >= 30 ? "text-emerald-600" : bu.roic >= 15 ? "text-amber-700" : bu.roic > 0 ? "text-red-600" : "text-gray-400"}`}>
                            ROIC {bu.roic > 0 ? bu.roic.toFixed(0) + "%" : "—"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${bu.color} rounded-full`} style={{ width: `${share}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-500 w-14 text-right shrink-0 font-medium tabular-nums">
                        {fmtBRL(bu.capitalAllocated)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Data quality / coverage gaps ───────────────────────────────── */}
        {q.hasData && q.dataQuality.coverageGaps.length > 0 && (
          <section className="card p-5 border-l-4 border-amber-400">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="text-xs font-semibold text-amber-800">Lacunas de cobertura</span>
            </div>
            <ul className="space-y-1">
              {q.dataQuality.coverageGaps.map((gap, i) => (
                <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">·</span> {gap}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Drill-Down Navigation ──────────────────────────────────────── */}
        <section className="card p-5 lg:p-6">
          <SectionHeader icon={<Target size={15} className="text-brand-500" />} title="Drill-Down por BU" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {buData.map((bu) => (
              <div key={bu.id} className="rounded-xl border border-gray-200/80 p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-7 h-7 rounded-lg ${bu.color} flex items-center justify-center shrink-0`}>
                    <Building2 size={12} className="text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">{bu.name}</div>
                    <div className="text-[10px] text-gray-400">{bu.sub.split(" · ")[0]}</div>
                  </div>
                </div>
                <div className="space-y-0.5">
                  {[
                    { label: "Visão Geral",   href: bu.hrefOverview  },
                    { label: "Financial",      href: bu.hrefFinancial },
                    { label: "Customers",      href: bu.hrefCustomers },
                    { label: "Unit Economics", href: bu.hrefUnitEcon  },
                    { label: "Budget",         href: bu.hrefBudget    },
                  ].map((link) => (
                    <Link key={link.label} href={link.href}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors group">
                      <span className="text-[11px] text-gray-500 group-hover:text-gray-700 font-medium">{link.label}</span>
                      <ChevronRight size={10} className="text-gray-300 group-hover:text-brand-600 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Quick nav ─────────────────────────────────────────────────────── */}
        <section>
          <ExpandableQuickNav />
        </section>

      </div>
    </>
  );
}
