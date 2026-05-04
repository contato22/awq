"use client";

import { useEffect, useState, useCallback } from "react";
import type { ReactNode, FormEvent } from "react";
import Header from "@/components/Header";
import {
  FileText, Plus, Search, Send, Eye, CheckCircle2, X,
  PenLine, Clock, AlertTriangle, ChevronRight, Copy,
  Building2, DollarSign, Calendar, Link2, User,
  LayoutTemplate, RefreshCw, ExternalLink, Download,
} from "lucide-react";
import type { Proposal, ProposalTemplate, ProposalSection } from "@/lib/crm-types";
import { SEED_PROPOSALS, SEED_PROPOSAL_TEMPLATES } from "@/lib/crm-db";
import { formatBRL, formatDateBR } from "@/lib/utils";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; icon: ReactNode; color: string; bg: string; border: string }> = {
  draft:    { label: "Rascunho",  icon: <FileText size={11} />,       color: "text-gray-600",   bg: "bg-gray-100",    border: "border-gray-200"  },
  sent:     { label: "Enviada",   icon: <Send size={11} />,           color: "text-blue-700",   bg: "bg-blue-50",     border: "border-blue-200"  },
  viewed:   { label: "Visualizada",icon:<Eye size={11} />,            color: "text-violet-700", bg: "bg-violet-50",   border: "border-violet-200"},
  signed:   { label: "Assinada",  icon: <CheckCircle2 size={11} />,   color: "text-emerald-700",bg: "bg-emerald-50",  border: "border-emerald-200"},
  declined: { label: "Recusada",  icon: <X size={11} />,              color: "text-red-700",    bg: "bg-red-50",      border: "border-red-200"   },
  expired:  { label: "Expirada",  icon: <AlertTriangle size={11} />,  color: "text-amber-700",  bg: "bg-amber-50",    border: "border-amber-200" },
};

const SIG_CFG: Record<string, { label: string; color: string; bg: string }> = {
  none:     { label: "Sem assinatura", color: "text-gray-500",    bg: "bg-gray-100"   },
  pending:  { label: "Aguardando",     color: "text-amber-700",   bg: "bg-amber-50"   },
  signed:   { label: "Assinada",       color: "text-emerald-700", bg: "bg-emerald-50" },
  declined: { label: "Recusada",       color: "text-red-700",     bg: "bg-red-50"     },
};

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function daysLeft(d: string | null | undefined): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

// ─── New Proposal Modal ───────────────────────────────────────────────────────

type NewForm = {
  title: string; opportunity_id: string; opportunity_name: string;
  template_id: string; signer_email: string; valid_until: string;
  bu: string; owner: string; deal_value: string;
};

