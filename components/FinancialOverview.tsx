"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import type { BankTransaction } from "@/lib/financial-db";
import {
  ArrowDownLeft, ArrowUpRight, FileUp, RefreshCw,
  TrendingDown, TrendingUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoraBalance { available: number; blocked: number | null; error?: string }

interface AccountInfo {
  key: string; name: string; subtitle: string;
  initials: string; bgClass: string;
  balance: number | null; loading: boolean; error: string | null;
}

interface ARItem {
  id: string; customer_name: string; net_amount: number; due_date: string;
}

interface Props {
  transactions: BankTransaction[];
  arPending: ARItem[];
  coraConfigured: boolean;
}

type Period = "14d" | "30d" | "3m";

interface FlowRow { label: string; cd: number; ci: number; saldo: number }
interface FlowResult { data: FlowRow[]; totCD: number; totCI: number; saldoFinal: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtK(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${Math.round(v / 1000)}k`;
  return String(Math.round(v));
}

function today() { return new Date().toISOString().slice(0, 10); }

function dateAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function buildFlow(txns: BankTransaction[], period: Period): FlowResult {
  const totalDays = period === "14d" ? 14 : period === "30d" ? 30 : 90;
  const since = dateAgo(totalDays - 1);

  const dayMap = new Map<string, { cd: number; ci: number }>();
  for (let i = totalDays - 1; i >= 0; i--) dayMap.set(dateAgo(i), { cd: 0, ci: 0 });

  let totCD = 0, totCI = 0;
  for (const t of txns) {
    if (t.transactionDate < since || !dayMap.has(t.transactionDate)) continue;
    const row = dayMap.get(t.transactionDate)!;
    if (t.direction === "credit") { row.cd += t.amount; totCD += t.amount; }
    else                          { row.ci += t.amount; totCI += t.amount; }
  }

  // 3m → aggregate by ISO week for a cleaner chart
  if (period === "3m") {
    const wkMap = new Map<string, { cd: number; ci: number }>();
    for (const [date, v] of dayMap.entries()) {
      const d = new Date(date);
      const sun = new Date(d);
      sun.setDate(d.getDate() - d.getDay());
      const key = sun.toISOString().slice(0, 10);
      if (!wkMap.has(key)) wkMap.set(key, { cd: 0, ci: 0 });
      const w = wkMap.get(key)!;
      w.cd += v.cd; w.ci += v.ci;
    }
    let running = 0;
    const data: FlowRow[] = Array.from(wkMap.entries()).map(([key, w]) => {
      running += w.cd - w.ci;
      const [, m, d] = key.split("-");
      return { label: `${d}/${m}`, cd: Math.round(w.cd), ci: Math.round(w.ci), saldo: Math.round(running) };
    });
    return { data, totCD, totCI, saldoFinal: running };
  }

  // Daily — for 30d skip intermediate labels to avoid crowding
  const step = period === "30d" ? 5 : 1;
  let running = 0;
  const data: FlowRow[] = Array.from(dayMap.entries()).map(([date, v], idx) => {
    running += v.cd - v.ci;
    const [, m, d] = date.split("-");
    return {
      label: idx % step === 0 || idx === dayMap.size - 1 ? `${d}/${m}` : "",
      cd:    Math.round(v.cd),
      ci:    Math.round(v.ci),
      saldo: Math.round(running),
    };
  });
  return { data, totCD, totCI, saldoFinal: running };
}

const ACCOUNTS_CFG = [
  { key: "AWQ_Holding", name: "Conta PJ AWQ Holding", subtitle: "AWQ Holding", initials: "AWQ", bgClass: "bg-brand-600" },
  { key: "ENERDY",      name: "Cora Enerdy",           subtitle: "BU ENRD",     initials: "ENRD", bgClass: "bg-violet-600" },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: "14d", label: "14 dias" },
  { key: "30d", label: "30 dias" },
  { key: "3m",  label: "3 meses" },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const lookup: Record<string, { name: string; color: string }> = {
    cd:    { name: "Créditos (CD)", color: "#10b981" },
    ci:    { name: "Débitos (CI)",  color: "#ef4444" },
    saldo: { name: "Saldo",         color: "#3b82f6" },
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg text-xs min-w-[176px]">
      <p className="font-bold text-gray-700 border-b border-gray-100 pb-1.5 mb-1.5">{label}</p>
      {(payload as { dataKey: string; value: number }[]).map((p) => {
        const meta = lookup[p.dataKey] ?? { name: p.dataKey, color: "#6b7280" };
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
              <span className="text-gray-500">{meta.name}</span>
            </div>
            <span className="font-semibold tabular-nums text-gray-800">{fmtBRL(p.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FinancialOverview({ transactions, arPending, coraConfigured }: Props) {
  const todayStr = today();

  const [period, setPeriod]       = useState<Period>("14d");
  const [hidden, setHidden]       = useState<Set<string>>(new Set());
  const [accounts, setAccounts]   = useState<AccountInfo[]>(
    ACCOUNTS_CFG.map((a) => ({ ...a, balance: null, loading: coraConfigured, error: null }))
  );

  const loadBalance = useCallback(async (key: string) => {
    try {
      const res  = await fetch(`/api/cora/balance?account=${key}`);
      const data = await res.json() as CoraBalance & { error?: string };
      setAccounts((prev) => prev.map((a) =>
        a.key === key ? { ...a, loading: false, balance: res.ok ? data.available : null, error: data.error ?? null } : a
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

  // AR / AP summaries
  const recebimentosHoje = transactions
    .filter((t) => t.transactionDate === todayStr && t.direction === "credit" && t.reconciliationStatus !== "descartado")
    .reduce((s, t) => s + t.amount, 0);
  const pagamentosHoje = transactions
    .filter((t) => t.transactionDate === todayStr && t.direction === "debit" && t.reconciliationStatus !== "descartado")
    .reduce((s, t) => s + t.amount, 0);
  const restanteMesAR     = arPending.reduce((s, i) => s + i.net_amount, 0);
  const overdueAR         = arPending.filter((i) => i.due_date < todayStr).reduce((s, i) => s + i.net_amount, 0);
  const pendingDebitsMonth = transactions
    .filter((t) => {
      const [y, m] = t.transactionDate.split("-");
      const now = new Date();
      return parseInt(y) === now.getFullYear() && parseInt(m) === now.getMonth() + 1
        && t.direction === "debit"
        && t.reconciliationStatus !== "conciliado"
        && t.reconciliationStatus !== "descartado";
    })
    .reduce((s, t) => s + t.amount, 0);

  const totalBalance = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const anyLoading   = accounts.some((a) => a.loading);

  const { data: flowData, totCD, totCI, saldoFinal } = useMemo(
    () => buildFlow(transactions, period),
    [transactions, period]
  );

  const txAccounts = useMemo(() => Array.from(
    new Map(transactions.map((t) => [
      `${t.bank}::${t.accountName}`,
      { bank: t.bank, name: t.accountName, entity: t.entity },
    ])).values()
  ), [transactions]);

  const netVariation = totCD - totCI;
  const netPct = totCI > 0 ? ((netVariation / totCI) * 100).toFixed(1) : null;

  const toggle = (key: string) => setHidden((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── 1. Fluxo de Caixa diário — full width, first ──────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Fluxo de Caixa diário</h3>
          <span className="text-xs text-gray-400">Últimos 14 dias</span>
        </div>
      </div>

      {/* ── 2. Contas + AR/AP ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">

        {/* LEFT: Contas bancárias */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Contas bancárias</h3>
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
              <p className="text-xs text-gray-400 italic">Nenhuma conta encontrada.</p>
            )}
            {txAccounts.map((acc) => {
              const coraAcc = accounts.find((a) => a.key === acc.entity);
              const initials =
                acc.entity === "ENERDY" ? "ENRD" :
                acc.entity === "JACQES" ? "JCQ"  : "AWQ";
              const bg =
                acc.entity === "ENERDY" ? "bg-violet-600" :
                acc.entity === "JACQES" ? "bg-emerald-600" : "bg-brand-600";
              const label = (acc.name ?? acc.bank ?? "").replace(/^Conta\s+PJ\s+/i, "").trim();
              return (
                <div key={`${acc.bank}::${acc.name}`} className="rounded-lg border border-gray-100 p-3 space-y-2 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center text-xs font-bold text-white tracking-wide shrink-0`}>
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-gray-900 truncate">{label}</div>
                      <div className="text-xs text-gray-400">{acc.bank}</div>
                    </div>
                    {coraAcc && !coraAcc.loading && coraAcc.balance !== null && (
                      <span className="text-sm font-bold text-gray-900 tabular-nums shrink-0">
                        {fmtBRL(coraAcc.balance)}
                      </span>
                    )}
                    {coraAcc?.loading && (
                      <span className="text-[10px] text-gray-400 animate-pulse shrink-0">…</span>
                    )}
                  </div>
                  <button className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                    <FileUp size={11} />
                    Importe seu extrato
                  </button>
                  {coraAcc && (
                    <div className="flex justify-end">
                      {coraAcc.loading ? (
                        <span className="text-xs text-gray-400 animate-pulse">Carregando…</span>
                      ) : coraAcc.error ? (
                        <span className="text-xs text-gray-400 italic">Saldo indisponível</span>
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

          {coraConfigured && !anyLoading && totalBalance > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-600">Saldo total</span>
              <span className="text-sm font-bold text-gray-900 tabular-nums">{fmtBRL(totalBalance)}</span>
            </div>
          )}
        </div>

        {/* RIGHT: AR/AP + Em atraso */}
        <div className="space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* A receber hoje */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">A receber hoje</p>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <ArrowUpRight size={10} /> CD
                </span>
              </div>
              {recebimentosHoje > 0 ? (
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">{fmtBRL(recebimentosHoje)}</p>
              ) : (
                <p className="text-sm text-gray-400 italic pt-1">Sem recebimentos hoje</p>
              )}
              {restanteMesAR > 0 && (
                <p className="text-xs text-gray-500">Restante do mês: <span className="font-semibold">{fmtBRL(restanteMesAR)}</span></p>
              )}
              <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors">
                <ArrowUpRight size={12} /> Novo Recebimento
              </button>
            </div>

            {/* A pagar hoje */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">A pagar hoje</p>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  <ArrowDownLeft size={10} /> CI
                </span>
              </div>
              {pagamentosHoje > 0 ? (
                <p className="text-2xl font-bold text-red-600 tabular-nums">{fmtBRL(pagamentosHoje)}</p>
              ) : (
                <p className="text-sm text-gray-400 italic pt-1">Contas em dia</p>
              )}
              {pendingDebitsMonth > 0 && (
                <p className="text-xs text-gray-500">Restante do mês: <span className="font-semibold">{fmtBRL(pendingDebitsMonth)}</span></p>
              )}
              <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors">
                <ArrowDownLeft size={12} /> Novo Pagamento
              </button>
            </div>
          </div>

          {/* Em atraso */}
          {(overdueAR > 0 || pendingDebitsMonth > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {overdueAR > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-600">Recebimentos em atraso</p>
                    <p className="text-lg font-bold text-emerald-700 tabular-nums mt-0.5">{fmtBRL(overdueAR)}</p>
                  </div>
                  <TrendingUp size={20} className="text-red-400 shrink-0" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">{fmtBRL(overdueAR)}</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-white p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-700">Pagamentos em atraso</p>
                  <TrendingDown size={14} className="text-red-400" />
                </div>
                <p className="text-2xl font-bold text-red-600 tabular-nums">{fmtBRL(pendingDebitsMonth)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
