"use client";

// ─── Conciliação Inteligente — subseção de /awq/conciliacao ──────────────────
// Tabs internas com toggle AWQ/ENRD compartilhado:
//   1. Visão Geral   — KPIs de saúde + gráfico (v_saldo_conciliado) + gate
//   2. Conciliação   — fila por estado (🟢🟡🟠🔴) + drawer de match + ações
//   3. Regras & Memória — CRUD de recon_rule + lista de recon_payee_memory
//
// Toda leitura via GET /api/conciliacao/data; ações via POST /api/conciliacao/action.

import { useCallback, useEffect, useState } from "react";
import {
  Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  AlertTriangle, CheckCircle2, CircleDot, Loader2, ShieldCheck, ShieldAlert,
  Trash2, X, Zap,
} from "lucide-react";
import { useLockedBU } from "@/lib/use-locked-bu";

type BU = "AWQ" | "ENRD";
type Tab = "overview" | "queue" | "rules";

interface Metrics {
  total: number; matched: number;
  counts: { auto: number; suggested: number; weak: number; exceptions: number };
  firstPass: number; cobertura: number; divergencia: number; agingMax: number;
  leadTimeP95: number; retrabalho: number; agingExcecaoOver7: number; agingArApOpen: number;
  gatePassed: boolean;
}
interface Ledger { id: string; kind: string; categoria: string; counterparty: string | null; applied: number }
interface QueueItem {
  groupId: string | null; bankTxId: string;
  state: "auto" | "suggested" | "weak" | "exception";
  method: string | null; confidence: number | null;
  valueDate: string; counterparty: string | null; amount: number;
  direction: "IN" | "OUT"; rawDescr: string | null; appliedSum: number; ledgers: Ledger[];
}
interface Saldo { refMonth: string; entradas: number; saidas: number; resultado: number }
interface Rule {
  id: string; bu: string | null; priority: number; match_field: string; pattern: string;
  set_kind: string | null; set_categoria: string | null; set_conta: string | null;
  set_intercompany: boolean | null; active: boolean | null;
}
interface Memory {
  bu: string; counterparty_key: string; kind: string | null; categoria: string | null;
  conta_contabil: string | null; hit_count: number | null; last_seen: string | null;
}
interface Data { metrics: Metrics; queue: QueueItem[]; saldo: Saldo[]; rules: Rule[]; memory: Memory[] }

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

