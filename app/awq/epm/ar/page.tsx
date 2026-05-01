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
  ar_code?:        string;
  bu_code:         BuCode;
  customer_name:   string;
  customer_doc?:   string;
  description:     string;
  category:        string;
  cost_center?:    string;
  reference_doc?:  string;
  issue_date:      string;
  due_date:        string;
  invoice_number?: string;
  invoice_series?: string;
  invoice_date?:   string;
  // Values
  gross_amount:    number;
  discount_amount: number;
  net_amount:      number;
  // Retentions (withheld by customer)
  irrf_withheld:        number;
  irrf_withheld_rate:   number;
  inss_withheld:        number;
  inss_withheld_rate:   number;
  iss_withheld:         number;
  iss_withheld_rate:    number;
  pis_withheld:         number;
  pis_withheld_rate:    number;
  cofins_withheld:      number;
  cofins_withheld_rate: number;
  csll_withheld:        number;
  csll_withheld_rate:   number;
  // Billing taxes (company remits)
  iss_rate:        number;
  iss_amount:      number;
  pis_rate:        number;
  pis_amount:      number;
  cofins_rate:     number;
  cofins_amount:   number;
  irpj_amount:     number;
  csll_amount:     number;
  tax_regime?:     string;
  simples_rate:    number;
  // Accounting
  revenue_account_id?:  string;
  revenue_type?:        string;
  nature_of_operation?: string;
  // Managerial
  project_id?:       string;
  service_category?: string;
  contract_type?:    string;
  // Accrual
  accrual_month?:            string;
  service_period_start?:     string;
  service_period_end?:       string;
  is_deferred_revenue:       boolean;
  deferred_periods:          number;
  revenue_recognition_date?: string;
  // Payment
  payment_date?:    string;
  received_date?:   string;
  payment_method?:  string;
  bank_account_id?: string;
  payment_reference?: string;
  receipt_ref?:     string;
  received_amount?: number;
  // Installments
  is_installment:      boolean;
  installment_number?: number;
  total_installments?: number;
  parent_ar_id?:       string;
  // Recurrence
  is_recurring:          boolean;
  recurrence_frequency?: string;
  contract_value?:       number;
  contract_start_date?:  string;
  contract_end_date?:    string;
  mrr?:                  number;
  arr?:                  number;
  // Collection
  status:                ARStatus;
  collection_status?:    string;
  collection_attempts:   number;
  last_collection_date?: string;
  // Late fees
  late_fee_rate:   number;
  late_fee_amount: number;
  interest_rate:   number;
  interest_amount: number;
  // Documents
  invoice_pdf_url?: string;
  invoice_xml_url?: string;
  danfe_url?:            string;
  payment_receipt_url?:  string;
  contract_url?:         string;
  boleto_url?:           string;
  boleto_barcode?:       string;
  // CRM
  opportunity_id?:   string;
  sales_rep_id?:     string;
  commission_rate:   number;
  commission_amount: number;
  commission_paid:   boolean;
  // Misc
  notes?:          string;
  customer_notes?: string;
  tags:            string[];
  created_at:      string;
  updated_at?:     string;
}

interface ARKPIs {
  totalAROutstanding: number;
  totalAROverdue:     number;
  totalARReceived:    number;
  dso:                number | null;
  ccc:                number | null;
  arAging:            Record<AgingBucket, number>;
}

// ─── AR fiscal calculation (impostos sobre faturamento + retenções) ───────────

const AR_SERVICE_CATEGORIES = new Set(["Serviço Recorrente", "Projeto", "Consultoria", "Produção"]);

function r2(n: number) { return Math.round(n * 100) / 100; }
function pct(r: number) { return r > 0 ? (r * 100).toFixed(2).replace(/\.?0+$/, "") + "%" : "—"; }

interface FiscalPreview {
  iss_rate: number; iss_amount: number;
  pis_rate: number; pis_amount: number;
  cofins_rate: number; cofins_amount: number;
  billingTaxTotal: number;
  irrf_withheld: number; inss_withheld: number;
  iss_withheld: number; pis_withheld: number;
  cofins_withheld: number; csll_withheld: number;
  totalWithheld: number;
  discount: number;
  net: number;
}

