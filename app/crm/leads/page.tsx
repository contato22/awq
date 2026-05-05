"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Users, Plus, Search, Target, TrendingUp,
  BarChart3, ExternalLink, RefreshCw, ChevronRight,
  Pencil, X, CheckCircle2, AlertCircle, Zap,
  Mail, Phone, Briefcase, DollarSign, Calendar, FileText,
} from "lucide-react";
import type { CrmLead } from "@/lib/crm-types";
import { SEED_LEADS } from "@/lib/crm-db";
import { formatBRL, formatDateBR } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  new:         { label: "Novo",           cls: "badge badge-blue" },
  contacted:   { label: "Contato",        cls: "badge badge-yellow" },
  qualified:   { label: "Qualificado",    cls: "badge badge-green" },
  unqualified: { label: "Desqualificado", cls: "badge badge-red" },
  converted:   { label: "Convertido",     cls: "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200/60" },
};

const BU_LIST = ["Todos", "JACQES", "CAZA", "ADVISOR", "VENTURE"] as const;
const STATUS_TABS = [
  { key: "all", label: "Todos" },
  { key: "new", label: "Novo" },
  { key: "contacted", label: "Contato" },
  { key: "qualified", label: "Qualificado" },
  { key: "unqualified", label: "Desqualificado" },
  { key: "converted", label: "Convertido" },
] as const;

const NEED_LABEL: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

const inputCls = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

// ─── Score ────────────────────────────────────────────────────────────────────

type EditForm = {
  contact_name: string;
  company_name: string;
  email: string;
  phone: string;
  job_title: string;
  bu: string;
  lead_source: string;
  assigned_to: string;
  status: string;
  bant_budget: string;
  bant_authority: boolean;
  bant_need: string;
  bant_timeline: string;
  qualification_notes: string;
};

function calcScore(f: EditForm): number {
  let score = 0;
  const budget = parseFloat(f.bant_budget) || 0;
  if (budget >= 50000)      score += 30;
  else if (budget >= 20000) score += 20;
  else if (budget >= 10000) score += 10;
  if (f.bant_authority) score += 20;
  if (f.bant_need === "high")   score += 25;
  else if (f.bant_need === "medium") score += 15;
  else if (f.bant_need === "low")    score += 5;
  if (f.bant_timeline) {
    const days = Math.ceil((new Date(f.bant_timeline).getTime() - Date.now()) / 86400000);
    if (days <= 30)      score += 15;
    else if (days <= 60) score += 10;
    else if (days <= 90) score += 5;
  }
  return Math.min(score, 100);
}

