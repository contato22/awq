"use client";

// ─── /awq/ap-ar — Contas a Pagar (AP) & Contas a Receber (AR) ────────────────
//
// ROLE: Gestão de obrigações a pagar e direitos a receber da tesouraria.
//       Dados em localStorage — rastreio manual de AP/AR.
//
// ARCHITECTURE:
//   • AP (Accounts Payable)  — obrigações: fornecedores, impostos, folha, etc.
//   • AR (Accounts Receivable) — direitos: clientes, adiantamentos, reembolsos.
//   • localStorage("awq_ap_items") — não persistido no servidor (dívida técnica)

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType = "ap" | "ar";
type ItemStatus = "pending" | "overdue" | "settled";

interface APARItem {
  id: string;
  type: ItemType;
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

const AP_CATEGORIES = [
  "Fornecedor",
  "Folha / Pró-labore",
  "Imposto / Tributo",
  "Aluguel",
  "Serviços",
  "Software / SaaS",
  "Marketing",
  "Financiamento",
  "Outros",
];

const AR_CATEGORIES = [
  "Cliente",
  "Adiantamento",
  "Reembolso",
  "Receita a Receber",
  "Nota Fiscal Emitida",
  "Outros",
];

const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: "Pendente",   color: "bg-amber-100 text-amber-700",   icon: Clock         },
  overdue:  { label: "Vencido",    color: "bg-red-100 text-red-700",       icon: AlertTriangle },
  settled:  { label: "Liquidado",  color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(1) + "K";
  return (
    sign +
    "R$" +
    abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

function fmtDate(s: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function computeStatus(dueDate: string, currentStatus: ItemStatus): ItemStatus {
  if (currentStatus === "settled") return "settled";
  if (dueDate && dueDate < today()) return "overdue";
  return "pending";
}

// ─── Empty form state ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  description: "",
  entity: "",
  amount: "",
  dueDate: "",
  category: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function APARPage() {
  const [items, setItems]           = useState<APARItem[]>([]);
  const [activeTab, setActiveTab]   = useState<ItemType>("ap");
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [formType, setFormType]     = useState<ItemType>("ap");

  // ── Load from localStorage ───────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as APARItem[];
        // Recompute overdue status on load
        const refreshed = parsed.map((item) => ({
          ...item,
          status: computeStatus(item.dueDate, item.status),
        }));
        setItems(refreshed);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Persist to localStorage ──────────────────────────────────────────────
  const save = useCallback((updated: APARItem[]) => {
    setItems(updated);
    try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }, []);

  // ── Add item ─────────────────────────────────────────────────────────────
  function handleAdd() {
    if (!form.description.trim() || !form.amount || !form.dueDate) return;
    const item: APARItem = {
      id: uid(),
      type: formType,
      description: form.description.trim(),
      entity: form.entity.trim(),
      amount: parseFloat(form.amount) || 0,
      dueDate: form.dueDate,
      status: computeStatus(form.dueDate, "pending"),
      category: form.category || (formType === "ap" ? AP_CATEGORIES[0] : AR_CATEGORIES[0]),
      createdAt: today(),
    };
    save([...items, item]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  // ── Toggle settled ───────────────────────────────────────────────────────
  function handleToggleSettle(id: string) {
    const updated = items.map((item) => {
      if (item.id !== id) return item;
      if (item.status === "settled") {
        return { ...item, status: computeStatus(item.dueDate, "pending") };
      }
      return { ...item, status: "settled" as ItemStatus };
    });
    save(updated);
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    save(items.filter((i) => i.id !== id));
  }

  // ── Derived metrics ──────────────────────────────────────────────────────
  const apItems = items.filter((i) => i.type === "ap");
  const arItems = items.filter((i) => i.type === "ar");

  const totalAP         = apItems.filter((i) => i.status !== "settled").reduce((s, i) => s + i.amount, 0);
  const totalAR         = arItems.filter((i) => i.status !== "settled").reduce((s, i) => s + i.amount, 0);
  const overdueAP       = apItems.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const overdueAR       = arItems.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  const visibleItems    = items.filter((i) => i.type === activeTab);
  const openItems       = visibleItems.filter((i) => i.status !== "settled");
  const settledItems    = visibleItems.filter((i) => i.status === "settled");

  const categories      = activeTab === "ap" ? AP_CATEGORIES : AR_CATEGORIES;

  function openForm(type: ItemType) {
    setFormType(type);
    setForm({ ...EMPTY_FORM, category: type === "ap" ? AP_CATEGORIES[0] : AR_CATEGORIES[0] });
    setShowForm(true);
  }

  return (
    <>
      <Header
        title="AP & AR"
        subtitle="Contas a Pagar · Contas a Receber · Tesouraria"
      />
      <div className="px-8 py-6 space-y-5">

        {/* ── Summary cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total a Pagar (AP)",
              value: fmtR(totalAP),
              icon: TrendingDown,
              color: "text-red-600",
              bg: "bg-red-50",
              delta: `${apItems.filter((i) => i.status !== "settled").length} obrigação(ões)`,
            },
            {
              label: "Total a Receber (AR)",
              value: fmtR(totalAR),
              icon: TrendingUp,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              delta: `${arItems.filter((i) => i.status !== "settled").length} direito(s)`,
            },
            {
              label: "AP Vencido",
              value: fmtR(overdueAP),
              icon: AlertTriangle,
              color: "text-orange-600",
              bg: "bg-orange-50",
              delta: `${apItems.filter((i) => i.status === "overdue").length} item(ns) em atraso`,
            },
            {
              label: "AR Vencido",
              value: fmtR(overdueAR),
              icon: CalendarDays,
              color: "text-amber-700",
              bg: "bg-amber-50",
              delta: `${arItems.filter((i) => i.status === "overdue").length} recebível(is) em atraso`,
            },
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

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-gray-200">
          {(["ap", "ar"] as ItemType[]).map((tab) => {
            const isAP = tab === "ap";
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                  activeTab === tab
                    ? isAP
                      ? "border-red-500 text-red-700"
                      : "border-emerald-500 text-emerald-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {isAP ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                {isAP ? "AP — Contas a Pagar" : "AR — Contas a Receber"}
                {items.filter((i) => i.type === tab && i.status !== "settled").length > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isAP ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {items.filter((i) => i.type === tab && i.status !== "settled").length}
                  </span>
                )}
              </button>
            );
          })}
          <div className="flex-1" />
          <button
            onClick={() => openForm(activeTab)}
            className={`flex items-center gap-2 px-4 py-2 mb-1.5 rounded-lg text-sm font-semibold transition-colors text-white ${
              activeTab === "ap"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            <Plus size={14} />
            {activeTab === "ap" ? "Nova Obrigação" : "Novo Recebível"}
          </button>
        </div>

        {/* ── Add form ─────────────────────────────────────────────────────── */}
        {showForm && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {formType === "ap"
                  ? <ArrowDownLeft size={16} className="text-red-600" />
                  : <ArrowUpRight size={16} className="text-emerald-600" />
                }
                <span className="text-sm font-semibold text-gray-800">
                  {formType === "ap" ? "Nova Conta a Pagar" : "Novo Recebível"}
                </span>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Descrição *"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
              />
              <input
                type="text"
                placeholder="Contraparte (fornecedor / cliente)"
                value={form.entity}
                onChange={(e) => setForm((f) => ({ ...f, entity: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
              />
              <input
                type="number"
                placeholder="Valor (R$) *"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
              />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">
                  Vencimento *
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                />
              </div>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!form.description.trim() || !form.amount || !form.dueDate}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors text-white disabled:opacity-40 disabled:cursor-not-allowed ${
                    formType === "ap"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Items table ───────────────────────────────────────────────────── */}
        <div className="card p-5">
          {/* Open items */}
          {openItems.length === 0 && settledItems.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <FileText size={32} className="text-gray-200 mx-auto" />
              <div className="text-sm font-semibold text-gray-400">
                {activeTab === "ap" ? "Nenhuma conta a pagar registrada" : "Nenhum recebível registrado"}
              </div>
              <div className="text-xs text-gray-400">
                Clique em &ldquo;{activeTab === "ap" ? "Nova Obrigação" : "Novo Recebível"}&rdquo; para adicionar
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Open */}
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
                          <th className="text-left py-2 px-3 text-xs font-semibold">Contraparte</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold">Categoria</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold">Vencimento</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold">Status</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold">Valor</th>
                          <th className="py-2 px-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {openItems
                          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                          .map((item) => {
                            const st = STATUS_CONFIG[item.status];
                            const StatusIcon = st.icon;
                            return (
                              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-2.5 px-3 text-xs text-gray-900 font-medium max-w-[180px]">
                                  <div className="truncate">{item.description}</div>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-gray-500">
                                  {item.entity || "—"}
                                </td>
                                <td className="py-2.5 px-3 text-xs text-gray-500">
                                  {item.category}
                                </td>
                                <td className={`py-2.5 px-3 text-xs whitespace-nowrap font-medium ${
                                  item.status === "overdue" ? "text-red-600" : "text-gray-700"
                                }`}>
                                  {fmtDate(item.dueDate)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                                    <StatusIcon size={10} />
                                    {st.label}
                                  </span>
                                </td>
                                <td className={`py-2.5 px-3 text-right text-xs font-bold ${
                                  activeTab === "ap" ? "text-red-600" : "text-emerald-600"
                                }`}>
                                  {activeTab === "ap" ? "-" : "+"}{fmtR(item.amount)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1 justify-end">
                                    <button
                                      onClick={() => handleToggleSettle(item.id)}
                                      title="Marcar como liquidado"
                                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    >
                                      <CheckCircle2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(item.id)}
                                      title="Excluir"
                                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
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
                          <td colSpan={5} className="py-2.5 px-3 text-xs font-semibold text-gray-600">
                            Total em aberto
                          </td>
                          <td className={`py-2.5 px-3 text-right text-sm font-bold ${
                            activeTab === "ap" ? "text-red-600" : "text-emerald-600"
                          }`}>
                            {activeTab === "ap" ? "-" : "+"}{fmtR(openItems.reduce((s, i) => s + i.amount, 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Settled */}
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
                          .map((item) => (
                            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-2 px-3 text-xs text-gray-500 line-through max-w-[180px]">
                                <div className="truncate">{item.description}</div>
                              </td>
                              <td className="py-2 px-3 text-xs text-gray-400">{item.entity || "—"}</td>
                              <td className="py-2 px-3 text-xs text-gray-400">{item.category}</td>
                              <td className="py-2 px-3 text-xs text-gray-400">{fmtDate(item.dueDate)}</td>
                              <td className="py-2 px-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                                  <CheckCircle2 size={10} />
                                  Liquidado
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right text-xs font-medium text-gray-400">
                                {fmtR(item.amount)}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    onClick={() => handleToggleSettle(item.id)}
                                    title="Reabrir"
                                    className="p-1.5 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                  >
                                    <Clock size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
