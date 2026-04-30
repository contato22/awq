"use client";

// ─── /awq/epm/ap — Contas a Pagar ────────────────────────────────────────────
// API-backed AP management with Brazilian fiscal retention auto-calculation.
// IRRF / INSS / ISS / PIS / COFINS computed client-side on form, stored server-side.

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import {
  ArrowDownLeft, Plus, X, CheckCircle2, Trash2, Search,
  ChevronDown, ChevronUp, AlertTriangle, Receipt,
} from "lucide-react";

interface EpmSupplier {
  id: string; name: string; doc?: string; supplier_type: SupplierType;
  bank_info?: string; notes?: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BuCode        = "AWQ" | "JACQES" | "CAZA" | "ADVISOR" | "VENTURE";
type APStatus      = "PENDING" | "SCHEDULED" | "PAID" | "OVERDUE" | "CANCELLED";
type SupplierType  = "service_professional" | "service_cleaning" | "service_construction" | "goods" | "rent" | "other";
type AgingBucket   = "CURRENT" | "1-30d" | "31-60d" | "61-90d" | "+90d";

interface APItem {
  id:               string;
  bu_code:          BuCode;
  supplier_name:    string;
  supplier_type:    SupplierType;
  description:      string;
  category:         string;
  reference_doc?:   string;
  issue_date:       string;
  due_date:         string;
  gross_amount:     number;
  irrf_rate:        number;
  irrf_amount:      number;
  inss_rate:        number;
  inss_amount:      number;
  iss_rate:         number;
  iss_amount:       number;
  pis_rate:         number;
  pis_amount:       number;
  cofins_rate:      number;
  cofins_amount:    number;
  total_retentions: number;
  net_amount:       number;
  status:           APStatus;
  paid_date?:       string;
  paid_amount?:     number;
  payment_ref?:     string;
  created_at:       string;
}

interface APKPIs {
  totalAPOutstanding: number;
  totalAPOverdue:     number;
  totalAPPaid:        number;
  dpo:                number | null;
  apAging:            Record<AgingBucket, number>;
}

// ─── Fiscal defaults (mirrors lib/ap-ar-db.ts — client-safe copy) ─────────────

const FISCAL_DEFAULTS: Record<SupplierType, { irrf: number; inss: number; iss: number; pis: number; cofins: number }> = {
  service_professional: { irrf: 0.015, inss: 0,    iss: 0.05, pis: 0.0065, cofins: 0.03 },
  service_cleaning:     { irrf: 0.01,  inss: 0.11, iss: 0.05, pis: 0.0065, cofins: 0.03 },
  service_construction: { irrf: 0.015, inss: 0.11, iss: 0.05, pis: 0.0065, cofins: 0.03 },
  goods:                { irrf: 0,     inss: 0,    iss: 0,    pis: 0,      cofins: 0    },
  rent:                 { irrf: 0.015, inss: 0,    iss: 0,    pis: 0,      cofins: 0    },
  other:                { irrf: 0,     inss: 0,    iss: 0,    pis: 0,      cofins: 0    },
};

const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  service_professional: "Serv. Profissional (IRRF 1.5% + ISS 5% + PIS/COFINS)",
  service_cleaning:     "Limpeza/Conservação (IRRF 1% + INSS 11% + ISS 5%)",
  service_construction: "Construção/Obra (IRRF 1.5% + INSS 11% + ISS 5%)",
  goods:                "Compra de Mercadoria (sem retenção)",
  rent:                 "Aluguel (IRRF 1.5%)",
  other:                "Outros (sem retenção padrão)",
};

function calcFiscal(gross: number, type: SupplierType) {
  const r = FISCAL_DEFAULTS[type];
  const irrf   = round2(gross * r.irrf);
  const inss   = round2(gross * r.inss);
  const iss    = round2(gross * r.iss);
  const pis    = round2(gross * r.pis);
  const cofins = round2(gross * r.cofins);
  const total  = round2(irrf + inss + iss + pis + cofins);
  return { irrf, inss, iss, pis, cofins, total, net: round2(gross - total) };
}

function round2(n: number) { return Math.round(n * 100) / 100; }

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function pct(r: number) {
  return r > 0 ? `${(r * 100).toFixed(1)}%` : "—";
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<APStatus, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "Pendente",  color: "text-amber-700",   bg: "bg-amber-50"   },
  SCHEDULED: { label: "Agendado",  color: "text-brand-700",   bg: "bg-brand-50"   },
  PAID:      { label: "Pago",      color: "text-emerald-700", bg: "bg-emerald-50" },
  OVERDUE:   { label: "Vencido",   color: "text-red-700",     bg: "bg-red-50"     },
  CANCELLED: { label: "Cancelado", color: "text-gray-500",    bg: "bg-gray-100"   },
};

