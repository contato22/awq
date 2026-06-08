// ─── /awq/conciliacao — Conciliação Bancária (hub unificado) ─────────────────
// CAMADA: corporate-treasury (ERP AWQ)
// SCOPE:  Hub único de conciliação — revisão de transações importadas + verificação manual.
//
// SEÇÕES:
//   1. KPIs de progresso (cálculo a partir da base canônica)
//   2. BankReconciliationBoard — layout lado a lado banco vs. sistema (estilo Conta Azul)
//   3. Impacto da Conciliação  — links para DFC, DRE e KPIs
//
// PERSISTÊNCIA:
//   SSR/Vercel → PATCH /api/transactions/[id] → transactions.json ou Postgres
//   GitHub Pages → edições salvas no localStorage do navegador

import Link from "next/link";
import nextDynamic from "next/dynamic";
import Header from "@/components/Header";
import BankReconciliationBoard from "@/components/BankReconciliationBoard";
import CoraStatusPanel from "@/components/CoraStatusPanel";
import OfflineBanksPanel from "@/components/OfflineBanksPanel";
import { getAllTransactions, getAllDocuments, type BankTransaction, type FinancialDocument } from "@/lib/financial-db";
import { getConsolidatedDaily } from "@/lib/balance-snapshots";
import { getAllAR, initAPARDB } from "@/lib/ap-ar-db";
import { todayBRT, daysAheadBRT } from "@/lib/date-brt";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  GitMerge,
  LineChart,
  Zap,
} from "lucide-react";

// ssr: false prevents Recharts (ResizeObserver) from crashing during SSR
const FinancialOverview = nextDynamic(() => import("@/components/FinancialOverviewV2"), { ssr: false });

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

const IS_STATIC       = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const CORA_CONFIGURED = !!(
  process.env.CORA_CLIENT_ID &&
  process.env.CORA_CERT &&
  process.env.CORA_KEY
);


