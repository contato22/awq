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
  saldo: number | null;
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

// Defesa contra "Invalid Date", "null", "undefined" e qualquer outro lixo que
// possa chegar no campo transactionDate. Aceita SOMENTE strings que comecem
// com YYYY-MM-DD. Retorna a string normalizada ou "" se invalida.
function validDate(v: unknown): string {
  const s = String(v ?? "");
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
}

const MONTH_PT    = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTH_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ─── Build flow data ──────────────────────────────────────────────────────────

// buildFlowDaily monta os buckets diários. Saldo da linha vem DIRETO do
// `running_balance` que a Cora persiste em cada txn (lib/db.ts campo
// running_balance, populado em /api/cora/sync). Para cada dia do periodo
// visivel pega o running_balance da ULTIMA txn do dia (saldo end-of-day
// segundo o extrato bancario). Dias sem movimento carregam o saldo do dia
// anterior (carry-forward). O `endBalance` (saldo live da Cora API) so e
// usado como fallback de ancora — preferencia absoluta pro saldo do extrato.
function buildFlowDaily(txns: BankTransaction[], month: string, endBalance: number | null): FlowResult {
  const year  = parseInt(month.slice(0, 4));
  const mon   = parseInt(month.slice(5, 7));
  const nDays = daysInMonth(year, mon);
  const from  = `${month}-01`;
  const to    = `${month}-${String(nDays).padStart(2, "0")}`;

  const dayMap = new Map<string, { i: number; o: number }>();
  for (let d = 1; d <= nDays; d++) {
    dayMap.set(`${month}-${String(d).padStart(2, "0")}`, { i: 0, o: 0 });
  }

  // Indexa, por dia, o running_balance da ULTIMA txn cronologica. Como a prop
  // pode chegar em qualquer ordem, ordeno por (data, id) e pego o ultimo de
  // cada dia — esse e o saldo end-of-day reportado pelo extrato Cora.
  const sortedAll = txns
    .map((t) => ({ t, td: validDate(t.transactionDate) }))
    .filter((x) => !!x.td)
    .sort((a, b) => {
      if (a.td !== b.td) return a.td < b.td ? -1 : 1;
      return String(a.t.id) < String(b.t.id) ? -1 : 1;
    });

  // Pre-period seed: running_balance da ultima txn ANTES do `from`. Serve pra
  // dia 1 do periodo (caso o dia 1 nao tenha movimento).
  let preSeed: number | null = null;
  for (const { t, td } of sortedAll) {
    if (td >= from) break;
    if (t.runningBalance != null) preSeed = Number(t.runningBalance);
  }

  // Per-day end-of-day running_balance dentro do periodo
  const dayRunBal = new Map<string, number>();
  for (const { t, td } of sortedAll) {
    if (td < from || td > to) continue;
    const b = dayMap.get(td);
    if (b) {
      const amt = Number(t.amount) || 0;
      if (t.direction === "credit") b.i += amt; else b.o += amt;
    }
    if (t.runningBalance != null) dayRunBal.set(td, Number(t.runningBalance));
  }

  // Carry-forward: dia atual = ultimo running_balance conhecido <= esse dia
  let lastKnown: number | null = preSeed;
  let ti = 0, to_ = 0;
  for (const { i, o } of dayMap.values()) { ti += i; to_ += o; }
  const periodNet = ti - to_;

  // Fallback: se NAO ha nenhum running_balance no/antes do periodo, ancora
  // pelo endBalance live (comportamento anterior). Isso cobre contas novas
  // recem-sincronizadas sem historico ou periodos antes do primeiro extrato.
  const noExtractAnchor = preSeed === null && dayRunBal.size === 0;
  const openingDay1 = endBalance !== null ? endBalance - periodNet : null;

  let cum = 0;
  const data: FlowRow[] = Array.from(dayMap.entries()).map(([date, { i, o }]) => {
    cum += i - o;
    // Preferencia: saldo end-of-day do extrato. Se o dia nao tem extrato, usa
    // o ultimo conhecido (carry-forward). Se nem isso, usa fallback derivado.
    if (dayRunBal.has(date)) lastKnown = dayRunBal.get(date)!;
    let saldo: number | null;
    if (noExtractAnchor) {
      saldo = openingDay1 !== null ? openingDay1 + cum : null;
    } else {
      saldo = lastKnown;
    }
    return {
      label:        String(parseInt(date.slice(8))),
      recebimentos: Math.round(i),
      pagamentos:  -Math.round(o),
      saldo:        saldo !== null ? Math.round(saldo) : null,
    };
  });
  return { data, totalIn: Math.round(ti), totalOut: Math.round(to_), net: Math.round(ti - to_), hasData: ti + to_ > 0 };
}

