"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar, CartesianGrid, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { BankTransaction } from "@/lib/financial-db";
import {
  ArrowDownLeft, ArrowUpRight, Calendar, ChevronDown,
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

type Period = "all" | "1d" | "7d" | "14d" | "30d" | "3m" | "6m" | "1y" | "custom";
interface DateRange { from: string; to: string }

type EntityKey = "AWQ_Holding" | "JACQES" | "Caza_Vision";

interface CashGenRow {
  label: string;
  AWQ_Holding: number;
  JACQES: number;
  Caza_Vision: number;
  total: number;  // cumulative net generated (starts at 0)
  caixa: number;  // total + opening balance = approximate account balance
}

interface EntityStats { revenue: number; expenses: number; net: number }

interface CashGenResult {
  data: CashGenRow[];
  byEntity: Record<EntityKey, EntityStats>;
  totalRevenue: number;
  totalExpenses: number;
  totalNet: number;
  hasData: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Must mirror HOLDING_OPERATIONAL_ENTITIES in lib/dre-query.ts — ENERDY is excluded
const OPERATIONAL_ENTITIES = new Set<string>(["AWQ_Holding", "JACQES", "Caza_Vision"]);

// Mirrors REVENUE_CATS / OPERATIONAL_EXPENSE_CATS in lib/financial-query.ts
// Cannot import that file in client components (uses Node fs). Keep in sync manually.
const REVENUE_CATS = new Set([
  "receita_recorrente", "receita_projeto", "receita_consultoria",
  "receita_producao", "receita_social_media", "receita_revenue_share",
  "receita_fee_venture", "receita_eventual", "rendimento_financeiro",
  "ajuste_bancario_credito",
]);
const OPERATIONAL_EXPENSE_CATS = new Set([
  "fornecedor_operacional", "freelancer_terceiro", "folha_remuneracao",
  "prolabore_retirada", "imposto_tributo", "juros_multa_iof",
  "tarifa_bancaria", "software_assinatura", "marketing_midia",
  "deslocamento_combustivel", "alimentacao_representacao", "viagem_hospedagem",
  "aluguel_locacao", "energia_agua_internet", "servicos_contabeis_juridicos",
  "cartao_compra_operacional", "despesa_pessoal_misturada", "despesa_ambigua",
]);

const ENTITY_CFG: { key: EntityKey; label: string; color: string; initials: string; bg: string }[] = [
  { key: "AWQ_Holding", label: "AWQ Holding", color: "#0487D9", initials: "AWQ",  bg: "bg-brand-600"   },
  { key: "JACQES",      label: "JACQES",      color: "#10b981", initials: "JCQ",  bg: "bg-emerald-600" },
  { key: "Caza_Vision", label: "Caza Vision", color: "#8b5cf6", initials: "CAZA", bg: "bg-violet-600"  },
];

const ACCOUNTS_CFG = [
  { key: "AWQ_Holding", name: "Conta PJ AWQ Holding", subtitle: "AWQ Holding",               initials: "AWQ",  bgClass: "bg-brand-600"  },
  { key: "ENERDY",      name: "Cora Enerdy",           subtitle: "Banco Integrado · BU ENRD", initials: "ENRD", bgClass: "bg-violet-600" },
];

const PERIOD_OPTS: { key: Period; label: string; sub: string }[] = [
  { key: "all",    label: "Tudo",      sub: "Todo período"     },
  { key: "1d",     label: "Hoje",      sub: "Dia atual"        },
  { key: "7d",     label: "7 dias",    sub: "Esta semana"      },
  { key: "14d",    label: "14 dias",   sub: "2 semanas"        },
  { key: "30d",    label: "30 dias",   sub: "Último mês"       },
  { key: "3m",     label: "3 meses",   sub: "Trimestre"        },
  { key: "6m",     label: "6 meses",   sub: "Semestre"         },
  { key: "1y",     label: "1 ano",     sub: "Anual"            },
  { key: "custom", label: "Período personalizado", sub: "" },
];

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

function today() { return new Date().toISOString().slice(0, 10); }

function dateAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  return new Date(new Date(date).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

function periodToRange(period: Exclude<Period, "all" | "custom">): DateRange {
  const daysMap: Record<Exclude<Period, "all" | "custom">, number> = {
    "1d": 1, "7d": 7, "14d": 14, "30d": 30, "3m": 90, "6m": 180, "1y": 365,
  };
  return { from: dateAgo(daysMap[period] - 1), to: today() };
}

// Full data range — from earliest eligible transaction to today
function allDataRange(txns: BankTransaction[]): DateRange {
  let earliest = today();
  for (const t of txns) {
    if (!OPERATIONAL_ENTITIES.has(t.entity) || t.excludedFromConsolidated) continue;
    if (t.transactionDate < earliest) earliest = t.transactionDate;
  }
  return { from: earliest, to: today() };
}

function emptyDay(): Record<EntityKey, { rev: number; exp: number }> {
  return { AWQ_Holding: { rev: 0, exp: 0 }, JACQES: { rev: 0, exp: 0 }, Caza_Vision: { rev: 0, exp: 0 } };
}

// Cash generation per entity — all bank credits vs debits (excludedFromConsolidated removed)
// Matches account balance: CD = all inflows, CI = all outflows, net ≈ account balance change
function buildCashGen(txns: BankTransaction[], range: DateRange, openingBal = 0): CashGenResult {
  const { from, to } = range;
  const diffDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1;

  const dayMap = new Map<string, ReturnType<typeof emptyDay>>();
  for (let i = 0; i < diffDays; i++) dayMap.set(addDays(from, i), emptyDay());

  const byEntity: Record<EntityKey, EntityStats> = {
    AWQ_Holding: { revenue: 0, expenses: 0, net: 0 },
    JACQES:      { revenue: 0, expenses: 0, net: 0 },
    Caza_Vision: { revenue: 0, expenses: 0, net: 0 },
  };

  for (const t of txns) {
    if (!OPERATIONAL_ENTITIES.has(t.entity)) continue;
    if (t.excludedFromConsolidated) continue;        // skip intercompany / investments
    if (t.transactionDate < from || t.transactionDate > to) continue;
    if (!dayMap.has(t.transactionDate)) continue;

    const ek = t.entity as EntityKey;
    if (!(ek in byEntity)) continue;

    const day = dayMap.get(t.transactionDate)!;

    // All bank credits = entradas, all bank debits = saídas (matches Cora/account balance)
    if (t.direction === "credit") {
      day[ek].rev += t.amount;
      byEntity[ek].revenue += t.amount;
    } else {
      day[ek].exp += t.amount;
      byEntity[ek].expenses += t.amount;
    }
  }

  for (const ek of Object.keys(byEntity) as EntityKey[]) {
    byEntity[ek].net = byEntity[ek].revenue - byEntity[ek].expenses;
  }

  // Weekly aggregation when range > 60 days
  type Bucket = { label: string; sums: ReturnType<typeof emptyDay> };
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
        wkMap.set(wk, { label: `${dd}/${m}`, sums: emptyDay() });
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
    return {
      label,
      AWQ_Holding: awq, JACQES: jcq, Caza_Vision: caza,
      total: Math.round(runningTotal),
      caixa: Math.round(runningTotal + openingBal),
    };
  });

  const totalRevenue  = Object.values(byEntity).reduce((s, e) => s + e.revenue, 0);
  const totalExpenses = Object.values(byEntity).reduce((s, e) => s + e.expenses, 0);
  return {
    data, byEntity, totalRevenue, totalExpenses,
    totalNet: totalRevenue - totalExpenses,
    hasData: totalRevenue + totalExpenses > 0,
  };
}

function bestPeriod(_txns: BankTransaction[]): Exclude<Period, "custom"> {
  // Always default to full data range so the chart matches account totals
  return "all";
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const TOOLTIP_META: Record<string, { name: string; color: string }> = {
  AWQ_Holding: { name: "AWQ Holding",       color: "#0487D9" },
  JACQES:      { name: "JACQES",            color: "#10b981" },
  Caza_Vision: { name: "Caza Vision",       color: "#8b5cf6" },
  total:       { name: "Total gerado",      color: "#023373" },
  caixa:       { name: "Caixa (saldo est.)", color: "#d97706" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CashGenTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-brand-200 bg-white shadow-2xl text-xs min-w-[200px] overflow-hidden">
      <div className="bg-brand-50 px-3 py-2 border-b border-brand-100">
        <p className="font-bold text-brand-900">Geração de caixa · {label}</p>
      </div>
      <div className="p-3 space-y-1.5">
        {(payload as { dataKey: string; value: number }[]).map((p) => {
          const m = TOOLTIP_META[p.dataKey] ?? { name: p.dataKey, color: "#6b7280" };
          return (
            <div key={p.dataKey} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                <span className="text-gray-500">{m.name}</span>
              </div>
              <span className={`font-bold tabular-nums ${p.value >= 0 ? "" : "text-red-600"}`}
                style={{ color: p.value >= 0 ? m.color : undefined }}>
                {fmtBRL(p.value)}
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

  const [period, setPeriod] = useState<Period>("1d");
  const [range,  setRange]  = useState<DateRange>(() => periodToRange("1d"));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [showDrop,   setShowDrop]   = useState(false);
  const [hidden,     setHidden]     = useState<Set<string>>(new Set());
  const [accounts,   setAccounts]   = useState<AccountInfo[]>(
    ACCOUNTS_CFG.map((a) => ({ ...a, balance: null, loading: coraConfigured, error: null }))
  );
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (period === "all") setRange(allDataRange(transactions));
  }, [transactions, period]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectPeriod = (p: Period) => {
    if (p === "custom") return;
    setPeriod(p);
    setRange(p === "all" ? allDataRange(transactions) : periodToRange(p as Exclude<Period, "all" | "custom">));
    setShowDrop(false);
  };

  const applyCustom = () => {
    if (!customFrom || !customTo || customFrom > customTo) return;
    setPeriod("custom");
    setRange({ from: customFrom, to: customTo });
    setShowDrop(false);
  };

  const periodLabel = period === "custom" || period === "all"
    ? (() => { const [, fm, fd] = range.from.split("-"); const [, tm, td] = range.to.split("-"); return `${fd}/${fm} — ${td}/${tm}`; })()
    : (PERIOD_OPTS.find(p => p.key === period)?.label ?? period);

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

  // AR / AP summary
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

  const totalBalance = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const anyLoading   = accounts.some((a) => a.loading);

  const genResult = useMemo(() => buildCashGen(transactions, range, openingBalance), [transactions, range, openingBalance]);

  const txAccounts = useMemo(() => Array.from(
    new Map(transactions.map((t) => [
      `${t.bank}::${t.accountName}`,
      { bank: t.bank, name: t.accountName, entity: t.entity },
    ])).values()
  ), [transactions]);

  const toggle = (key: string) => setHidden((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  // Only show entities that have movements in this period
  const activeEntities = ENTITY_CFG.filter(
    (e) => genResult.byEntity[e.key].revenue + genResult.byEntity[e.key].expenses > 0
  );

  const netPct = genResult.totalRevenue > 0
    ? ((genResult.totalNet / genResult.totalRevenue) * 100).toFixed(1)
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── 1. Geração de Caixa ───────────────────────────────────────────── */}
      <div className="card overflow-visible">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Geração de Caixa · Por Conta</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Entradas − Saídas bancárias · exclui transferências intercompany e aplicações financeiras</p>
          </div>

          {/* Period dropdown */}
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setShowDrop((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[12px] font-semibold shadow-sm transition-all ${
                showDrop ? "border-brand-300 bg-brand-50 text-brand-800" : "border-gray-200 bg-white text-gray-700 hover:border-brand-200"
              }`}
            >
              <Calendar size={13} className="text-brand-500 shrink-0" />
              {periodLabel}
              <ChevronDown size={11} className={`text-gray-400 transition-transform duration-200 ${showDrop ? "rotate-180" : ""}`} />
            </button>

            {showDrop && (
              <div className="absolute top-[calc(100%+6px)] right-0 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                <div className="p-2">
                  <p className="text-overline px-2 py-1.5">Períodos rápidos</p>
                  <div className="grid grid-cols-3 gap-1">
                    {PERIOD_OPTS.filter((p) => p.key !== "custom").map((p) => (
                      <button
                        key={p.key}
                        onClick={() => selectPeriod(p.key)}
                        className={`flex flex-col items-start px-3 py-2 rounded-lg text-left transition-colors ${
                          period === p.key && period !== "custom"
                            ? "bg-brand-50 text-brand-800"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span className="text-[11px] font-bold">{p.label}</span>
                        <span className="text-[9px] text-gray-400">{p.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-100 bg-gray-50/60 p-3 space-y-2.5">
                  <p className="text-overline">Período personalizado</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 font-medium">De</label>
                      <input type="date" value={customFrom} max={customTo || todayStr}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-full text-[11px] border border-gray-200 rounded-lg px-2.5 py-2 focus:border-brand-400 focus:outline-none bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 font-medium">Até</label>
                      <input type="date" value={customTo} min={customFrom} max={todayStr}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="w-full text-[11px] border border-gray-200 rounded-lg px-2.5 py-2 focus:border-brand-400 focus:outline-none bg-white" />
                    </div>
                  </div>
                  <button onClick={applyCustom} disabled={!customFrom || !customTo || customFrom > customTo}
                    className="w-full py-2 text-[11px] font-bold bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-lg transition-colors">
                    Aplicar período
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KPI row — one per active entity + total */}
        <div className={`grid divide-x divide-gray-100 border-t border-b border-gray-100 ${
          activeEntities.length === 0 ? "grid-cols-1" :
          activeEntities.length === 1 ? "grid-cols-2" :
          activeEntities.length === 2 ? "grid-cols-3" : "grid-cols-4"
        }`}>
          {activeEntities.map((e) => {
            const stats = genResult.byEntity[e.key];
            return (
              <button key={e.key} onClick={() => toggle(e.key)}
                title={hidden.has(e.key) ? "Mostrar conta" : "Ocultar conta"}
                className={`px-4 py-3 text-left hover:bg-gray-50 transition-all ${hidden.has(e.key) ? "opacity-35" : ""}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate">{e.label}</span>
                </div>
                <p className={`text-base font-bold tabular-nums leading-tight ${stats.net >= 0 ? "text-gray-900" : "text-red-600"}`}>
                  {fmtBRL(stats.net)}
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5 tabular-nums">
                  +{fmtK(stats.revenue)} / −{fmtK(stats.expenses)}
                </p>
              </button>
            );
          })}
          {/* Total */}
          <button onClick={() => toggle("total")}
            title={hidden.has("total") ? "Mostrar total" : "Ocultar total"}
            className={`px-4 py-3 text-left hover:bg-gray-50 transition-all ${hidden.has("total") ? "opacity-35" : ""}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full shrink-0 bg-[#023373]" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total</span>
              {netPct && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${genResult.totalNet >= 0 ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-600"}`}>
                  {netPct}% margem
                </span>
              )}
            </div>
            <p className={`text-base font-bold tabular-nums leading-tight ${genResult.totalNet >= 0 ? "text-[#023373]" : "text-red-600"}`}>
              {fmtBRL(genResult.totalNet)}
            </p>
            <p className="text-[9px] text-gray-400 mt-0.5 tabular-nums">
              +{fmtK(genResult.totalRevenue)} / −{fmtK(genResult.totalExpenses)}
            </p>
          </button>
        </div>

        {/* Chart — stacked bars per entity + running total line */}
        <div className="bg-[#fafaf8] rounded-b-xl px-4 pb-5 pt-4">
          {!genResult.hasData ? (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2">
              <Calendar size={24} className="text-gray-300" />
              <p className="text-sm font-medium text-gray-400">Sem movimentações no período</p>
              {period !== "all" && (
                <button onClick={() => { setPeriod("all"); setRange(allDataRange(transactions)); }}
                  className="text-xs font-semibold text-brand-600 underline">
                  Ver todo o período
                </button>
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={genResult.data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="" stroke="#ece8df" strokeWidth={0.75} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#b5b0a8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#b5b0a8" }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={56} />
                <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} />
                <Tooltip content={<CashGenTooltip />} cursor={{ fill: "rgba(4,135,217,0.05)" }} />

                {/* Stacked bars — net cash per entity */}
                {ENTITY_CFG.map((e) =>
                  !hidden.has(e.key) ? (
                    <Bar key={e.key} dataKey={e.key} stackId="gen"
                      fill={e.color} fillOpacity={0.82} maxBarSize={32} />
                  ) : null
                )}

                {/* Total gerado — cumulative net from 0 */}
                {!hidden.has("total") && (
                  <Line type="monotone" dataKey="total" stroke="#023373" strokeWidth={2}
                    dot={false} activeDot={{ r: 4, fill: "#023373", stroke: "#fff", strokeWidth: 2 }} />
                )}
                {/* Caixa — total gerado + saldo de abertura = posição real em conta */}
                {!hidden.has("caixa") && openingBalance > 0 && (
                  <Line type="monotone" dataKey="caixa" stroke="#d97706" strokeWidth={2.5}
                    strokeDasharray="6 3"
                    dot={false} activeDot={{ r: 4, fill: "#d97706", stroke: "#fff", strokeWidth: 2 }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          {genResult.hasData && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-[#ece8df]">
              {activeEntities.map((e) => (
                <button key={e.key} onClick={() => toggle(e.key)}
                  className={`flex items-center gap-1.5 text-[10px] font-medium transition-opacity ${hidden.has(e.key) ? "opacity-30" : "text-gray-600"}`}>
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: e.color }} />
                  {e.label}
                </button>
              ))}
              <button onClick={() => toggle("total")}
                className={`flex items-center gap-1.5 text-[10px] font-medium transition-opacity ${hidden.has("total") ? "opacity-30" : "text-gray-600"}`}>
                <span className="w-8 h-0.5 rounded bg-[#023373] shrink-0" />
                Total gerado
              </button>
              {openingBalance > 0 && (
                <button onClick={() => toggle("caixa")}
                  className={`flex items-center gap-1.5 text-[10px] font-medium transition-opacity ${hidden.has("caixa") ? "opacity-30" : "text-gray-600"}`}>
                  <span className="w-8 h-0 border-t-2 border-dashed border-amber-500 shrink-0" />
                  Caixa
                </button>
              )}
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
              // Net cash generated by this entity in the selected period
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
