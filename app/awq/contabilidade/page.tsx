// ─── /awq/contabilidade — Balanço Patrimonial Gerencial ───────────────────────
//
// CAMADA: corporate-control (ERP AWQ)
// METODOLOGIA: Caixa-base (cash-basis) — posição real dos saldos bancários.
//   Distinção: /awq/financial = DRE gerencial  |  este módulo = posição patrimonial
//
// FONTE: bank_transactions via buildFinancialQuery (financial-query.ts)
// SSR: force-dynamic, sem cache.

import Header from "@/components/Header";
import {
  buildFinancialQuery,
  fmtBRL,
  fmtDate,
  ENTITY_LABELS,
  type EntitySummary,
  type FinancialQueryResult,
} from "@/lib/financial-query";
import {
  Scale,
  Landmark,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BadgeCheck,
  Info,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

// ─── Formatting ───────────────────────────────────────────────────────────────

function cls(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── No-data empty state ──────────────────────────────────────────────────────

function NoDataBanner() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Aguardando extratos bancários</p>
          <p className="text-xs text-amber-700 mt-1">
            Nenhum extrato processado ainda. Importe PDFs ou sincronize via{" "}
            <a href="/awq/conciliacao" className="underline font-medium">
              Conciliação
            </a>{" "}
            para gerar o balanço patrimonial.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Methodology notice ───────────────────────────────────────────────────────

function MethodologyNote() {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
      <Info size={12} className="shrink-0 mt-0.5" />
      <span>
        <strong>Balanço Gerencial (Caixa-Base)</strong> — posição real dos saldos bancários
        consolidados. Não é escrituração contábil formal (regime de competência). Passivos e
        obrigações de longo prazo não são capturados em extratos bancários.
      </span>
    </div>
  );
}

// ─── Entity cash row ──────────────────────────────────────────────────────────

function EntityAtivoRow({ e }: { e: EntitySummary }) {
  const balance = e.totalCashBalance;
  const positive = balance >= 0;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
        <Landmark size={14} className="text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-800">{e.label}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {e.accounts.length} conta{e.accounts.length !== 1 ? "s" : ""} ·{" "}
          {e.accounts.map((a) => `${a.bank}`).join(", ")}
        </div>
        {e.accounts.length > 1 && (
          <div className="mt-1.5 space-y-0.5">
            {e.accounts.map((a) => (
              <div key={a.documentId} className="flex justify-between text-xs text-gray-400">
                <span className="truncate">{a.accountName}</span>
                <span className={cls("tabular-nums ml-3 shrink-0", a.closingBalance >= 0 ? "text-gray-600" : "text-red-500")}>
                  {fmtBRL(a.closingBalance)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={cls("text-sm font-bold tabular-nums shrink-0", positive ? "text-gray-800" : "text-red-600")}>
        {fmtBRL(balance)}
      </div>
    </div>
  );
}

// ─── Balance sheet section header ────────────────────────────────────────────

function SectionHeader({ label, total, accent }: { label: string; total: number; accent: "emerald" | "blue" | "gray" }) {
  const colorMap = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    blue:    "bg-blue-50 border-blue-200 text-blue-700",
    gray:    "bg-gray-50 border-gray-200 text-gray-700",
  };
  return (
    <div className={cls("flex justify-between items-center px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider", colorMap[accent])}>
      <span>{label}</span>
      <span className="tabular-nums text-sm">{fmtBRL(total)}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ContabilidadePage() {
  let result: FinancialQueryResult | null = null;
  let loadError = false;

  try {
    result = await buildFinancialQuery();
  } catch (err) {
    console.error("[/awq/contabilidade] buildFinancialQuery failed:", err);
    loadError = true;
  }

  const hasData = result?.hasData ?? false;
  const c = result?.consolidated;
  const entities = result?.entities ?? [];

  // ── ATIVO ──────────────────────────────────────────────────────────────────
  // Caixa e Bancos = sum of closing balances across all accounts
  const caixaBancos = entities.reduce((s, e) => s + e.totalCashBalance, 0);
  // Aplicações Financeiras = net of all financial app/redemption movements
  const netFinancialApps = entities.reduce(
    (s, e) => s + e.accounts.reduce((as, a) => as + a.financialApplications - a.financialRedemptions, 0),
    0
  );
  const totalAtivo = caixaBancos + netFinancialApps;

  // ── RESULTADO DO PERÍODO ───────────────────────────────────────────────────
  const receitas  = c?.totalRevenue ?? 0;
  const despesas  = c?.totalExpenses ?? 0;
  const resultado = c?.operationalNetCash ?? 0;

  // ── Period coverage ────────────────────────────────────────────────────────
  const periodStart = c?.periodStart ?? null;
  const periodEnd   = c?.periodEnd   ?? null;
  const periodLabel = periodStart && periodEnd
    ? `${fmtDate(periodStart)} – ${fmtDate(periodEnd)}`
    : "—";

  return (
    <>
      <Header
        title="Balanço Patrimonial"
        subtitle="Posição Patrimonial Gerencial · AWQ Group"
      />

      <div className="page-container space-y-6">

        {/* Error banner */}
        {loadError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertCircle size={13} className="shrink-0" />
            Erro ao carregar dados financeiros. Verifique os logs do servidor.
          </div>
        )}

        {/* Methodology note */}
        <MethodologyNote />

        {/* No data */}
        {!hasData && !loadError && <NoDataBanner />}

        {hasData && (
          <>
            {/* Period summary bar */}
            <div className="card p-4 flex flex-wrap gap-4 items-center justify-between">
              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Período coberto</div>
                <div className="text-sm font-semibold text-gray-800 mt-0.5">{periodLabel}</div>
              </div>
              <div className="flex gap-6">
                <div className="text-right">
                  <div className="text-xs text-gray-400">Total Ativo</div>
                  <div className={cls("text-lg font-bold tabular-nums", totalAtivo >= 0 ? "text-gray-900" : "text-red-600")}>
                    {fmtBRL(totalAtivo)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Resultado do Período</div>
                  <div className={cls("text-lg font-bold tabular-nums", resultado >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {resultado >= 0 ? "+" : ""}{fmtBRL(resultado)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Transações</div>
                  <div className="text-lg font-bold tabular-nums text-gray-800">
                    {(c?.transactionCount ?? 0).toLocaleString("pt-BR")}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── ATIVO ── */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-blue-500" />
                  <h2 className="text-sm font-bold text-gray-900">ATIVO</h2>
                </div>

                <div>
                  <SectionHeader label="Ativo Circulante" total={totalAtivo} accent="blue" />

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                      Caixa e Equivalentes de Caixa
                    </div>
                    <div className="divide-y divide-gray-50">
                      {entities.filter((e) => e.totalCashBalance !== 0 || e.accounts.length > 0).map((e) => (
                        <EntityAtivoRow key={e.entity} e={e} />
                      ))}
                    </div>

                    {/* Subtotal caixa */}
                    <div className="flex justify-between items-center py-2 mt-1 border-t border-gray-200">
                      <span className="text-xs font-semibold text-gray-600">Subtotal Caixa e Bancos</span>
                      <span className={cls("text-xs font-bold tabular-nums", caixaBancos >= 0 ? "text-gray-800" : "text-red-600")}>
                        {fmtBRL(caixaBancos)}
                      </span>
                    </div>
                  </div>

                  {/* Financial investments */}
                  {netFinancialApps !== 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                        Aplicações Financeiras (líquido)
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-xs text-gray-600">CDB / LCI / LCA / Fundos</span>
                        <span className="text-xs font-semibold tabular-nums text-blue-700">{fmtBRL(netFinancialApps)}</span>
                      </div>
                    </div>
                  )}

                  {/* TOTAL ATIVO */}
                  <div className="flex justify-between items-center py-3 mt-2 border-t-2 border-gray-900">
                    <span className="text-sm font-bold text-gray-900">TOTAL ATIVO</span>
                    <span className={cls("text-sm font-bold tabular-nums", totalAtivo >= 0 ? "text-gray-900" : "text-red-600")}>
                      {fmtBRL(totalAtivo)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── RESULTADO DO PERÍODO (PL) ── */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Scale size={16} className="text-emerald-500" />
                  <h2 className="text-sm font-bold text-gray-900">RESULTADO DO PERÍODO</h2>
                </div>

                <SectionHeader label="Patrimônio Líquido Operacional" total={resultado} accent="emerald" />

                <div className="space-y-0">
                  {/* Receitas */}
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-gray-600">Receitas Operacionais</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 tabular-nums">{fmtBRL(receitas)}</span>
                  </div>

                  {/* Despesas */}
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight size={14} className="text-red-500 shrink-0" />
                      <span className="text-xs text-gray-600">Despesas Operacionais</span>
                    </div>
                    <span className="text-xs font-semibold text-red-600 tabular-nums">({fmtBRL(despesas)})</span>
                  </div>

                  {/* Intercompany eliminated */}
                  {(c?.intercompanyEliminated ?? 0) > 0 && (
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                      <span className="text-xs text-gray-400 italic">Intercompany eliminado</span>
                      <span className="text-xs text-gray-400 tabular-nums">({fmtBRL(c!.intercompanyEliminated)})</span>
                    </div>
                  )}

                  {/* Retiradas de sócios */}
                  {(c?.partnerWithdrawals ?? 0) > 0 && (
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Pró-labore / Retiradas (incluído acima)</span>
                      <span className="text-xs text-gray-400 tabular-nums">({fmtBRL(c!.partnerWithdrawals)})</span>
                    </div>
                  )}

                  {/* Resultado líquido */}
                  <div className="flex justify-between items-center py-3 mt-1 border-t-2 border-gray-900">
                    <span className="text-sm font-bold text-gray-900">RESULTADO LÍQUIDO</span>
                    <div className="flex items-center gap-1.5">
                      {resultado >= 0
                        ? <TrendingUp size={14} className="text-emerald-500" />
                        : <TrendingDown size={14} className="text-red-500" />}
                      <span className={cls("text-sm font-bold tabular-nums", resultado >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {fmtBRL(resultado)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Data quality badge */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <BadgeCheck size={13} className="text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-400">
                    {c?.confirmedTransactions ?? 0} transações confirmadas ·{" "}
                    {c?.ambiguousTransactions ?? 0} pendentes de classificação
                  </span>
                </div>
              </div>
            </div>

            {/* Intercompany note */}
            {(c?.intercompanyEliminated ?? 0) > 0 && (
              <div className="text-xs text-gray-400 px-1">
                * Transferências intercompany ({fmtBRL(c!.intercompanyEliminated)}) eliminadas da consolidação para evitar dupla contagem.
              </div>
            )}
          </>
        )}

      </div>
    </>
  );
}
