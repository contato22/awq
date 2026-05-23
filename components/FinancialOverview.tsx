"use client";

// FinancialOverview — Conta Azul-style financial dashboard panel
// Shows: account balances, A receber/A pagar hoje, overdue totals,
// and a 14-day daily cash flow sparkline chart (Recharts).

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BankTransaction } from "@/lib/financial-db";
import { ArrowDownLeft, ArrowUpRight, Building2, FileUp, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoraBalance { available: number; blocked: number | null; error?: string }

interface AccountInfo {
  key:      string;   // e.g. "AWQ_Holding"
  name:     string;   // display name
  subtitle: string;
  initials: string;
  bgClass:  string;   // Tailwind bg class for badge
  balance:  number | null;
  loading:  boolean;
  error:    string | null;
}

interface ARItem {
  id: string;
  customer_name: string;
  net_amount: number;
  due_date: string;
}

interface Props {
  transactions: BankTransaction[];
  arPending: ARItem[];
  coraConfigured: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function today() { return new Date().toISOString().slice(0, 10); }

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

// Build daily cash flow data from transactions (last 14 days)
function buildDailyFlow(txns: BankTransaction[]) {
  const since = daysAgo(13);
  const map = new Map<string, { recebimentos: number; pagamentos: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i);
    map.set(d, { recebimentos: 0, pagamentos: 0 });
  }
  for (const t of txns) {
    if (t.transactionDate < since) continue;
    const key = t.transactionDate;
    if (!map.has(key)) continue;
    const row = map.get(key)!;
    if (t.direction === "credit") row.recebimentos += t.amount;
    else row.pagamentos += t.amount;
  }
  let running = 0;
  return Array.from(map.entries()).map(([date, v]) => {
    running += v.recebimentos - v.pagamentos;
    const [, m, d] = date.split("-");
    return {
      date: `${d}/${m}`,
      recebimentos: Math.round(v.recebimentos),
      pagamentos:   Math.round(v.pagamentos),
      saldo:        Math.round(running),
    };
  });
}

const ACCOUNTS_CFG = [
  { key: "AWQ_Holding", name: "Conta PJ AWQ Holding", subtitle: "AWQ Holding", initials: "AWQ", bgClass: "bg-blue-600" },
  { key: "ENERDY",      name: "Cora Enerdy",           subtitle: "BU ENRD",     initials: "ENRD", bgClass: "bg-violet-600" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FinancialOverview({ transactions, arPending, coraConfigured }: Props) {
  const todayStr = today();

  // Account balances
  const [accounts, setAccounts] = useState<AccountInfo[]>(
    ACCOUNTS_CFG.map((a) => ({ ...a, balance: null, loading: coraConfigured, error: null }))
  );

  const loadBalance = useCallback(async (key: string) => {
    try {
      const res  = await fetch(`/api/cora/balance?account=${key}`);
      const data = await res.json() as CoraBalance & { error?: string };
      setAccounts((prev) => prev.map((a) =>
        a.key === key
          ? { ...a, loading: false, balance: res.ok ? data.available : null, error: data.error ?? null }
          : a
      ));
    } catch {
      setAccounts((prev) => prev.map((a) =>
        a.key === key ? { ...a, loading: false, error: "Falha ao buscar saldo" } : a
      ));
    }
  }, []);

  useEffect(() => {
    if (!coraConfigured) return;
    void loadBalance("AWQ_Holding");
    void loadBalance("ENERDY");
  }, [coraConfigured, loadBalance]);

  // AR / AP summaries from transactions
  const recebimentosHoje = transactions
    .filter((t) => t.transactionDate === todayStr && t.direction === "credit" && t.reconciliationStatus !== "descartado")
    .reduce((s, t) => s + t.amount, 0);

  const pagamentosHoje = transactions
    .filter((t) => t.transactionDate === todayStr && t.direction === "debit" && t.reconciliationStatus !== "descartado")
    .reduce((s, t) => s + t.amount, 0);

  // Restante do mês from AR (pending receivables)
  const restanteMesAR = arPending.reduce((s, i) => s + i.net_amount, 0);

  // Overdue (AR items past due)
  const overdueAR = arPending
    .filter((i) => i.due_date < todayStr)
    .reduce((s, i) => s + i.net_amount, 0);

  // Pending debits this month (not yet conciliated)
  const pendingDebitsMonth = transactions
    .filter((t) => {
      const [y, m] = t.transactionDate.split("-");
      const now = new Date();
      return (
        parseInt(y) === now.getFullYear() &&
        parseInt(m) === now.getMonth() + 1 &&
        t.direction === "debit" &&
        t.reconciliationStatus !== "conciliado" &&
        t.reconciliationStatus !== "descartado"
      );
    })
    .reduce((s, t) => s + t.amount, 0);

  const totalBalance = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const anyLoading   = accounts.some((a) => a.loading);

  const dailyData = buildDailyFlow(transactions);

  // Unique account names from transactions (for "Importe seu extrato" links)
  const txAccounts = Array.from(
    new Map(transactions.map((t) => [`${t.bank}::${t.accountName}`, { bank: t.bank, name: t.accountName, entity: t.entity }])).values()
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">

      {/* ── LEFT: Contas bancárias ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Contas</h3>
          {coraConfigured && (
            <button
              onClick={() => { void loadBalance("AWQ_Holding"); void loadBalance("ENERDY"); }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Atualizar saldos"
            >
              <RefreshCw size={12} className={anyLoading ? "animate-spin" : ""} />
            </button>
          )}
        </div>

        <div className="space-y-2">
          {txAccounts.length === 0 && !coraConfigured && (
            <p className="text-xs text-gray-400 italic">Nenhuma conta bancária encontrada.</p>
          )}
          {txAccounts.map((acc) => {
            // Match to Cora account for balance
            const coraAcc = accounts.find((a) => a.key === acc.entity);
            const initials =
              acc.entity === "ENERDY" ? "ENRD" :
              acc.entity === "JACQES" ? "JCQ"  : "AWQ";
            const bg =
              acc.entity === "ENERDY" ? "bg-violet-600" :
              acc.entity === "JACQES" ? "bg-emerald-600" : "bg-blue-600";
            const label = (acc.name ?? acc.bank ?? "").replace(/^Conta\s+PJ\s+/i, "").trim();
            return (
              <div key={`${acc.bank}::${acc.name}`} className="rounded-lg border border-gray-100 p-3 space-y-2 hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center text-[10px] font-bold text-white tracking-wide shrink-0`}>
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-900 truncate">{label}</div>
                    <div className="text-[10px] text-gray-400">{acc.bank}</div>
                  </div>
                </div>
                <button className="flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                  <FileUp size={11} />
                  Importe seu extrato
                </button>
                {coraAcc && (
                  <div className="flex justify-end">
                    {coraAcc.loading ? (
                      <span className="text-[11px] text-gray-400 animate-pulse">Carregando…</span>
                    ) : coraAcc.error ? (
                      <span className="text-[10px] text-gray-400 italic">Saldo indisponível</span>
                    ) : coraAcc.balance !== null ? (
                      <span className="text-sm font-bold text-gray-900 tabular-nums">
                        {fmtBRL(coraAcc.balance)}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total balance */}
        {coraConfigured && !anyLoading && totalBalance > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-600">Saldo total</span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">{fmtBRL(totalBalance)}</span>
          </div>
        )}
      </div>

      {/* ── RIGHT: AR/AP + chart + overdue ────────────────────────────────── */}
      <div className="space-y-4">

        {/* A receber / A pagar hoje */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* A receber hoje */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">A receber hoje</p>
              <ArrowUpRight size={14} className="text-emerald-500" />
            </div>
            {recebimentosHoje > 0 ? (
              <p className="text-xl font-bold text-emerald-600 tabular-nums">{fmtBRL(recebimentosHoje)}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">Não há recebimentos hoje.</p>
            )}
            {restanteMesAR > 0 && (
              <p className="text-[11px] text-gray-500">Restante do mês: <span className="font-semibold">{fmtBRL(restanteMesAR)}</span></p>
            )}
            <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors">
              <ArrowUpRight size={12} />
              Novo Recebimento
            </button>
          </div>

          {/* A pagar hoje */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">A pagar hoje</p>
              <ArrowDownLeft size={14} className="text-red-500" />
            </div>
            {pagamentosHoje > 0 ? (
              <p className="text-xl font-bold text-red-600 tabular-nums">{fmtBRL(pagamentosHoje)}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">Não há pagamentos hoje.</p>
            )}
            {pendingDebitsMonth > 0 && (
              <p className="text-[11px] text-gray-500">Restante do mês: <span className="font-semibold">{fmtBRL(pendingDebitsMonth)}</span></p>
            )}
            <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors">
              <ArrowDownLeft size={12} />
              Novo Pagamento
            </button>
          </div>
        </div>

        {/* Fluxo de Caixa diário (14 dias) */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-700">Fluxo de Caixa diário</h3>
            <span className="text-[10px] text-gray-400">Últimos 14 dias</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradPag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                width={32}
              />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}
                formatter={(v: number) => fmtBRL(v)}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                formatter={(name: string) => name === "recebimentos" ? "Recebimentos" : name === "pagamentos" ? "Pagamentos" : "Saldo"} />
              <Area type="monotone" dataKey="recebimentos" stroke="#10b981" strokeWidth={2} fill="url(#gradRec)" dot={false} />
              <Area type="monotone" dataKey="pagamentos"   stroke="#ef4444" strokeWidth={2} fill="url(#gradPag)" dot={false} />
              <Area type="monotone" dataKey="saldo"        stroke="#3b82f6" strokeWidth={1.5} fill="url(#gradSaldo)" dot={{ r: 3, fill: "#3b82f6" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Em atraso */}
        {(overdueAR > 0 || pendingDebitsMonth > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-red-100 bg-white p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-700">Recebimentos em atraso</p>
                <TrendingUp size={14} className="text-red-400" />
              </div>
              <p className="text-xl font-bold text-emerald-600 tabular-nums">{fmtBRL(overdueAR)}</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-white p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-700">Pagamentos em atraso</p>
                <TrendingDown size={14} className="text-red-400" />
              </div>
              <p className="text-xl font-bold text-red-600 tabular-nums">{fmtBRL(pendingDebitsMonth)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