export default async function ConciliacaoPage() {
  let transactions: BankTransaction[] = [];
  let documents:    FinancialDocument[] = [];
  let loadError: string | null = null;

  // Expected AR receipts (EPM system — separate from bank_transactions)
  let arPending: { id: string; customer_name: string; net_amount: number; due_date: string; account_code?: string }[] = [];
  try {
    await initAPARDB();
    const arItems = await getAllAR();
    const horizon = daysAheadBRT(30);
    arPending = arItems
      .filter((i) => (i.status === "PENDING" || i.status === "PARTIAL") && i.due_date <= horizon)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 8)
      .map((i) => ({
        id: i.id,
        customer_name: i.customer_name,
        net_amount: i.status === "PARTIAL" ? i.net_amount - (i.received_amount ?? 0) : i.net_amount,
        due_date: i.due_date,
        account_code: i.account_code,
      }));
  } catch { /* AR EPM unavailable — show empty state */ }

  try {
    [transactions, documents] = await Promise.all([
      getAllTransactions(),
      getAllDocuments(),
    ]);
  } catch (err) {
    console.error("[ConciliacaoPage] DB load error:", err);
    loadError = err instanceof Error ? err.message : "Erro ao carregar dados do banco";
  }

  const conciliado = transactions.filter((t) => t.reconciliationStatus === "conciliado").length;
  const total      = transactions.length;
  const pct        = total > 0 ? Math.round((conciliado / total) * 100) : 0;
  const docsDone   = documents.filter((d) => d.status === "done").length;

  const openingBalance = documents
    .filter((d) => d.status === "done" && d.openingBalance != null
      && d.entity !== "ENERDY")
    .reduce((s, d) => s + (d.openingBalance ?? 0), 0);

  // ── Snapshots de saldo consolidado (últimos 5 anos) ──
  // Janela longa para suportar modo "Anual" no chart (dados históricos até 2022).
  // Carry-forward por conta dentro de getConsolidatedDaily.
  // Holding-only (exclui ENERDY) — combina com o escopo do chart.
  let balanceSnapshots: Array<{ date: string; total: number }> = [];
  try {
    const tdy = todayBRT();
    const fromIso = new Date(new Date(tdy).getTime() - 1826 * 86_400_000)
      .toISOString().slice(0, 10);
    const dailyHolding = await getConsolidatedDaily(fromIso, tdy, "AWQ_Holding");
    const dailyJacqes  = await getConsolidatedDaily(fromIso, tdy, "JACQES");
    const dailyCaza    = await getConsolidatedDaily(fromIso, tdy, "Caza_Vision");
    const byDate = new Map<string, number>();
    for (const arr of [dailyHolding, dailyJacqes, dailyCaza]) {
      for (const row of arr) {
        byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.total);
      }
    }
    balanceSnapshots = Array.from(byDate.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch { /* sem snapshots — chart usa fallback */ }

  return (
    <>
      <Header
        title="Conciliação"
        subtitle="Conciliação bancária · DFC e DRE sincronizados"
      />
      <div className="page-container">

        {/* ── Erro de carregamento ── */}
        {loadError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Falha ao carregar dados</p>
              <p className="text-xs text-amber-700 mt-0.5 font-mono">{loadError}</p>
            </div>
          </div>
        )}

        {/* ── Visão geral financeira: chart + contas + AR/AP ── */}
        <FinancialOverview
          transactions={transactions}
          arPending={arPending.map(({ id, customer_name, net_amount, due_date }) => ({ id, customer_name, net_amount, due_date }))}
          coraConfigured={CORA_CONFIGURED}
          openingBalance={openingBalance}
          balanceSnapshots={balanceSnapshots}
        />

        {/* ── Painel de conciliação ── */}
        <section className="space-y-4">

          {/* Header da seção com progress inline */}
          <div className="section-header mb-0">
            <div className="flex items-start gap-3 min-w-0">
              <div className="section-title">
                <GitMerge size={15} className="text-brand-500 shrink-0" />
                <h2>Conciliação Bancária</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                Associe movimentações bancárias às suas receitas e despesas
              </p>
            </div>
            {total > 0 && (
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 whitespace-nowrap">{pct}%</span>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {conciliado}/{total} txns
                  {docsDone > 0 && ` · ${docsDone} extrato${docsDone > 1 ? "s" : ""}`}
                </span>
              </div>
            )}
          </div>

          {/* Cora sync status */}
          {CORA_CONFIGURED && (
            <CoraStatusPanel transactions={transactions} />
          )}

          {/* Outros bancos da Holding — sem integração API */}
          <OfflineBanksPanel transactions={transactions} />

          {/* Board principal */}
          <BankReconciliationBoard
            initialTransactions={transactions}
            isStatic={IS_STATIC}
            coraConfigured={CORA_CONFIGURED}
          />
        </section>

        {/* ── AR Pipeline (apenas se houver itens) ── */}
        {arPending.length > 0 && (
          <section className="card p-5 space-y-3">
            <div className="section-header mb-0">
              <div className="section-title">
                <CheckCircle2 size={14} className="text-brand-500 shrink-0" />
                <h2>AR · Recebimentos Esperados</h2>
              </div>
              <Link href="/awq/epm/ar/cadastro" className="section-link">
                Cadastro <ArrowUpRight size={11} />
              </Link>
            </div>
            <div className="grid gap-1">
              {arPending.map((item) => {
                const todayDate = todayBRT();
                const overdue = item.due_date < todayDate;
                const [y, m, d] = item.due_date.split("-");
                return (
                  <div key={item.id}
                    className={`flex items-center justify-between text-xs rounded-xl px-3 py-2 ${overdue ? "bg-red-50 border border-red-200" : "bg-white border border-brand-100"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 size={11} className={overdue ? "text-red-400 shrink-0" : "text-brand-400 shrink-0"} />
                      <span className="font-medium text-gray-700 truncate">{item.customer_name}</span>
                      {item.account_code && (
                        <span className="text-[9px] font-mono text-gray-400 hidden sm:inline">{item.account_code}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`tabular-nums font-semibold ${overdue ? "text-red-700" : "text-emerald-700"}`}>
                        {(item.net_amount ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <span className={`text-[10px] ${overdue ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                        {`${d}/${m}/${y}`}{overdue ? " ⚠" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Footer: links para relatórios ── */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200">
          <span className="text-overline mr-1">Impacto em:</span>
          {[
            { href: "/awq/cashflow",  icon: Zap,      label: "DFC" },
            { href: "/awq/financial", icon: LineChart, label: "DRE" },
            { href: "/awq/kpis",      icon: BarChart3, label: "KPIs" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="btn-secondary flex items-center gap-1.5 py-1.5 text-xs"
            >
              <item.icon size={11} className="text-brand-500" />
              {item.label}
              <ExternalLink size={10} className="text-gray-400" />
            </Link>
          ))}
          {IS_STATIC && (
            <span className="ml-auto text-[10px] text-gray-400">Edições salvas localmente</span>
          )}
        </div>

      </div>
    </>
  );
}
