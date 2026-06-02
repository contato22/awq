"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar, CartesianGrid, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { BankTransaction } from "@/lib/financial-db";
import {
  ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight,
  FileUp, RefreshCw, TrendingDown, TrendingUp,
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
  openingBalance?: number; // sum of document opening balances (from page SSR)
}

type ViewMode = "diario" | "mensal";

// Conta Azul–style flow chart row
interface FlowRow {
  label: string;
  recebimentos: number;   // positive (credits — green bars going up)
  pagamentos: number;     // negative (debits — red bars going down)
  saldo: number;          // running balance (navy dotted line)
}

interface FlowResult {
  data: FlowRow[];
  totalIn: number;    // total credits (positive)
  totalOut: number;   // total debits (positive)
  net: number;        // totalIn − totalOut
  hasData: boolean;
}

// Entity-level stats for KPI strip
interface DateRange { from: string; to: string }
type EntityKey = "AWQ_Holding" | "JACQES" | "Caza_Vision";
interface CashGenRow {
  label: string;
  AWQ_Holding: number; JACQES: number; Caza_Vision: number;
  total: number; caixa: number;
}
interface EntityStats { revenue: number; expenses: number; net: number }
interface CashGenResult {
  data: CashGenRow[];
  byEntity: Record<EntityKey, EntityStats>;
  totalRevenue: number; totalExpenses: number; totalNet: number; hasData: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Must mirror HOLDING_OPERATIONAL_ENTITIES in lib/dre-query.ts — ENERDY is excluded
const OPERATIONAL_ENTITIES = new Set<string>(["AWQ_Holding", "JACQES", "Caza_Vision"]);

const ENTITY_CFG: { key: EntityKey; label: string; color: string; initials: string; bg: string }[] = [
  { key: "AWQ_Holding", label: "AWQ Holding", color: "#0487D9", initials: "AWQ",  bg: "bg-brand-600"   },
  { key: "JACQES",      label: "JACQES",      color: "#10b981", initials: "JCQ",  bg: "bg-emerald-600" },
  { key: "Caza_Vision", label: "Caza Vision", color: "#8b5cf6", initials: "CAZA", bg: "bg-violet-600"  },
];

const ACCOUNTS_CFG = [
  { key: "AWQ_Holding", name: "Conta PJ AWQ Holding", subtitle: "AWQ Holding",               initials: "AWQ",  bgClass: "bg-brand-600"  },
  { key: "ENERDY",      name: "Cora Enerdy",           subtitle: "Banco Integrado · BU ENRD", initials: "ENRD", bgClass: "bg-violet-600" },
];

const MONTH_NAMES_PT   = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTH_NAMES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtK(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? "-" : ""}R$${(Math.abs(v) / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${v < 0 ? "-" : ""}R$${Math.round(Math.abs(v) / 1000)}k`;
  return `R$${Math.round(v)}`;
}
const BRT = "America/Sao_Paulo";
function today() { return new Date().toLocaleDateString("sv", { timeZone: BRT }); }
function dateAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toLocaleDateString("sv", { timeZone: BRT });
}

function prevMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
}
function nextMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}
function daysInMonthFn(year: number, month: number): number {
  return new Date(year, month, 0).getDate(); // day 0 = last day of prev month
}

function allDataRange(txns: BankTransaction[]): DateRange {
  let earliest = today();
  for (const t of txns) {
    if (!OPERATIONAL_ENTITIES.has(t.entity) || t.excludedFromConsolidated) continue;
    if (t.transactionDate < earliest) earliest = t.transactionDate;
  }
  return { from: earliest, to: today() };
}

function emptyEntityDay(): Record<EntityKey, { rev: number; exp: number }> {
  return { AWQ_Holding: { rev: 0, exp: 0 }, JACQES: { rev: 0, exp: 0 }, Caza_Vision: { rev: 0, exp: 0 } };
}

function addDays(date: string, days: number) {
  return new Date(new Date(date).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

// ─── Build entity KPI data (kept for KPI strip only) ─────────────────────────

function buildCashGen(txns: BankTransaction[], range: DateRange, openingBal = 0): CashGenResult {
  const { from, to } = range;
  const diffDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1;

  let prePeriodNet = 0;
  for (const t of txns) {
    if (!OPERATIONAL_ENTITIES.has(t.entity) || t.excludedFromConsolidated) continue;
    if (t.transactionDate < from) {
      prePeriodNet += t.direction === "credit" ? t.amount : -t.amount;
    }
  }
  const startBal = openingBal + prePeriodNet;

  const dayMap = new Map<string, ReturnType<typeof emptyEntityDay>>();
  for (let i = 0; i < diffDays; i++) dayMap.set(addDays(from, i), emptyEntityDay());

  const byEntity: Record<EntityKey, EntityStats> = {
    AWQ_Holding: { revenue: 0, expenses: 0, net: 0 },
    JACQES:      { revenue: 0, expenses: 0, net: 0 },
    Caza_Vision: { revenue: 0, expenses: 0, net: 0 },
  };

  for (const t of txns) {
    if (!OPERATIONAL_ENTITIES.has(t.entity)) continue;
    if (t.excludedFromConsolidated) continue;
    if (t.transactionDate < from || t.transactionDate > to) continue;
    if (!dayMap.has(t.transactionDate)) continue;
    const ek = t.entity as EntityKey;
    if (!(ek in byEntity)) continue;
    const day = dayMap.get(t.transactionDate)!;
    if (t.direction === "credit") { day[ek].rev += t.amount; byEntity[ek].revenue += t.amount; }
    else { day[ek].exp += t.amount; byEntity[ek].expenses += t.amount; }
  }

  for (const ek of Object.keys(byEntity) as EntityKey[]) {
    byEntity[ek].net = byEntity[ek].revenue - byEntity[ek].expenses;
  }

  // Weekly aggregation when range > 60 days
  type Bucket = { label: string; sums: ReturnType<typeof emptyEntityDay> };
  let buckets: Bucket[];

  if (diffDays > 60) {
    const wkMap = new Map<string, Bucket>();
    for (const [date, sums] of dayMap.entries()) {
      const d = new Date(date);
      const sun = new Date(d);
      sun.setDate(d.getDate() - d.getDay());
      const wk = sun.toISOString().slice(0, 10);
      if (!wkMap.has(wk)) {
        const [, m, dd] = wk.split("-");
        wkMap.set(wk, { label: `${dd}/${m}`, sums: emptyEntityDay() });
      }
      const b = wkMap.get(wk)!;
      for (const ek of ["AWQ_Holding", "JACQES", "Caza_Vision"] as EntityKey[]) {
        b.sums[ek].rev += sums[ek].rev;
        b.sums[ek].exp += sums[ek].exp;
      }
    }
    buckets = Array.from(wkMap.values());
  } else {
    const labelStep = diffDays > 21 ? Math.ceil(diffDays / 8) : 1;
    buckets = Array.from(dayMap.entries()).map(([date, sums], idx) => {
      const [, m, d] = date.split("-");
      return { label: idx % labelStep === 0 || idx === dayMap.size - 1 ? `${d}/${m}` : "", sums };
    });
  }

  let runningTotal = 0;
  const data: CashGenRow[] = buckets.map(({ label, sums }) => {
    const awq  = Math.round(sums.AWQ_Holding.rev - sums.AWQ_Holding.exp);
    const jcq  = Math.round(sums.JACQES.rev - sums.JACQES.exp);
    const caza = Math.round(sums.Caza_Vision.rev - sums.Caza_Vision.exp);
    runningTotal += awq + jcq + caza;
    return { label, AWQ_Holding: awq, JACQES: jcq, Caza_Vision: caza,
             total: Math.round(runningTotal), caixa: Math.round(runningTotal + startBal) };
  });

  const totalRevenue  = Object.values(byEntity).reduce((s, e) => s + e.revenue, 0);
  const totalExpenses = Object.values(byEntity).reduce((s, e) => s + e.expenses, 0);
  return { data, byEntity, totalRevenue, totalExpenses, totalNet: totalRevenue - totalExpenses,
           hasData: totalRevenue + totalExpenses > 0 };
}

// ─── Build Conta Azul–style flow data ────────────────────────────────────────

function buildFlowDaily(txns: BankTransaction[], month: string, openingBal: number): FlowResult {
  const year  = parseInt(month.slice(0, 4));
  const mon   = parseInt(month.slice(5, 7));
  const nDays = daysInMonthFn(year, mon);
  const from  = `${month}-01`;
  const to    = `${month}-${String(nDays).padStart(2, "0")}`;

  // Balance at start of this month
  let prePeriodNet = 0;
  for (const t of txns) {
    if (!OPERATIONAL_ENTITIES.has(t.entity) || t.excludedFromConsolidated) continue;
    if (t.transactionDate < from) {
      prePeriodNet += t.direction === "credit" ? t.amount : -t.amount;
    }
  }
  const startBal = openingBal + prePeriodNet;

  // Day buckets
  const dayMap = new Map<string, { in: number; out: number }>();
  for (let d = 1; d <= nDays; d++) {
    dayMap.set(`${month}-${String(d).padStart(2, "0")}`, { in: 0, out: 0 });
  }

  for (const t of txns) {
    if (!OPERATIONAL_ENTITIES.has(t.entity) || t.excludedFromConsolidated) continue;
    if (t.transactionDate < from || t.transactionDate > to) continue;
    const bucket = dayMap.get(t.transactionDate);
    if (!bucket) continue;
    if (t.direction === "credit") bucket.in  += t.amount;
    else                          bucket.out += t.amount;
  }

  let runningSaldo = startBal;
  let totalIn = 0, totalOut = 0;

  const data: FlowRow[] = Array.from(dayMap.entries()).map(([date, { in: inc, out }]) => {
    runningSaldo += inc - out;
    totalIn  += inc;
    totalOut += out;
    return {
      label: String(parseInt(date.slice(8))),
      recebimentos:  Math.round(inc),
      pagamentos:   -Math.round(out),  // negative → bars go below zero
      saldo:         Math.max(0, Math.round(runningSaldo)),
    };
  });

  return { data, totalIn: Math.round(totalIn), totalOut: Math.round(totalOut),
           net: Math.round(totalIn - totalOut), hasData: totalIn + totalOut > 0 };
}

function buildFlowMonthly(txns: BankTransaction[], openingBal: number): FlowResult {
  const eligible = txns.filter((t) => OPERATIONAL_ENTITIES.has(t.entity) && !t.excludedFromConsolidated);
  if (eligible.length === 0) return { data: [], totalIn: 0, totalOut: 0, net: 0, hasData: false };

  const minMonth = eligible.reduce(
    (min, t) => { const mk = t.transactionDate.slice(0, 7); return mk < min ? mk : min; },
    eligible[0].transactionDate.slice(0, 7)
  );
  const curMonth = today().slice(0, 7);

  const monthMap = new Map<string, { in: number; out: number }>();
  let m = minMonth;
  while (m <= curMonth) {
    monthMap.set(m, { in: 0, out: 0 });
    m = nextMonth(m);
  }

  for (const t of eligible) {
    const mk = t.transactionDate.slice(0, 7);
    const bucket = monthMap.get(mk);
    if (!bucket) continue;
    if (t.direction === "credit") bucket.in  += t.amount;
    else                          bucket.out += t.amount;
  }

  let runningSaldo = openingBal;
  let totalIn = 0, totalOut = 0;

  const data: FlowRow[] = Array.from(monthMap.entries()).map(([mk, { in: inc, out }]) => {
    runningSaldo += inc - out;
    totalIn  += inc;
    totalOut += out;
    const mi = parseInt(mk.slice(5)) - 1;
    const yr = mk.slice(0, 4);
    return {
      label: `${MONTH_NAMES_SHORT[mi]}/${yr.slice(2)}`,
      recebimentos:  Math.round(inc),
      pagamentos:   -Math.round(out),
      saldo:         Math.max(0, Math.round(runningSaldo)),
    };
  });

  return { data, totalIn: Math.round(totalIn), totalOut: Math.round(totalOut),
           net: Math.round(totalIn - totalOut), hasData: totalIn + totalOut > 0 };
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

type FlowTooltipProps = {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
};

function FlowTooltip({ active, payload, label }: FlowTooltipProps) {
  if (!active || !payload?.length) return null;
  const meta: Record<string, { name: string; sub: string; color: string }> = {
    recebimentos: { name: "AR",    sub: "Recebimentos realizados", color: "#16a34a" },
    pagamentos:   { name: "AP",    sub: "Pagamentos realizados",   color: "#dc2626" },
    saldo:        { name: "Saldo", sub: "Posição acumulada",       color: "#1e3a5f" },
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-2xl text-xs min-w-[210px] overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
        <p className="font-bold text-gray-900">Fluxo de caixa · {label}</p>
      </div>
      <div className="p-3 space-y-2">
        {payload.map((p) => {
          const m = meta[p.dataKey] ?? { name: p.dataKey, sub: "", color: "#6b7280" };
          const displayVal = Math.abs(p.value);
          return (
            <div key={p.dataKey} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                <div>
                  <span className="font-bold text-gray-800">{m.name}</span>
                  {m.sub && <span className="text-gray-400 ml-1">{m.sub}</span>}
                </div>
              </div>
              <span className="font-bold tabular-nums" style={{ color: m.color }}>
                {fmtBRL(displayVal)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FinancialOverview({ transactions, arPending, coraConfigured, openingBalance = 0 }: Props) {
  const todayStr = today();

  const [viewMode,  setViewMode]  = useState<ViewMode>("diario");
  const [monthNav,  setMonthNav]  = useState<string>(() => today().slice(0, 7));
  const [hidden,    setHidden]    = useState<Set<string>>(new Set());
  const [accounts,  setAccounts]  = useState<AccountInfo[]>(
    ACCOUNTS_CFG.map((a) => ({ ...a, balance: null, loading: coraConfigured, error: null }))
  );

  const toggle = (key: string) => setHidden((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  // Month-range for entity KPI strip (matches the chart)
  const genRange = useMemo<DateRange>(() => {
    if (viewMode === "mensal") return allDataRange(transactions);
    const year  = parseInt(monthNav.slice(0, 4));
    const mon   = parseInt(monthNav.slice(5));
    const nDays = daysInMonthFn(year, mon);
    return { from: `${monthNav}-01`, to: `${monthNav}-${String(nDays).padStart(2, "0")}` };
  }, [viewMode, monthNav, transactions]);

  const genResult = useMemo(() => buildCashGen(transactions, genRange, openingBalance),
    [transactions, genRange, openingBalance]);

  const flowResult = useMemo(() => {
    if (viewMode === "diario") return buildFlowDaily(transactions, monthNav, openingBalance);
    return buildFlowMonthly(transactions, openingBalance);
  }, [transactions, viewMode, monthNav, openingBalance]);

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

  // Today's AR/AP (from bank transactions)
  const recebimentosHoje = transactions
    .filter((t) => OPERATIONAL_ENTITIES.has(t.entity) && !t.excludedFromConsolidated
      && t.transactionDate === todayStr && t.direction === "credit"
      && t.reconciliationStatus !== "descartado")
    .reduce((s, t) => s + t.amount, 0);

  const pagamentosHoje = transactions
    .filter((t) => OPERATIONAL_ENTITIES.has(t.entity) && !t.excludedFromConsolidated
      && t.transactionDate === todayStr && t.direction === "debit"
      && t.reconciliationStatus !== "descartado")
    .reduce((s, t) => s + t.amount, 0);

  const restanteMesAR = arPending.reduce((s, i) => s + i.net_amount, 0);
  const overdueAR     = arPending.filter((i) => i.due_date < todayStr).reduce((s, i) => s + i.net_amount, 0);

  const pendingDebitsMonth = transactions
    .filter((t) => {
      if (!OPERATIONAL_ENTITIES.has(t.entity) || t.excludedFromConsolidated) return false;
      const [y, m] = t.transactionDate.split("-");
      const now = new Date();
      return parseInt(y) === now.getFullYear() && parseInt(m) === now.getMonth() + 1
        && t.direction === "debit"
        && t.reconciliationStatus !== "conciliado"
        && t.reconciliationStatus !== "descartado";
    })
    .reduce((s, t) => s + t.amount, 0);

  const totalBalance = accounts.filter((a) => a.key !== "ENERDY").reduce((s, a) => s + (a.balance ?? 0), 0);
  const anyLoading   = accounts.some((a) => a.loading);

  const txAccounts = useMemo(() => Array.from(
    new Map(transactions.map((t) => [
      `${t.bank}::${t.accountName}`,
      { bank: t.bank, name: t.accountName, entity: t.entity },
    ])).values()
  ), [transactions]);

  // Only entities with movements in the selected period
  const activeEntities = ENTITY_CFG.filter(
    (e) => genResult.byEntity[e.key].revenue + genResult.byEntity[e.key].expenses > 0
  );

  const netPct = genResult.totalRevenue > 0
    ? ((genResult.totalNet / genResult.totalRevenue) * 100).toFixed(1)
    : null;

  // Best estimate of current total cash balance (all time)
  const allTimeNet = useMemo(() => {
    let net = 0;
    for (const t of transactions) {
      if (!OPERATIONAL_ENTITIES.has(t.entity) || t.excludedFromConsolidated) continue;
      if (t.direction === "credit") net += t.amount;
      else net -= t.amount;
    }
    return net;
  }, [transactions]);

  const caixaTotal = coraConfigured && !anyLoading && totalBalance > 0
    ? totalBalance
    : openingBalance > 0
      ? openingBalance + allTimeNet
      : allTimeNet;
  const caixaLabel = coraConfigured && !anyLoading && totalBalance > 0
    ? "Saldo real (Cora)"
    : openingBalance > 0 ? "Estimado" : "Fluxo acumulado";

  // Chart bar sizing — single stack per x-position so can be wider
  const maxBarSz = viewMode === "diario" ? 18 : 36;

  // Month nav label
  const monthLabel = `${MONTH_NAMES_PT[parseInt(monthNav.slice(5)) - 1]} ${monthNav.slice(0, 4)}`;
  const isCurrentMonth = monthNav >= today().slice(0, 7);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── 1. Fluxo de Caixa (Conta Azul style) ─────────────────────────── */}
      <div className="card overflow-visible">

        {/* Top bar: title + Diário/Mensal toggle + month nav */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Fluxo de Caixa</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Recebimentos e pagamentos realizados · exclui intercompany e aplicações
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Diário / Mensal toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 text-[11px] font-semibold">
              <button
                onClick={() => setViewMode("diario")}
                className={`px-3 py-1.5 transition-colors ${viewMode === "diario" ? "bg-brand-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              >
                Diário
              </button>
              <button
                onClick={() => setViewMode("mensal")}
                className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${viewMode === "mensal" ? "bg-brand-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              >
                Mensal
              </button>
            </div>

            {/* Month navigation — only in Diário mode */}
            {viewMode === "diario" && (
              <div className="flex items-center gap-0.5 text-[11px] font-semibold text-gray-700 border border-gray-200 rounded-lg bg-white overflow-hidden">
                <button
                  onClick={() => setMonthNav(prevMonth(monthNav))}
                  className="px-2 py-1.5 hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-700"
                  title="Mês anterior"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="px-2 py-1.5 min-w-[130px] text-center tabular-nums">{monthLabel}</span>
                <button
                  onClick={() => setMonthNav(nextMonth(monthNav))}
                  disabled={isCurrentMonth}
                  className="px-2 py-1.5 hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Próximo mês"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* KPI strip — Recebimentos / Pagamentos / Saldo líquido / Caixa Total */}
        <div className={`grid divide-x divide-gray-100 border-t border-b border-gray-100 ${
          activeEntities.length === 0 ? "grid-cols-3" :
          activeEntities.length === 1 ? "grid-cols-4" :
          activeEntities.length === 2 ? "grid-cols-5" : "grid-cols-6"
        }`}>
          {/* Entity pills (hidden by default from KPI; can toggle) */}
          {activeEntities.map((e) => {
            const stats = genResult.byEntity[e.key];
            return (
              <button key={e.key} onClick={() => toggle(e.key)}
                title={hidden.has(e.key) ? "Mostrar conta" : "Ocultar conta"}
                className={`px-3 py-3 text-left hover:bg-gray-50 transition-all ${hidden.has(e.key) ? "opacity-35" : ""}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate">{e.label}</span>
                </div>
                <p className={`text-sm font-bold tabular-nums leading-tight ${stats.net >= 0 ? "text-gray-900" : "text-red-600"}`}>
                  {fmtBRL(stats.net)}
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5 tabular-nums">
                  +{fmtK(stats.revenue)} / −{fmtK(stats.expenses)}
                </p>
              </button>
            );
          })}

          {/* AR · Recebimentos KPI */}
          <div className="px-4 py-3 text-left">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">AR · Recebimentos</span>
            </div>
            <p className="text-base font-bold tabular-nums leading-tight text-emerald-700">
              {fmtBRL(flowResult.totalIn)}
            </p>
            <p className="text-[9px] text-gray-400 mt-0.5">
              {viewMode === "diario" ? monthLabel : "Histórico"} · realizado
            </p>
          </div>

          {/* AP · Pagamentos KPI */}
          <div className="px-4 py-3 text-left">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">AP · Pagamentos</span>
            </div>
            <p className="text-base font-bold tabular-nums leading-tight text-red-700">
              {fmtBRL(flowResult.totalOut)}
            </p>
            <p className="text-[9px] text-gray-400 mt-0.5">
              {viewMode === "diario" ? monthLabel : "Histórico"} · realizado
            </p>
          </div>

          {/* Total gerado (net) */}
          <button onClick={() => toggle("total")}
            title={hidden.has("total") ? "Mostrar saldo" : "Ocultar saldo"}
            className={`px-4 py-3 text-left hover:bg-gray-50 transition-all ${hidden.has("total") ? "opacity-35" : ""}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#1e3a5f] shrink-0" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Saldo líquido</span>
              {netPct && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${genResult.totalNet >= 0 ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-600"}`}>
                  {netPct}%
                </span>
              )}
            </div>
            <p className={`text-base font-bold tabular-nums leading-tight ${flowResult.net >= 0 ? "text-[#1e3a5f]" : "text-red-600"}`}>
              {fmtBRL(flowResult.net)}
            </p>
            <p className="text-[9px] text-gray-400 mt-0.5">
              Receb − Pagto
            </p>
          </button>

          {/* Caixa Total */}
          <button onClick={() => toggle("caixa")}
            title={hidden.has("caixa") ? "Mostrar caixa" : "Ocultar caixa"}
            className={`px-4 py-3 text-left hover:bg-amber-50/60 transition-all ${hidden.has("caixa") ? "opacity-35" : ""}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Caixa Total</span>
              {anyLoading && <span className="text-[9px] text-gray-300 animate-pulse">•••</span>}
            </div>
            <p className={`text-base font-bold tabular-nums leading-tight ${caixaTotal >= 0 ? "text-amber-600" : "text-red-600"}`}>
              {fmtBRL(caixaTotal)}
            </p>
            <p className="text-[9px] text-gray-400 mt-0.5">{caixaLabel}</p>
          </button>
        </div>

        {/* Chart — Conta Azul style */}
        <div className="bg-[#fafaf8] rounded-b-xl px-4 pb-5 pt-3">

          {/* Legend at top-right — matches Conta Azul layout */}
          <div className="flex items-center justify-end gap-4 mb-2 text-[10px] font-medium text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#16a34a] opacity-80 shrink-0" />
              AR · Recebimentos
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#dc2626] opacity-75 shrink-0" />
              AP · Pagamentos
            </div>
            <button onClick={() => toggle("total")}
              className={`flex items-center gap-1.5 transition-opacity ${hidden.has("total") ? "opacity-30" : ""}`}>
              <span className="inline-flex items-center gap-0.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]" />
                <span className="w-3 h-px bg-[#1e3a5f]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]" />
              </span>
              Saldo
            </button>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={flowResult.data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              barCategoryGap="30%">
              <CartesianGrid strokeDasharray="" stroke="#ece8df" strokeWidth={0.75} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#b5b0a8" }}
                axisLine={false}
                tickLine={false}
                interval={viewMode === "diario" ? 4 : "preserveStartEnd"}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#b5b0a8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtK}
                width={56}
                domain={[
                  (dataMin: number) => Math.min(0, Math.floor(dataMin / 1000) * 1000),
                  "auto",
                ]}
              />
              <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} />
              <Tooltip content={<FlowTooltip />} cursor={{ fill: "rgba(4,135,217,0.04)" }} />

              {/* AR — green bars going UP from 0 (stackId so same x pos as AP) */}
              <Bar
                dataKey="recebimentos"
                stackId="flow"
                fill="#16a34a"
                fillOpacity={0.82}
                maxBarSize={maxBarSz}
                radius={[2, 2, 0, 0]}
              />

              {/* AP — red bars going DOWN from 0 (negative values, same stackId) */}
              <Bar
                dataKey="pagamentos"
                stackId="flow"
                fill="#dc2626"
                fillOpacity={0.78}
                maxBarSize={maxBarSz}
                radius={[0, 0, 2, 2]}
              />

              {/* Saldo — navy line with small dots (like Conta Azul) */}
              {!hidden.has("total") && (
                <Line
                  type="monotone"
                  dataKey="saldo"
                  stroke="#1e3a5f"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#1e3a5f", stroke: "#fff", strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: "#1e3a5f", stroke: "#fff", strokeWidth: 2 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {!flowResult.hasData && (
            <p className="text-center text-[11px] text-gray-400 -mt-2 mb-1">
              Sem movimentações {viewMode === "diario" ? `em ${monthLabel}` : "no histórico"} ·{" "}
              {viewMode === "diario" && (
                <button onClick={() => setViewMode("mensal")}
                  className="text-brand-500 hover:underline">ver todo o histórico</button>
              )}
            </p>
          )}

          {/* Bottom legend row — entity toggles only */}
          {activeEntities.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 pt-2 border-t border-[#ece8df] text-[10px] font-medium text-gray-500">
              <span className="text-[9px] text-gray-300 uppercase tracking-wide">Por entidade:</span>
              {activeEntities.map((e) => (
                <button key={e.key} onClick={() => toggle(e.key)}
                  className={`flex items-center gap-1.5 transition-opacity ${hidden.has(e.key) ? "opacity-30" : ""}`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                  {e.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Contas + AR/AP ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">

        {/* LEFT: Contas bancárias */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-overline">Contas bancárias</h3>
            {coraConfigured && (
              <button onClick={() => { void loadBalance("AWQ_Holding"); void loadBalance("ENERDY"); }}
                className="text-gray-300 hover:text-gray-500 transition-colors" title="Atualizar saldos">
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
              const cfg = ENTITY_CFG.find((e) => e.key === acc.entity);
              const initials = acc.entity === "ENERDY" ? "ENRD" : (cfg?.initials ?? "AWQ");
              const bg = acc.entity === "ENERDY" ? "bg-violet-600" : (cfg?.bg ?? "bg-brand-600");
              const label = (acc.name ?? acc.bank ?? "").replace(/^Conta\s+PJ\s+/i, "").trim();
              const entityNet = acc.entity in genResult.byEntity
                ? genResult.byEntity[acc.entity as EntityKey].net
                : null;
              return (
                <div key={`${acc.bank}::${acc.name}`} className="rounded-xl border border-gray-100 p-3 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center text-[10px] font-bold text-white tracking-wide shrink-0`}>
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-gray-900 truncate">{label}</div>
                      <div className="text-[10px] text-gray-400">{acc.bank}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {coraAcc && !coraAcc.loading && coraAcc.balance !== null && (
                        <div className="text-sm font-bold text-gray-900 tabular-nums">{fmtBRL(coraAcc.balance)}</div>
                      )}
                      {coraAcc?.loading && <div className="text-[10px] text-gray-300 animate-pulse">…</div>}
                      {entityNet !== null && (
                        <div className={`text-[10px] font-semibold tabular-nums ${entityNet >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {entityNet >= 0 ? "+" : ""}{fmtK(entityNet)} gerado
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                    <FileUp size={11} /> Importe seu extrato
                  </button>
                </div>
              );
            })}
          </div>

          {coraConfigured && !anyLoading && totalBalance > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Saldo total</span>
              <span className="text-sm font-bold text-gray-900 tabular-nums">{fmtBRL(totalBalance)}</span>
            </div>
          )}
        </div>

        {/* RIGHT: AR/AP + Em atraso */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-overline">A receber hoje</p>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <ArrowUpRight size={9} /> Entrada
                </span>
              </div>
              {recebimentosHoje > 0 ? (
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">{fmtBRL(recebimentosHoje)}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Sem recebimentos hoje</p>
              )}
              {restanteMesAR > 0 && (
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Restante do mês: <span className="font-semibold text-gray-600">{fmtBRL(restanteMesAR)}</span>
                </p>
              )}
              <button className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-semibold transition-all">
                <ArrowUpRight size={11} /> Novo Recebimento
              </button>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-overline">A pagar hoje</p>
                <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                  <ArrowDownLeft size={9} /> Saída
                </span>
              </div>
              {pagamentosHoje > 0 ? (
                <p className="text-2xl font-bold text-red-600 tabular-nums">{fmtBRL(pagamentosHoje)}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Contas em dia</p>
              )}
              {pendingDebitsMonth > 0 && (
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Restante do mês: <span className="font-semibold text-gray-600">{fmtBRL(pendingDebitsMonth)}</span>
                </p>
              )}
              <button className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-[11px] font-semibold transition-all">
                <ArrowDownLeft size={11} /> Novo Pagamento
              </button>
            </div>
          </div>

          {(overdueAR > 0 || pendingDebitsMonth > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {overdueAR > 0 && (
                <div className="card p-4 flex items-center justify-between border-l-4 border-l-amber-400">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-1">Em atraso · AR</p>
                    <p className="text-lg font-bold text-emerald-700 tabular-nums">{fmtBRL(overdueAR)}</p>
                  </div>
                  <TrendingUp size={20} className="text-amber-400 shrink-0" />
                </div>
              )}
              {pendingDebitsMonth > 0 && (
                <div className="card p-4 flex items-center justify-between border-l-4 border-l-red-400">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-red-500 mb-1">Em atraso · AP</p>
                    <p className="text-lg font-bold text-red-700 tabular-nums">{fmtBRL(pendingDebitsMonth)}</p>
                  </div>
                  <TrendingDown size={20} className="text-red-400 shrink-0" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