const AGING_CFG: Record<AgingBucket, { label: string; color: string }> = {
  "CURRENT": { label: "A vencer",  color: "text-emerald-600" },
  "1-30d":   { label: "1–30 dias", color: "text-amber-600"   },
  "31-60d":  { label: "31–60d",    color: "text-orange-600"  },
  "61-90d":  { label: "61–90d",    color: "text-red-600"     },
  "+90d":    { label: "+90 dias",  color: "text-red-800"     },
};

const CATEGORIES = ["Freelancer", "Fornecedor", "Aluguel", "Software", "Marketing", "Tributário", "Folha", "Produção", "Outros"];
const BUS: BuCode[] = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function APPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [items,     setItems]     = useState<APItem[]>([]);
  const [kpis,      setKPIs]      = useState<APKPIs | null>(null);
  const [suppliers, setSuppliers] = useState<EpmSupplier[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [search,    setSearch]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterBU,   setFilterBU]   = useState<BuCode | "">("");
  const [statusFilter,setStatusFilter] = useState<APStatus | "ALL">("ALL");
  const [payModal, setPayModal] = useState<{
    open: boolean; id: string; item: APItem | null;
    paid_date: string; paid_amount: string; payment_ref: string; saving: boolean;
  }>({ open: false, id: "", item: null, paid_date: today, paid_amount: "", payment_ref: "", saving: false });

  const [form, setForm] = useState({
    bu_code:       "AWQ" as BuCode,
    supplier_name: "",
    supplier_type: "service_professional" as SupplierType,
    description:   "",
    category:      "Fornecedor",
    reference_doc: "",
    issue_date:    today,
    due_date:      "",
    gross_amount:  "",
    installments:  "1",
  });

  const fiscal = form.gross_amount
    ? calcFiscal(parseFloat(form.gross_amount) || 0, form.supplier_type)
    : null;

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [listRes, kpisRes, suppRes] = await Promise.all([
        fetch("/api/epm/ap"),
        fetch("/api/epm/ap?view=kpis"),
        fetch("/api/epm/suppliers"),
      ]);
      const listJson = await listRes.json() as { success: boolean; data: APItem[] };
      const kpisJson = await kpisRes.json() as { success: boolean; data: APKPIs };
      const suppJson = await suppRes.json() as { success: boolean; data: EpmSupplier[] };
      if (listJson.success) setItems(listJson.data);
      if (kpisJson.success) setKPIs(kpisJson.data);
      if (suppJson.success) setSuppliers(suppJson.data);
    } catch { /* ignore network errors */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const gross = parseFloat(form.gross_amount);
    const n     = parseInt(form.installments) || 1;
    if (!gross || gross <= 0) return;
    setSubmitting(true);
    try {
      const payload = {
        bu_code:       form.bu_code,
        supplier_name: form.supplier_name,
        supplier_type: form.supplier_type,
        description:   form.description,
        category:      form.category,
        reference_doc: form.reference_doc || undefined,
        issue_date:    form.issue_date,
        due_date:      form.due_date,
        gross_amount:  gross,
      };
      const endpoint = n > 1 ? "/api/epm/ap/installments" : "/api/epm/ap";
      const body     = n > 1 ? { ...payload, total_installments: n } : payload;
      const res      = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { success: boolean };
      if (json.success) {
        setShowForm(false);
        setForm((f) => ({ ...f, supplier_name: "", description: "", reference_doc: "", due_date: "", gross_amount: "", installments: "1" }));
        await loadData();
      }
    } finally { setSubmitting(false); }
  }

  function openPayModal(item: APItem) {
    setPayModal({ open: true, id: item.id, item, paid_date: today, paid_amount: String(item.net_amount), payment_ref: "", saving: false });
  }

  async function confirmPay() {
    if (!payModal.paid_date || !payModal.paid_amount) return;
    setPayModal((m) => ({ ...m, saving: true }));
    await fetch("/api/epm/ap", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: payModal.id, action: "pay", paid_date: payModal.paid_date, paid_amount: parseFloat(payModal.paid_amount), payment_ref: payModal.payment_ref || undefined }),
    });
    setPayModal({ open: false, id: "", item: null, paid_date: today, paid_amount: "", payment_ref: "", saving: false });
    await loadData();
  }

  async function handleDelete(id: string) {
    await fetch("/api/epm/ap", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "delete" }),
    });
    await loadData();
  }

  // ── Filter ───────────────────────────────────────────────────────────────────

  const filtered = items.filter((i) => {
    if (filterBU && i.bu_code !== filterBU) return false;
    if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
    if (search !== "" &&
      !i.supplier_name.toLowerCase().includes(search.toLowerCase()) &&
      !i.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const outstanding = items.filter((i) => i.status !== "PAID" && i.status !== "CANCELLED");

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <Header
        title="Contas a Pagar (AP)"
        subtitle={`EPM · AWQ Group · ${outstanding.length} em aberto · Retenções fiscais automáticas`}
      />
      <div className="page-container">

        {/* ── KPI cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Em Aberto",    value: fmtBRL(kpis?.totalAPOutstanding ?? 0), color: "text-amber-700",   bg: "bg-amber-50"   },
            { label: "Vencido",      value: fmtBRL(kpis?.totalAPOverdue     ?? 0), color: "text-red-700",     bg: "bg-red-50"     },
            { label: "Total Pago",   value: fmtBRL(kpis?.totalAPPaid        ?? 0), color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "DPO estimado", value: kpis?.dpo != null ? `${kpis.dpo}d` : "—", color: "text-brand-700", bg: "bg-brand-50" },
          ].map((c) => (
            <div key={c.label} className={`card p-4 text-center ${c.bg}`}>
              <div className={`text-xl font-bold tabular-nums ${c.color}`}>{c.value}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        {/* ── Aging report ──────────────────────────────────────────── */}
        {kpis && outstanding.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Aging Report — AP (valor líquido)</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
              {(Object.keys(AGING_CFG) as AgingBucket[]).map((b) => (
                <div key={b} className="bg-gray-50 rounded-lg py-3">
                  <div className={`font-bold tabular-nums ${AGING_CFG[b].color}`}>
                    {fmtBRL(kpis.apAging[b] ?? 0)}
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
          {(["ALL", "PENDING", "OVERDUE", "SCHEDULED", "PAID", "CANCELLED"] as const).map((s) => (
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
              placeholder="Buscar fornecedor ou descrição…"
              className="flex-1 text-xs py-2 border-b border-gray-200 focus:outline-none focus:border-brand-500 bg-transparent"
            />
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancelar" : "Nova AP"}
          </button>
        </div>

        {/* ── Add form ──────────────────────────────────────────────── */}
        {showForm && (
          <form onSubmit={handleAdd} className="card p-5 border-2 border-brand-200 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Nova Conta a Pagar</h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* BU + Supplier name */}
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
                <label className="block font-semibold text-gray-600 mb-1">Fornecedor *</label>
                <input
                  required
                  list="supplier-list"
                  type="text"
                  value={form.supplier_name}
                  onChange={(e) => {
                    const val  = e.target.value;
                    const supp = suppliers.find((s) => s.name === val);
                    setForm((f) => ({
                      ...f,
                      supplier_name: val,
                      supplier_type: supp ? supp.supplier_type : f.supplier_type,
                    }));
                  }}
                  placeholder="Nome do fornecedor"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <datalist id="supplier-list">
                  {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name} — {s.doc ?? ""}</option>)}
                </datalist>
              </div>

              {/* Supplier type — triggers fiscal calc */}
              <div className="col-span-2">
                <label className="block font-semibold text-gray-600 mb-1">Tipo de Operação (define retenções)</label>
                <select
                  value={form.supplier_type}
                  onChange={(e) => setForm((f) => ({ ...f, supplier_type: e.target.value as SupplierType }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {(Object.keys(SUPPLIER_TYPE_LABELS) as SupplierType[]).map((k) => (
                    <option key={k} value={k}>{SUPPLIER_TYPE_LABELS[k]}</option>
                  ))}
                </select>
              </div>

              {/* Description + Category */}
              <div className="col-span-2">
                <label className="block font-semibold text-gray-600 mb-1">Descrição *</label>
                <input
                  required
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Edição de vídeo — Projeto XP Q1/2026"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Categoria</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Doc. referência</label>
                <input
                  type="text"
                  value={form.reference_doc}
                  onChange={(e) => setForm((f) => ({ ...f, reference_doc: e.target.value }))}
                  placeholder="NF-e, boleto, contrato…"
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

              {/* Gross amount + Installments */}
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Valor Bruto (R$) *</label>
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

            {/* ── Fiscal preview ───────────────────────────────────── */}
            {fiscal && (parseFloat(form.gross_amount) > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-2">
                  <Receipt size={12} />
                  Retenções Fiscais — cálculo automático
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  {[
                    { label: "IRRF",   rate: FISCAL_DEFAULTS[form.supplier_type].irrf,   amount: fiscal.irrf   },
                    { label: "INSS",   rate: FISCAL_DEFAULTS[form.supplier_type].inss,   amount: fiscal.inss   },
                    { label: "ISS",    rate: FISCAL_DEFAULTS[form.supplier_type].iss,    amount: fiscal.iss    },
                    { label: "PIS",    rate: FISCAL_DEFAULTS[form.supplier_type].pis,    amount: fiscal.pis    },
                    { label: "COFINS", rate: FISCAL_DEFAULTS[form.supplier_type].cofins, amount: fiscal.cofins },
                  ].map((tax) => (
                    <div key={tax.label} className="bg-white rounded-lg p-2 border border-amber-100">
                      <div className="text-[10px] text-gray-500 font-medium">{tax.label}</div>
                      <div className="text-amber-700 font-bold tabular-nums">{fmtBRL(tax.amount)}</div>
                      <div className="text-[9px] text-gray-400">{pct(tax.rate)}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-amber-200">
                  <span className="text-gray-600">Total retido: <strong className="text-amber-800">{fmtBRL(fiscal.total)}</strong></span>
                  <span className="text-gray-600">
                    Líquido a pagar: <strong className="text-emerald-700 text-sm">{fmtBRL(fiscal.net)}</strong>
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              {submitting ? "Registrando…" : parseInt(form.installments) > 1 ? `Parcelar em ${form.installments}×` : "Registrar Conta a Pagar"}
            </button>
          </form>
        )}

        {/* ── Items table ───────────────────────────────────────────── */}
        {loading ? (
          <div className="card p-12 text-center text-sm text-gray-400">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 flex flex-col items-center gap-3 text-center">
            <ArrowDownLeft size={32} className="text-gray-200" />
            <div className="text-sm text-gray-400">
              {items.length === 0 ? "Nenhuma conta a pagar registrada" : "Nenhum resultado"}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">Venc.</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">Fornecedor</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">BU</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Bruto</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Retenções</th>
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
                          <div className="font-medium text-gray-800">{item.supplier_name}</div>
                          <div className="text-[10px] text-gray-400 truncate max-w-[160px]">{item.description}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded text-[10px] font-bold">
                            {item.bu_code}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-gray-500">
                          {fmtBRL(item.gross_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-amber-700">
                          {item.total_retentions > 0 ? `(${fmtBRL(item.total_retentions)})` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-gray-900">
                          {fmtBRL(item.net_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.color} ${sc.bg}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {item.status !== "PAID" && item.status !== "CANCELLED" && (
                              <button
                                onClick={() => openPayModal(item)}
                                title="Registrar pagamento"
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              >
                                <CheckCircle2 size={13} />
                              </button>
                            )}
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
                        <tr key={`${item.id}-detail`} className="bg-amber-50 border-b border-amber-100">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px]">
                              {[
                                { label: "IRRF",   rate: item.irrf_rate,   amount: item.irrf_amount   },
                                { label: "INSS",   rate: item.inss_rate,   amount: item.inss_amount   },
                                { label: "ISS",    rate: item.iss_rate,    amount: item.iss_amount    },
                                { label: "PIS",    rate: item.pis_rate,    amount: item.pis_amount    },
                                { label: "COFINS", rate: item.cofins_rate, amount: item.cofins_amount },
                              ].map((t) => (
                                <div key={t.label} className="bg-white rounded-lg px-3 py-2 border border-amber-100 text-center">
                                  <div className="text-gray-500 font-medium">{t.label} ({pct(t.rate)})</div>
                                  <div className={`font-bold tabular-nums ${t.amount > 0 ? "text-amber-700" : "text-gray-300"}`}>
                                    {fmtBRL(t.amount)}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-gray-500">
                              <span>Emissão: <strong>{fmtDate(item.issue_date)}</strong></span>
                              <span>Categoria: <strong>{item.category}</strong></span>
                              {item.reference_doc && <span>Doc: <strong>{item.reference_doc}</strong></span>}
                              {item.paid_date && <span>Pago em: <strong>{fmtDate(item.paid_date)}</strong> · {item.payment_ref}</span>}
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
          <Link href="/awq/epm/ar" className="text-brand-600 hover:underline">Contas a Receber →</Link>
        </div>

      </div>

      {/* ── Payment modal ────────────────────────────────────────────── */}
      {payModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Registrar Pagamento</h2>
              <button onClick={() => setPayModal((m) => ({ ...m, open: false }))} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            {payModal.item && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-semibold text-gray-700">{payModal.item.supplier_name}</span>
                {" · "}{payModal.item.description}
                <span className="ml-2 font-bold text-gray-800">{fmtBRL(payModal.item.net_amount)}</span>
              </div>
            )}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Data de pagamento *</label>
                <input type="date" value={payModal.paid_date}
                  onChange={(e) => setPayModal((m) => ({ ...m, paid_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Valor pago (líquido) *</label>
                <input type="number" step="0.01" min="0.01" value={payModal.paid_amount}
                  onChange={(e) => setPayModal((m) => ({ ...m, paid_amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Referência (txid PIX, NSU…)</label>
                <input type="text" value={payModal.payment_ref} placeholder="Opcional"
                  onChange={(e) => setPayModal((m) => ({ ...m, payment_ref: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setPayModal((m) => ({ ...m, open: false }))}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmPay} disabled={payModal.saving || !payModal.paid_date || !payModal.paid_amount}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors">
                {payModal.saving ? "Salvando…" : "Confirmar Pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
