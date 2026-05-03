"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Users, Plus, Search, Target, TrendingUp,
  BarChart3, ExternalLink, ChevronRight, Pencil, X,
} from "lucide-react";
import type { CrmLead } from "@/lib/crm-types";
import { BU_OPTIONS, OWNER_OPTIONS } from "@/lib/crm-types";
import { SEED_LEADS } from "@/lib/crm-db";
import { formatBRL, formatDateBR } from "@/lib/utils";

// ─── Edit Lead Modal ──────────────────────────────────────────────────────────

function EditLeadModal({
  lead,
  onSave,
  onClose,
}: {
  lead: CrmLead;
  onSave: (updated: CrmLead) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    company_name:         lead.company_name,
    contact_name:         lead.contact_name,
    email:                lead.email ?? "",
    phone:                lead.phone ?? "",
    job_title:            lead.job_title ?? "",
    bu:                   lead.bu,
    assigned_to:          lead.assigned_to,
    status:               lead.status,
    lead_score:           String(lead.lead_score),
    qualification_notes:  lead.qualification_notes ?? "",
    bant_budget:          String(lead.bant_budget ?? ""),
    bant_authority:       lead.bant_authority,
    bant_need:            lead.bant_need ?? "",
    bant_timeline:        lead.bant_timeline ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:              "update",
          lead_id:             lead.lead_id,
          status:              form.status,
          lead_score:          parseInt(form.lead_score) || 0,
          qualification_notes: form.qualification_notes || null,
          bant_budget:         form.bant_budget ? parseFloat(form.bant_budget) : null,
          bant_authority:      form.bant_authority,
          bant_need:           form.bant_need   || null,
          bant_timeline:       form.bant_timeline || null,
          assigned_to:         form.assigned_to,
        }),
      });
      if (!res.ok) throw new Error("API error");
      onSave({
        ...lead,
        status:              form.status as CrmLead["status"],
        lead_score:          parseInt(form.lead_score) || 0,
        qualification_notes: form.qualification_notes || null,
        bant_budget:         form.bant_budget ? parseFloat(form.bant_budget) : null,
        bant_authority:      form.bant_authority,
        bant_need:           form.bant_need as CrmLead["bant_need"] || null,
        bant_timeline:       form.bant_timeline || null,
        assigned_to:         form.assigned_to,
      });
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Editar Lead</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">{lead.contact_name} · {lead.company_name}</p>
          </div>
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                <option value="new">Novo</option>
                <option value="contacted">Contato</option>
                <option value="qualified">Qualificado</option>
                <option value="unqualified">Desqualificado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Responsável</label>
              <select value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                {OWNER_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Score (0–100)</label>
            <input type="number" min="0" max="100" value={form.lead_score} onChange={e => set("lead_score", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas de Qualificação</label>
            <textarea value={form.qualification_notes} onChange={e => set("qualification_notes", e.target.value)}
              rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none" />
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">BANT</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Budget (R$)</label>
                <input type="number" min="0" value={form.bant_budget} onChange={e => set("bant_budget", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Need</label>
                <select value={form.bant_need} onChange={e => set("bant_need", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  <option value="">— Indefinido —</option>
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Timeline</label>
                <input type="date" value={form.bant_timeline} onChange={e => set("bant_timeline", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.bant_authority}
                    onChange={e => set("bant_authority", e.target.checked)}
                    className="w-4 h-4 accent-brand-600" />
                  <span className="text-xs text-gray-700">Decisor identificado</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

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
      <div className="page-container">

        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
            {toast.msg}
          </div>
        )}

        {editingLead && (
          <EditLeadModal
            lead={editingLead}
            onSave={updated => {
              setLeads(prev => prev.map(l => l.lead_id === updated.lead_id ? updated : l));
              setEditingLead(null);
              showToast("Lead atualizado", true);
            }}
            onClose={() => setEditingLead(null)}
          />
        )}

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
                            <button onClick={() => setEditingLead(lead)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                              <Pencil size={10} /> Editar
                            </button>
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