function buildFlowMonthly(txns: BankTransaction[], coraBalance: number | null): FlowResult {
  // txns ja vem pre-filtrado pela page; valida data (descarta "Invalid Date"
  // e qualquer string que nao seja YYYY-MM-DD)
  const elig = txns
    .map((t) => ({ t, td: validDate(t.transactionDate) }))
    .filter((x) => !!x.td);
  if (!elig.length) {
    // Sem movimentações: ainda assim mostra linha flat ancorada no saldo real da Cora Enerdy.
    if (coraBalance !== null) {
      const cm = today().slice(0, 7);
      const mi = parseInt(cm.slice(5)) - 1;
      return {
        data: [{
          label:        `${MONTH_SHORT[mi]}/${cm.slice(2, 4)}`,
          recebimentos: 0,
          pagamentos:   0,
          saldo:        Math.round(coraBalance),
        }],
        totalIn: 0, totalOut: 0, net: 0, hasData: false,
      };
    }
    return { data: [], totalIn: 0, totalOut: 0, net: 0, hasData: false };
  }

  const minMonth = elig.reduce(
    (min, x) => { const mk = x.td.slice(0, 7); return mk < min ? mk : min; },
    elig[0].td.slice(0, 7)
  );
  const curMonth = today().slice(0, 7);

  const mmap = new Map<string, { i: number; o: number }>();
  let m = minMonth;
  while (m <= curMonth) { mmap.set(m, { i: 0, o: 0 }); m = nextMonth(m); }

  for (const { t, td } of elig) {
    const mk = td.slice(0, 7);
    const b = mmap.get(mk);
    if (!b) continue;
    const amt = Number(t.amount) || 0;
    if (t.direction === "credit") b.i += amt; else b.o += amt;
  }

  // Ancora o saldo no fim do período (último bucket) = coraBalance, igual ao diário.
  // Com txns no histórico: openingPre = coraBalance - sumOfAllPeriods.
  let allNet = 0;
  for (const { i, o } of mmap.values()) { allNet += i - o; }
  const openingPre = coraBalance !== null ? coraBalance - allNet : null;

  let cum = 0, ti = 0, to_ = 0;
  const data: FlowRow[] = Array.from(mmap.entries()).map(([mk, { i, o }]) => {
    cum += i - o; ti += i; to_ += o;
    const mi = parseInt(mk.slice(5)) - 1;
    return {
      label:        `${MONTH_SHORT[mi]}/${mk.slice(2, 4)}`,
      recebimentos: Math.round(i),
      pagamentos:  -Math.round(o),
      saldo:        openingPre !== null ? Math.round(openingPre + cum) : null,
    };
  });
  return { data, totalIn: Math.round(ti), totalOut: Math.round(to_), net: Math.round(ti - to_), hasData: ti + to_ > 0 };
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function FlowTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const meta: Record<string, { name: string; color: string }> = {
    recebimentos: { name: "AR · Recebimentos", color: "#16a34a" },
    pagamentos:   { name: "AP · Pagamentos",   color: "#dc2626" },
    saldo:        { name: "Saldo",             color: "#7c3aed" },
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-2xl text-xs min-w-[190px] overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
        <p className="font-bold text-gray-900">Cora Enerdy · {label}</p>
      </div>
      <div className="p-3 space-y-2">
        {payload.map((p) => {
          const m = meta[p.dataKey] ?? { name: p.dataKey, color: "#6b7280" };
          return (
            <div key={p.dataKey} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                <span className="font-bold text-gray-800">{m.name}</span>
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
  const [mounted,  setMounted]  = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("diario");
  // Default: mes da txn mais recente. Garante que ao abrir a pagina o usuario
  // ja ve as colunas AR/AP do mes onde efetivamente houve movimento. Se nao
  // houver txn nenhuma na prop, cai no mes atual. O user pode navegar pra
  // outros meses pelas setinhas normalmente.
  const [monthNav, setMonthNav] = useState(() => {
    let latest = "";
    for (const t of transactions) {
      const td = validDate(t.transactionDate);
      if (td && td > latest) latest = td;
    }
    return latest ? latest.slice(0, 7) : today().slice(0, 7);
  });
  const [balance,  setBalance]  = useState<number | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [balErr,   setBalErr]   = useState<string | null>(null);
  const [debug,    setDebug]    = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  // Recharts uses ResizeObserver — only render the SVG chart after mount to
  // avoid any SSR/hydration edge case. The card shell always renders.
  useEffect(() => { setMounted(true); }, []);

  const loadBalance = useCallback(async () => {
    setLoading(true); setBalErr(null);
    try {
      const res  = await fetch("/api/cora/balance?account=ENERDY");
      const data = await res.json() as CoraBalance;
      if (res.ok) setBalance(data.available);
      else setBalErr(data.error ?? "Erro");
    } catch { setBalErr("Falha na conexão"); }
    finally  { setLoading(false); }
  }, []);

  // Sempre tenta carregar o saldo no mount — fonte da verdade é a resposta da
  // API, NÃO env vars (que viram undefined no bundle do browser por não terem
  // prefixo NEXT_PUBLIC_). Se a Cora não estiver configurada server-side, a API
  // retorna 501/502, o componente cai em loading→error e <Line> simplesmente
  // não desenha (nunca flat em R$0).
  useEffect(() => { void loadBalance(); }, [loadBalance]);

  // Anchor do saldo no FIM do mês visível.
  // Mês atual ou futuro: anchor = balance live (não subtrai nada — txns
  //   futuras agendadas NÃO afetaram o saldo real ainda).
  // Mês passado: anchor = balance - net dos txns ocorridos ENTRE fim do mês
  //   visível e HOJE (estes sim já impactaram o saldo). Ignora txns futuras.
  const endBalanceForView = useMemo(() => {
    if (balance === null) return null;
    const year   = parseInt(monthNav.slice(0, 4));
    const mon    = parseInt(monthNav.slice(5, 7));
    const lastDay = `${monthNav}-${String(new Date(year, mon, 0).getDate()).padStart(2, "0")}`;
    const todayStr = today();
    if (lastDay >= todayStr) return balance; // mês atual ou futuro
    let postNet = 0;
    for (const t of transactions) {
      const td = validDate(t.transactionDate);
      if (!td) continue;
      // só conta o que aconteceu APÓS o fim do mês visível E ATÉ hoje
      if (td > lastDay && td <= todayStr) {
        const a = Number(t.amount) || 0;
        postNet += t.direction === "credit" ? a : -a;
      }
    }
    return balance - postNet;
  }, [transactions, balance, monthNav]);

  // Anchor: depende EXCLUSIVAMENTE do balance vindo de GET /api/cora/balance.
  // balance===null (loading/erro) → anchor=null → saldo=null por bucket →
  // <Line> não renderiza (sem fantasma em R$0).
  const dailyAnchor   = endBalanceForView;
  const monthlyAnchor = balance;

  const flowResult = useMemo(() =>
    viewMode === "diario"
      ? buildFlowDaily(transactions, monthNav, dailyAnchor)
      : buildFlowMonthly(transactions, monthlyAnchor),
  [transactions, viewMode, monthNav, dailyAnchor, monthlyAnchor]);

  // Mes mais recente do extrato (ultima transactionDate). Usado pra mostrar
  // botao "pular pra esse mes" quando o usuario abre num mes vazio.
  const latestTxnMonth = useMemo(() => {
    let latest = "";
    for (const t of transactions) {
      const td = validDate(t.transactionDate);
      if (td && td > latest) latest = td;
    }
    return latest ? latest.slice(0, 7) : null;
  }, [transactions]);
  const latestTxnLabel = latestTxnMonth
    ? `${MONTH_PT[parseInt(latestTxnMonth.slice(5)) - 1]} ${latestTxnMonth.slice(0, 4)}`
    : null;

  // transactions ja vem pre-filtrado pela page (entity=ENERDY); confiar na prop
  const totalIn  = transactions.filter((t) => t.direction === "credit").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalOut = transactions.filter((t) => t.direction === "debit").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const net      = totalIn - totalOut;

  // Trava contra monthNav corrompido (ex.: "Invalid" se algum upstream burlar
  // a validacao). Se o indice nao bater, cai no mes atual com aviso silencioso.
  const monthLabel = (() => {
    if (!/^\d{4}-\d{2}$/.test(monthNav)) return `${MONTH_PT[parseInt(today().slice(5, 7)) - 1]} ${today().slice(0, 4)}`;
    const mi = parseInt(monthNav.slice(5)) - 1;
    const name = MONTH_PT[mi] ?? MONTH_PT[parseInt(today().slice(5, 7)) - 1];
    return `${name} ${monthNav.slice(0, 4)}`;
  })();
  const isCurrentMonth = monthNav >= today().slice(0, 7);
  const maxBarSz       = viewMode === "diario" ? 18 : 36;
  const saldoDisplay   = balance ?? net;
  const saldoLabel     = balance !== null ? "Saldo real Cora" : "Fluxo acumulado";

  // ── Debug overlay (?debug=1) ─────────────────────────────────────────────
  // Imprime no console E renderiza VISÍVEL acima do chart os valores reais
  // que estão alimentando o saldo da linha. Permite observar (não inferir) o
  // wiring balance → anchor → data[].saldo. Removível: tirar `?debug=1` da URL.
  const debugData = useMemo(() => {
    const first = flowResult.data[0];
    const last  = flowResult.data[flowResult.data.length - 1];
    return {
      balance,
      dailyAnchor,
      monthlyAnchor,
      viewMode,
      monthNav,
      dataLen: flowResult.data.length,
      firstSaldo: first?.saldo ?? null,
      lastSaldo:  last?.saldo  ?? null,
      txnCountTotal:   transactions.length,
      txnCountWithDate: transactions.filter((t) => !!t.transactionDate).length,
      txnCountWithRunBal: transactions.filter((t) => t.runningBalance != null).length,
      txnEntities: Array.from(new Set(transactions.map((t) => String(t.entity ?? "?")))).join(","),
      firstTxnDate: transactions.find((t) => !!t.transactionDate)?.transactionDate ?? "n/a",
    };
  }, [balance, dailyAnchor, monthlyAnchor, viewMode, monthNav, flowResult.data, transactions]);

  useEffect(() => {
    if (!debug) return;
    // eslint-disable-next-line no-console
    console.log("[EnrdFlowChart debug]", debugData);
  }, [debug, debugData]);

  return (
    <div className="card overflow-visible">

      {debug && (
        <div className="m-3 p-3 rounded-lg bg-yellow-50 border border-yellow-300 text-[11px] font-mono text-yellow-900 leading-relaxed">
          <div className="font-bold mb-1 text-yellow-700">[?debug=1] EnrdFlowChart state</div>
          <div>balance (state): <b>{balance === null ? "null" : balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></div>
          <div>dailyAnchor (passa pra buildFlowDaily): <b>{debugData.dailyAnchor === null ? "null" : (debugData.dailyAnchor as number).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></div>
          <div>monthlyAnchor (passa pra buildFlowMonthly): <b>{debugData.monthlyAnchor === null ? "null" : (debugData.monthlyAnchor as number).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></div>
          <div>viewMode: <b>{debugData.viewMode}</b> · monthNav: <b>{debugData.monthNav}</b> · data.length: <b>{debugData.dataLen}</b></div>
          <div>data[0].saldo: <b>{debugData.firstSaldo === null ? "null" : debugData.firstSaldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></div>
          <div>data[last].saldo: <b>{debugData.lastSaldo === null ? "null" : debugData.lastSaldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></div>
          <div>txns recebidos como prop: <b>{debugData.txnCountTotal}</b> · com transactionDate: <b>{debugData.txnCountWithDate}</b> · com runningBalance: <b>{debugData.txnCountWithRunBal}</b></div>
          <div>entities distintas na prop: <b>{debugData.txnEntities}</b> (esperado: ENERDY)</div>
          <div>primeira transactionDate: <b>{debugData.firstTxnDate}</b></div>
          <div className="text-yellow-700 mt-1">Saldo na linha: agora puxa <b>running_balance</b> da ultima txn de cada dia (extrato Cora) com carry-forward. Fallback no balance live só se nao ha extrato.</div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Fluxo de Caixa · Cora Enerdy</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Recebimentos e pagamentos · conta Cora ENRD</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-[11px] font-semibold">
            {(["diario", "mensal"] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 transition-colors ${v !== "diario" ? "border-l border-gray-200" : ""} ${viewMode === v ? "bg-violet-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                {v === "diario" ? "Diário" : "Mensal"}
              </button>
            ))}
          </div>
          {viewMode === "diario" && (
            <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg bg-white overflow-hidden text-[11px] font-semibold text-gray-700">
              <button onClick={() => setMonthNav(prevMonth(monthNav))} className="px-2 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-gray-700"><ChevronLeft size={13} /></button>
              <span className="px-2 py-1.5 min-w-[130px] text-center tabular-nums">{monthLabel}</span>
              <button onClick={() => setMonthNav(nextMonth(monthNav))} disabled={isCurrentMonth} className="px-2 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={13} /></button>
            </div>
          )}
          {coraConfigured && (
            <button onClick={() => void loadBalance()} title="Atualizar saldo Cora"
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 divide-x divide-gray-100 border-t border-b border-gray-100">
        {[
          { label: "Recebimentos", value: flowResult.totalIn, color: "text-emerald-700", dot: "bg-emerald-500", sub: viewMode === "diario" ? monthLabel : "Histórico" },
          { label: "Pagamentos",   value: flowResult.totalOut, color: "text-red-700",     dot: "bg-red-500",    sub: viewMode === "diario" ? monthLabel : "Histórico" },
          { label: "Saldo líquido",value: flowResult.net,      color: flowResult.net >= 0 ? "text-violet-700" : "text-red-600", dot: "bg-violet-600", sub: "Receb − Pagto" },
          { label: "Saldo Cora",   value: saldoDisplay,        color: saldoDisplay >= 0 ? "text-amber-600" : "text-red-600",    dot: "bg-amber-500",  sub: balErr ?? saldoLabel },
        ].map(({ label, value, color, dot, sub }) => (
          <div key={label} className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
              {label === "Saldo Cora" && loading && <span className="text-[9px] text-gray-300 animate-pulse">•••</span>}
            </div>
            <p className={`text-base font-bold tabular-nums leading-tight ${color}`}>{fmtBRL(value)}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-[#fafaf8] rounded-b-xl px-4 pb-5 pt-3">
        <div className="flex items-center justify-end gap-4 mb-2 text-[10px] font-medium text-gray-500">
          {[
            { color: "#16a34a", label: "AR · Recebimentos" },
            { color: "#dc2626", label: "AP · Pagamentos" },
            { color: "#7c3aed", label: "Saldo", dots: true },
          ].map(({ color, label, dots }) => (
            <div key={label} className="flex items-center gap-1.5">
              {dots ? (
                <span className="inline-flex items-center gap-0.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <span className="w-3 h-px" style={{ background: color }} />
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                </span>
              ) : (
                <span className="w-3 h-3 rounded-sm opacity-80 shrink-0" style={{ background: color }} />
              )}
              {label}
            </div>
          ))}
        </div>

        {mounted ? (
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={flowResult.data} margin={{ top: 4, right: 56, bottom: 0, left: 0 }} barCategoryGap="30%" stackOffset="sign">
              <CartesianGrid strokeDasharray="" stroke="#ece8df" strokeWidth={0.75} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#b5b0a8" }} axisLine={false} tickLine={false}
                interval={viewMode === "diario" ? 4 : "preserveStartEnd"} />
              {/* Y esquerda — escala das BARRAS (recebimentos AR / pagamentos AP).
                  Auto-scale independente do saldo: garante que mesmo com a linha
                  ancorada em R$ 4.425,97 as colunas verdes nao virem tracinhos
                  invisiveis. domain inclui 0 pra ReferenceLine ficar consistente. */}
              <YAxis yAxisId="bars" tick={{ fontSize: 10, fill: "#b5b0a8" }} axisLine={false} tickLine={false}
                tickFormatter={fmtK} width={56}
                domain={[(dMin: number) => Math.min(0, dMin), (dMax: number) => Math.max(0, dMax)]} />
              {/* Y direita — escala da LINHA DE SALDO. orientation=right + hide ticks
                  pra nao poluir. dataKey explicito pro Recharts saber o que medir. */}
              <YAxis yAxisId="saldo" orientation="right" hide
                domain={[(dMin: number) => Math.min(0, dMin), "auto"]} />
              <ReferenceLine yAxisId="bars" y={0} stroke="#d1d5db" strokeWidth={1} />
              <Tooltip content={<FlowTooltip />} cursor={{ fill: "rgba(124,58,237,0.04)" }} />
              <Bar yAxisId="bars" dataKey="recebimentos" stackId="flow" fill="#16a34a" fillOpacity={0.82} maxBarSize={maxBarSz} radius={[2, 2, 0, 0]} />
              <Bar yAxisId="bars" dataKey="pagamentos"   stackId="flow" fill="#dc2626" fillOpacity={0.78} maxBarSize={maxBarSz} radius={[0, 0, 2, 2]} />
              {balance !== null && (
                <Line yAxisId="saldo" type="monotone" dataKey="saldo" stroke="#7c3aed" strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 3, fill: "#7c3aed", stroke: "#fff", strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: "#7c3aed", stroke: "#fff", strokeWidth: 2 }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 230 }} className="flex items-center justify-center">
            <span className="text-[11px] text-gray-300 animate-pulse">Carregando gráfico…</span>
          </div>
        )}

        {!flowResult.hasData && (
          <p className="text-center text-[11px] text-gray-400 -mt-2 mb-1">
            Sem movimentações {viewMode === "diario" ? `em ${monthLabel}` : "no histórico"}
            {viewMode === "diario" && latestTxnMonth && latestTxnMonth !== monthNav && (
              <> · <button onClick={() => setMonthNav(latestTxnMonth)} className="text-emerald-600 font-semibold hover:underline">ir para {latestTxnLabel}</button> (mês com a última txn)</>
            )}
            {viewMode === "diario" && (!latestTxnMonth || latestTxnMonth === monthNav) && (
              <> · <button onClick={() => setViewMode("mensal")} className="text-violet-500 hover:underline">ver histórico</button></>
            )}
          </p>
        )}
        {coraConfigured && loading && (
          <p className="text-center text-[10px] text-gray-300 animate-pulse -mt-1 mb-1">Calculando posição de caixa…</p>
        )}
      </div>
    </div>
  );
}
