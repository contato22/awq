"use client";

// ─── /awq/ap-ar — AP (server) + AR (localStorage) ────────────────────────────

import { useState, useEffect, useCallback, type ElementType, type FormEvent } from "react";
import Header from "@/components/Header";
import APForm, { BUS, type BU } from "@/components/ap/APForm";
import PayModal from "@/components/ap/PayModal";
import {
  ArrowDownLeft, ArrowUpRight, Plus, Trash2, AlertTriangle,
  CheckCircle2, Clock, X, FileText, TrendingDown, TrendingUp,
  CalendarDays, Building2, Pencil, DollarSign, RefreshCw,
} from "lucide-react";
import type { AccountsPayable } from "@/lib/ap-types";
import { AP_STATUS_CONFIG, AP_DOCUMENT_TYPE_LABELS, AP_PAYMENT_METHOD_LABELS } from "@/lib/ap-types";

// ── AR types (localStorage, unchanged) ───────────────────────────────────────

type ARStatus = "pending" | "overdue" | "settled";

interface ARItem {
  id: string; bu: BU; description: string; entity: string;
  amount: number; dueDate: string; status: ARStatus; category: string; createdAt: string;
}

const AR_CATEGORIES = ["Cliente","Adiantamento","Reembolso","Receita a Receber","Nota Fiscal Emitida","Outros"];
const AR_LS_KEY = "awq_ar_items";

const AR_STATUS_CONFIG: Record<ARStatus, { label: string; color: string; icon: ElementType }> = {
  pending: { label: "Pendente",  color: "bg-amber-100 text-amber-700",    icon: Clock         },
  overdue: { label: "Vencido",   color: "bg-red-100 text-red-700",        icon: AlertTriangle },
  settled: { label: "Liquidado", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2  },
};

const BU_MAP = Object.fromEntries(BUS.map((b) => [b.id, b])) as Record<BU, typeof BUS[0]>;