function scoreColor(s: number) {
  if (s >= 71) return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (s >= 41) return { bar: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" };
  return               { bar: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",     border: "border-red-200" };
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 71 ? "bg-emerald-500" : score >= 41 ? "bg-amber-400" : "bg-red-500";
  const textColor = score >= 71 ? "text-emerald-700" : score >= 41 ? "text-amber-700" : "text-red-600";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[11px] font-bold ${textColor}`}>{score}</span>
    </div>
  );
}

function BuBadge({ bu }: { bu: string }) {
  if (bu === "JACQES") return <span className="badge badge-blue text-[10px]">{bu}</span>;
  if (bu === "CAZA")   return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200/60">{bu}</span>;
  if (bu === "ADVISOR") return <span className="badge badge-green text-[10px]">{bu}</span>;
  return <span className="badge badge-yellow text-[10px]">{bu}</span>;
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
      type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
    }`}>
      {type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditLeadModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: CrmLead;
  onClose: () => void;
  onSaved: (updated: CrmLead) => void;
}) {
  const [form, setForm] = useState<EditForm>({
    contact_name: lead.contact_name,
    company_name: lead.company_name,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    job_title: lead.job_title ?? "",
    bu: lead.bu,
    lead_source: lead.lead_source,
    assigned_to: lead.assigned_to,
    status: lead.status,
    bant_budget: lead.bant_budget != null ? String(lead.bant_budget) : "",
    bant_authority: lead.bant_authority,
    bant_need: lead.bant_need ?? "medium",
    bant_timeline: lead.bant_timeline ?? "",
    qualification_notes: lead.qualification_notes ?? "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = useCallback(<K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: "" }));
  }, []);

  const estimatedScore = calcScore(form);
  const scoreClr = scoreColor(estimatedScore);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.contact_name.trim()) errs.contact_name = "Nome obrigatório";
    if (!form.company_name.trim()) errs.company_name = "Empresa obrigatória";
    if (!form.bu) errs.bu = "BU obrigatória";
    if (!form.assigned_to) errs.assigned_to = "Responsável obrigatório";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        action: "update",
        lead_id: lead.lead_id,
        contact_name: form.contact_name,
        company_name: form.company_name,
        email: form.email || null,
        phone: form.phone || null,
        job_title: form.job_title || null,
        bu: form.bu,
        lead_source: form.lead_source,
        assigned_to: form.assigned_to,
        status: form.status,
        lead_score: estimatedScore,
        bant_budget: form.bant_budget ? parseFloat(form.bant_budget) : null,
        bant_authority: form.bant_authority,
        bant_need: form.bant_need || null,
        bant_timeline: form.bant_timeline || null,
        qualification_notes: form.qualification_notes || null,
      };
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        onSaved(json.data);
      } else {
        throw new Error(json.error ?? "Erro ao salvar");
      }
    } catch (err) {
      setErrors({ _global: err instanceof Error ? err.message : "Erro ao salvar lead" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Editar Lead</h2>
            <p className="text-xs text-gray-500 mt-0.5">{lead.company_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">

            {/* Score preview */}
            <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${scoreClr.border} ${scoreClr.bg}`}>
              <div className="flex items-center gap-2">
                <Zap size={13} className={scoreClr.text} />
                <span className={`text-xs font-semibold ${scoreClr.text}`}>Score: {estimatedScore}/100</span>
              </div>
              <div className="flex-1 max-w-xs h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${scoreClr.bar} transition-all duration-500`} style={{ width: `${estimatedScore}%` }} />
              </div>
              <span className="text-[10px] text-gray-500">
                {estimatedScore >= 71 ? "Lead quente" : estimatedScore >= 41 ? "Lead morno" : "Lead frio"}
              </span>
            </div>

            {/* Dados do Lead */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados do Lead</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome completo <span className="text-red-500">*</span></label>
                  <input type="text" className={`${inputCls} ${errors.contact_name ? "border-red-400" : ""}`}
                    value={form.contact_name} onChange={e => set("contact_name", e.target.value)} />
                  {errors.contact_name && <p className="text-[11px] text-red-600 mt-1">{errors.contact_name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Empresa <span className="text-red-500">*</span></label>
                  <input type="text" className={`${inputCls} ${errors.company_name ? "border-red-400" : ""}`}
                    value={form.company_name} onChange={e => set("company_name", e.target.value)} />
                  {errors.company_name && <p className="text-[11px] text-red-600 mt-1">{errors.company_name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
                  <div className="relative">
                    <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="email" className={`${inputCls} pl-8`} value={form.email} onChange={e => set("email", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
                  <div className="relative">
                    <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="tel" className={`${inputCls} pl-8`} value={form.phone} onChange={e => set("phone", e.target.value)} />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cargo</label>
                  <div className="relative">
                    <Briefcase size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="text" className={`${inputCls} pl-8`} value={form.job_title} onChange={e => set("job_title", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Qualificação */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Qualificação</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">BU <span className="text-red-500">*</span></label>
                  <select className={`${selectCls} ${errors.bu ? "border-red-400" : ""}`} value={form.bu} onChange={e => set("bu", e.target.value)}>
                    <option value="">Selecionar BU…</option>
                    <option value="JACQES">JACQES</option>
                    <option value="CAZA">CAZA</option>
                    <option value="ADVISOR">ADVISOR</option>
                    <option value="VENTURE">VENTURE</option>
                  </select>
                  {errors.bu && <p className="text-[11px] text-red-600 mt-1">{errors.bu}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fonte do Lead</label>
                  <select className={selectCls} value={form.lead_source} onChange={e => set("lead_source", e.target.value)}>
                    <option value="manual">Manual</option>
                    <option value="inbound">Inbound</option>
                    <option value="referral">Referral / Indicação</option>
                    <option value="organic">Orgânico</option>
                    <option value="paid">Pago</option>
                    <option value="outbound">Outbound</option>
                    <option value="event">Evento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Responsável <span className="text-red-500">*</span></label>
                  <select className={`${selectCls} ${errors.assigned_to ? "border-red-400" : ""}`} value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)}>
                    <option value="">Selecionar…</option>
                    <option value="Miguel">Miguel</option>
                    <option value="Danilo">Danilo</option>
                  </select>
                  {errors.assigned_to && <p className="text-[11px] text-red-600 mt-1">{errors.assigned_to}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
                    <option value="new">Novo</option>
                    <option value="contacted">Contato feito</option>
                    <option value="qualified">Qualificado</option>
                    <option value="unqualified">Desqualificado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BANT */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">BANT</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Budget (R$)</label>
                  <div className="relative">
                    <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="number" min="0" step="1000" className={`${inputCls} pl-8`}
                      value={form.bant_budget} onChange={e => set("bant_budget", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Need</label>
                  <select className={selectCls} value={form.bant_need} onChange={e => set("bant_need", e.target.value)}>
                    <option value="">Selecionar…</option>
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Timeline (prazo de decisão)</label>
                  <div className="relative">
                    <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="date" className={`${inputCls} pl-8`}
                      value={form.bant_timeline} onChange={e => set("bant_timeline", e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="block text-xs font-medium text-gray-700 mr-3">Authority (é o decisor?)</label>
                  <div
                    onClick={() => set("bant_authority", !form.bant_authority)}
                    className={`w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer ${form.bant_authority ? "bg-blue-500" : "bg-gray-200"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.bant_authority ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-1.5"><FileText size={12} />Notas de Qualificação</span>
              </label>
              <textarea rows={3} className={`${inputCls} resize-none`}
                value={form.qualification_notes} onChange={e => set("qualification_notes", e.target.value)} />
            </div>

            {errors._global && (
              <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle size={13} />{errors._global}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Salvando…</>
              ) : (
                <><CheckCircle2 size={14} />Salvar alterações</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function LeadsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStatic, setIsStatic] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const urlBu = searchParams?.get("bu") ?? null;
  const [buFilter, setBuFilter] = useState<string>(urlBu && BU_LIST.includes(urlBu as typeof BU_LIST[number]) ? urlBu : "Todos");
  const [search, setSearch] = useState("");
  const [converting, setConverting] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/crm/leads");
        const json = await res.json();
        if (json.success) {
          setLeads(json.data);
        } else throw new Error("api");
      } catch {
        setLeads(SEED_LEADS);
        setIsStatic(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleConvert(lead: CrmLead) {
    if (!confirm(`Converter "${lead.company_name}" em oportunidade?`)) return;
    setConverting(lead.lead_id);
    try {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert",
          lead_id: lead.lead_id,
          opportunity_name: `${lead.company_name} — ${lead.bu}`,
          bu: lead.bu,
          owner: lead.assigned_to,
          deal_value: lead.bant_budget ?? 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setLeads(prev => prev.map(l => l.lead_id === lead.lead_id ? { ...l, status: "converted" as const } : l));
        router.push("/crm/opportunities");
      } else {
        alert(json.error ?? "Erro ao converter lead");
      }
    } catch {
      alert("Erro de rede — tente novamente");
    } finally {
      setConverting(null);
    }
  }

  function handleSaved(updated: CrmLead) {
    setLeads(prev => prev.map(l => l.lead_id === updated.lead_id ? updated : l));
    setEditingLead(null);
    setToast({ message: "Lead atualizado com sucesso!", type: "success" });
  }

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (buFilter !== "Todos" && l.bu !== buFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.company_name.toLowerCase().includes(q) &&
          !l.contact_name.toLowerCase().includes(q) &&
          !(l.email ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [leads, statusFilter, buFilter, search]);

  // KPIs
  const kpiTotal     = leads.length;
  const kpiNew       = leads.filter(l => l.status === "new").length;
  const kpiQualified = leads.filter(l => l.status === "qualified").length;
  const kpiScoreAvg  = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.lead_score, 0) / leads.length) : 0;

  if (loading) {
    return (
      <>
        <Header title="Leads — CRM AWQ" subtitle="Pipeline de prospecção" />
        <div className="page-container">
          <div className="card p-12 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Carregando leads…</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Leads — CRM AWQ" subtitle="Pipeline de prospecção" />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {editingLead && (
        <EditLeadModal
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="page-container">

        {/* Header actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {isStatic && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              Snapshot estático
            </span>
          )}
          {!isStatic && <div />}
          <Link
            href="/crm/leads/add"
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={14} />
            Adicionar Lead
          </Link>
        </div>

        {/* ── KPI Row ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Users size={16} className="text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiTotal}</div>
              <div className="text-[10px] text-gray-500">Total de leads</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Target size={16} className="text-violet-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiNew}</div>
              <div className="text-[10px] text-gray-500">Leads novos</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiQualified}</div>
              <div className="text-[10px] text-gray-500">Qualificados</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <BarChart3 size={16} className="text-amber-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiScoreAvg}</div>
              <div className="text-[10px] text-gray-500">Score médio</div>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ────────────────────────────────────────────────────── */}
        <div className="card p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-1 flex-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === tab.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* BU filter */}
          <select
            value={buFilter}
            onChange={e => setBuFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            {BU_LIST.map(b => <option key={b}>{b}</option>)}
          </select>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-44 pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────────── */}
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <SectionHeader
              icon={<Users size={15} />}
              title="Leads"
              badge={
                <span className="badge badge-gray ml-1 text-[10px]">{filtered.length}</span>
              }
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              compact
              icon={<Search size={16} className="text-gray-400" />}
              title="Nenhum lead encontrado"
              description="Tente ajustar os filtros ou adicione um novo lead."
              action={
                <Link href="/crm/leads/add" className="btn-primary text-sm flex items-center gap-1.5">
                  <Plus size={13} />
                  Novo Lead
                </Link>
              }
            />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Lead / Empresa</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">BU</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Budget (BANT)</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Need</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Responsável</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Criado em</th>
                    <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((lead) => {
                    const statusCfg = STATUS_CONFIG[lead.status];
                    const needLabel = lead.bant_need ? (NEED_LABEL[lead.bant_need] ?? lead.bant_need) : "—";
                    const needColor = lead.bant_need === "high" ? "text-red-600" : lead.bant_need === "medium" ? "text-amber-600" : "text-gray-400";
                    return (
                      <tr key={lead.lead_id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900 text-[12px]">{lead.contact_name}</div>
                          <div className="text-[11px] text-gray-500 truncate max-w-[160px]">{lead.company_name}</div>
                          {lead.job_title && (
                            <div className="text-[10px] text-gray-400 truncate max-w-[160px]">{lead.job_title}</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <BuBadge bu={lead.bu} />
                        </td>
                        <td className="py-3 px-3">
                          <span className={`${statusCfg?.cls ?? "badge badge-gray"} text-[10px]`}>
                            {statusCfg?.label ?? lead.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <ScoreBar score={lead.lead_score} />
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] font-medium text-gray-700">{formatBRL(lead.bant_budget)}</span>
                          {lead.bant_authority && (
                            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Decisor</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[11px] font-semibold ${needColor}`}>{needLabel}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700">
                              {lead.assigned_to.charAt(0)}
                            </div>
                            <span className="text-[11px] text-gray-600">{lead.assigned_to}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-gray-400">
                          {formatDateBR(lead.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {lead.status !== "converted" && (
                              <button
                                onClick={() => setEditingLead(lead)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                                <Pencil size={10} />
                                Editar
                              </button>
                            )}
                            <Link href={`/crm/activities/add?related_to_type=lead&related_to_id=${lead.lead_id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                              <ExternalLink size={10} />
                              Atividade
                            </Link>
                            {lead.status !== "converted" && lead.status !== "unqualified" && (
                              <button
                                onClick={() => handleConvert(lead)}
                                disabled={converting === lead.lead_id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors disabled:opacity-50">
                                <ChevronRight size={10} />
                                {converting === lead.lead_id ? "…" : "Converter"}
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

      </div>
    </>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsPageInner />
    </Suspense>
  );
}
