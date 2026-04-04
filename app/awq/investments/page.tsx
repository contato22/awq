// ─── /awq/investments — Área de Investimentos Financeiros ────────────────────
// DATA SOURCE: financial-db.ts via investment-query.ts (primary — real pipeline)
//              holdingTreasurySnapshot (fallback — empirical print when no PDF ingested)
// SCOPE: aplicacao_financeira + resgate_financeiro + fila de revisão
// This is NOT operational cash flow. Patrimonial / treasury movements only.
// NO MOCKS. Snapshot only shown when pipeline has no data, clearly labeled.

import Header from "@/components/Header";
import {
  Landmark,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  MinusCircle,
  Clock,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Activity,
  Building2,
  Camera,
  XCircle,
} from "lucide-react";
import {
  buildInvestmentQuery,
  fmtBRL,
  fmtDate,
  ENTITY_LABELS,
  INVESTMENT_CATEGORY_LABELS,
  type InvestmentEntry,
  type EntityInvestmentSummary,
} from "@/lib/investment-query";
import { holdingTreasurySnapshot } from "@/lib/awq-derived-metrics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ConfidenceBadge({ status }: { status: InvestmentEntry["reconciledStatus"] }) {
  if (status === "conciliado")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
        <CheckCircle2 size={9} /> Conciliado
      </span>
    );
  if (status === "revisão pendente")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
        <Clock size={9} /> Revisão
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
      <HelpCircle size={9} /> Ambíguo
    </span>
  );
}