function NewProposalModal({ templates, onClose, onSave }: {
  templates: ProposalTemplate[];
  onClose: () => void;
  onSave: (p: Proposal) => void;
}) {
  const [form, setForm] = useState<NewForm>({
    title: "", opportunity_id: "", opportunity_name: "",
    template_id: templates[0]?.template_id ?? "",
    signer_email: "", valid_until: "",
    bu: "JACQES", owner: "Miguel", deal_value: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof NewForm, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const selectedTpl = templates.find(t => t.template_id === form.template_id);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Título obrigatório"); return; }
    if (!form.opportunity_id.trim()) { setError("ID da oportunidade obrigatório"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: form.title,
          opportunity_id: form.opportunity_id,
          template_id: form.template_id || null,
          signer_email: form.signer_email || null,
          valid_until: form.valid_until || null,
          bu: form.bu,
          owner: form.owner,
          deal_value: form.deal_value ? parseFloat(form.deal_value) : 0,
          sections: selectedTpl?.sections ?? [],
        }),
      });
      const json = await res.json();
      if (json.success) { onSave(json.data); }
      else setError(json.error ?? "Erro ao criar proposta");
    } catch { setError("Erro de conexão"); }
    finally { setSaving(false); }
  }

  const inputCls = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Nova Proposta</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
        </div>
        <form onSubmit={handleSave} className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Título da proposta *</label>
            <input type="text" className={inputCls} placeholder="Ex: Proposta de Social Media — Empresa X"
              value={form.title} onChange={e => set("title", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">ID da Oportunidade *</label>
              <input type="text" className={inputCls} placeholder="opp-id ou uuid"
                value={form.opportunity_id} onChange={e => set("opportunity_id", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">BU</label>
              <select className={`${inputCls} cursor-pointer`} value={form.bu} onChange={e => set("bu", e.target.value)}>
                <option value="JACQES">JACQES</option>
                <option value="CAZA">Caza Vision</option>
                <option value="ADVISOR">Advisor</option>
                <option value="VENTURE">Venture</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Template</label>
            <select className={`${inputCls} cursor-pointer`} value={form.template_id} onChange={e => set("template_id", e.target.value)}>
              <option value="">Sem template (em branco)</option>
              {templates.map(t => <option key={t.template_id} value={t.template_id}>{t.name} ({t.bu})</option>)}
            </select>
            {selectedTpl && (
              <p className="text-[10px] text-gray-400 mt-1">{selectedTpl.sections.length} seções · {selectedTpl.variables.length} variáveis</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Valor (R$)</label>
              <input type="number" min="0" step="1000" className={inputCls} placeholder="35000"
                value={form.deal_value} onChange={e => set("deal_value", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Válida até</label>
              <input type="date" className={inputCls} value={form.valid_until} onChange={e => set("valid_until", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">E-mail do signatário</label>
              <input type="email" className={inputCls} placeholder="cliente@empresa.com"
                value={form.signer_email} onChange={e => set("signer_email", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Responsável</label>
              <select className={`${inputCls} cursor-pointer`} value={form.owner} onChange={e => set("owner", e.target.value)}>
                <option value="Miguel">Miguel</option>
                <option value="Danilo">Danilo</option>
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSave as unknown as React.MouseEventHandler} disabled={saving}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Plus size={14} />}
            Criar proposta
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Proposal Detail Panel ────────────────────────────────────────────────────

function ProposalDetail({ proposal, onAction, onClose }: {
  proposal: Proposal;
  onAction: (action: string, extra?: Record<string, string>) => void;
  onClose: () => void;
}) {
  const sc = STATUS_CFG[proposal.status] ?? STATUS_CFG.draft;
  const sig = SIG_CFG[proposal.signature_status] ?? SIG_CFG.none;
  const days = daysLeft(proposal.valid_until);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function doAction(action: string, extra?: Record<string, string>) {
    setActionLoading(action);
    try { await onAction(action, extra); }
    finally { setActionLoading(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-bold text-gray-400">{proposal.proposal_code}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                {sc.icon}{sc.label}
              </span>
              {days !== null && days <= 7 && days >= 0 && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Expira em {days}d
                </span>
              )}
              {days !== null && days < 0 && (
                <span className="text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">Expirada</span>
              )}
            </div>
            <h2 className="text-sm font-bold text-gray-900">{proposal.title}</h2>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
              {proposal.account_name && <span className="flex items-center gap-1"><Building2 size={10} />{proposal.account_name}</span>}
              <span className="flex items-center gap-1"><DollarSign size={10} />{formatBRL(proposal.deal_value)}</span>
              {proposal.valid_until && <span className="flex items-center gap-1"><Calendar size={10} />Válida até {formatDateBR(proposal.valid_until)}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0 ml-3"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* E-signature status */}
          <div className={`rounded-xl p-4 border ${sig.bg} border-opacity-60`} style={{ borderColor: "currentColor" }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <PenLine size={14} className={sig.color} />
                  <span className={`text-xs font-bold ${sig.color}`}>Assinatura Eletrônica</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sig.bg} ${sig.color}`}>{sig.label}</span>
                </div>
                {proposal.signer_email && (
                  <p className="text-[11px] text-gray-600 flex items-center gap-1"><User size={9} />{proposal.signer_name ?? proposal.signer_email}</p>
                )}
                {proposal.signed_at && (
                  <p className="text-[11px] text-emerald-700 mt-0.5">Assinado em {fmtDateTime(proposal.signed_at)}</p>
                )}
                {proposal.signature_link && proposal.signature_status === "pending" && (
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 truncate max-w-xs">{proposal.signature_link}</code>
                    <button onClick={() => navigator.clipboard.writeText(proposal.signature_link!)} className="text-gray-400 hover:text-gray-700">
                      <Copy size={11} />
                    </button>
                  </div>
                )}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {proposal.status === "draft" && (
                  <button
                    onClick={() => doAction("send")}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {actionLoading === "send" ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send size={11} />}
                    Enviar para assinatura
                  </button>
                )}
                {(proposal.status === "sent" || proposal.status === "viewed") && proposal.signature_status === "pending" && (
                  <>
                    <button
                      onClick={() => doAction("sign", { signer_name: proposal.signer_name ?? "", signer_email: proposal.signer_email ?? "" })}
                      disabled={!!actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {actionLoading === "sign" ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={11} />}
                      Marcar assinada
                    </button>
                    <button
                      onClick={() => doAction("decline")}
                      disabled={!!actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-60"
                    >
                      <X size={11} />Recusada
                    </button>
                    {proposal.signature_link && (
                      <a href={proposal.signature_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                        <ExternalLink size={11} />Abrir link
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-3">Timeline</h4>
            <div className="space-y-2">
              {[
                { date: proposal.created_at,               label: "Proposta criada",    color: "bg-gray-300" },
                { date: proposal.sent_at,                  label: "Enviada para cliente",color: "bg-blue-400" },
                { date: proposal.viewed_at,                label: `Visualizada ${proposal.viewed_count > 1 ? `(${proposal.viewed_count}x)` : ""}`, color: "bg-violet-400" },
                { date: proposal.signature_requested_at,   label: "Assinatura solicitada",color: "bg-amber-400" },
                { date: proposal.signed_at,                label: `Assinada por ${proposal.signer_name ?? "—"}`, color: "bg-emerald-400" },
                { date: proposal.declined_at,              label: `Recusada${proposal.decline_reason ? ` — ${proposal.decline_reason}` : ""}`, color: "bg-red-400" },
              ].filter(e => !!e.date).map((e, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${e.color}`} />
                  <div>
                    <span className="text-xs text-gray-800 font-medium">{e.label}</span>
                    <span className="text-[10px] text-gray-400 ml-2">{fmtDateTime(e.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content preview */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-3">Conteúdo ({proposal.sections.length} seções)</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {proposal.sections.map((section: ProposalSection) => (
                <div key={section.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-700">{section.order}. {section.title}</span>
                  </div>
                  <div className="px-3 py-2">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{section.content}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-gray-400">
            {proposal.template_name ? `Template: ${proposal.template_name}` : "Sem template"} · Owner: {proposal.owner}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.origin + "/api/crm/proposals?id=" + proposal.proposal_id)}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 transition-colors"
          >
            <Link2 size={11} />Copiar link
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Proposal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch("/api/crm/proposals"),
        fetch("/api/crm/proposals?resource=templates"),
      ]);
      const [pJson, tJson] = await Promise.all([pRes.json(), tRes.json()]);
      setProposals(pJson.success ? pJson.data : SEED_PROPOSALS);
      setTemplates(tJson.success ? tJson.data : SEED_PROPOSAL_TEMPLATES);
    } catch {
      setProposals(SEED_PROPOSALS);
      setTemplates(SEED_PROPOSAL_TEMPLATES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = proposals.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.account_name ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleAction(action: string, extra?: Record<string, string>) {
    if (!selected) return;
    try {
      const res = await fetch("/api/crm/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, proposal_id: selected.proposal_id, ...extra }),
      });
      const json = await res.json();
      if (json.success) {
        setSelected(json.data);
        setProposals(prev => prev.map(p => p.proposal_id === json.data.proposal_id ? json.data : p));
      }
    } catch { /* ignore */ }
  }

  // KPIs
  const kpiTotal    = proposals.length;
  const kpiPending  = proposals.filter(p => p.signature_status === "pending").length;
  const kpiSigned   = proposals.filter(p => p.signature_status === "signed").length;
  const kpiValue    = proposals.filter(p => p.signature_status === "signed").reduce((s, p) => s + p.deal_value, 0);

  return (
    <>
      <Header title="Propostas — CRM AWQ" subtitle="Geração, envio e rastreamento de e-signature" />
      {showNew && (
        <NewProposalModal templates={templates} onClose={() => setShowNew(false)} onSave={p => { setProposals(prev => [p, ...prev]); setShowNew(false); }} />
      )}
      {selected && (
        <ProposalDetail proposal={selected} onAction={handleAction} onClose={() => setSelected(null)} />
      )}

      <div className="page-container">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div />
          <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} />Nova Proposta
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",       value: kpiTotal,          icon: <FileText size={15} className="text-blue-600" />,   bg: "bg-blue-50"   },
            { label: "Aguardando",  value: kpiPending,        icon: <Clock size={15} className="text-amber-600" />,     bg: "bg-amber-50"  },
            { label: "Assinadas",   value: kpiSigned,         icon: <CheckCircle2 size={15} className="text-emerald-600"/>, bg: "bg-emerald-50"},
            { label: "Receita convertida", value: formatBRL(kpiValue), icon: <DollarSign size={15} className="text-violet-600"/>, bg: "bg-violet-50"},
          ].map(k => (
            <div key={k.label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>{k.icon}</div>
              <div>
                <div className="text-lg font-bold text-gray-900">{k.value}</div>
                <div className="text-[10px] text-gray-500">{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Buscar propostas…"
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none cursor-pointer"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os status</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => {
              const sc = STATUS_CFG[p.status] ?? STATUS_CFG.draft;
              const sig = SIG_CFG[p.signature_status] ?? SIG_CFG.none;
              const days = daysLeft(p.valid_until);

              return (
                <button
                  key={p.proposal_id}
                  onClick={() => setSelected(p)}
                  className="w-full text-left card p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-bold text-gray-400">{p.proposal_code}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                          {sc.icon}{sc.label}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sig.bg} ${sig.color}`}>
                          <PenLine size={9} className="inline mr-0.5" />{sig.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                        {p.account_name && <span className="flex items-center gap-1"><Building2 size={9} />{p.account_name}</span>}
                        <span className="flex items-center gap-1"><DollarSign size={9} />{formatBRL(p.deal_value)}</span>
                        {p.viewed_count > 0 && (
                          <span className="flex items-center gap-1 text-violet-600"><Eye size={9} />{p.viewed_count}x visualizada</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {p.valid_until && (
                        <span className={`text-[10px] font-medium ${days !== null && days <= 0 ? "text-red-600" : days !== null && days <= 7 ? "text-amber-600" : "text-gray-400"}`}>
                          {days !== null && days <= 0 ? "Expirada" : days !== null && days <= 7 ? `${days}d restantes` : formatDateBR(p.valid_until)}
                        </span>
                      )}
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <FileText size={28} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhuma proposta encontrada</p>
                <button onClick={() => setShowNew(true)} className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium">
                  Criar primeira proposta →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Templates section */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <LayoutTemplate size={14} className="text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-700">Templates disponíveis ({templates.length})</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {templates.map(t => (
              <div key={t.template_id} className="card p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold text-gray-900 truncate">{t.name}</p>
                  <span className="text-[10px] text-gray-400 shrink-0">{t.bu}</span>
                </div>
                <p className="text-[11px] text-gray-500 truncate">{t.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-gray-400">{t.sections.length} seções · usado {t.times_used}x</span>
                  <button onClick={() => { setShowNew(true); }} className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">Usar</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
