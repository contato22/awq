"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar, CartesianGrid, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { BankTransaction } from "@/lib/financial-db";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoraBalance { available: number; error?: string }

interface FlowRow {
  label: string;
  recebimentos: number;
  pagamentos: number;
  saldo: number;
}

interface FlowResult {
  data: FlowRow[];
  totalIn: number;
  totalOut: number;
  net: number;
  hasData: boolean;
}

interface Props {
  transactions: BankTransaction[];
  coraConfigured: boolean;
}

type ViewMode = "diario" | "mensal";

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

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
}
function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

const MONTH_NAMES_PT    = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTH_NAMES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ─── Build flow data (ENERDY-only) ────────────────────────────────────────────

function buildFlowDaily(txns: BankTransaction[], month: string, startBal: number): FlowResult {
  const year  = parseInt(month.slice(0, 4));
  const mon   = parseInt(month.slice(5, 7));
  const nDays = daysInMonth(year, mon);
  const from  = `${month}-01`;
  const to    = `${month}-${String(nDays).padStart(2, "0")}`;

  const dayMap = new Map<string, { in: number; out: number }>();
  for (let d = 1; d <= nDays; d++) {
    dayMap.set(`${month}-${String(d).padStart(2, "0")}`, { in: 0, out: 0 });
  }

  for (const t of txns) {
    if (t.entity !== "ENERDY") continue;
    if (t.transactionDate < from || t.transactionDate > to) continue;
    const bucket = dayMap.get(t.transactionDate);
    if (!bucket) continue;
    if (t.direction === "credit") bucket.in  += t.amount;
    else                          bucket.out += t.amount;
  }

  let rs = startBal, ti = 0, to_ = 0;
  const data: FlowRow[] = Array.from(dayMap.entries()).map(([date, { in: inc, out }]) => {
    rs += inc - out;
    ti += inc;
    to_ += out;
    return {
      label:         String(parseInt(date.slice(8))),
      recebimentos:  Math.round(inc),
      pagamentos:   -Math.round(out),
      saldo:         Math.max(0, Math.round(rs)),
    };
  });

  return { data, totalIn: Math.round(ti), totalOut: Math.round(to_),
           net: Math.round(ti - to_), hasData: ti + to_ > 0 };
}