const BU_STYLES: Record<BU, { color: string; bg: string; dot: string; short: string }> = {
  awq:     { color: "text-amber-700",   bg: "bg-amber-50",   dot: "bg-amber-500",   short: "Holding"  },
  jacqes:  { color: "text-blue-700",    bg: "bg-blue-50",    dot: "bg-blue-500",    short: "JACQES"   },
  caza:    { color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500", short: "Caza"     },
  venture: { color: "text-orange-700",  bg: "bg-orange-50",  dot: "bg-orange-500",  short: "Venture"  },
  advisor: { color: "text-violet-700",  bg: "bg-violet-50",  dot: "bg-violet-500",  short: "Advisor"  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  const abs = Math.abs(n), s = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return s + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return s + "R$" + (abs / 1_000).toFixed(1) + "K";
  return s + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string | undefined) {
  if (!s) return "—";
  const d = s.slice(0, 10); const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function today() { return new Date().toISOString().slice(0, 10); }

function arStatus(dueDate: string, cur: ARStatus): ARStatus {
  if (cur === "settled") return "settled";
  return dueDate < today() ? "overdue" : "pending";
}

const EMPTY_AR = { description: "", entity: "", amount: "", dueDate: "", category: "", bu: "awq" as BU };

// ── Component ─────────────────────────────────────────────────────────────────

export default function APARPage() {
  // ── AP state (server) ──────────────────────────────────────────────────────
  const [apItems, setApItems] = useState<AccountsPayable[]>([]);
  const [apLoading, setApLoading] = useState(false);
  const [payingItem, setPayingItem] = useState<AccountsPayable | null>(null);
  const [showAPForm, setShowAPForm] = useState(false);

  // ── AR state (localStorage) ────────────────────────────────────────────────
  const [arItems, setArItems] = useState<ARItem[]>([]);
  const [arForm, setArForm] = useState(EMPTY_AR);
  const [arEditing, setArEditing] = useState<string | null>(null);
  const [showARForm, setShowARForm] = useState(false);

  // ── Shared UI state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"ap" | "ar">("ap");
  const [activeBU, setActiveBU] = useState<BU | "all">("all");

  // ── AP: fetch from server ──────────────────────────────────────────────────
  const fetchAP = useCallback(async () => {
    setApLoading(true);
    try {
      const qs = activeBU !== "all" ? `?bu=${activeBU}` : "";
      const res = await fetch(`/api/ap${qs}`);
      if (res.ok) setApItems(await res.json());
    } finally {
      setApLoading(false);
    }
  }, [activeBU]);

  useEffect(() => { fetchAP(); }, [fetchAP]);

  async function handleCancelAP(id: number) {
    if (!confirm("Cancelar esta conta a pagar?")) return;
    await fetch(`/api/ap/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ by: "user" }) });
    fetchAP();
  }

  // ── AR: localStorage ───────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AR_LS_KEY);
      if (raw) setArItems(JSON.parse(raw) as ARItem[]);
    } catch { /* ignore */ }
  }, []);

  function saveAR(items: ARItem[]) {
    setArItems(items);
    localStorage.setItem(AR_LS_KEY, JSON.stringify(items));
  }

  function submitAR(e: FormEvent) {
    e.preventDefault();
    const amount = parseFloat(String(arForm.amount));
    if (!arForm.description || !arForm.entity || isNaN(amount) || !arForm.dueDate || !arForm.category) return;
    if (arEditing) {
      saveAR(arItems.map((i: ARItem) => i.id === arEditing
        ? { ...i, ...arForm, amount, status: arStatus(arForm.dueDate, i.status) }
        : i));
      setArEditing(null);
    } else {
      const item: ARItem = {
        id: uid(), bu: arForm.bu as BU, description: arForm.description,
        entity: arForm.entity, amount, dueDate: arForm.dueDate,
        category: arForm.category, status: arStatus(arForm.dueDate, "pending"),
        createdAt: new Date().toISOString(),
      };
      saveAR([item, ...arItems]);
    }
    setArForm(EMPTY_AR);
    setShowARForm(false);
  }

  function editAR(item: ARItem) {
    setArForm({ description: item.description, entity: item.entity, amount: String(item.amount), dueDate: item.dueDate, category: item.category, bu: item.bu });
    setArEditing(item.id);
    setShowARForm(true);
  }

  function settleAR(id: string) {
    saveAR(arItems.map((i: ARItem) => i.id === id ? { ...i, status: "settled" as ARStatus } : i));
  }

  function deleteAR(id: string) {
    if (!confirm("Remover este lançamento?")) return;
    saveAR(arItems.filter((i: ARItem) => i.id !== id));
  }

  // ── Derived totals ─────────────────────────────────────────────────────────
  const apFiltered = activeBU === "all" ? apItems : apItems.filter((i: AccountsPayable) => i.bu === activeBU);
  const arFiltered = activeBU === "all" ? arItems : arItems.filter((i: ARItem) => i.bu === activeBU);

  const apTotal   = apFiltered.filter((i: AccountsPayable) => i.status !== "cancelled").reduce((s: number, i: AccountsPayable) => s + i.net_amount, 0);
  const apPending = apFiltered.filter((i: AccountsPayable) => i.status === "pending" || i.status === "overdue").reduce((s: number, i: AccountsPayable) => s + i.net_amount, 0);
  const arTotal   = arFiltered.filter((i: ARItem) => i.status !== "settled").reduce((s: number, i: ARItem) => s + i.amount, 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Contas a Pagar / Receber" />
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Page title ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contas a Pagar / Receber</h1>
            <p className="text-sm text-gray-500 mt-1">Gestão financeira consolidada</p>
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="w-5 h-5 text-red-500" /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">AP — Total a Pagar</p>
              <p className="text-lg font-bold text-red-600">{fmtR(apTotal)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="p-2 bg-amber-50 rounded-lg"><Clock className="w-5 h-5 text-amber-500" /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">AP — Pendente / Vencido</p>
              <p className="text-lg font-bold text-amber-600">{fmtR(apPending)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-500" /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">AR — Total a Receber</p>
              <p className="text-lg font-bold text-emerald-600">{fmtR(arTotal)}</p>
            </div>
          </div>
        </div>

        {/* ── BU Filter ── */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(["all", ...Object.keys(BU_STYLES)] as (BU | "all")[]).map((bu) => {
            const style = bu !== "all" ? BU_STYLES[bu] : null;
            return (
              <button key={bu} onClick={() => setActiveBU(bu)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${activeBU === bu ? (style ? `${style.bg} ${style.color} border-current` : "bg-gray-800 text-white border-gray-800") : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                {bu === "all" ? "Todas BUs" : (BU_MAP[bu]?.label ?? bu)}
              </button>
            );
          })}
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-200 mb-4">
          {(["ap", "ar"] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === t ? "border-amber-500 text-amber-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t === "ap" ? <><ArrowUpRight className="inline w-4 h-4 mr-1" />Contas a Pagar</> : <><ArrowDownLeft className="inline w-4 h-4 mr-1" />Contas a Receber</>}
            </button>
          ))}
        </div>

        {/* ══════════════════════ AP TAB ══════════════════════ */}
        {activeTab === "ap" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{apFiltered.length} lançamento(s)</p>
              <div className="flex gap-2">
                <button onClick={fetchAP} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <RefreshCw className={`w-4 h-4 ${apLoading ? "animate-spin" : ""}`} /> Atualizar
                </button>
                <button onClick={() => setShowAPForm(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600">
                  <Plus className="w-4 h-4" /> Nova Conta a Pagar
                </button>
              </div>
            </div>

            {/* AP Form (slide-down) */}
            {showAPForm && (
              <div className="mb-6 bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">Nova Conta a Pagar</h2>
                  <button onClick={() => setShowAPForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <APForm
                  defaultBU={activeBU !== "all" ? activeBU : "awq"}
                  onSuccess={() => { setShowAPForm(false); fetchAP(); }}
                  onCancel={() => setShowAPForm(false)}
                />
              </div>
            )}

            {/* AP Table */}
            {apLoading && apItems.length === 0 ? (
              <div className="flex justify-center py-16 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Carregando…
              </div>
            ) : apFiltered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nenhuma conta a pagar</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {["BU","Fornecedor","Documento","Vencimento","Valor Líquido","Status","Ações"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {apFiltered.map((ap) => {
                      const cfg = AP_STATUS_CONFIG[ap.status];
                      const StatusIcon = cfg.icon;
                      const buStyle = BU_STYLES[ap.bu as BU];
                      const docLabel = AP_DOCUMENT_TYPE_LABELS[ap.document_type] ?? ap.document_type;
                      return (
                        <tr key={ap.ap_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {buStyle ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${buStyle.bg} ${buStyle.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${buStyle.dot}`} />{buStyle.short}
                              </span>
                            ) : <span className="text-gray-500">{ap.bu}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 truncate max-w-[160px]">{(ap as AccountsPayable & { supplier_name?: string }).supplier_name ?? `#${ap.supplier_id}`}</div>
                            {ap.description && <div className="text-xs text-gray-400 truncate max-w-[160px]">{ap.description}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-gray-600">
                              <FileText className="w-3.5 h-3.5 shrink-0" />{docLabel}
                            </div>
                            {ap.document_number && <div className="text-xs text-gray-400">{ap.document_number}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-gray-700">
                              <CalendarDays className="w-3.5 h-3.5 shrink-0" />{fmtDate(ap.due_date)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{fmtR(ap.net_amount)}</div>
                            {ap.gross_amount !== ap.net_amount && (
                              <div className="text-xs text-gray-400">Bruto: {fmtR(ap.gross_amount)}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                              <StatusIcon className="w-3 h-3" />{cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {(ap.status === "pending" || ap.status === "overdue") && (
                                <button onClick={() => setPayingItem(ap)} title="Registrar pagamento"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              )}
                              {ap.status !== "cancelled" && ap.status !== "paid" && (
                                <button onClick={() => handleCancelAP(ap.ap_id)} title="Cancelar"
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════ AR TAB ══════════════════════ */}
        {activeTab === "ar" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{arFiltered.length} lançamento(s)</p>
              <button onClick={() => { setArEditing(null); setArForm(EMPTY_AR); setShowARForm((v) => !v); }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600">
                <Plus className="w-4 h-4" /> Nova Conta a Receber
              </button>
            </div>

            {/* AR Form */}
            {showARForm && (
              <form onSubmit={submitAR} className="mb-6 bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">{arEditing ? "Editar" : "Nova"} Conta a Receber</h2>
                  <button type="button" onClick={() => { setShowARForm(false); setArEditing(null); setArForm(EMPTY_AR); }} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">BU</label>
                    <select value={arForm.bu} onChange={(e) => setArForm((f) => ({ ...f, bu: e.target.value as BU }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      {BUS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                    <select value={arForm.category} onChange={(e) => setArForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required>
                      <option value="">Selecione…</option>
                      {AR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
                    <input value={arForm.description} onChange={(e) => setArForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required placeholder="Ex: NF 001/2025" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Entidade (Devedor)</label>
                    <input value={arForm.entity} onChange={(e) => setArForm((f) => ({ ...f, entity: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required placeholder="Nome ou CNPJ" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" min="0" value={arForm.amount} onChange={(e) => setArForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Vencimento</label>
                    <input type="date" value={arForm.dueDate} onChange={(e) => setArForm((f) => ({ ...f, dueDate: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => { setShowARForm(false); setArEditing(null); setArForm(EMPTY_AR); }}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="px-4 py-2 text-sm font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                    {arEditing ? "Salvar" : "Adicionar"}
                  </button>
                </div>
              </form>
            )}

            {/* AR Table */}
            {arFiltered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nenhuma conta a receber</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {["BU","Descrição","Entidade","Vencimento","Valor","Status","Ações"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {arFiltered.map((ar) => {
                      const live = { ...ar, status: arStatus(ar.dueDate, ar.status) };
                      const cfg  = AR_STATUS_CONFIG[live.status];
                      const StatusIcon = cfg.icon;
                      const buStyle = BU_STYLES[ar.bu];
                      return (
                        <tr key={ar.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {buStyle ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${buStyle.bg} ${buStyle.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${buStyle.dot}`} />{buStyle.short}
                              </span>
                            ) : <span className="text-gray-500">{ar.bu}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{ar.description}</div>
                            <div className="text-xs text-gray-400">{ar.category}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <div className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 shrink-0" />{ar.entity}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-gray-700">
                              <CalendarDays className="w-3.5 h-3.5 shrink-0" />{fmtDate(ar.dueDate)}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{fmtR(ar.amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                              <StatusIcon className="w-3 h-3" />{cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {live.status !== "settled" && (
                                <>
                                  <button onClick={() => editAR(ar)} title="Editar"
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                  <button onClick={() => settleAR(ar.id)} title="Marcar como liquidado"
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><CheckCircle2 className="w-4 h-4" /></button>
                                </>
                              )}
                              <button onClick={() => deleteAR(ar.id)} title="Remover"
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Pay Modal ── */}
      {payingItem && (
        <PayModal
          ap={payingItem}
          onClose={() => setPayingItem(null)}
          onSuccess={() => { setPayingItem(null); fetchAP(); }}
        />
      )}
    </div>
  );
}