function calcARFiscal(gross: number, category: string, opts?: {
  discount?: number;
  irrf_withheld_rate?: number; inss_withheld_rate?: number;
  iss_withheld_rate?: number;  pis_withheld_rate?: number;
  cofins_withheld_rate?: number; csll_withheld_rate?: number;
}): FiscalPreview {
  const isSvc       = AR_SERVICE_CATEGORIES.has(category);
  const iss_rate    = isSvc ? 0.05   : 0;
  const pis_rate    = isSvc ? 0.0065 : 0;
  const cofins_rate = isSvc ? 0.03   : 0;
  const iss_amount    = r2(gross * iss_rate);
  const pis_amount    = r2(gross * pis_rate);
  const cofins_amount = r2(gross * cofins_rate);
  const billingTaxTotal = r2(iss_amount + pis_amount + cofins_amount);

  const o = opts ?? {};
  const irrf_withheld   = r2(gross * (o.irrf_withheld_rate   ?? 0));
  const inss_withheld   = r2(gross * (o.inss_withheld_rate   ?? 0));
  const iss_withheld    = r2(gross * (o.iss_withheld_rate    ?? 0));
  const pis_withheld    = r2(gross * (o.pis_withheld_rate    ?? 0));
  const cofins_withheld = r2(gross * (o.cofins_withheld_rate ?? 0));
  const csll_withheld   = r2(gross * (o.csll_withheld_rate   ?? 0));
  const totalWithheld   = r2(irrf_withheld + inss_withheld + iss_withheld + pis_withheld + cofins_withheld + csll_withheld);
  const discount        = o.discount ?? 0;

  return {
    iss_rate, iss_amount, pis_rate, pis_amount, cofins_rate, cofins_amount, billingTaxTotal,
    irrf_withheld, inss_withheld, iss_withheld, pis_withheld, cofins_withheld, csll_withheld,
    totalWithheld, discount,
    net: r2(gross - discount - totalWithheld),
  };
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
    received_date: string; received_amount: string; receipt_ref: string;
    payment_method: string; saving: boolean;
  }>({ open: false, id: "", item: null, received_date: today, received_amount: "", receipt_ref: "", payment_method: "pix", saving: false });
  const [editModal, setEditModal] = useState<{
    open: boolean; item: ARItem | null;
    customer_name: string; description: string; category: string;
    cost_center: string; reference_doc: string; due_date: string; saving: boolean;
  }>({ open: false, item: null, customer_name: "", description: "", category: "", cost_center: "", reference_doc: "", due_date: "", saving: false });
  const [costCenters, setCostCenters] = useState<{ id: string; code: string; name: string }[]>([]);

  const [form, setForm] = useState({
    bu_code:              "JACQES" as BuCode,
    customer_name:        "",
    customer_doc:         "",
    description:          "",
    category:             "Serviço Recorrente",
    cost_center:          "",
    reference_doc:        "",
    invoice_number:       "",
    accrual_month:        "",
    service_period_start: "",
    service_period_end:   "",
    is_deferred_revenue:  false,
    deferred_periods:     "",
    issue_date:           today,
    due_date:             "",
    gross_amount:         "",
    discount_amount:      "",
    installments:         "1",
    irrf_withheld_rate:   "",
    inss_withheld_rate:   "",
    iss_withheld_rate:    "",
    pis_withheld_rate:    "",
    cofins_withheld_rate: "",
    csll_withheld_rate:   "",
    tax_regime:           "",
    simples_rate:         "",
    service_category:     "",
    contract_type:        "",
    revenue_account_id:   "",
    revenue_type:         "",
    nature_of_operation:  "",
    project_id:           "",
    late_fee_rate:        "",
    interest_rate:        "",
    invoice_pdf_url:      "",
    invoice_xml_url:      "",
    danfe_url:            "",
    payment_receipt_url:  "",
    boleto_url:           "",
    boleto_barcode:       "",
    contract_url:         "",
    opportunity_id:       "",
    sales_rep_id:         "",
    commission_rate:      "",
    notes:                "",
    customer_notes:       "",
    tags:                 "",
  });

  const gross = parseFloat(form.gross_amount) || 0;
  const fiscalPreview: FiscalPreview | null = gross > 0 ? calcARFiscal(gross, form.category, {
    discount:             parseFloat(form.discount_amount)      || 0,
    irrf_withheld_rate:   parseFloat(form.irrf_withheld_rate)   / 100 || 0,
    inss_withheld_rate:   parseFloat(form.inss_withheld_rate)   / 100 || 0,
    iss_withheld_rate:    parseFloat(form.iss_withheld_rate)    / 100 || 0,
    pis_withheld_rate:    parseFloat(form.pis_withheld_rate)    / 100 || 0,
    cofins_withheld_rate: parseFloat(form.cofins_withheld_rate) / 100 || 0,
    csll_withheld_rate:   parseFloat(form.csll_withheld_rate)   / 100 || 0,
  }) : null;

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
      const payload: Record<string, unknown> = {
        bu_code:              form.bu_code,
        customer_name:        form.customer_name,
        customer_doc:         form.customer_doc         || undefined,
        description:          form.description,
        category:             form.category,
        cost_center:          form.cost_center          || undefined,
        reference_doc:        form.reference_doc        || undefined,
        invoice_number:       form.invoice_number       || undefined,
        accrual_month:        form.accrual_month        || undefined,
        service_period_start: form.service_period_start || undefined,
        service_period_end:   form.service_period_end   || undefined,
        is_deferred_revenue:  form.is_deferred_revenue  || undefined,
        deferred_periods:     parseInt(form.deferred_periods) || undefined,
        service_category:     form.service_category     || undefined,
        contract_type:        form.contract_type        || undefined,
        tax_regime:           form.tax_regime           || undefined,
        simples_rate:         parseFloat(form.simples_rate)    / 100 || undefined,
        revenue_account_id:   form.revenue_account_id   || undefined,
        revenue_type:         form.revenue_type         || undefined,
        nature_of_operation:  form.nature_of_operation  || undefined,
        project_id:           form.project_id           || undefined,
        issue_date:           form.issue_date,
        due_date:             form.due_date,
        gross_amount:         gross,
        discount_amount:      parseFloat(form.discount_amount) || undefined,
        irrf_withheld_rate:   parseFloat(form.irrf_withheld_rate)   / 100 || undefined,
        inss_withheld_rate:   parseFloat(form.inss_withheld_rate)   / 100 || undefined,
        iss_withheld_rate:    parseFloat(form.iss_withheld_rate)    / 100 || undefined,
        pis_withheld_rate:    parseFloat(form.pis_withheld_rate)    / 100 || undefined,
        cofins_withheld_rate: parseFloat(form.cofins_withheld_rate) / 100 || undefined,
        csll_withheld_rate:   parseFloat(form.csll_withheld_rate)   / 100 || undefined,
        late_fee_rate:        parseFloat(form.late_fee_rate)  / 100 || undefined,
        interest_rate:        parseFloat(form.interest_rate)  / 100 || undefined,
        invoice_pdf_url:      form.invoice_pdf_url      || undefined,
        invoice_xml_url:      form.invoice_xml_url      || undefined,
        danfe_url:            form.danfe_url             || undefined,
        payment_receipt_url:  form.payment_receipt_url   || undefined,
        boleto_url:           form.boleto_url            || undefined,
        boleto_barcode:       form.boleto_barcode        || undefined,
        contract_url:         form.contract_url          || undefined,
        opportunity_id:       form.opportunity_id        || undefined,
        sales_rep_id:         form.sales_rep_id          || undefined,
        commission_rate:      parseFloat(form.commission_rate) / 100 || undefined,
        notes:                form.notes                 || undefined,
        customer_notes:       form.customer_notes        || undefined,
        tags:                 form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
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
        setForm((f) => ({
          ...f,
          customer_name: "", customer_doc: "", description: "", reference_doc: "", invoice_number: "",
          due_date: "", gross_amount: "", discount_amount: "", installments: "1",
          irrf_withheld_rate: "", inss_withheld_rate: "", iss_withheld_rate: "",
          pis_withheld_rate: "", cofins_withheld_rate: "", csll_withheld_rate: "",
          accrual_month: "", service_period_start: "", service_period_end: "",
          is_deferred_revenue: false, deferred_periods: "",
          service_category: "", contract_type: "", tax_regime: "", simples_rate: "",
          revenue_account_id: "", revenue_type: "", nature_of_operation: "", project_id: "",
          late_fee_rate: "", interest_rate: "",
          invoice_pdf_url: "", invoice_xml_url: "", danfe_url: "", payment_receipt_url: "",
          boleto_url: "", boleto_barcode: "", contract_url: "",
          opportunity_id: "", sales_rep_id: "", commission_rate: "",
          notes: "", customer_notes: "", tags: "",
        }));
        await loadData();
      }
    } finally { setSubmitting(false); }
  }

  function openRecModal(item: ARItem) {
    setRecModal({
      open: true, id: item.id, item,
      received_date: today,
      received_amount: String(item.net_amount),
      receipt_ref: "",
      payment_method: item.payment_method ?? "pix",
      saving: false,
    });
  }

  async function confirmReceive() {
    if (!recModal.received_date || !recModal.received_amount) return;
    setRecModal((m) => ({ ...m, saving: true }));
    await fetch("/api/epm/ar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: recModal.id,
        action: "receive",
        received_date:   recModal.received_date,
        received_amount: parseFloat(recModal.received_amount),
        receipt_ref:     recModal.receipt_ref || undefined,
        payment_method:  recModal.payment_method || undefined,
      }),
    });
    setRecModal({ open: false, id: "", item: null, received_date: today, received_amount: "", receipt_ref: "", payment_method: "pix", saving: false });
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

              <div>
                <label className="block font-semibold text-gray-600 mb-1">CPF / CNPJ cliente</label>
                <input
                  type="text"
                  value={form.customer_doc}
                  onChange={(e) => setForm((f) => ({ ...f, customer_doc: e.target.value }))}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
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
                <label className="block font-semibold text-gray-600 mb-1">Referência / NF-e</label>
                <input
                  type="text"
                  value={form.reference_doc}
                  onChange={(e) => setForm((f) => ({ ...f, reference_doc: e.target.value }))}
                  placeholder="Proposta, contrato…"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Nº NF-e</label>
                <input
                  type="text"
                  value={form.invoice_number}
                  onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
                  placeholder="000001"
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
                <label className="block font-semibold text-gray-600 mb-1">Desconto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.discount_amount}
                  onChange={(e) => setForm((f) => ({ ...f, discount_amount: e.target.value }))}
                  placeholder="0,00"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Mês Competência</label>
                <input
                  type="month"
                  value={form.accrual_month}
                  onChange={(e) => setForm((f) => ({ ...f, accrual_month: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Início do período</label>
                <input type="date" value={form.service_period_start}
                  onChange={(e) => setForm((f) => ({ ...f, service_period_start: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Fim do período</label>
                <input type="date" value={form.service_period_end}
                  onChange={(e) => setForm((f) => ({ ...f, service_period_end: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div className="flex items-center gap-2 pt-3">
                <input type="checkbox" id="deferred_rev" checked={form.is_deferred_revenue}
                  onChange={(e) => setForm((f) => ({ ...f, is_deferred_revenue: e.target.checked }))}
                  className="rounded" />
                <label htmlFor="deferred_rev" className="font-semibold text-gray-600">Receita diferida</label>
                {form.is_deferred_revenue && (
                  <input type="number" min="1" max="60" value={form.deferred_periods}
                    onChange={(e) => setForm((f) => ({ ...f, deferred_periods: e.target.value }))}
                    placeholder="Nº períodos"
                    className="ml-auto w-28 px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                )}
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

            {/* ── Fiscal avançado ──────────────────────────────── */}
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-gray-600 py-1 select-none">
                Fiscal avançado (regime, Simples, IRPJ…) — opcional
              </summary>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block font-semibold text-gray-500 mb-0.5">Regime tributário</label>
                  <select value={form.tax_regime}
                    onChange={(e) => setForm((f) => ({ ...f, tax_regime: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                    <option value="">— Selecione —</option>
                    <option value="simples_nacional">Simples Nacional</option>
                    <option value="lucro_presumido">Lucro Presumido</option>
                    <option value="lucro_real">Lucro Real</option>
                    <option value="mei">MEI</option>
                    <option value="isento">Isento</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-500 mb-0.5">Alíquota Simples %</label>
                  <input type="number" step="0.01" min="0" max="20" value={form.simples_rate}
                    onChange={(e) => setForm((f) => ({ ...f, simples_rate: e.target.value }))}
                    placeholder="0"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-500 mb-0.5">Multa padrão %</label>
                  <input type="number" step="0.01" min="0" max="100" value={form.late_fee_rate}
                    onChange={(e) => setForm((f) => ({ ...f, late_fee_rate: e.target.value }))}
                    placeholder="2"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-500 mb-0.5">Juros mora mensal %</label>
                  <input type="number" step="0.01" min="0" max="100" value={form.interest_rate}
                    onChange={(e) => setForm((f) => ({ ...f, interest_rate: e.target.value }))}
                    placeholder="1"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
              </div>
            </details>

            {/* ── Classificação contábil / gerencial ───────────── */}
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-gray-600 py-1 select-none">
                Classificação contábil e gerencial — opcional
              </summary>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block font-semibold text-gray-500 mb-0.5">Conta de receita</label>
                  <input type="text" value={form.revenue_account_id}
                    onChange={(e) => setForm((f) => ({ ...f, revenue_account_id: e.target.value }))}
                    placeholder="Ex: 3.1.1.01"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-500 mb-0.5">Tipo de receita</label>
                  <input type="text" value={form.revenue_type}
                    onChange={(e) => setForm((f) => ({ ...f, revenue_type: e.target.value }))}
                    placeholder="recorrente, pontual…"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-500 mb-0.5">Natureza da operação</label>
                  <input type="text" value={form.nature_of_operation}
                    onChange={(e) => setForm((f) => ({ ...f, nature_of_operation: e.target.value }))}
                    placeholder="Prestação de serviço…"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-500 mb-0.5">ID do projeto</label>
                  <input type="text" value={form.project_id}
                    onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                    placeholder="PROJ-001"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
              </div>
            </details>

            {/* ── Documentos ───────────────────────────────────── */}
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-gray-600 py-1 select-none">
                Documentos (NF-e XML, PDF, Boleto…) — opcional
              </summary>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { label: "URL PDF NF-e",   key: "invoice_pdf_url", ph: "https://…" },
                  { label: "URL XML NF-e",   key: "invoice_xml_url", ph: "https://…" },
                  { label: "URL DANFE",          key: "danfe_url",            ph: "https://…" },
                  { label: "URL Boleto",         key: "boleto_url",           ph: "https://…" },
                  { label: "Cód. barras",        key: "boleto_barcode",       ph: "00000…"    },
                  { label: "URL Contrato",       key: "contract_url",         ph: "https://…" },
                  { label: "URL Comprovante pag.",key: "payment_receipt_url", ph: "https://…" },
                ].map(({ label, key, ph }) => (
                  <div key={key}>
                    <label className="block font-semibold text-gray-500 mb-0.5">{label}</label>
                    <input type="text" value={(form as Record<string, unknown>)[key] as string}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={ph}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  </div>
                ))}
              </div>
            </details>

            {/* ── CRM & Comissão ───────────────────────────────── */}
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-gray-600 py-1 select-none">
                CRM e comissão — opcional
              </summary>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block font-semibold text-gray-500 mb-0.5">ID Oportunidade</label>
                  <input type="text" value={form.opportunity_id}
                    onChange={(e) => setForm((f) => ({ ...f, opportunity_id: e.target.value }))}
                    placeholder="OPP-001"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-500 mb-0.5">ID Vendedor</label>
                  <input type="text" value={form.sales_rep_id}
                    onChange={(e) => setForm((f) => ({ ...f, sales_rep_id: e.target.value }))}
                    placeholder="REP-001"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-500 mb-0.5">Taxa comissão %</label>
                  <input type="number" step="0.01" min="0" max="100" value={form.commission_rate}
                    onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))}
                    placeholder="0"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
              </div>
            </details>

            {/* ── Obs / Tags ───────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Observações internas</label>
                <textarea rows={2} value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Notas internas…"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Obs. para o cliente</label>
                <textarea rows={2} value={form.customer_notes}
                  onChange={(e) => setForm((f) => ({ ...f, customer_notes: e.target.value }))}
                  placeholder="Mensagem ao cliente…"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
              </div>
              <div className="col-span-2">
                <label className="block font-semibold text-gray-600 mb-1">Tags (separadas por vírgula)</label>
                <input type="text" value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="retainer, contrato, prioritário…"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
            </div>

            {/* ── Retenções sofridas (opcional) ───────────────────── */}
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-gray-600 py-1 select-none">
                Retenções sofridas (IRRF, INSS, CSLL…) — opcional
              </summary>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { label: "IRRF ret. %",   key: "irrf_withheld_rate"   },
                  { label: "INSS ret. %",   key: "inss_withheld_rate"   },
                  { label: "ISS ret. %",    key: "iss_withheld_rate"    },
                  { label: "PIS ret. %",    key: "pis_withheld_rate"    },
                  { label: "COFINS ret. %", key: "cofins_withheld_rate" },
                  { label: "CSLL ret. %",   key: "csll_withheld_rate"   },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block font-semibold text-gray-500 mb-0.5">{label}</label>
                    <input
                      type="number" step="0.01" min="0" max="100"
                      value={(form as Record<string, unknown>)[key] as string}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder="0"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                ))}
              </div>
            </details>

            {/* ── Fiscal preview ───────────────────────────────────── */}
            {fiscalPreview && gross > 0 && (
              <div className="rounded-xl p-4 text-xs space-y-3 border bg-violet-50 border-violet-200">
                <div className="flex items-center gap-1.5 font-semibold text-violet-800">
                  <Receipt size={12} />
                  Resumo fiscal — cálculo automático
                </div>

                {/* Impostos sobre faturamento */}
                {fiscalPreview.billingTaxTotal > 0 && (
                  <div>
                    <div className="text-[10px] text-violet-600 font-semibold mb-1">Tributos sobre faturamento (empresa recolhe)</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: "ISS",    rate: fiscalPreview.iss_rate,    amount: fiscalPreview.iss_amount    },
                        { label: "PIS",    rate: fiscalPreview.pis_rate,    amount: fiscalPreview.pis_amount    },
                        { label: "COFINS", rate: fiscalPreview.cofins_rate, amount: fiscalPreview.cofins_amount },
                      ].map((tax) => (
                        <div key={tax.label} className="bg-white rounded-lg p-2 border border-violet-100">
                          <div className="text-[10px] text-gray-500 font-medium">{tax.label} {pct(tax.rate)}</div>
                          <div className="text-violet-700 font-bold tabular-nums">{fmtBRL(tax.amount)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Retenções sofridas */}
                {fiscalPreview.totalWithheld > 0 && (
                  <div>
                    <div className="text-[10px] text-red-600 font-semibold mb-1">Retenções sofridas (cliente deduz)</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: "IRRF",   amount: fiscalPreview.irrf_withheld   },
                        { label: "INSS",   amount: fiscalPreview.inss_withheld   },
                        { label: "ISS r.", amount: fiscalPreview.iss_withheld    },
                        { label: "PIS r.", amount: fiscalPreview.pis_withheld    },
                        { label: "COFINS r.", amount: fiscalPreview.cofins_withheld },
                        { label: "CSLL",   amount: fiscalPreview.csll_withheld   },
                      ].filter((t) => t.amount > 0).map((t) => (
                        <div key={t.label} className="bg-white rounded-lg p-2 border border-red-100">
                          <div className="text-[10px] text-gray-500 font-medium">{t.label}</div>
                          <div className="text-red-600 font-bold tabular-nums">({fmtBRL(t.amount)})</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-violet-200">
                  <span className="text-gray-600 text-[11px]">
                    Bruto: <strong>{fmtBRL(gross)}</strong>
                    {fiscalPreview.discount > 0 && <> · Desc: <strong className="text-red-600">({fmtBRL(fiscalPreview.discount)})</strong></>}
                    {fiscalPreview.totalWithheld > 0 && <> · Ret.: <strong className="text-red-600">({fmtBRL(fiscalPreview.totalWithheld)})</strong></>}
                  </span>
                  <span className="font-bold text-emerald-700">
                    Líquido: {fmtBRL(fiscalPreview.net)}
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
                          <td colSpan={8} className="px-4 py-3 space-y-2">

                            {/* Impostos sobre faturamento */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                              {[
                                { label: "ISS",    rate: item.iss_rate,    amount: item.iss_amount    },
                                { label: "PIS",    rate: item.pis_rate,    amount: item.pis_amount    },
                                { label: "COFINS", rate: item.cofins_rate, amount: item.cofins_amount },
                              ].map((t) => (
                                <div key={t.label} className="bg-white rounded-lg px-3 py-2 border border-violet-100 text-center">
                                  <div className="text-gray-400 font-medium">{t.label} {pct(t.rate)}</div>
                                  <div className={`font-bold tabular-nums ${t.amount > 0 ? "text-violet-700" : "text-gray-300"}`}>
                                    {fmtBRL(t.amount)}
                                  </div>
                                </div>
                              ))}
                              <div className="bg-white rounded-lg px-3 py-2 border border-violet-100 text-center">
                                <div className="text-gray-400 font-medium">Líquido recebido</div>
                                <div className="font-bold tabular-nums text-emerald-700">{fmtBRL(item.net_amount)}</div>
                              </div>
                            </div>

                            {/* Retenções sofridas */}
                            {(() => {
                              const rets = [
                                { label: "IRRF ret.",   v: item.irrf_withheld,   r: item.irrf_withheld_rate   },
                                { label: "INSS ret.",   v: item.inss_withheld,   r: item.inss_withheld_rate   },
                                { label: "ISS ret.",    v: item.iss_withheld,    r: item.iss_withheld_rate    },
                                { label: "PIS ret.",    v: item.pis_withheld,    r: item.pis_withheld_rate    },
                                { label: "COFINS ret.", v: item.cofins_withheld, r: item.cofins_withheld_rate },
                                { label: "CSLL ret.",   v: item.csll_withheld,   r: item.csll_withheld_rate   },
                              ].filter((x) => x.v > 0);
                              if (!rets.length) return null;
                              return (
                                <div>
                                  <div className="text-[10px] font-semibold text-red-600 mb-1">Retenções sofridas (deduzidas pelo cliente)</div>
                                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px]">
                                    {rets.map((t) => (
                                      <div key={t.label} className="bg-white rounded-lg px-2 py-1.5 border border-red-100 text-center">
                                        <div className="text-gray-400">{t.label} {pct(t.r)}</div>
                                        <div className="font-bold text-red-600">({fmtBRL(t.v)})</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-[11px] text-gray-500 pt-1">
                              <span>Emissão: <strong>{fmtDate(item.issue_date)}</strong></span>
                              {item.invoice_number && <span>NF-e: <strong>{item.invoice_number}</strong></span>}
                              {item.accrual_month  && <span>Competência: <strong>{item.accrual_month}</strong></span>}
                              {item.service_period_start && <span>Período: <strong>{fmtDate(item.service_period_start)}{item.service_period_end ? ` → ${fmtDate(item.service_period_end)}` : ""}</strong></span>}
                              {item.is_deferred_revenue  && <span className="text-violet-600">Diferida{item.deferred_periods > 0 ? ` ${item.deferred_periods}p` : ""}</span>}
                              {item.cost_center    && <span>CC: <strong>{item.cost_center}</strong></span>}
                              {item.reference_doc  && <span>Doc: <strong>{item.reference_doc}</strong></span>}
                              {item.contract_type  && <span>Contrato: <strong>{item.contract_type}</strong></span>}
                              {item.service_category && <span>Serviço: <strong>{item.service_category}</strong></span>}
                              {item.project_id     && <span>Projeto: <strong>{item.project_id}</strong></span>}
                              {item.revenue_account_id && <span>Conta: <strong>{item.revenue_account_id}</strong></span>}
                              {item.revenue_type   && <span>Tipo receita: <strong>{item.revenue_type}</strong></span>}
                              {item.nature_of_operation && <span>Natureza: <strong>{item.nature_of_operation}</strong></span>}
                              {item.tax_regime     && <span>Regime: <strong>{item.tax_regime}</strong></span>}
                              {item.customer_doc   && <span>Doc. cliente: <strong>{item.customer_doc}</strong></span>}
                              {item.is_installment && item.installment_number != null && (
                                <span>Parcela: <strong>{item.installment_number}/{item.total_installments}</strong></span>
                              )}
                              {item.is_recurring && <span className="text-brand-600 font-semibold">Recorrente{item.mrr ? ` · MRR ${fmtBRL(item.mrr)}` : ""}{item.arr ? ` · ARR ${fmtBRL(item.arr)}` : ""}</span>}
                              {(item.late_fee_rate > 0 || item.interest_rate > 0) && (
                                <span>Multa: <strong>{pct(item.late_fee_rate)}</strong> · Juros: <strong>{pct(item.interest_rate)}/mês</strong></span>
                              )}
                              {(item.late_fee_amount > 0 || item.interest_amount > 0) && (
                                <span className="text-red-600">
                                  Multa/Juros aplicados: <strong>{fmtBRL(item.late_fee_amount + item.interest_amount)}</strong>
                                </span>
                              )}
                              {item.collection_status && item.collection_status !== "not_due" && (
                                <span>Cobrança: <strong>{item.collection_status}</strong>{item.collection_attempts > 0 ? ` (${item.collection_attempts}×)` : ""}</span>
                              )}
                              {item.opportunity_id && <span>Oportunidade: <strong>{item.opportunity_id}</strong></span>}
                              {item.sales_rep_id   && <span>Vendedor: <strong>{item.sales_rep_id}</strong></span>}
                              {item.commission_amount > 0 && (
                                <span>Comissão: <strong>{fmtBRL(item.commission_amount)}</strong>{item.commission_paid ? " ✓" : " (pendente)"}</span>
                              )}
                              {(item.payment_date ?? item.received_date) && (
                                <span>
                                  Recebido em: <strong>{fmtDate((item.payment_date ?? item.received_date)!)}</strong>
                                  {item.payment_method && ` · ${item.payment_method.toUpperCase()}`}
                                  {item.received_amount && ` · ${fmtBRL(item.received_amount)}`}
                                  {(item.payment_reference ?? item.receipt_ref) && ` · ${item.payment_reference ?? item.receipt_ref}`}
                                </span>
                              )}
                              {(item.invoice_pdf_url || item.danfe_url || item.boleto_url || item.contract_url) && (
                                <span className="flex gap-2">
                                  {item.invoice_pdf_url && <a href={item.invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">NF-e PDF</a>}
                                  {item.danfe_url           && <a href={item.danfe_url}           target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">DANFE</a>}
                                  {item.boleto_url          && <a href={item.boleto_url}          target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Boleto</a>}
                                  {item.contract_url        && <a href={item.contract_url}        target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Contrato</a>}
                                  {item.payment_receipt_url && <a href={item.payment_receipt_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Comprovante</a>}
                                </span>
                              )}
                              {item.boleto_barcode && <span>Cód. barras: <strong className="font-mono">{item.boleto_barcode}</strong></span>}
                              {item.customer_notes && <span>Obs. cliente: <em>{item.customer_notes}</em></span>}
                              {item.notes && <span>Obs: <em>{item.notes}</em></span>}
                              {item.tags?.length > 0 && (
                                <span className="flex gap-1">
                                  {item.tags.map((t) => (
                                    <span key={t} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">{t}</span>
                                  ))}
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
              <button onClick={() => setRecModal((m) => ({ ...m, open: false, payment_method: "pix" }))} className="p-1 text-gray-400 hover:text-gray-600">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Data de recebimento *</label>
                  <input type="date" value={recModal.received_date}
                    onChange={(e) => setRecModal((m) => ({ ...m, received_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Forma de pagamento</label>
                  <select value={recModal.payment_method}
                    onChange={(e) => setRecModal((m) => ({ ...m, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                    <option value="pix">PIX</option>
                    <option value="ted">TED</option>
                    <option value="boleto">Boleto</option>
                    <option value="card">Cartão</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Valor recebido *</label>
                <input type="number" step="0.01" min="0.01" value={recModal.received_amount}
                  onChange={(e) => setRecModal((m) => ({ ...m, received_amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Referência (txid PIX, NSU, etc.)</label>
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