function buildFlowMonthly(txns: BankTransaction[], coraBalance: number | null): FlowResult {
  const eligible = txns.filter((t) => t.entity === "ENERDY");
  if (eligible.length === 0) return { data: [], totalIn: 0, totalOut: 0, net: 0, hasData: false };

  const minMonth = eligible.reduce(
    (min, t) => { const mk = t.transactionDate.slice(0, 7); return mk < min ? mk : min; },
    eligible[0].transactionDate.slice(0, 7)
  );
  const curMonth = today().slice(0, 7);

  const monthMap = new Map<string, { in: number; out: number }>();
  let m = minMonth;
  while (m <= curMonth) { monthMap.set(m, { in: 0, out: 0 }); m = nextMonth(m); }

  for (const t of eligible) {
    const mk = t.transactionDate.slice(0, 7);
    const bucket = monthMap.get(mk);
    if (!bucket) continue;
    if (t.direction === "credit") bucket.in  += t.amount;
    else                          bucket.out += t.amount;
  }

  // Anchor saldo to Cora balance when available
  let allNet = 0;
  for (const t of eligible) { allNet += t.direction === "credit" ? t.amount : -t.amount; }
  const startBal = coraBalance !== null ? coraBalance - allNet : 0;

  let rs = startBal, ti = 0, to_ = 0;
  const data: FlowRow[] = Array.from(monthMap.entries()).map(([mk, { in: inc, out }]) => {
    rs += inc - out;
    ti += inc;
    to_ += out;
    const mi = parseInt(mk.slice(5)) - 1;
    const yr = mk.slice(0, 4);
    return {
      label: `${MONTH_NAMES_SHORT[mi]}/${yr.slice(2)}`,
      recebimentos:  Math.round(inc),
      pagamentos:   -Math.round(out),
      saldo:         Math.max(0, Math.round(rs)),
    };
  });

  return { data, totalIn: Math.round(ti), totalOut: Math.round(to_),
           net: Math.round(ti - to_), hasData: ti + to_ > 0 };
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

type TooltipProps = { active?: boolean; payload?: Array<{ dataKey: string; value: number }>; label?: string };

function FlowTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const meta: Record<string, { name: string; sub: string; color: string }> = {
    recebimentos: { name: "Recebimentos", sub: "Entradas realizadas", color: "#16a34a" },
    pagamentos:   { name: "Pagamentos",   sub: "Saídas realizadas",   color: "#dc2626" },
    saldo:        { name: "Saldo",        sub: "Posição acumulada",   color: "#7c3aed" },
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-2xl text-xs min-w-[200px] overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
        <p className="font-bold text-gray-900">Cora Enerdy · {label}</p>
      </div>
      <div className="p-3 space-y-2">
        {payload.map((p) => {
          const m = meta[p.dataKey] ?? { name: p.dataKey, sub: "", color: "#6b7280" };
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
                {fmtBRL(Math.abs(p.value))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EnrdFlowChart({ transactions, coraConfigured }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("diario");
  const [monthNav, setMonthNav] = useState<string>(() => today().slice(0, 7));
  const [balance,  setBalance]  = useState<number | null>(null);
  const [loading,  setLoading]  = useState(coraConfigured);
  const [balErr,   setBalErr]   = useState<string | null>(null);

  const loadBalance = useCallback(async () => {
    setLoading(true);
    setBalErr(null);
    try {
      const res  = await fetch("/api/cora/balance?account=ENERDY");
      const data = await res.json() as CoraBalance;
      if (res.ok) setBalance(data.available);
      else setBalErr(data.error ?? "Erro ao buscar saldo");
    } catch {
      setBalErr("Falha na conexão");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (coraConfigured) void loadBalance(); }, [coraConfigured, loadBalance]);

  // Balance at start of displayed month (anchored to Cora when available)
  const startBal = useMemo(() => {
    const eligible = transactions.filter((t) => t.entity === "ENERDY");
    if (balance !== null) {
      // Anchor: coraBalance = allHistoricalNet + startBal → startBal = coraBalance - allNet
      let allNet = 0;
      for (const t of eligible) allNet += t.direction === "credit" ? t.amount : -t.amount;
      const anchor = balance - allNet;
      // Pre-period net up to start of this month
      const from = `${monthNav}-01`;
      let prePeriod = 0;
      for (const t of eligible) {
        if (t.transactionDate < from) prePeriod += t.direction === "credit" ? t.amount : -t.amount;
      }
      return anchor + prePeriod;
    }
    // Fallback: naive running total before month
    const from = `${monthNav}-01`;
    let pre = 0;
    for (const t of eligible) {
      if (t.transactionDate < from) pre += t.direction === "credit" ? t.amount : -t.amount;
    }
    return pre;
  }, [transactions, balance, monthNav]);

  const flowResult = useMemo<FlowResult>(() => {
    if (viewMode === "diario") return buildFlowDaily(transactions, monthNav, startBal);
    return buildFlowMonthly(transactions, balance);
  }, [transactions, viewMode, monthNav, startBal, balance]);

  const enrdTxns = useMemo(() => transactions.filter((t) => t.entity === "ENERDY"), [transactions]);
  const totalCredits = enrdTxns.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0);
  const totalDebits  = enrdTxns.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0);
  const netAll       = totalCredits - totalDebits;

  const monthLabel    = `${MONTH_NAMES_PT[parseInt(monthNav.slice(5)) - 1]} ${monthNav.slice(0, 4)}`;
  const isCurrentMonth = monthNav >= today().slice(0, 7);
  const maxBarSz = viewMode === "diario" ? 18 : 36;

  const saldoDisplay = balance !== null ? balance : netAll;
  const saldoLabel   = balance !== null ? "Saldo real Cora" : "Fluxo acumulado";

  // DIAGNÓSTICO — remover após confirmar render
  return (
    <div style={{ background: "#7c3aed", padding: "16px", borderRadius: "12px" }}>
      <strong style={{ color: "white", fontSize: "14px" }}>
        EnrdFlowChart monta ✓ — {transactions.length} txns · {flowResult.data.length} dias · saldo {saldoDisplay.toFixed(2)}
      </strong>
    </div>
  );

  // eslint-disable-next-line no-unreachable
  return (
    <div className="card overflow-visible">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Fluxo de Caixa · Cora Enerdy</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Recebimentos e pagamentos realizados · conta Cora ENRD
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Diário / Mensal toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-[11px] font-semibold">
            <button
              onClick={() => setViewMode("diario")}
              className={`px-3 py-1.5 transition-colors ${viewMode === "diario" ? "bg-violet-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              Diário
            </button>
            <button
              onClick={() => setViewMode("mensal")}
              className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${viewMode === "mensal" ? "bg-violet-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
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
              >
                <ChevronLeft size={13} />
              </button>
              <span className="px-2 py-1.5 min-w-[130px] text-center tabular-nums">{monthLabel}</span>
              <button
                onClick={() => setMonthNav(nextMonth(monthNav))}
                disabled={isCurrentMonth}
                className="px-2 py-1.5 hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}

          {/* Cora refresh */}
          {coraConfigured && (
            <button
              onClick={() => void loadBalance()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              title="Atualizar saldo Cora"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          )}
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-4 divide-x divide-gray-100 border-t border-b border-gray-100">
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Recebimentos</span>
          </div>
          <p className="text-base font-bold tabular-nums leading-tight text-emerald-700">
            {fmtBRL(flowResult.totalIn)}
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5">{viewMode === "diario" ? monthLabel : "Histórico"}</p>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Pagamentos</span>
          </div>
          <p className="text-base font-bold tabular-nums leading-tight text-red-700">
            {fmtBRL(flowResult.totalOut)}
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5">{viewMode === "diario" ? monthLabel : "Histórico"}</p>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Saldo líquido</span>
          </div>
          <p className={`text-base font-bold tabular-nums leading-tight ${flowResult.net >= 0 ? "text-violet-700" : "text-red-600"}`}>
            {fmtBRL(flowResult.net)}
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5">Receb − Pagto</p>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Saldo Cora</span>
            {loading && <span className="text-[9px] text-gray-300 animate-pulse">•••</span>}
          </div>
          <p className={`text-base font-bold tabular-nums leading-tight ${saldoDisplay >= 0 ? "text-amber-600" : "text-red-600"}`}>
            {fmtBRL(saldoDisplay)}
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5">
            {balErr ? <span className="text-red-400">{balErr}</span> : saldoLabel}
          </p>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="bg-[#fafaf8] rounded-b-xl px-4 pb-5 pt-3">
        <div className="flex items-center justify-end gap-4 mb-2 text-[10px] font-medium text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#16a34a] opacity-80 shrink-0" />
            Recebimentos
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#dc2626] opacity-75 shrink-0" />
            Pagamentos
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
              <span className="w-3 h-px bg-[#7c3aed]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
            </span>
            Saldo
          </div>
        </div>

        <ResponsiveContainer width="100%" height={230}>
          <ComposedChart data={flowResult.data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
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
            <Tooltip content={<FlowTooltip />} cursor={{ fill: "rgba(124,58,237,0.04)" }} />

            <Bar dataKey="recebimentos" stackId="flow" fill="#16a34a" fillOpacity={0.82} maxBarSize={maxBarSz} radius={[2, 2, 0, 0]} />
            <Bar dataKey="pagamentos"   stackId="flow" fill="#dc2626" fillOpacity={0.78} maxBarSize={maxBarSz} radius={[0, 0, 2, 2]} />

            {(!coraConfigured || !loading) && (
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ r: 3, fill: "#7c3aed", stroke: "#fff", strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: "#7c3aed", stroke: "#fff", strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {!flowResult.hasData && (
          <p className="text-center text-[11px] text-gray-400 -mt-2 mb-1">
            Sem movimentações {viewMode === "diario" ? `em ${monthLabel}` : "no histórico"}
            {viewMode === "diario" && (
              <> · <button onClick={() => setViewMode("mensal")} className="text-violet-500 hover:underline">ver todo o histórico</button></>
            )}
          </p>
        )}

        {coraConfigured && loading && (
          <p className="text-center text-[10px] text-gray-300 animate-pulse -mt-1 mb-1">
            Calculando posição de caixa…
          </p>
        )}
      </div>
    </div>
  );
}
