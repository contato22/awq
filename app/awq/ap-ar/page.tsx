"use client";

// ─── /awq/ap-ar — Contas a Pagar (AP) & Contas a Receber (AR) ────────────────
//
// ROLE: Gestão de obrigações a pagar e direitos a receber da tesouraria.
//       Dados em localStorage — rastreio manual de AP/AR por BU.
//
// ARCHITECTURE:
//   • AP (Accounts Payable)  — obrigações: fornecedores, impostos, folha, etc.
//   • AR (Accounts Receivable) — direitos: clientes, adiantamentos, reembolsos.
//   • Campo "bu" por item — filtragem e agrupamento por Business Unit.
//   • localStorage("awq_ap_items") — não persistido no servidor (dívida técnica)

import { useState, useEffect, useCallback } from "react";
import type { ElementType } from "react";
import Header from "@/components/Header";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  FileText,
  TrendingDown,
  TrendingUp,
  CalendarDays,
  Building2,
  Pencil,
  Search,
  SlidersHorizontal,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType   = "ap" | "ar";
type ItemStatus = "pending" | "overdue" | "settled";
type BU         = "awq" | "jacqes" | "caza" | "venture" | "advisor";

interface APARItem {
  id: string;
  type: ItemType;
  bu: BU;
  description: string;
  entity: string;
  amount: number;
  dueDate: string;
  status: ItemStatus;
  category: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = "awq_ap_items";

const BUS: { id: BU; label: string; short: string; color: string; bg: string; dot: string }[] = [
  { id: "awq",     label: "AWQ Holding",  short: "Holding",  color: "text-amber-700",   bg: "bg-amber-50",   dot: "bg-amber-500"   },
  { id: "jacqes",  label: "JACQES",       short: "JACQES",   color: "text-blue-700",    bg: "bg-blue-50",    dot: "bg-blue-500"    },
  { id: "caza",    label: "Caza Vision",  short: "Caza",     color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  { id: "venture", label: "AWQ Venture",  short: "Venture",  color: "text-orange-700",  bg: "bg-orange-50",  dot: "bg-orange-500"  },
  { id: "advisor", label: "Advisor",      short: "Advisor",  color: "text-violet-700",  bg: "bg-violet-50",  dot: "bg-violet-500"  },
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
  pending: { label: "Pendente",  color: "bg-amber-100 text-amber-700",    icon: Clock         },
  overdue: { label: "Vencido",   color: "bg-red-100 text-red-700",        icon: AlertTriangle },
  settled: { label: "Liquidado", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  const abs = Math.abs(n);
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

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function today() { return new Date().toISOString().slice(0, 10); }

function computeStatus(dueDate: string, current: ItemStatus): ItemStatus {
  if (current === "settled") return "settled";
  if (dueDate && dueDate < today()) return "overdue";
  return "pending";
}

const EMPTY_FORM = { description: "", entity: "", amount: "", dueDate: "", category: "", bu: "awq" as BU };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function APARPage() {
  const [items, setItems]         = useState<APARItem[]>([]);
  const [activeTab, setActiveTab] = useState<ItemType>("ap");
  const [activeBU, setActiveBU]   = useState<BU | "all">("all");
  const [showForm, setShowForm]   = useState(true);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editingItem, setEditingItem] = useState<APARItem | null>(null);
  const [editForm, setEditForm]       = useState(EMPTY_FORM);
  const [search, setSearch]             = useState("");
  const [catFilter, setCatFilter]       = useState("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "overdue" | "this_month" | "next_30">("all");

  // ── Load from localStorage ───────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as APARItem[];
        const refreshed = parsed.map((item) => ({
          ...item,
          bu: (item.bu ?? "awq") as BU,
          status: computeStatus(item.dueDate, item.status),
        }));
        setItems(refreshed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setCatFilter("all");
    setPeriodFilter("all");
    setSearch("");
  }, [activeTab]);

  const save = useCallback((updated: APARItem[]) => {
    setItems(updated);
    try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }, []);

  // ── Add item ─────────────────────────────────────────────────────────────
  function handleAdd() {
    if (!form.description.trim() || !form.amount || !form.dueDate) return;
    const item: APARItem = {
      id: uid(),
      type: activeTab,
      bu: form.bu,
      description: form.description.trim(),
      entity: form.entity.trim(),
      amount: parseFloat(form.amount) || 0,
      dueDate: form.dueDate,
      status: computeStatus(form.dueDate, "pending"),
      category: form.category || (activeTab === "ap" ? AP_CATEGORIES[0] : AR_CATEGORIES[0]),
      createdAt: today(),
    };
    save([...items, item]);
    setForm({ ...EMPTY_FORM, bu: form.bu });
  }

  function handleToggleSettle(id: string) {
    save(items.map((item) => {
      if (item.id !== id) return item;
      return { ...item, status: item.status === "settled" ? computeStatus(item.dueDate, "pending") : "settled" };
    }));
  }

  function handleDelete(id: string) { save(items.filter((i) => i.id !== id)); }

  function handleOpenEdit(item: APARItem) {
    setEditingItem(item);
    setEditForm({
      description: item.description,
      entity: item.entity,
      amount: String(item.amount),
      dueDate: item.dueDate,
      category: item.category,
      bu: item.bu,
    });
  }

  function handleSaveEdit() {
    if (!editingItem) return;
    if (!editForm.description.trim() || !editForm.amount || !editForm.dueDate) return;
    save(items.map((i) => {
      if (i.id !== editingItem.id) return i;
      return {
        ...i,
        description: editForm.description.trim(),
        entity: editForm.entity.trim(),
        amount: parseFloat(editForm.amount) || 0,
        dueDate: editForm.dueDate,
        category: editForm.category,
        bu: editForm.bu,
        status: computeStatus(editForm.dueDate, i.status),
      };
    }));
    setEditingItem(null);
  }

  // ── Derived — scoped to current BU filter ────────────────────────────────
  const buFilter = (i: APARItem) => activeBU === "all" || i.bu === activeBU;

  const apAll = items.filter((i) => i.type === "ap");
  const arAll = items.filter((i) => i.type === "ar");

  const totalAP   = apAll.filter((i) => buFilter(i) && i.status !== "settled").reduce((s, i) => s + i.amount, 0);
  const totalAR   = arAll.filter((i) => buFilter(i) && i.status !== "settled").reduce((s, i) => s + i.amount, 0);
  const overdueAP = apAll.filter((i) => buFilter(i) && i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const overdueAR = arAll.filter((i) => buFilter(i) && i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  const categories = activeTab === "ap" ? AP_CATEGORIES : AR_CATEGORIES;
  const hasFilters = search.trim() !== "" || catFilter !== "all" || periodFilter !== "all";

  function matchesSearch(i: APARItem) {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return i.description.toLowerCase().includes(q) || i.entity.toLowerCase().includes(q);
  }

  function matchesCat(i: APARItem) { return catFilter === "all" || i.category === catFilter; }

  function matchesPeriod(i: APARItem) {
    if (periodFilter === "all") return true;
    const t = today();
    if (periodFilter === "overdue")    return i.dueDate < t;
    if (periodFilter === "this_month") return i.dueDate.slice(0, 7) === t.slice(0, 7);
    if (periodFilter === "next_30") {
      const next30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
      return i.dueDate >= t && i.dueDate <= next30;
    }
    return true;
  }

  const visible      = items.filter((i) => i.type === activeTab && buFilter(i) && matchesSearch(i) && matchesCat(i));
  const openItems    = visible.filter((i) => i.status !== "settled" && matchesPeriod(i));
  const settledItems = visible.filter((i) => i.status === "settled");

  // ── Per-BU breakdown (for summary row) ───────────────────────────────────
  const buBreakdown = BUS.map((bu) => {
    const buAP = apAll.filter((i) => i.bu === bu.id && i.status !== "settled").reduce((s, i) => s + i.amount, 0);
    const buAR = arAll.filter((i) => i.bu === bu.id && i.status !== "settled").reduce((s, i) => s + i.amount, 0);
    const hasItems = apAll.some((i) => i.bu === bu.id) || arAll.some((i) => i.bu === bu.id);
    return { ...bu, ap: buAP, ar: buAR, hasItems };
  }).filter((b) => b.hasItems);

  return (
    <>
      <Header title="AP & AR" subtitle="Contas a Pagar · Contas a Receber · Tesouraria" />
      <div className="px-8 py-6 space-y-5">

        {/* ── Summary cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total a Pagar (AP)", value: fmtR(totalAP), icon: TrendingDown, color: "text-red-600",    bg: "bg-red-50",    delta: `${apAll.filter((i) => buFilter(i) && i.status !== "settled").length} obrigação(ões)` },
            { label: "Total a Receber (AR)", value: fmtR(totalAR), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", delta: `${arAll.filter((i) => buFilter(i) && i.status !== "settled").length} direito(s)` },
            { label: "AP Vencido",  value: fmtR(overdueAP), icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", delta: `${apAll.filter((i) => buFilter(i) && i.status === "overdue").length} item(ns) em atraso` },
            { label: "AR Vencido",  value: fmtR(overdueAR), icon: CalendarDays,  color: "text-amber-700",  bg: "bg-amber-50",  delta: `${arAll.filter((i) => buFilter(i) && i.status === "overdue").length} recebível(is) em atraso` },
          ].map((c) => {
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

        {/* ── BU filter bar ─────────────────────────────────────────────────── */}
        <div className="card px-4 py-3 flex items-center gap-2 flex-wrap">
          <Building2 size={13} className="text-gray-400 shrink-0" />
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1">BU</span>
          <button
            onClick={() => setActiveBU("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              activeBU === "all"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Consolidado
          </button>
          {BUS.map((bu) => (
            <button
              key={bu.id}
              onClick={() => setActiveBU(bu.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                activeBU === bu.id
                  ? `${bu.bg} ${bu.color} ring-1 ring-current/30`
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${bu.dot}`} />
              {bu.short}
            </button>
          ))}
          {activeBU !== "all" && (
            <span className="ml-auto text-[10px] text-gray-400">
              Filtrando por {BU_MAP[activeBU].label}
            </span>
          )}
        </div>

        {/* ── Per-BU breakdown strip (only when Consolidado) ──────────────── */}
        {activeBU === "all" && buBreakdown.length > 0 && (
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

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-gray-200">
          {(["ap", "ar"] as ItemType[]).map((tab) => {
            const isAP = tab === "ap";
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

        {/* ── Filter bar ────────────────────────────────────────────────────── */}
        <div className="card px-4 py-3 flex flex-wrap items-center gap-3">
          <SlidersHorizontal size={13} className="text-gray-400 shrink-0" />
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar descrição ou contraparte…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg pl-8 pr-8 py-1.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-brand-500"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex items-center gap-1 flex-wrap">
            {([
              { id: "all",        label: "Todos"     },
              { id: "overdue",    label: "Vencidos"  },
              { id: "this_month", label: "Este mês"  },
              { id: "next_30",    label: "Próx. 30d" },
            ] as const).map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodFilter(p.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  periodFilter === p.id
                    ? p.id === "overdue"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setCatFilter("all"); setPeriodFilter("all"); }}
              className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={11} /> Limpar filtros
            </button>
          )}
        </div>

        {/* ── Add form (visible by default) ────────────────────────────────── */}
        {showForm && (
          <div className={`card p-5 border-l-4 ${activeTab === "ap" ? "border-l-red-400" : "border-l-emerald-400"}`}>
            <div className="flex items-center gap-2 mb-4">
              {activeTab === "ap" ? <ArrowDownLeft size={16} className="text-red-600" /> : <ArrowUpRight size={16} className="text-emerald-600" />}
              <span className="text-sm font-semibold text-gray-800">
                {activeTab === "ap" ? "Registrar Conta a Pagar (AP)" : "Registrar Recebível (AR)"}
              </span>
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
                  type="date" value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
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
              <div className="flex items-center gap-2 lg:col-span-3 pt-1">
                <button
                  onClick={handleAdd}
                  disabled={!form.description.trim() || !form.amount || !form.dueDate}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-colors text-white disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeTab === "ap" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  <Plus size={14} />
                  {activeTab === "ap" ? "Adicionar Obrigação" : "Adicionar Recebível"}
                </button>
                <button
                  onClick={() => setForm(EMPTY_FORM)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Items table ───────────────────────────────────────────────────── */}
        <div className="card p-5">
          {openItems.length === 0 && settledItems.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <FileText size={32} className="text-gray-200 mx-auto" />
              <div className="text-sm font-semibold text-gray-400">
                {hasFilters
                  ? "Nenhum resultado para os filtros aplicados"
                  : activeTab === "ap" ? "Nenhuma conta a pagar" : "Nenhum recebível"}
                {!hasFilters && (activeBU !== "all" ? ` para ${BU_MAP[activeBU].label}` : " registrado")}
              </div>
              <div className="text-xs text-gray-400">
                {hasFilters ? "Tente ajustar ou limpar os filtros acima" : "Preencha o formulário acima para adicionar"}
              </div>
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
                          <th className="text-left py-2 px-3 text-xs font-semibold">BU</th>
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
                          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                          .map((item) => {
                            const st  = STATUS_CONFIG[item.status];
                            const StatusIcon = st.icon;
                            const bu  = BU_MAP[item.bu];
                            return (
                              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-2.5 px-3 text-xs text-gray-900 font-medium max-w-[160px]">
                                  <div className="truncate">{item.description}</div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${bu.bg} ${bu.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${bu.dot}`} />
                                    {bu.short}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-gray-500">{item.entity || "—"}</td>
                                <td className="py-2.5 px-3 text-xs text-gray-500">{item.category}</td>
                                <td className={`py-2.5 px-3 text-xs whitespace-nowrap font-medium ${item.status === "overdue" ? "text-red-600" : "text-gray-700"}`}>
                                  {fmtDate(item.dueDate)}
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
                                    <button onClick={() => handleOpenEdit(item)} title="Editar" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                      <Pencil size={13} />
                                    </button>
                                    <button onClick={() => handleToggleSettle(item.id)} title="Marcar como liquidado" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
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
                          <td colSpan={6} className="py-2.5 px-3 text-xs font-semibold text-gray-600">
                            Total em aberto{activeBU !== "all" ? ` — ${BU_MAP[activeBU].label}` : ""}
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
                          .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
                          .map((item) => {
                            const bu = BU_MAP[item.bu];
                            return (
                              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-2 px-3 text-xs text-gray-500 line-through max-w-[160px]">
                                  <div className="truncate">{item.description}</div>
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${bu.bg} ${bu.color}`}>
                                    {bu.short}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-xs text-gray-400">{item.entity || "—"}</td>
                                <td className="py-2 px-3 text-xs text-gray-400">{item.category}</td>
                                <td className="py-2 px-3 text-xs text-gray-400">{fmtDate(item.dueDate)}</td>
                                <td className="py-2 px-3">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 size={10} /> Liquidado
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right text-xs font-medium text-gray-400">{fmtR(item.amount)}</td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1 justify-end">
                                    <button onClick={() => handleOpenEdit(item)} title="Editar" className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                      <Pencil size={13} />
                                    </button>
                                    <button onClick={() => handleToggleSettle(item.id)} title="Reabrir" className="p-1.5 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
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
      </div>

      {/* ── Edit modal ───────────────────────────────────────────────────────── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editingItem.type === "ap"
                  ? <ArrowDownLeft size={16} className="text-red-600" />
                  : <ArrowUpRight size={16} className="text-emerald-600" />}
                <span className="text-sm font-semibold text-gray-800">
                  Editar {editingItem.type === "ap" ? "Conta a Pagar" : "Recebível"}
                </span>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text" placeholder="Descrição *" value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                className="sm:col-span-2 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text" placeholder="Contraparte (fornecedor / cliente)" value={editForm.entity}
                onChange={(e) => setEditForm((f) => ({ ...f, entity: e.target.value }))}
                className="sm:col-span-2 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
              />
              <input
                type="number" placeholder="Valor (R$) *" value={editForm.amount} min="0" step="0.01"
                onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
              />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Vencimento *</label>
                <input
                  type="date" value={editForm.dueDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Categoria</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                >
                  {(editingItem.type === "ap" ? AP_CATEGORIES : AR_CATEGORIES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Business Unit</label>
                <select
                  value={editForm.bu}
                  onChange={(e) => setEditForm((f) => ({ ...f, bu: e.target.value as BU }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                >
                  {BUS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSaveEdit}
                disabled={!editForm.description.trim() || !editForm.amount || !editForm.dueDate}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Salvar alterações
              </button>
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
