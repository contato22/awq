"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
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
}

type Period = "7d" | "14d" | "30d" | "3m" | "6m" | "1y" | "custom";
interface DateRange { from: string; to: string }
interface FlowRow   { label: string; cd: number; ci: number; saldo: number }
interface FlowResult {
  data: FlowRow[]; totCD: number; totCI: number;
  saldoFinal: number; hasData: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtK(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `R$${Math.round(v / 1000)}k`;
  return `R$${Math.round(v)}`;
}

function today() { return new Date().toISOString().slice(0, 10); }

function dateAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  return new Date(new Date(date).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

function periodToRange(period: Exclude<Period, "custom">): DateRange {
  const daysMap: Record<Exclude<Period, "custom">, number> = {
    "7d": 7, "14d": 14, "30d": 30, "3m": 90, "6m": 180, "1y": 365,
  };
  return { from: dateAgo(daysMap[period] - 1), to: today() };
}

// Excludes internal transfers, investments, card reserves — same logic as DRE/DFC
function buildFlowRange(txns: BankTransaction[], range: DateRange): FlowResult {
  const { from, to } = range;

  const diffDays =
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1;

  // Build day map
  const dayMap = new Map<string, { cd: number; ci: number }>();
  for (let i = 0; i < diffDays; i++) {
    dayMap.set(addDays(from, i), { cd: 0, ci: 0 });
  }

  let totCD = 0, totCI = 0;
  for (const t of txns) {
    // Same exclusion rule as DRE/DFC — skip intercompany/investment/card-reserve
    if (t.excludedFromConsolidated) continue;
    if (t.transactionDate < from || t.transactionDate > to) continue;
    if (!dayMap.has(t.transactionDate)) continue;
    const row = dayMap.get(t.transactionDate)!;
    if (t.direction === "credit") { row.cd += t.amount; totCD += t.amount; }
    else                          { row.ci += t.amount; totCI += t.amount; }
  }

  // Weekly aggregation when range > 60 days
  if (diffDays > 60) {
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
    return { data, totCD, totCI, saldoFinal: running, hasData: totCD + totCI > 0 };
  }

  // Daily — skip intermediate labels on longer ranges
  const labelStep = diffDays > 21 ? Math.ceil(diffDays / 8) : 1;
  let running = 0;
  const entries = Array.from(dayMap.entries());
  const data: FlowRow[] = entries.map(([date, v], idx) => {
    running += v.cd - v.ci;
    const [, m, d] = date.split("-");
    return {
      label: idx % labelStep === 0 || idx === entries.length - 1 ? `${d}/${m}` : "",
      cd: Math.round(v.cd), ci: Math.round(v.ci), saldo: Math.round(running),
    };
  });
  return { data, totCD, totCI, saldoFinal: running, hasData: totCD + totCI > 0 };
}

function bestPeriod(txns: BankTransaction[]): Exclude<Period, "custom"> {
  for (const p of ["7d", "14d", "30d", "3m", "6m", "1y"] as const) {
    if (buildFlowRange(txns, periodToRange(p)).hasData) return p;
  }
  return "1y";
}

const PERIOD_OPTS: { key: Period; label: string; sub: string }[] = [
  { key: "7d",     label: "7 dias",    sub: "Esta semana"      },
  { key: "14d",    label: "14 dias",   sub: "2 semanas"        },
  { key: "30d",    label: "30 dias",   sub: "Último mês"       },
  { key: "3m",     label: "3 meses",   sub: "Trimestre"        },
  { key: "6m",     label: "6 meses",   sub: "Semestre"         },
  { key: "1y",     label: "1 ano",     sub: "Anual"            },
  { key: "custom", label: "Período personalizado", sub: "" },
];

const ACCOUNTS_CFG = [
  { key: "AWQ_Holding", name: "Conta PJ AWQ Holding", subtitle: "AWQ Holding",               initials: "AWQ",  bgClass: "bg-brand-600"  },
  { key: "ENERDY",      name: "Cora Enerdy",           subtitle: "Banco Integrado · BU ENRD", initials: "ENRD", bgClass: "bg-violet-600" },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const meta: Record<string, { name: string; color: string }> = {
    saldo: { name: "Saldo líquido", color: "#d97706" },
    cd:    { name: "Créditos",      color: "#10b981" },
    ci:    { name: "Débitos",       color: "#ef4444" },
  };
  return (
    <div className="rounded-xl border border-amber-200 bg-white shadow-2xl text-xs min-w-[190px] overflow-hidden">
      <div className="bg-amber-50 px-3 py-2 border-b border-amber-100">
        <p className="font-bold text-amber-900">{label}</p>
      </div>
      <div className="p-3 space-y-1.5">
        {(payload as { dataKey: string; value: number }[]).map((p) => {
          const m = meta[p.dataKey] ?? { name: p.dataKey, color: "#6b7280" };
          return (
            <div key={p.dataKey} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                <span className="text-gray-500">{m.name}</span>
              </div>
              <span className="font-bold tabular-nums" style={{ color: m.color }}>{fmtBRL(p.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FinancialOverview({ transactions, arPending, coraConfigured }: Props) {
  const todayStr = today();

  const [period, setPeriod]     = useState<Period>(() => bestPeriod(transactions));
  const [range,  setRange]      = useState<DateRange>(() => periodToRange(bestPeriod(transactions)));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [showDrop,  setShowDrop]  = useState(false);
  const [hidden,    setHidden]    = useState<Set<string>>(new Set());
  const [accounts,  setAccounts]  = useState<AccountInfo[]>(
    ACCOUNTS_CFG.map((a) => ({ ...a, balance: null, loading: coraConfigured, error: null }))
  );
  const dropRef = useRef<HTMLDivElement>(null);

  // Auto-detect best period when transactions change (post-Cora sync)
  useEffect(() => {
    const best = bestPeriod(transactions);
    setPeriod(best);
    setRange(periodToRange(best));
  }, [transactions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectPeriod = (p: Period) => {
    if (p === "custom") return; // handled by applyCustom
    setPeriod(p);
    setRange(periodToRange(p as Exclude<Period, "custom">));
    setShowDrop(false);
  };

  const applyCustom = () => {
    if (!customFrom || !customTo || customFrom > customTo) return;
    setPeriod("custom");
    setRange({ from: customFrom, to: customTo });
    setShowDrop(false);
  };

  const periodLabel = period === "custom"
    ? (() => { const [, fm, fd] = range.from.split("-"); const [, tm, td] = range.to.split("-"); return `${fd}/${fm} — ${td}/${tm}`; })()
    : (PERIOD_OPTS.find(p => p.key === period)?.label ?? period);

  // Cora balances
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

  // AR / AP
  const recebimentosHoje = transactions
    .filter((t) => !t.excludedFromConsolidated && t.transactionDate === todayStr && t.direction === "credit" && t.reconciliationStatus !== "descartado")
    .reduce((s, t) => s + t.amount, 0);
  const pagamentosHoje = transactions
    .filter((t) => !t.excludedFromConsolidated && t.transactionDate === todayStr && t.direction === "debit" && t.reconciliationStatus !== "descartado")
    .reduce((s, t) => s + t.amount, 0);
  const restanteMesAR      = arPending.reduce((s, i) => s + i.net_amount, 0);
  const overdueAR          = arPending.filter((i) => i.due_date < todayStr).reduce((s, i) => s + i.net_amount, 0);
  const pendingDebitsMonth = transactions
    .filter((t) => {
      if (t.excludedFromConsolidated) return false;
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

  const { data: flowData, totCD, totCI, saldoFinal, hasData } = useMemo(
    () => buildFlowRange(transactions, range),
    [transactions, range]
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

      {/* ── 1. Fluxo de Caixa ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-visible shadow-sm">

        {/* Top bar: title + period dropdown + series toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Fluxo de Caixa Operacional</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Excluindo transferências internas e aplicações financeiras</p>
          </div>

          {/* Period dropdown — JP Morgan pill style */}
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setShowDrop((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[12px] font-semibold shadow-sm transition-all ${
                showDrop ? "border-amber-400 bg-amber-50 text-amber-800" : "border-gray-200 bg-white text-gray-700 hover:border-amber-300"
              }`}
            >
              <Calendar size={13} className="text-amber-500 shrink-0" />
              {periodLabel}
              <ChevronDown size={11} className={`text-gray-400 transition-transform duration-200 ${showDrop ? "rotate-180" : ""}`} />
            </button>

            {showDrop && (
              <div className="absolute top-[calc(100%+6px)] right-0 z-50 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
                {/* Preset options */}
                <div className="p-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1.5">Períodos rápidos</p>
                  <div className="grid grid-cols-3 gap-1">
                    {PERIOD_OPTS.filter((p) => p.key !== "custom").map((p) => (
                      <button
                        key={p.key}
                        onClick={() => selectPeriod(p.key)}
                        className={`flex flex-col items-start px-3 py-2 rounded-xl text-left transition-colors ${
                          period === p.key && period !== "custom"
                            ? "bg-amber-100 text-amber-900"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span className="text-[11px] font-bold">{p.label}</span>
                        <span className="text-[9px] text-gray-400">{p.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom date range */}
                <div className="border-t border-gray-100 bg-gray-50/60 p-3 space-y-2.5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Período personalizado</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 font-medium">De</label>
                      <input
                        type="date"
                        value={customFrom}
                        max={customTo || todayStr}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-full text-[11px] border border-gray-200 rounded-lg px-2.5 py-2 focus:border-amber-400 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 font-medium">Até</label>
                      <input
                        type="date"
                        value={customTo}
                        min={customFrom}
                        max={todayStr}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="w-full text-[11px] border border-gray-200 rounded-lg px-2.5 py-2 focus:border-amber-400 focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={applyCustom}
                    disabled={!customFrom || !customTo || customFrom > customTo}
                    className="w-full py-2 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl transition-colors"
                  >
                    Aplicar período
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KPI row — clickable series toggles */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-b border-gray-100">
          {[
            { key: "cd",    label: "CD — Créditos", value: totCD,      color: "text-emerald-600", dotC: "#10b981" },
            { key: "ci",    label: "CI — Débitos",  value: totCI,      color: "text-red-600",     dotC: "#ef4444" },
            { key: "saldo", label: "Saldo líquido", value: saldoFinal,
              color: saldoFinal >= 0 ? "text-amber-700" : "text-red-600", dotC: "#d97706" },
          ].map((k) => (
            <button
              key={k.key}
              onClick={() => toggle(k.key)}
              title={hidden.has(k.key) ? "Mostrar série" : "Ocultar série"}
              className={`px-5 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-all ${hidden.has(k.key) ? "opacity-35" : ""}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: k.dotC }} />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{k.label}</span>
                {k.key === "saldo" && netPct && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${netVariation >= 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>
                    {netVariation >= 0 ? "+" : ""}{netPct}%
                  </span>
                )}
              </div>
              <p className={`text-lg font-bold tabular-nums leading-tight ${k.color}`}>{fmtBRL(k.value)}</p>
            </button>
          ))}
        </div>

        {/* Chart — JP Morgan golden area */}
        <div className="bg-[#fdfcf8] rounded-b-2xl px-4 pb-5 pt-4">
          {!hasData ? (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2">
              <Calendar size={24} className="text-gray-300" />
              <p className="text-sm font-medium text-gray-400">Sem movimentações no período</p>
              {period !== "1y" && (
                <button
                  onClick={() => { setPeriod("1y"); setRange(periodToRange("1y")); }}
                  className="text-xs font-semibold text-amber-600 underline"
                >
                  Ver 1 ano completo
                </button>
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={flowData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradSaldoGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#f59e0b" stopOpacity={0.82} />
                    <stop offset="50%"  stopColor="#fbbf24" stopOpacity={0.4}  />
                    <stop offset="100%" stopColor="#fef3c7" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="gradCDGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradCIRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                {/* Dense solid horizontal gridlines — JP Morgan style */}
                <CartesianGrid strokeDasharray="" stroke="#ece8df" strokeWidth={0.75} vertical={false} />

                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#b5b0a8" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#b5b0a8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmtK}
                  width={56}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: "#d97706", strokeWidth: 1, strokeDasharray: "4 3" }}
                />

                {/* CD — secondary green area */}
                {!hidden.has("cd") && (
                  <Area type="monotone" dataKey="cd"
                    stroke="#10b981" strokeWidth={1.5} fill="url(#gradCDGreen)"
                    dot={false} activeDot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} />
                )}
                {/* CI — secondary red area */}
                {!hidden.has("ci") && (
                  <Area type="monotone" dataKey="ci"
                    stroke="#ef4444" strokeWidth={1.5} fill="url(#gradCIRed)"
                    dot={false} activeDot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }} />
                )}
                {/* Saldo — golden primary area (on top) */}
                {!hidden.has("saldo") && (
                  <Area type="monotone" dataKey="saldo"
                    stroke="#d97706" strokeWidth={2.5} fill="url(#gradSaldoGold)"
                    dot={false} activeDot={{ r: 5, fill: "#d97706", stroke: "#fff", strokeWidth: 2 }} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── 2. Contas + AR/AP ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">

        {/* LEFT: Contas bancárias */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Contas bancárias</h3>
            {coraConfigured && (
              <button
                onClick={() => { void loadBalance("AWQ_Holding"); void loadBalance("ENERDY"); }}
                className="text-gray-300 hover:text-gray-500 transition-colors"
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
              const initials = acc.entity === "ENERDY" ? "ENRD" : acc.entity === "JACQES" ? "JCQ" : "AWQ";
              const bg = acc.entity === "ENERDY" ? "bg-violet-600" : acc.entity === "JACQES" ? "bg-emerald-600" : "bg-brand-600";
              const label = (acc.name ?? acc.bank ?? "").replace(/^Conta\s+PJ\s+/i, "").trim();
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
                    {coraAcc && !coraAcc.loading && coraAcc.balance !== null && (
                      <span className="text-sm font-bold text-gray-900 tabular-nums shrink-0">
                        {fmtBRL(coraAcc.balance)}
                      </span>
                    )}
                    {coraAcc?.loading && <span className="text-[10px] text-gray-300 animate-pulse shrink-0">…</span>}
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
            {/* A receber hoje */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">A receber hoje</p>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <ArrowUpRight size={9} /> CD
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
              <button className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors">
                <ArrowUpRight size={11} /> Novo Recebimento
              </button>
            </div>

            {/* A pagar hoje */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">A pagar hoje</p>
                <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                  <ArrowDownLeft size={9} /> CI
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
              <button className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold transition-colors">
                <ArrowDownLeft size={11} /> Novo Pagamento
              </button>
            </div>
          </div>

          {/* Em atraso */}
          {(overdueAR > 0 || pendingDebitsMonth > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {overdueAR > 0 && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-1">Em atraso · AR</p>
                    <p className="text-lg font-bold text-emerald-700 tabular-nums">{fmtBRL(overdueAR)}</p>
                  </div>
                  <TrendingUp size={20} className="text-amber-400 shrink-0" />
                </div>
              )}
              {pendingDebitsMonth > 0 && (
                <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 flex items-center justify-between shadow-sm">
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
