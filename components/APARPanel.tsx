"use client";

// ─── APARPanel — Contas a Pagar (AP) & Contas a Receber (AR) ─────────────────
//
// Componente compartilhado usado por todas as páginas de AP/AR:
//   • BU-scoped  (buScope = "jacqes" | "caza" | "venture" | "advisor" | "awq")
//     → exibe e cria apenas itens daquela BU; seletor de BU oculto no formulário.
//   • Group view (buScope = "all")
//     → exibe todos os itens consolidados; permite filtrar por BU; seletor visível.
//
// Persistência: API /api/ap-ar (Postgres em produção, JSON em dev).

import { useState, useEffect, useCallback } from "react";
import type { ElementType } from "react";
import {
  ArrowDownLeft, ArrowUpRight, Plus, Trash2,
  AlertTriangle, CheckCircle2, Clock, X,
  FileText, TrendingDown, TrendingUp, CalendarDays, Building2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType   = "ap" | "ar";
type ItemStatus = "pending" | "overdue" | "settled";
type BU         = "awq" | "jacqes" | "caza" | "venture" | "advisor";

interface APARItem {
  id:          string;
  type:        ItemType;
  bu:          BU;
  description: string;
  entity:      string;
  amount:      number;
  due_date:    string;
  status:      ItemStatus;
  category:    string;
  created_at:  string;
  updated_at:  string;
}

export type BUScope = BU | "all";

// ─── Constants ────────────────────────────────────────────────────────────────

const BUS: { id: BU; label: string; short: string; color: string; bg: string; dot: string }[] = [
  { id: "awq",     label: "AWQ Holding", short: "Holding", color: "text-amber-700",   bg: "bg-amber-50",   dot: "bg-amber-500"   },
  { id: "jacqes",  label: "JACQES",      short: "JACQES",  color: "text-blue-700",    bg: "bg-blue-50",    dot: "bg-blue-500"    },
  { id: "caza",    label: "Caza Vision", short: "Caza",    color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  { id: "venture", label: "AWQ Venture", short: "Venture", color: "text-orange-700",  bg: "bg-orange-50",  dot: "bg-orange-500"  },
  { id: "advisor", label: "Advisor",     short: "Advisor", color: "text-violet-700",  bg: "bg-violet-50",  dot: "bg-violet-500"  },
];

const BU_MAP = Object.fromEntries(BUS.map((b) => [b.id, b])) as Record<BU, typeof BUS[0]>;

const AP_CATEGORIES = [
  "Fornecedor", "Folha / Pró-labore", "Imposto / Tributo",
  "Aluguel", "Serviços", "Software / SaaS", "Marketing", "Financiamento", "Outros",
];

const AR_CATEGORIES = [
  "Cliente", "Adiantamento", "Reembolso",
  "Receita a Receber", "Nota Fiscal Emitida", "Outros",
];

const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; icon: ElementType }> = {
  pending: { label: "Pendente",  color: "bg-amber-100 text-amber-700",     icon: Clock         },
  overdue: { label: "Vencido",   color: "bg-red-100 text-red-700",         icon: AlertTriangle },
  settled: { label: "Liquidado", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(1) + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

const EMPTY_FORM = {
  description: "", entity: "", amount: "", due_date: "", category: "", bu: "awq" as BU,
};

// ─── Component ────────────────────────────────────────────────────────────────

interface APARPanelProps {
  /** "all" = visão consolidada do grupo; qualquer BU = visão isolada daquela BU. */
  buScope: BUScope;
}

export default function APARPanel({ buScope }: APARPanelProps) {
  const isGroup = buScope === "all";

  const [items,     setItems]     = useState<APARItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ItemType>("ap");
  // In BU mode the BU filter is locked; in group mode the user can toggle.
  const [activeBU,  setActiveBU]  = useState<BU | "all">(isGroup ? "all" : buScope as BU);
  const [showForm,  setShowForm]  = useState(true);
  const [form,      setForm]      = useState<typeof EMPTY_FORM>({
    ...EMPTY_FORM,
    bu: isGroup ? "awq" : buScope as BU,
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs   = isGroup ? "" : `?bu=${buScope}`;
      const res  = await fetch(`/api/ap-ar${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as APARItem[];
      setItems(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [buScope, isGroup]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Add item ───────────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!form.description.trim() || !form.amount || !form.due_date) return;
    const payload = {
      type:        activeTab,
      bu:          isGroup ? form.bu : buScope,
      description: form.description.trim(),
      entity:      form.entity.trim(),
      amount:      parseFloat(form.amount) || 0,
      due_date:    form.due_date,
      category:    form.category || (activeTab === "ap" ? AP_CATEGORIES[0] : AR_CATEGORIES[0]),
    };
    const res = await fetch("/api/ap-ar", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    if (res.ok) {
      const item = await res.json() as APARItem;
      setItems((prev) => [item, ...prev].sort((a, b) => a.due_date.localeCompare(b.due_date)));
      setForm({ ...EMPTY_FORM, bu: isGroup ? form.bu : buScope as BU });
    }
  }

  // ── Toggle settle ──────────────────────────────────────────────────────────
  async function handleToggleSettle(item: APARItem) {
    const newStatus: ItemStatus = item.status === "settled" ? "pending" : "settled";
    const res = await fetch(`/api/ap-ar/${item.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json() as APARItem;
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    const res = await fetch(`/api/ap-ar/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const buFilter = (i: APARItem) => activeBU === "all" || i.bu === activeBU;

  const apAll = items.filter((i) => i.type === "ap");
  const arAll = items.filter((i) => i.type === "ar");

  const totalAP   = apAll.filter((i) => buFilter(i) && i.status !== "settled").reduce((s, i) => s + i.amount, 0);
  const totalAR   = arAll.filter((i) => buFilter(i) && i.status !== "settled").reduce((s, i) => s + i.amount, 0);
  const overdueAP = apAll.filter((i) => buFilter(i) && i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const overdueAR = arAll.filter((i) => buFilter(i) && i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  const visible      = items.filter((i) => i.type === activeTab && buFilter(i));
  const openItems    = visible.filter((i) => i.status !== "settled");
  const settledItems = visible.filter((i) => i.status === "settled");
  const categories   = activeTab === "ap" ? AP_CATEGORIES : AR_CATEGORIES;

  const buBreakdown = BUS.map((bu) => {
    const buAP = apAll.filter((i) => i.bu === bu.id && i.status !== "settled").reduce((s, i) => s + i.amount, 0);
    const buAR = arAll.filter((i) => i.bu === bu.id && i.status !== "settled").reduce((s, i) => s + i.amount, 0);
    const has  = apAll.some((i) => i.bu === bu.id) || arAll.some((i) => i.bu === bu.id);
    return { ...bu, ap: buAP, ar: buAR, hasItems: has };
  }).filter((b) => b.hasItems);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="px-8 py-6 space-y-5">

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { label: "Total a Pagar (AP)", value: fmtR(totalAP),   icon: TrendingDown, color: "text-red-600",     bg: "bg-red-50",     delta: `${apAll.filter((i) => buFilter(i) && i.status !== "settled").length} obrigação(ões)` },
          { label: "Total a Receber (AR)",value: fmtR(totalAR),  icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-50", delta: `${arAll.filter((i) => buFilter(i) && i.status !== "settled").length} direito(s)` },
          { label: "AP Vencido",          value: fmtR(overdueAP),icon: AlertTriangle,color: "text-orange-600",  bg: "bg-orange-50",  delta: `${apAll.filter((i) => buFilter(i) && i.status === "overdue").length} em atraso` },
          { label: "AR Vencido",          value: fmtR(overdueAR),icon: CalendarDays, color: "text-amber-700",   bg: "bg-amber-50",   delta: `${arAll.filter((i) => buFilter(i) && i.status === "overdue").length} em atraso` },
        ] as const).map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={c.color} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{c.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
                <div className="text-[10px] text-gray-400 mt-1">{c.delta}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── BU filter bar (grupo only) ──────────────────────────────────────── */}
      {isGroup && (
        <div className="card px-4 py-3 flex items-center gap-2 flex-wrap">
          <Building2 size={13} className="text-gray-400 shrink-0" />
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1">BU</span>
          <button
            onClick={() => setActiveBU("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${activeBU === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Consolidado
          </button>
          {BUS.map((bu) => (
            <button
              key={bu.id}
              onClick={() => setActiveBU(bu.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${activeBU === bu.id ? `${bu.bg} ${bu.color} ring-1 ring-current/30` : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${bu.dot}`} />
              {bu.short}
            </button>
          ))}
          {activeBU !== "all" && (
            <span className="ml-auto text-[10px] text-gray-400">
              Filtrando por {BU_MAP[activeBU as BU].label}
            </span>
          )}
        </div>
      )}

      {/* ── Breakdown por BU (grupo, visão consolidada) ─────────────────────── */}
      {isGroup && activeBU === "all" && buBreakdown.length > 0 && (
        <div className="card px-4 py-3">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Breakdown por BU</div>
          <div className="flex flex-wrap gap-3">
            {buBreakdown.map((bu) => (
              <button
                key={bu.id}
                onClick={() => setActiveBU(bu.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left hover:shadow-sm transition-all ${bu.bg} border-transparent`}
              >
                <span className={`w-2 h-2 rounded-full ${bu.dot} shrink-0`} />
                <span className={`text-xs font-bold ${bu.color}`}>{bu.short}</span>
                <span className="text-[10px] text-red-500 font-semibold">AP {fmtR(bu.ap)}</span>
                <span className="text-[10px] text-emerald-600 font-semibold">AR {fmtR(bu.ar)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs + toggle form ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {(["ap", "ar"] as ItemType[]).map((tab) => {
          const isAP  = tab === "ap";
          const count = items.filter((i) => i.type === tab && buFilter(i) && i.status !== "settled").length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? isAP ? "border-red-500 text-red-700" : "border-emerald-500 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {isAP ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
              {isAP ? "AP — Contas a Pagar" : "AR — Contas a Receber"}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isAP ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 mb-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
        >
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? "Ocultar" : "Novo cadastro"}
        </button>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className={`card p-5 border-l-4 ${activeTab === "ap" ? "border-l-red-400" : "border-l-emerald-400"}`}>
          <div className="flex items-center gap-2 mb-4">
            {activeTab === "ap"
              ? <ArrowDownLeft size={16} className="text-red-600" />
              : <ArrowUpRight  size={16} className="text-emerald-600" />}
            <span className="text-sm font-semibold text-gray-800">
              {activeTab === "ap" ? "Registrar Conta a Pagar (AP)" : "Registrar Recebível (AR)"}
            </span>
            {!isGroup && (
              <span className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${BU_MAP[buScope as BU].bg} ${BU_MAP[buScope as BU].color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${BU_MAP[buScope as BU].dot}`} />
                {BU_MAP[buScope as BU].label}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="text" placeholder="Descrição *" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
            />
            <input
              type="text" placeholder="Contraparte (fornecedor / cliente)" value={form.entity}
              onChange={(e) => setForm((f) => ({ ...f, entity: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
            />
            <input
              type="number" placeholder="Valor (R$) *" value={form.amount} min="0" step="0.01"
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
            />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Vencimento *</label>
              <input
                type="date" value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* BU selector: visible only on group view */}
            {isGroup && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Business Unit</label>
                <select
                  value={form.bu}
                  onChange={(e) => setForm((f) => ({ ...f, bu: e.target.value as BU }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                >
                  {BUS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
              </div>
            )}
            <div className={`flex items-center gap-2 pt-1 ${isGroup ? "lg:col-span-3" : "lg:col-span-2"}`}>
              <button
                onClick={handleAdd}
                disabled={!form.description.trim() || !form.amount || !form.due_date}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-colors text-white disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeTab === "ap" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                <Plus size={14} />
                {activeTab === "ap" ? "Adicionar Obrigação" : "Adicionar Recebível"}
              </button>
              <button
                onClick={() => setForm({ ...EMPTY_FORM, bu: isGroup ? "awq" : buScope as BU })}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Items table ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-gray-400">Carregando...</div>
      ) : error ? (
        <div className="card p-8 text-center text-sm text-red-500">{error}</div>
      ) : (
        <div className="card p-5">
          {openItems.length === 0 && settledItems.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <FileText size={32} className="text-gray-200 mx-auto" />
              <div className="text-sm font-semibold text-gray-400">
                {activeTab === "ap" ? "Nenhuma conta a pagar" : "Nenhum recebível"}
                {!isGroup ? ` para ${BU_MAP[buScope as BU].label}` : " registrado"}
              </div>
              <div className="text-xs text-gray-400">Preencha o formulário acima para adicionar</div>
            </div>
          ) : (
            <div className="space-y-6">
              {openItems.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Em Aberto ({openItems.length})
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500">
                          <th className="text-left py-2 px-3 text-xs font-semibold">Descrição</th>
                          {isGroup && <th className="text-left py-2 px-3 text-xs font-semibold">BU</th>}
                          <th className="text-left py-2 px-3 text-xs font-semibold">Contraparte</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold">Categoria</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold">Vencimento</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold">Status</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold">Valor</th>
                          <th className="py-2 px-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {openItems
                          .sort((a, b) => a.due_date.localeCompare(b.due_date))
                          .map((item) => {
                            const st       = STATUS_CONFIG[item.status];
                            const StatusIcon = st.icon;
                            const bu       = BU_MAP[item.bu];
                            return (
                              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-2.5 px-3 text-xs text-gray-900 font-medium max-w-[160px]">
                                  <div className="truncate">{item.description}</div>
                                </td>
                                {isGroup && (
                                  <td className="py-2.5 px-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${bu.bg} ${bu.color}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${bu.dot}`} />
                                      {bu.short}
                                    </span>
                                  </td>
                                )}
                                <td className="py-2.5 px-3 text-xs text-gray-500">{item.entity || "—"}</td>
                                <td className="py-2.5 px-3 text-xs text-gray-500">{item.category}</td>
                                <td className={`py-2.5 px-3 text-xs whitespace-nowrap font-medium ${item.status === "overdue" ? "text-red-600" : "text-gray-700"}`}>
                                  {fmtDate(item.due_date)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                                    <StatusIcon size={10} />
                                    {st.label}
                                  </span>
                                </td>
                                <td className={`py-2.5 px-3 text-right text-xs font-bold ${activeTab === "ap" ? "text-red-600" : "text-emerald-600"}`}>
                                  {activeTab === "ap" ? "-" : "+"}{fmtR(item.amount)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1 justify-end">
                                    <button onClick={() => handleToggleSettle(item)} title="Marcar como liquidado" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                      <CheckCircle2 size={13} />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} title="Excluir" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200">
                          <td colSpan={isGroup ? 6 : 5} className="py-2.5 px-3 text-xs font-semibold text-gray-600">
                            Total em aberto{!isGroup ? ` — ${BU_MAP[buScope as BU].label}` : ""}
                          </td>
                          <td className={`py-2.5 px-3 text-right text-sm font-bold ${activeTab === "ap" ? "text-red-600" : "text-emerald-600"}`}>
                            {activeTab === "ap" ? "-" : "+"}{fmtR(openItems.reduce((s, i) => s + i.amount, 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {settledItems.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Liquidados ({settledItems.length})
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm opacity-60">
                      <tbody>
                        {settledItems
                          .sort((a, b) => b.due_date.localeCompare(a.due_date))
                          .map((item) => {
                            const bu = BU_MAP[item.bu];
                            return (
                              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-2 px-3 text-xs text-gray-500 line-through max-w-[160px]">
                                  <div className="truncate">{item.description}</div>
                                </td>
                                {isGroup && (
                                  <td className="py-2 px-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${bu.bg} ${bu.color}`}>
                                      {bu.short}
                                    </span>
                                  </td>
                                )}
                                <td className="py-2 px-3 text-xs text-gray-400">{item.entity || "—"}</td>
                                <td className="py-2 px-3 text-xs text-gray-400">{item.category}</td>
                                <td className="py-2 px-3 text-xs text-gray-400">{fmtDate(item.due_date)}</td>
                                <td className="py-2 px-3">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 size={10} /> Liquidado
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right text-xs font-medium text-gray-400">{fmtR(item.amount)}</td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1 justify-end">
                                    <button onClick={() => handleToggleSettle(item)} title="Reabrir" className="p-1.5 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                                      <Clock size={13} />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