const STATE_META: Record<QueueItem["state"], { label: string; dot: string; chip: string }> = {
  auto:      { label: "Auto",      dot: "text-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  suggested: { label: "Sugeridos", dot: "text-amber-500",   chip: "bg-amber-50 text-amber-700" },
  weak:      { label: "Fracos",    dot: "text-orange-500",  chip: "bg-orange-50 text-orange-700" },
  exception: { label: "Exceções",  dot: "text-red-500",     chip: "bg-red-50 text-red-700" },
};

export default function ConciliacaoInteligenteSection() {
  const { lockedBU, sessionLoading } = useLockedBU();
  const [bu, setBu] = useState<BU>("AWQ");
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [filter, setFilter] = useState<QueueItem["state"] | "all">("all");

  // BU travada por role.
  useEffect(() => {
    if (lockedBU === "AWQ" || lockedBU === "ENRD") setBu(lockedBU);
  }, [lockedBU]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/conciliacao/data?bu=${bu}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Falha ao carregar");
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [bu]);

  useEffect(() => { if (!sessionLoading) load(); }, [load, sessionLoading]);

  async function act(payload: Record<string, unknown>) {
    const r = await fetch("/api/conciliacao/action", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert(j.error ?? "Falha na ação"); return false; }
    return true;
  }

  const m = data?.metrics;

  return (
    <section className="card p-5 space-y-4">
      {/* Header + toggle BU */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
            <Zap size={14} className="text-brand-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Conciliação Inteligente</h2>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              Classifica, auto-resolve o óbvio e enfileira a exceção
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
          {(["AWQ", "ENRD"] as BU[]).map((b) => (
            <button
              key={b}
              disabled={!!lockedBU && lockedBU !== b}
              onClick={() => setBu(b)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                bu === b ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              } ${!!lockedBU && lockedBU !== b ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex gap-0.5 border-b border-gray-200">
        {([
          ["overview", "Visão Geral"],
          ["queue", "Conciliação"],
          ["rules", "Regras & Memória"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {label}
            {id === "queue" && m && m.counts.exceptions > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">
                {m.counts.exceptions}
              </span>
            )}
          </button>
        ))}
      </nav>

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
          <Loader2 size={16} className="animate-spin" /> Carregando…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Não foi possível carregar</p>
            <p className="text-xs text-amber-700 mt-0.5 font-mono">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && data && m && (
        <>
          {tab === "overview" && <OverviewTab m={m} saldo={data.saldo} />}
          {tab === "queue" && (
            <QueueTab
              queue={data.queue} counts={m.counts} filter={filter} setFilter={setFilter}
              onSelect={setSelected}
            />
          )}
          {tab === "rules" && (
            <RulesTab bu={bu} rules={data.rules} memory={data.memory} act={act} reload={load} />
          )}
        </>
      )}

      {selected && (
        <MatchDrawer
          item={selected} bu={bu}
          onClose={() => setSelected(null)}
          onAction={async (payload) => { const ok = await act(payload); if (ok) { setSelected(null); load(); } }}
        />
      )}
    </section>
  );
}

// ── Tab 1: Visão Geral ───────────────────────────────────────────────────────
function OverviewTab({ m, saldo }: { m: Metrics; saldo: Saldo[] }) {
  const chartData = saldo.map((s) => ({
    mes: s.refMonth?.slice(0, 7) ?? "",
    Entradas: s.entradas ?? 0,
    Saídas: s.saidas ?? 0,
    Saldo: s.resultado ?? 0,
  }));
  return (
    <div className="space-y-4">
      {/* Gate badge */}
      <div className={`rounded-xl border p-3 flex items-center gap-2.5 ${
        m.gatePassed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}>
        {m.gatePassed
          ? <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          : <ShieldAlert size={16} className="text-amber-600 shrink-0" />}
        <p className={`text-xs font-semibold ${m.gatePassed ? "text-emerald-800" : "text-amber-800"}`}>
          {m.gatePassed
            ? "Saldo definitivo — cobertura ≥ 98% e divergência R$ 0,00"
            : `Provisório — não conciliado (cobertura ${pct(m.cobertura)}, divergência ${brl(m.divergencia)})`}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="First-pass" value={pct(m.firstPass)} hint={`${m.counts.auto} auto`} />
        <KpiCard label="Cobertura" value={pct(m.cobertura)} hint={`${m.matched}/${m.total}`}
          tone={m.cobertura >= 0.98 ? "good" : "warn"} />
        <KpiCard label="Divergência" value={brl(m.divergencia)}
          tone={m.divergencia === 0 ? "good" : "warn"} />
        <KpiCard label="Aging máx." value={`${m.agingMax}d`}
          tone={m.agingMax > 7 ? "bad" : m.agingMax > 3 ? "warn" : "good"} hint="exceção mais antiga" />
      </div>

      {/* Gráfico barras divergentes + linha de saldo (fonte: v_saldo_conciliado) */}
      <div className="rounded-xl border border-gray-100 p-3">
        <p className="text-[11px] font-semibold text-gray-500 mb-2">
          Entradas × Saídas + Saldo acumulado · fonte v_saldo_conciliado
        </p>
        {chartData.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">
            Sem dados conciliados ainda — sincronize a Cora ou importe um extrato.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Bar dataKey="Entradas" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Saídas" fill="#f43f5e" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="Saldo" stroke="#6366f1" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Painel de métricas (§7) */}
      <MetricsPanel m={m} />
    </div>
  );
}

// Painel de métricas com metas (§7 do spec).
function MetricsPanel({ m }: { m: Metrics }) {
  const rows: { metric: string; value: string; meta: string; ok: boolean }[] = [
    { metric: "First-pass match rate", value: pct(m.firstPass), meta: "≥ 60%", ok: m.firstPass >= 0.6 },
    { metric: "Cobertura", value: pct(m.cobertura), meta: "≥ 98%", ok: m.cobertura >= 0.98 },
    { metric: "Lead time p95", value: `${m.leadTimeP95}d`, meta: "≤ 2d", ok: m.leadTimeP95 <= 2 },
    { metric: "Retrabalho", value: pct(m.retrabalho), meta: "≤ 5%", ok: m.retrabalho <= 0.05 },
    { metric: "Aging de exceção (>7d)", value: `${m.agingExcecaoOver7}`, meta: "0", ok: m.agingExcecaoOver7 === 0 },
    { metric: "Divergência de saldo", value: brl(m.divergencia), meta: "R$ 0,00", ok: m.divergencia === 0 },
    { metric: "Aging AR/AP aberto", value: `${m.agingArApOpen}`, meta: "exposto", ok: true },
  ];
  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <p className="text-[11px] font-semibold text-gray-500 mb-2">Painel de métricas</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-100">
            <th className="py-1.5 font-semibold">Métrica</th>
            <th className="py-1.5 font-semibold text-right">Atual</th>
            <th className="py-1.5 font-semibold text-right">Meta</th>
            <th className="py-1.5 font-semibold text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.metric} className="border-b border-gray-50">
              <td className="py-1.5 text-gray-700">{r.metric}</td>
              <td className="py-1.5 text-right tabular-nums font-semibold text-gray-800">{r.value}</td>
              <td className="py-1.5 text-right tabular-nums text-gray-400">{r.meta}</td>
              <td className="py-1.5 text-right">
                <span className={r.ok ? "text-emerald-600" : "text-amber-600"}>{r.ok ? "✓" : "•"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KpiCard({ label, value, hint, tone = "neutral" }: {
  label: string; value: string; hint?: string; tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneCls = {
    neutral: "text-gray-900", good: "text-emerald-600", warn: "text-amber-600", bad: "text-red-600",
  }[tone];
  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
      <p className={`text-xl font-bold tabular-nums mt-0.5 ${toneCls}`}>{value}</p>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

// ── Tab 2: Conciliação (fila) ────────────────────────────────────────────────
function QueueTab({ queue, counts, filter, setFilter, onSelect }: {
  queue: QueueItem[]; counts: Metrics["counts"];
  filter: QueueItem["state"] | "all"; setFilter: (s: QueueItem["state"] | "all") => void;
  onSelect: (i: QueueItem) => void;
}) {
  const shown = filter === "all" ? queue : queue.filter((q) => q.state === filter);
  return (
    <div className="space-y-3">
      {/* contadores por estado */}
      <div className="flex flex-wrap gap-2">
        {(["auto", "suggested", "weak", "exception"] as QueueItem["state"][]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? "all" : s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === s ? STATE_META[s].chip : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <CircleDot size={11} className={STATE_META[s].dot} />
            {STATE_META[s].label}
            <span className="tabular-nums">({counts[s === "exception" ? "exceptions" : s]})</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-xs text-gray-400 py-8 text-center">Nada nesta categoria.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 font-semibold">Data</th>
                <th className="py-2 font-semibold">Contraparte</th>
                <th className="py-2 font-semibold text-right">Valor</th>
                <th className="py-2 font-semibold">Método</th>
                <th className="py-2 font-semibold text-right">Conf.</th>
                <th className="py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 200).map((q) => (
                <tr key={`${q.groupId ?? "exc"}-${q.bankTxId}`} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 tabular-nums text-gray-600">{q.valueDate}</td>
                  <td className="py-2 text-gray-700 truncate max-w-[180px]">{q.counterparty ?? q.rawDescr ?? "—"}</td>
                  <td className={`py-2 text-right tabular-nums font-semibold ${q.direction === "IN" ? "text-emerald-700" : "text-red-700"}`}>
                    {brl(q.amount)}
                  </td>
                  <td className="py-2 text-gray-500">{q.method ?? "—"}</td>
                  <td className="py-2 text-right tabular-nums text-gray-500">{q.confidence ?? "—"}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => onSelect(q)} className="text-brand-600 font-semibold hover:underline">
                      {q.state === "exception" ? "Resolver" : "Ver"}
                    </button>
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

// ── Drawer de match ──────────────────────────────────────────────────────────
function MatchDrawer({ item, bu, onClose, onAction }: {
  item: QueueItem; bu: BU; onClose: () => void;
  onAction: (payload: Record<string, unknown>) => void;
}) {
  const [memKind, setMemKind] = useState("AP");
  const [memCat, setMemCat] = useState("");
  const [memConta, setMemConta] = useState("");
  const isException = item.state === "exception";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-white shadow-xl p-5 space-y-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {isException ? "Resolver exceção" : "Detalhe do match"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* lado banco */}
        <div className="rounded-xl border border-gray-100 p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Transação bancária</p>
          <p className="text-sm font-semibold text-gray-800">{item.counterparty ?? item.rawDescr ?? "—"}</p>
          <p className={`text-lg font-bold tabular-nums ${item.direction === "IN" ? "text-emerald-700" : "text-red-700"}`}>
            {brl(item.amount)}
          </p>
          <p className="text-xs text-gray-500">{item.valueDate} · {item.method ?? "sem método"}{item.confidence != null ? ` · conf ${item.confidence}` : ""}</p>
        </div>

        {/* lançamentos */}
        {item.ledgers.length > 0 && (
          <div className="rounded-xl border border-gray-100 p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
              Lançamento(s) · Σ aplicado {brl(item.appliedSum)}
            </p>
            {item.ledgers.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">{l.kind} · {l.categoria}{l.counterparty ? ` · ${l.counterparty}` : ""}</span>
                <span className="tabular-nums font-semibold text-gray-800">{brl(l.applied)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ações */}
        {!isException && item.groupId && (
          <div className="flex gap-2">
            <button
              onClick={() => onAction({ action: "approve", groupId: item.groupId })}
              className="btn-primary flex-1 flex items-center justify-center gap-1.5 py-2 text-xs"
            >
              <CheckCircle2 size={13} /> Aprovar
            </button>
            <button
              onClick={() => onAction({ action: "reject", groupId: item.groupId })}
              className="btn-secondary flex-1 py-2 text-xs"
            >
              Rejeitar
            </button>
          </div>
        )}

        {/* exceção → memorizar contraparte */}
        {isException && (
          <div className="rounded-xl border border-gray-100 p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Memorizar contraparte</p>
            <div className="grid grid-cols-3 gap-2">
              <select value={memKind} onChange={(e) => setMemKind(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
                {["AP", "AR", "FEE", "TRANSFER"].map((k) => <option key={k}>{k}</option>)}
              </select>
              <input value={memCat} onChange={(e) => setMemCat(e.target.value)} placeholder="categoria"
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 col-span-2" />
            </div>
            <input value={memConta} onChange={(e) => setMemConta(e.target.value)} placeholder="conta contábil"
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-full" />
            <button
              disabled={!item.counterparty}
              onClick={() => onAction({
                action: "memorize", bu,
                counterpartyKey: normalize(item.counterparty ?? ""),
                kind: memKind, categoria: memCat, conta: memConta,
              })}
              className="btn-primary w-full py-2 text-xs disabled:opacity-40"
            >
              Memorizar para próximas
            </button>
            {!item.counterparty && <p className="text-[10px] text-gray-400">Sem contraparte para memorizar.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab 3: Regras & Memória ──────────────────────────────────────────────────
function RulesTab({ bu, rules, memory, act, reload }: {
  bu: BU; rules: Rule[]; memory: Memory[];
  act: (p: Record<string, unknown>) => Promise<boolean>; reload: () => void;
}) {
  const [pattern, setPattern] = useState("");
  const [field, setField] = useState("counterparty");
  const [kind, setKind] = useState("AP");
  const [categoria, setCategoria] = useState("");

  async function addRule() {
    if (!pattern.trim()) return;
    const ok = await act({
      action: "rule.save",
      rule: {
        bu, priority: (rules.at(-1)?.priority ?? 0) + 10,
        match_field: field, pattern, set_kind: kind, set_categoria: categoria, active: true,
      },
    });
    if (ok) { setPattern(""); setCategoria(""); reload(); }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Regras */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700">Regras de classificação</p>
        <div className="rounded-xl border border-gray-100 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={field} onChange={(e) => setField(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
              {["counterparty", "raw_descr", "counter_doc"].map((f) => <option key={f}>{f}</option>)}
            </select>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
              {["AP", "AR", "FEE", "TRANSFER", "DIFF"].map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>
          <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="padrão (regex/ilike)"
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-full" />
          <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="categoria"
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-full" />
          <button onClick={addRule} className="btn-primary w-full py-1.5 text-xs">Adicionar regra</button>
        </div>
        {rules.length === 0 ? (
          <p className="text-xs text-gray-400">Nenhuma regra.</p>
        ) : rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between text-xs rounded-lg border border-gray-100 px-3 py-2">
            <div className="min-w-0">
              <span className="font-mono text-gray-700 truncate">{r.match_field} ~ {r.pattern}</span>
              <span className="text-gray-400 ml-2">→ {r.set_kind}/{r.set_categoria}</span>
            </div>
            <button onClick={async () => { if (await act({ action: "rule.del", id: r.id })) reload(); }}
              className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      {/* Memória */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700">Memória de contrapartes</p>
        {memory.length === 0 ? (
          <p className="text-xs text-gray-400">Memória vazia — resolva exceções para alimentá-la.</p>
        ) : memory.map((mem) => (
          <div key={mem.counterparty_key} className="flex items-center justify-between text-xs rounded-lg border border-gray-100 px-3 py-2">
            <div className="min-w-0">
              <span className="text-gray-700 truncate">{mem.counterparty_key}</span>
              <span className="text-gray-400 ml-2">→ {mem.kind}/{mem.categoria} · {mem.hit_count}×</span>
            </div>
            <button onClick={async () => { if (await act({ action: "mem.del", bu, counterpartyKey: mem.counterparty_key })) reload(); }}
              className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}
