"use client";

// ─── /awq/epm/ar — Contas a Receber ──────────────────────────────────────────
// API-backed AR management with ISS auto-calculation, aging, and DSO tracking.

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import {
  ArrowUpRight, Plus, X, CheckCircle2, Trash2, Search,
  ChevronDown, ChevronUp, Receipt, Pencil,
} from "lucide-react";

interface EpmCustomer { id: string; name: string; doc?: string; }

// ─── Types ────────────────────────────────────────────────────────────────────

type BuCode   = "AWQ" | "JACQES" | "CAZA" | "ADVISOR" | "VENTURE";
type ARStatus = "PENDING" | "PARTIAL" | "RECEIVED" | "OVERDUE" | "CANCELLED";
type AgingBucket = "CURRENT" | "1-30d" | "31-60d" | "61-90d" | "+90d";

interface ARItem {
  id:              string;
  bu_code:         BuCode;
  customer_name:   string;
  description:     string;
  category:        string;
  cost_center?:    string;
  reference_doc?:  string;
  issue_date:      string;
  due_date:        string;
  gross_amount:    number;
  iss_rate:        number;
  iss_amount:      number;
  pis_rate:        number;
  pis_amount:      number;
  cofins_rate:     number;
  cofins_amount:   number;
  net_amount:      number;
  status:          ARStatus;
  received_date?:  string;
  received_amount?: number;
  receipt_ref?:    string;
  created_at:      string;
}

interface ARKPIs {
  totalAROutstanding: number;
  totalAROverdue:     number;
  totalARReceived:    number;
  dso:                number | null;
  ccc:                number | null;
  arAging:            Record<AgingBucket, number>;
}

// ─── AR fiscal calculation (ISS + PIS + COFINS) ───────────────────────────────

const AR_SERVICE_CATEGORIES = new Set(["Serviço Recorrente", "Projeto", "Consultoria", "Produção"]);

function r2(n: number) { return Math.round(n * 100) / 100; }
function pct(r: number) { return r > 0 ? (r * 100).toFixed(2).replace(/\.?0+$/, "") + "%" : "—"; }

function calcARFiscal(gross: number, category: string) {
  const isSvc      = AR_SERVICE_CATEGORIES.has(category);
  const iss_rate    = isSvc ? 0.05   : 0;
  const pis_rate    = isSvc ? 0.0065 : 0;
  const cofins_rate = isSvc ? 0.03   : 0;
  const iss_amount    = r2(gross * iss_rate);
  const pis_amount    = r2(gross * pis_rate);
  const cofins_amount = r2(gross * cofins_rate);
  const total         = r2(iss_amount + pis_amount + cofins_amount);
  return { iss_rate, iss_amount, pis_rate, pis_amount, cofins_rate, cofins_amount, total, net: r2(gross - total) };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ARStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: "Pendente",  color: "text-amber-700",   bg: "bg-amber-50"   },
  PARTIAL:  { label: "Parcial",   color: "text-brand-700",   bg: "bg-brand-50"   },
  RECEIVED: { label: "Recebido",  color: "text-emerald-700", bg: "bg-emerald-50" },
  OVERDUE:  { label: "Vencido",   color: "text-red-700",     bg: "bg-red-50"     },
  CANCELLED:{ label: "Cancelado", color: "text-gray-500",    bg: "bg-gray-100"   },
};

const AGING_CFG: Record<AgingBucket, { label: string; color: string }> = {
  "CURRENT": { label: "A receber", color: "text-emerald-600" },
  "1-30d":   { label: "1–30 dias", color: "text-amber-600"   },
  "31-60d":  { label: "31–60d",    color: "text-orange-600"  },
  "61-90d":  { label: "61–90d",    color: "text-red-600"     },
  "+90d":    { label: "+90 dias",  color: "text-red-800"     },
};