function ConfidenceChip({ level }: { level: InvestmentEntry["classificationConfidence"] }) {
  const map: Record<string, string> = {
    confirmed: "text-emerald-700 bg-emerald-50 border-emerald-200",
    probable:  "text-brand-700 bg-brand-50 border-brand-200",
    ambiguous: "text-amber-700 bg-amber-50 border-amber-200",
    unclassifiable: "text-gray-500 bg-gray-100 border-gray-200",
  };
  return (
    <span className={`inline-flex text-[10px] font-semibold border rounded px-1.5 py-0.5 ${map[level] ?? ""}`}>
      {level}
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// ─── Empirical Investment Panel ────────────────────────────────────────────────
// Shown when pipeline has no ingested documents.
// Source: holdingTreasurySnapshot — confirmed by bank prints.
// Clearly labeled as empirical snapshot, not pipeline data.

function EmpiricalInvestmentPanel() {
  const s = holdingTreasurySnapshot;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex items-start gap-3 mb-4">
        <Camera size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">
            Posição Empírica Confirmada — Print Bancário
          </p>
          <p className="text-[11px] text-amber-600 mt-0.5">
            Fonte: {s.source} · Referência: {s.asOf} · Confiança: print bancário
          </p>
          <p className="text-[11px] text-amber-600 mt-0.5">
            Esta posição será substituída automaticamente após ingesta do extrato PDF em{" "}
            <a href="/awq/ingest" className="underline font-medium">/awq/ingest</a>.
          </p>
        </div>
      </div>

      {/* Investment position */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-white border border-amber-200 p-4">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">
            Saldo Total Investido
          </div>
          <div className="text-2xl font-bold text-gray-900">{fmtBRL(s.totalInvestedReal)}</div>
          <div className="text-[11px] text-gray-500 mt-1">{s.investmentType}</div>
          <div className="text-[10px] text-gray-400">{s.investmentBank}</div>
          <div className="mt-2 text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
            <Camera size={8} /> print confirmado
          </div>
        </div>
        <div className="rounded-lg bg-white border border-gray-200 p-4">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Caixa Operacional Holding
          </div>
          <div className="text-xl font-bold text-gray-900">{fmtBRL(s.operationalCash)}</div>
          <div className="text-[11px] text-gray-500 mt-1">Cora AWQ — saldo disponível</div>
          <div className="text-[10px] text-red-500 mt-1 font-semibold">
            ≠ investimento
          </div>
        </div>
        <div className="rounded-lg bg-white border border-gray-200 p-4">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Saldo em Conta Itaú
          </div>
          <div className="text-xl font-bold text-gray-900">{fmtBRL(s.investmentAccountCash)}</div>
          <div className="text-[11px] text-gray-500 mt-1">Itaú Empresas — conta corrente</div>
          <div className="text-[10px] text-red-500 mt-1 font-semibold">
            ≠ saldo investido
          </div>
        </div>
      </div>

      {/* Last application */}
      <div className="rounded-lg bg-white border border-emerald-200 p-3 mb-4">
        <div className="flex items-center gap-2">
          <ArrowUpRight size={12} className="text-emerald-600" />
          <span className="text-xs font-semibold text-gray-800">
            Última aplicação confirmada:
          </span>
          <span className="text-xs font-bold text-red-600">− {fmtBRL(s.lastApplicationAmount)}</span>
          <span className="text-[11px] text-gray-400">APLICACAO CDB DI · {s.lastApplicationDate}</span>
          <span className="ml-auto text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
            aplicacao_financeira ✓
          </span>
        </div>
        <div className="text-[10px] text-gray-400 mt-1 ml-5">
          Classificação correta: excluída do P&amp;L operacional
        </div>
      </div>

      {/* NOT investment section */}
      <div className="rounded-lg border border-red-100 bg-red-50/60 p-3">
        <p className="text-[11px] font-bold text-red-700 mb-2 flex items-center gap-1.5">
          <XCircle size={12} /> Itens excluídos da contagem de investimento (evidência empírica)
        </p>
        <div className="space-y-1">
          {[
            { label: "Tarifas bancárias (Itaú)", amount: s.bankFees, cat: "tarifa_bancaria" },
            { label: "Reserva de Limite Cartão Cora", amount: s.cardReserveDeposited, cat: "transferencia_interna" },
            { label: "Pix para AWQ Producoes (intercompany)", amount: s.intercompanyTotal, cat: "transferencia_interna_enviada" },
            { label: "Retirada sócio Miguel Costa", amount: s.partnerWithdrawals, cat: "prolabore_retirada" },
            { label: "Saldo em conta Itaú (operacional)", amount: s.investmentAccountCash, cat: "conta_corrente" },
            { label: "Caixa Cora (operacional)", amount: s.operationalCash, cat: "caixa_operacional" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-[11px]">
              <span className="text-gray-600 flex items-center gap-1">
                <XCircle size={9} className="text-red-400" />
                {item.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{fmtBRL(item.amount)}</span>
                <span className="text-[9px] text-gray-400 bg-gray-100 border border-gray-200 rounded px-1 py-0.5 font-mono">
                  {item.cat}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NoDataBanner({ message, gaps }: { message: string; gaps: string[] }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">{message}</p>
          {gaps.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {gaps.map((g) => (
                <li key={g} className="text-[11px] text-amber-600 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-amber-700 mt-2">
            Ingira extratos bancários em{" "}
            <a href="/awq/ingest" className="underline font-medium">/awq/ingest</a>{" "}
            e classifique transações como <code className="font-mono bg-amber-100 px-1 rounded">aplicacao_financeira</code> ou{" "}
            <code className="font-mono bg-amber-100 px-1 rounded">resgate_financeiro</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

function LedgerTable({
  entries,
  title,
  emptyMessage,
  isReview,
}: {
  entries: InvestmentEntry[];
  title: string;
  emptyMessage: string;
  isReview?: boolean;
}) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        {isReview ? (
          <ShieldAlert size={15} className="text-amber-500" />
        ) : (
          <Landmark size={15} className="text-brand-500" />
        )}
        {title}
        <span className="ml-auto text-[11px] font-normal text-gray-400">
          {entries.length} registro(s)
        </span>
      </h2>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">{emptyMessage}</p>
      ) : (
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 w-24">Data</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Banco · Conta</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 hidden lg:table-cell">Entidade</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 hidden xl:table-cell">Descrição</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Categoria</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Valor</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 hidden md:table-cell">Status</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 hidden lg:table-cell">Confiança</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.transactionId}
                  className={`border-b border-gray-100 transition-colors ${
                    e.isAmbiguous
                      ? "bg-amber-50/40 hover:bg-amber-50"
                      : "hover:bg-gray-50/80"
                  }`}
                >
                  <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">
                    {fmtDate(e.transactionDate)}
                  </td>
                  <td className="py-2 px-3 text-xs">
                    <div className="font-medium text-gray-800 truncate max-w-[140px]">{e.accountName}</div>
                    <div className="text-[10px] text-gray-400">{e.bank}</div>
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-500 hidden lg:table-cell">
                    {ENTITY_LABELS[e.entity] ?? e.entity}
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-500 hidden xl:table-cell max-w-[200px]">
                    <span className="truncate block" title={e.descriptionOriginal}>
                      {e.counterpartyName ?? e.descriptionOriginal.slice(0, 40)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-600">
                    {INVESTMENT_CATEGORY_LABELS[e.investmentCategory]}
                  </td>
                  <td className={`py-2 px-3 text-right text-xs font-bold whitespace-nowrap ${
                    e.direction === "credit" ? "text-emerald-600" : "text-red-600"
                  }`}>
                    {e.direction === "credit" ? "+" : "−"}{fmtBRL(e.amount)}
                  </td>
                  <td className="py-2 px-3 text-center hidden md:table-cell">
                    <ConfidenceBadge status={e.reconciledStatus} />
                  </td>
                  <td className="py-2 px-3 text-center hidden lg:table-cell">
                    <ConfidenceChip level={e.classificationConfidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EntityCard({ s }: { s: EntityInvestmentSummary }) {
  const net = s.netInvested;
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs font-bold text-gray-900">{s.label}</div>
          {s.lastActivity && (
            <div className="text-[10px] text-gray-400 mt-0.5">
              Última mov.: {fmtDate(s.lastActivity)}
            </div>
          )}
        </div>
        <Building2 size={14} className="text-gray-300" />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Aplicado</span>
          <span className="text-red-600 font-semibold">{fmtBRL(s.totalApplications)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Resgatado</span>
          <span className="text-emerald-600 font-semibold">{fmtBRL(s.totalRedemptions)}</span>
        </div>
        <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
          <span className="font-semibold text-gray-700">Saldo Líq.</span>
          <span className={`font-bold ${net > 0 ? "text-gray-900" : net < 0 ? "text-emerald-700" : "text-gray-400"}`}>
            {net > 0 ? "−" : "+"}{fmtBRL(Math.abs(net))}
          </span>
        </div>
        {s.ambiguousCount > 0 && (
          <div className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
            <AlertCircle size={9} /> {s.ambiguousCount} item(ns) em revisão
          </div>
        )}
      </div>
      {s.accounts.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-[10px] text-gray-400">Contas: {s.accounts.join(", ")}</div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqInvestmentsPage() {
  const q = await buildInvestmentQuery();

  const periodLabel = q.periodStart && q.periodEnd
    ? `${fmtDate(q.periodStart)} – ${fmtDate(q.periodEnd)}`
    : "Período: aguardando extratos";

  const allConfirmed = [...q.applications, ...q.redemptions].sort(
    (a, b) => b.transactionDate.localeCompare(a.transactionDate)
  );

  const confidencePct =
    q.confirmedCount + q.ambiguousCount > 0
      ? Math.round((q.confirmedCount / (q.confirmedCount + q.ambiguousCount)) * 100)
      : 0;

  const op = q.operationalReference;

  return (
    <>
      <Header
        title="Investimentos — AWQ Group"
        subtitle={`Aplicações e resgates financeiros · Patrimônio segregado · ${periodLabel}`}
      />
      <div className="page-container">

        {/* ── Empty states ─────────────────────────────────────────────────── */}
        {!q.hasData && (
          <>
            <NoDataBanner
              message="Pipeline financeira aguardando extratos bancários"
              gaps={q.coverageGaps}
            />
            {/* Show empirical snapshot from bank prints while pipeline is empty */}
            <EmpiricalInvestmentPanel />
          </>
        )}

        {q.hasData && !q.hasInvestmentData && (
          <NoDataBanner
            message="Nenhuma transação de investimento identificada"
            gaps={q.coverageGaps}
          />
        )}

        {/* ── Coverage gaps (when partial data exists) ─────────────────────── */}
        {q.hasInvestmentData && q.coverageGaps.length > 0 && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1.5">
              <AlertCircle size={13} /> Atenção
            </p>
            <ul className="space-y-0.5">
              {q.coverageGaps.map((g) => (
                <li key={g} className="text-[11px] text-amber-600 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              label:   "Aplicado",
              value:   fmtBRL(q.totalApplications),
              sub:     `${q.applications.length} transação(ões)`,
              icon:    ArrowUpRight,
              color:   "text-red-600",
              bg:      "bg-red-50",
            },
            {
              label:   "Resgatado",
              value:   fmtBRL(q.totalRedemptions),
              sub:     `${q.redemptions.length} transação(ões)`,
              icon:    ArrowDownLeft,
              color:   "text-emerald-600",
              bg:      "bg-emerald-50",
            },
            {
              label:   "Saldo Líq. Investido",
              value:   fmtBRL(q.netInvested),
              sub:     q.netInvested > 0 ? "Mais aplicado que resgatado" : q.netInvested < 0 ? "Mais resgatado que aplicado" : "Zerado no período",
              icon:    Landmark,
              color:   q.netInvested > 0 ? "text-gray-700" : "text-emerald-700",
              bg:      "bg-gray-50",
            },
            {
              label:   "Em Revisão",
              value:   String(q.ambiguousCount),
              sub:     "Itens pendentes de decisão",
              icon:    Clock,
              color:   q.ambiguousCount > 0 ? "text-amber-600" : "text-gray-400",
              bg:      q.ambiguousCount > 0 ? "bg-amber-50" : "bg-gray-50",
            },
            {
              label:   "Confiança",
              value:   `${confidencePct}%`,
              sub:     `${q.confirmedCount} de ${q.confirmedCount + q.ambiguousCount} classificados`,
              icon:    CheckCircle2,
              color:   confidencePct >= 80 ? "text-emerald-600" : confidencePct >= 50 ? "text-amber-600" : "text-red-600",
              bg:      "bg-gray-50",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-bold text-gray-900 truncate">{card.value}</div>
                  <div className="text-[10px] font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{card.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Investment vs Operational Separation ─────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <MinusCircle size={15} className="text-violet-500" />
            Separação: Operacional vs Investimento / Patrimonial
          </h2>
          <p className="text-[11px] text-gray-400 mb-4">
            Aplicações e resgates são excluídos do FCO operacional.
            Não inflam receita nem despesa consolidada.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">FCO Operacional</div>
              <div className="text-xl font-bold text-gray-900">{fmtBRL(op.operationalNet)}</div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Entradas op.</span>
                  <span className="text-emerald-600 font-semibold">{fmtBRL(op.totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Saídas op.</span>
                  <span className="text-red-500">{fmtBRL(op.totalExpenses)}</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-emerald-600">
                Receitas e despesas operacionais classificadas
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Investimento / Patrimonial</div>
              <div className="text-xl font-bold text-gray-900">{fmtBRL(q.netInvested)}</div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Aplicações</span>
                  <span className="text-red-600 font-semibold">{fmtBRL(q.totalApplications)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Resgates</span>
                  <span className="text-emerald-600 font-semibold">{fmtBRL(q.totalRedemptions)}</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-gray-400">
                Excluído do consolidado operacional
              </div>
            </div>

            <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
              <div className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider mb-1">Em Revisão</div>
              <div className="text-xl font-bold text-gray-900">{q.ambiguousCount}</div>
              <div className="mt-2 text-xs text-gray-500">
                Transferências internas não pareadas — possivelmente investimento,
                aguardando classificação manual.
              </div>
              <div className="mt-2 text-[10px] text-amber-600">
                Rendimentos não identificáveis automaticamente
              </div>
            </div>
          </div>
        </div>

        {/* ── Entity Breakdown ─────────────────────────────────────────────── */}
        {q.hasInvestmentData && q.byEntity.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Activity size={14} className="text-brand-400" />
              Por Entidade / BU
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {q.byEntity.map((s) => (
                <EntityCard key={s.entity} s={s} />
              ))}
            </div>
          </div>
        )}

        {/* ── Investment Ledger (confirmed) ────────────────────────────────── */}
        <LedgerTable
          entries={allConfirmed}
          title="Ledger de Investimentos — Confirmados"
          emptyMessage="Nenhuma transação de investimento confirmada. Classifique transações como aplicacao_financeira ou resgate_financeiro."
        />

        {/* ── Review Queue ─────────────────────────────────────────────────── */}
        {q.reviewQueue.length > 0 && (
          <LedgerTable
            entries={q.reviewQueue}
            title="Fila de Revisão — Possível Investimento (não confirmado)"
            emptyMessage="Nenhum item em revisão."
            isReview
          />
        )}

        {/* ── Data quality ─────────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Activity size={15} className="text-brand-500" />
            Qualidade e Rastreabilidade
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
            {[
              { label: "Documentos afetados",   value: q.affectedDocuments },
              { label: "Transações confirmadas", value: q.confirmedCount    },
              { label: "Em revisão",             value: q.ambiguousCount    },
              { label: "Contas com mov.",        value: q.affectedAccounts.length },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          {q.affectedAccounts.length > 0 && (
            <div className="text-[11px] text-gray-400">
              Contas: {q.affectedAccounts.join(" · ")}
            </div>
          )}
        </div>

        {/* ── Methodology disclaimer ───────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-700">Área de Investimentos</span> —
            Esta página apresenta exclusivamente movimentações patrimoniais identificadas nos extratos bancários ingeridos.
            Aplicações (<code className="font-mono bg-gray-100 px-1 rounded text-[10px]">aplicacao_financeira</code>) e
            resgates (<code className="font-mono bg-gray-100 px-1 rounded text-[10px]">resgate_financeiro</code>) são
            excluídos do FCO operacional e não inflam receita nem despesa consolidada da AWQ.
            O saldo líquido investido representa fluxo de caixa observável — não valor de mercado dos ativos.
            Rendimentos só poderão ser calculados quando a categoria{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[10px]">rendimento_financeiro</code>{" "}
            for criada e transações forem classificadas. Dados 100% originados dos extratos bancários reais.
          </p>
        </div>

      </div>
    </>
  );
}