const CATEGORIES  = ["Serviço Recorrente", "Projeto", "Consultoria", "Produção", "Adiantamento", "Reembolso", "Outros"];
const BUS: BuCode[] = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ARPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [items,     setItems]     = useState<ARItem[]>([]);
  const [kpis,      setKPIs]      = useState<ARKPIs | null>(null);
  const [customers, setCustomers] = useState<EpmCustomer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [search,    setSearch]    = useState("");
  const [submitting,setSubmitting]= useState(false);
  const [expandedId,setExpandedId]= useState<string | null>(null);
  const [filterBU,  setFilterBU]  = useState<BuCode | "">("");
  const [statusFilter,setStatusFilter] = useState<ARStatus | "ALL">("ALL");
  const [recModal, setRecModal] = useState<{
    open: boolean; id: string; item: ARItem | null;
    received_date: string; received_amount: string; receipt_ref: string; saving: boolean;
  }>({ open: false, id: "", item: null, received_date: today, received_amount: "", receipt_ref: "", saving: false });
  const [editModal, setEditModal] = useState<{
    open: boolean; item: ARItem | null;
    customer_name: string; description: string; category: string;
    cost_center: string; reference_doc: string; due_date: string; saving: boolean;
  }>({ open: false, item: null, customer_name: "", description: "", category: "", cost_center: "", reference_doc: "", due_date: "", saving: false });
  const [costCenters, setCostCenters] = useState<{ id: string; code: string; name: string }[]>([]);

  const [form, setForm] = useState({
    bu_code:       "JACQES" as BuCode,
    customer_name: "",
    description:   "",
    category:      "Serviço Recorrente",
    cost_center:   "",
    reference_doc: "",
    issue_date:    today,
    due_date:      "",
    gross_amount:  "",
    installments:  "1",
  });

  const gross        = parseFloat(form.gross_amount) || 0;
  const fiscalPreview = gross > 0 ? calcARFiscal(gross, form.category) : null;

  // ── Load ─────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [listRes, kpisRes, custRes, ccRes] = await Promise.all([
        fetch("/api/epm/ar"),
        fetch("/api/epm/ar?view=kpis"),
        fetch("/api/epm/customers"),
        fetch("/api/epm/cost-centers"),
      ]);
      const listJson = await listRes.json() as { success: boolean; data: ARItem[] };
      const kpisJson = await kpisRes.json() as { success: boolean; data: ARKPIs };
      const custJson = await custRes.json() as { success: boolean; data: EpmCustomer[] };
      const ccJson   = await ccRes.json()  as { success: boolean; data: { id: string; code: string; name: string }[] };
      if (listJson.success) setItems(listJson.data);
      if (kpisJson.success) setKPIs(kpisJson.data);
      if (custJson.success) setCustomers(custJson.data);
      if (ccJson.success)   setCostCenters(ccJson.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!gross || gross <= 0) return;
    const n = parseInt(form.installments) || 1;
    setSubmitting(true);
    try {
      const payload = {
        bu_code:       form.bu_code,
        customer_name: form.customer_name,
        description:   form.description,
        category:      form.category,
        cost_center:   form.cost_center || undefined,
        reference_doc: form.reference_doc || undefined,
        issue_date:    form.issue_date,
        due_date:      form.due_date,
        gross_amount:  gross,
      };
      const endpoint = n > 1 ? "/api/epm/ar/installments" : "/api/epm/ar";
      const body     = n > 1 ? { ...payload, total_installments: n } : payload;
      const res      = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { success: boolean };
      if (json.success) {
        setShowForm(false);
        setForm((f) => ({ ...f, customer_name: "", description: "", reference_doc: "", due_date: "", gross_amount: "", installments: "1" }));
        await loadData();
      }
    } finally { setSubmitting(false); }
  }

  function openRecModal(item: ARItem) {
    setRecModal({ open: true, id: item.id, item, received_date: today, received_amount: String(item.net_amount), receipt_ref: "", saving: false });
  }

  async function confirmReceive() {
    if (!recModal.received_date || !recModal.received_amount) return;
    setRecModal((m) => ({ ...m, saving: true }));
    await fetch("/api/epm/ar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: recModal.id, action: "receive", received_date: recModal.received_date, received_amount: parseFloat(recModal.received_amount), receipt_ref: recModal.receipt_ref || undefined }),
    });
    setRecModal({ open: false, id: "", item: null, received_date: today, received_amount: "", receipt_ref: "", saving: false });
    await loadData();
  }

  async function handleDelete(id: string) {
    await fetch("/api/epm/ar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "delete" }),
    });
    await loadData();
  }

  function openEditModal(item: ARItem) {
    setEditModal({ open: true, item, customer_name: item.customer_name, description: item.description, category: item.category, cost_center: item.cost_center ?? "", reference_doc: item.reference_doc ?? "", due_date: item.due_date, saving: false });
  }

  async function confirmEdit() {
    if (!editModal.item) return;
    setEditModal((m) => ({ ...m, saving: true }));
    await fetch("/api/epm/ar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editModal.item.id, action: "update", customer_name: editModal.customer_name, description: editModal.description, category: editModal.category, cost_center: editModal.cost_center || undefined, reference_doc: editModal.reference_doc || undefined, due_date: editModal.due_date }),
    });
    setEditModal({ open: false, item: null, customer_name: "", description: "", category: "", cost_center: "", reference_doc: "", due_date: "", saving: false });
    await loadData();
  }

  // ── Filter ───────────────────────────────────────────────────────────────────

  const filtered = items.filter((i) => {
    if (filterBU && i.bu_code !== filterBU) return false;
    if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
    if (search !== "" &&
      !i.customer_name.toLowerCase().includes(search.toLowerCase()) &&
      !i.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const outstanding = items.filter((i) => i.status !== "RECEIVED" && i.status !== "CANCELLED");

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <Header
        title="Contas a Receber (AR)"
        subtitle={`EPM · AWQ Group · ${outstanding.length} em aberto${kpis?.dso != null ? ` · DSO ${kpis.dso}d` : ""}${kpis?.ccc != null ? ` · CCC ${kpis.ccc}d` : ""}`}
      />
      <div className="page-container">

        {/* ── KPI cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "A Receber",    value: fmtBRL(kpis?.totalAROutstanding ?? 0), color: "text-brand-700",   bg: "bg-brand-50"   },
            { label: "Vencido",      value: fmtBRL(kpis?.totalAROverdue     ?? 0), color: "text-red-700",     bg: "bg-red-50"     },
            { label: "Recebido",     value: fmtBRL(kpis?.totalARReceived    ?? 0), color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "DSO estimado", value: kpis?.dso != null ? `${kpis.dso}d` : "—", color: "text-amber-700", bg: "bg-amber-50" },
          ].map((c) => (
            <div key={c.label} className={`card p-4 text-center ${c.bg}`}>
              <div className={`text-xl font-bold tabular-nums ${c.color}`}>{c.value}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        {/* ── CCC note ──────────────────────────────────────────────── */}
        {kpis?.ccc != null && (
          <div className={`flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl border ${
            kpis.ccc > 0
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}>
            <span className="font-semibold">Cash Conversion Cycle (CCC):</span>
            <span>{kpis.ccc}d</span>
            <span className="text-gray-500">= DSO {kpis.dso}d − DPO {kpis.dso != null && kpis.ccc != null ? kpis.dso - kpis.ccc : "—"}d</span>
            <span className="ml-auto">
              {kpis.ccc > 30
                ? "⚠️ Alto — você financia clientes por mais de um mês"
                : kpis.ccc <= 0
                ? "✓ Saudável — clientes pagam antes de fornecedores"
                : "OK"}
            </span>
          </div>
        )}

        {/* ── Aging report ──────────────────────────────────────────── */}
        {kpis && outstanding.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Aging Report — AR (valor bruto)</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
              {(Object.keys(AGING_CFG) as AgingBucket[]).map((b) => (
                <div key={b} className="bg-gray-50 rounded-lg py-3">
                  <div className={`font-bold tabular-nums ${AGING_CFG[b].color}`}>
                    {fmtBRL(kpis.arAging[b] ?? 0)}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{AGING_CFG[b].label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BU filter ─────────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterBU("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!filterBU ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            Todas BUs
          </button>
          {BUS.map((b) => (
            <button key={b} onClick={() => setFilterBU(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterBU === b ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {b}
            </button>
          ))}
        </div>

        {/* ── Status filter ─────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap">
          {(["ALL", "PENDING", "OVERDUE", "PARTIAL", "RECEIVED", "CANCELLED"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s === "ALL" ? "Todos" : STATUS_CFG[s].label}
            </button>
          ))}
        </div>

        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente ou descrição…"
              className="flex-1 text-xs py-2 border-b border-gray-200 focus:outline-none focus:border-brand-500 bg-transparent"
            />
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancelar" : "Nova AR"}
          </button>
        </div>

        {/* ── Add form ──────────────────────────────────────────────── */}
        {showForm && (
          <form onSubmit={handleAdd} className="card p-5 border-2 border-brand-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Nova Conta a Receber</h2>
              <Link href="/awq/epm/ar/contracts" className="text-xs text-brand-600 hover:underline">
                Usar contrato recorrente →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Business Unit</label>
                <select
                  value={form.bu_code}
                  onChange={(e) => setForm((f) => ({ ...f, bu_code: e.target.value as BuCode }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {BUS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Cliente *</label>
                <input
                  required
                  list="customer-list"
                  type="text"
                  value={form.customer_name}
                  onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                  placeholder="Nome do cliente"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <datalist id="customer-list">
                  {customers.map((c) => <option key={c.id} value={c.name}>{c.name}{c.doc ? ` — ${c.doc}` : ""}</option>)}
                </datalist>
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-gray-600 mb-1">Descrição *</label>
                <input
                  required
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Retainer mensal JACQES — abr/2026"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Categoria (define ISS)</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}{AR_SERVICE_CATEGORIES.has(c) ? " (ISS+PIS+COFINS)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Centro de Custo</label>
                <select
                  value={form.cost_center}
                  onChange={(e) => setForm((f) => ({ ...f, cost_center: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">— Nenhum —</option>
                  {costCenters.map((cc) => <option key={cc.id} value={cc.code}>{cc.code} · {cc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Referência</label>
                <input
                  type="text"
                  value={form.reference_doc}
                  onChange={(e) => setForm((f) => ({ ...f, reference_doc: e.target.value }))}
                  placeholder="NF-e, proposta, contrato…"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Emissão</label>
                <input
                  type="date"
                  value={form.issue_date}
                  onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Vencimento *</label>
                <input
                  required
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Valor do Serviço (R$) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.gross_amount}
                  onChange={(e) => setForm((f) => ({ ...f, gross_amount: e.target.value }))}
                  placeholder="0,00"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Parcelas</label>
                <select
                  value={form.installments}
                  onChange={(e) => setForm((f) => ({ ...f, installments: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => (
                    <option key={n} value={n}>{n === 1 ? "À vista (1x)" : `${n}× mensais`}</option>
                  ))}
                </select>
                {parseInt(form.installments) > 1 && form.gross_amount && (
                  <div className="text-[10px] text-brand-600 mt-0.5">
                    {parseInt(form.installments)}× de {fmtBRL(Math.round(parseFloat(form.gross_amount) / parseInt(form.installments) * 100) / 100)}
                  </div>
                )}
              </div>
            </div>

            {/* ── Fiscal preview (ISS + PIS + COFINS) ─────────────── */}
            {fiscalPreview && gross > 0 && (
              <div className={`rounded-xl p-4 text-xs space-y-2 border ${
                fiscalPreview.total > 0
                  ? "bg-violet-50 border-violet-200"
                  : "bg-gray-50 border-gray-200"
              }`}>
                <div className="flex items-center gap-1.5 font-semibold text-violet-800 mb-2">
                  <Receipt size={12} />
                  {fiscalPreview.total > 0 ? "Tributos sobre receita — cálculo automático" : "Categoria sem tributos"}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "ISS",    rate: fiscalPreview.iss_rate,    amount: fiscalPreview.iss_amount    },
                    { label: "PIS",    rate: fiscalPreview.pis_rate,    amount: fiscalPreview.pis_amount    },
                    { label: "COFINS", rate: fiscalPreview.cofins_rate, amount: fiscalPreview.cofins_amount },
                  ].map((tax) => (
                    <div key={tax.label} className="bg-white rounded-lg p-2 border border-violet-100">
                      <div className="text-[10px] text-gray-500 font-medium">{tax.label}</div>
                      <div className="text-violet-700 font-bold tabular-nums">{fmtBRL(tax.amount)}</div>
                      <div className="text-[9px] text-gray-400">{pct(tax.rate)}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-violet-200">
                  <span className="text-gray-600">Total tributos: <strong className="text-violet-800">{fmtBRL(fiscalPreview.total)}</strong></span>
                  <span className="text-gray-600">
                    Líquido a receber: <strong className="text-emerald-700 text-sm">{fmtBRL(fiscalPreview.net)}</strong>
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              {submitting ? "Registrando…" : parseInt(form.installments) > 1 ? `Parcelar em ${form.installments}×` : "Registrar Conta a Receber"}
            </button>
          </form>
        )}

        {/* ── Items table ───────────────────────────────────────────── */}
        {loading ? (
          <div className="card p-12 text-center text-sm text-gray-400">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 flex flex-col items-center gap-3 text-center">
            <ArrowUpRight size={32} className="text-gray-200" />
            <div className="text-sm text-gray-400">
              {items.length === 0 ? "Nenhuma conta a receber registrada" : "Nenhum resultado"}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">Venc.</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">Cliente</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">BU</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Bruto</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Tributos</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Líquido</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.sort((a, b) => a.due_date.localeCompare(b.due_date)).map((item) => {
                    const sc       = STATUS_CFG[item.status];
                    const expanded = expandedId === item.id;
                    return [
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedId(expanded ? null : item.id)}
                      >
                        <td className="py-2.5 px-3 tabular-nums text-gray-500 whitespace-nowrap">
                          {fmtDate(item.due_date)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-gray-800">{item.customer_name}</div>
                          <div className="text-[10px] text-gray-400 truncate max-w-[160px]">{item.description}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">
                            {item.bu_code}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-gray-500">
                          {fmtBRL(item.gross_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-violet-700">
                          {(item.iss_amount + item.pis_amount + item.cofins_amount) > 0
                            ? `(${fmtBRL(r2(item.iss_amount + item.pis_amount + item.cofins_amount))})`
                            : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-emerald-700">
                          {fmtBRL(item.net_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.color} ${sc.bg}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {item.status !== "RECEIVED" && item.status !== "CANCELLED" && (
                              <button
                                onClick={() => openRecModal(item)}
                                title="Registrar recebimento"
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              >
                                <CheckCircle2 size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(item)}
                              title="Editar"
                              className="p-1 text-brand-500 hover:bg-brand-50 rounded transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              title="Excluir"
                              className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                            {expanded
                              ? <ChevronUp size={13} className="text-gray-400" />
                              : <ChevronDown size={13} className="text-gray-400" />
                            }
                          </div>
                        </td>
                      </tr>,
                      expanded && (
                        <tr key={`${item.id}-detail`} className="bg-violet-50 border-b border-violet-100">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                              {[
                                { label: "ISS",    rate: item.iss_rate,    amount: item.iss_amount    },
                                { label: "PIS",    rate: item.pis_rate,    amount: item.pis_amount    },
                                { label: "COFINS", rate: item.cofins_rate, amount: item.cofins_amount },
                              ].map((t) => (
                                <div key={t.label} className="bg-white rounded-lg px-3 py-2 border border-violet-100 text-center">
                                  <div className="text-gray-500 font-medium">{t.label} ({pct(t.rate)})</div>
                                  <div className={`font-bold tabular-nums ${t.amount > 0 ? "text-violet-700" : "text-gray-300"}`}>
                                    {fmtBRL(t.amount)}
                                  </div>
                                </div>
                              ))}
                              <div className="bg-white rounded-lg px-3 py-2 border border-violet-100 text-center">
                                <div className="text-gray-500 font-medium">Líquido reconhecido</div>
                                <div className="font-bold tabular-nums text-emerald-700">{fmtBRL(item.net_amount)}</div>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-gray-500">
                              <span>Emissão: <strong>{fmtDate(item.issue_date)}</strong></span>
                              {item.cost_center && <span>CC: <strong>{item.cost_center}</strong></span>}
                              {item.reference_doc && <span>Doc: <strong>{item.reference_doc}</strong></span>}
                              {item.received_date && (
                                <span>Recebido em: <strong>{fmtDate(item.received_date)}</strong>
                                  {item.received_amount && ` · ${fmtBRL(item.received_amount)}`}
                                  {item.receipt_ref && ` · ${item.receipt_ref}`}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/ap" className="text-brand-600 hover:underline">Contas a Pagar →</Link>
        </div>

      </div>

      {/* ── Edit modal ───────────────────────────────────────────────── */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Editar Conta a Receber</h2>
              <button onClick={() => setEditModal((m) => ({ ...m, open: false }))} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Cliente</label>
                <input type="text" value={editModal.customer_name}
                  onChange={(e) => setEditModal((m) => ({ ...m, customer_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Descrição</label>
                <input type="text" value={editModal.description}
                  onChange={(e) => setEditModal((m) => ({ ...m, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Categoria</label>
                  <select value={editModal.category}
                    onChange={(e) => setEditModal((m) => ({ ...m, category: e.target.value }))}
                    className="w-full px-2 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Centro de Custo</label>
                  <select value={editModal.cost_center}
                    onChange={(e) => setEditModal((m) => ({ ...m, cost_center: e.target.value }))}
                    className="w-full px-2 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                    <option value="">— Nenhum —</option>
                    {costCenters.map((cc) => <option key={cc.id} value={cc.code}>{cc.code} · {cc.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Vencimento</label>
                  <input type="date" value={editModal.due_date}
                    onChange={(e) => setEditModal((m) => ({ ...m, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Referência</label>
                  <input type="text" value={editModal.reference_doc}
                    onChange={(e) => setEditModal((m) => ({ ...m, reference_doc: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditModal((m) => ({ ...m, open: false }))}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmEdit} disabled={editModal.saving}
                className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors">
                {editModal.saving ? "Salvando…" : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Receive modal ────────────────────────────────────────────── */}
      {recModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Registrar Recebimento</h2>
              <button onClick={() => setRecModal((m) => ({ ...m, open: false }))} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            {recModal.item && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-semibold text-gray-700">{recModal.item.customer_name}</span>
                {" · "}{recModal.item.description}
                <span className="ml-2 font-bold text-emerald-700">{fmtBRL(recModal.item.net_amount)}</span>
              </div>
            )}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Data de recebimento *</label>
                <input type="date" value={recModal.received_date}
                  onChange={(e) => setRecModal((m) => ({ ...m, received_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Valor recebido *</label>
                <input type="number" step="0.01" min="0.01" value={recModal.received_amount}
                  onChange={(e) => setRecModal((m) => ({ ...m, received_amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Referência (txid PIX, etc.)</label>
                <input type="text" value={recModal.receipt_ref} placeholder="Opcional"
                  onChange={(e) => setRecModal((m) => ({ ...m, receipt_ref: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setRecModal((m) => ({ ...m, open: false }))}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmReceive} disabled={recModal.saving || !recModal.received_date || !recModal.received_amount}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors">
                {recModal.saving ? "Salvando…" : "Confirmar Recebimento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
