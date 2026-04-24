"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import { fetchCazaCRM } from "@/lib/caza-crm-query";
import type { CazaCrmProposal, CazaCrmOpportunity } from "@/lib/caza-crm-db";
import {
  CAZA_PROPOSAL_STATUSES, CAZA_SERVICE_TYPES,
} from "@/lib/caza-crm-db";
import {
  FileText, Plus, X, Database, CloudOff, DollarSign,
  CheckCircle2, Clock, XCircle,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const PROPOSAL_STATUS_CFG: Record<string, { text: string; bg: string; border: string }> = {
  "Em Elaboração": { text: "text-gray-600",    bg: "bg-gray-100",   border: "border-gray-200"   },
  "Enviada":       { text: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200"   },
  "Aprovada":      { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  "Rejeitada":     { text: "text-red-700",     bg: "bg-red-50",     border: "border-red-200"    },
  "Em Revisão":    { text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200"  },
};

function ProposalStatusBadge({ status }: { status: string }) {
  const cfg = PROPOSAL_STATUS_CFG[status] ?? PROPOSAL_STATUS_CFG["Em Elaboração"];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.text} ${cfg.bg} ${cfg.border}`}>
      {status}
    </span>
  );
}

const EMPTY_FORM = {
  opportunity_id: "", versao: "1", valor_proposto: "", escopo: "",
  status: "Em Elaboração" as string, data_envio: "", observacoes: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

export default function CazaCrmPropostas() {
  const [proposals, setProposals] = useState<CazaCrmProposal[]>([]);
  const [opps,      setOpps]      = useState<CazaCrmOpportunity[]>([]);
  const [source,    setSource]    = useState<"loading" | "internal" | "static" | "empty">("loading");
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState("Todas");

  useEffect(() => {
    Promise.all([
      fetchCazaCRM<CazaCrmProposal>("propostas"),
      fetchCazaCRM<CazaCrmOpportunity>("oportunidades"),
    ]).then(([props, oppsData]) => {
      setProposals(props);
      setOpps(oppsData);
      setSource(props.length > 0 ? (IS_STATIC ? "static" : "internal") : "empty");
    });
  }, []);

  const filtered   = filter === "Todas" ? proposals : proposals.filter((p) => p.status === filter);
  const totalValue = proposals.filter((p) => p.status !== "Rejeitada").reduce((s, p) => s + p.valor_proposto, 0);
  const approved   = proposals.filter((p) => p.status === "Aprovada").reduce((s, p) => s + p.valor_proposto, 0);

  const oppMap = new Map(opps.map((o) => [o.id, o]));

  async function handleSave() {
    if (IS_STATIC) { setError("Não disponível no modo estático."); return; }
    if (!form.opportunity_id) { setError("Vincule uma oportunidade."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/caza/crm/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id: form.opportunity_id,
          versao:         Number(form.versao) || 1,
          valor_proposto: Number(form.valor_proposto) || 0,
          escopo:         form.escopo,
          status:         form.status,
          data_envio:     form.data_envio || null,
          observacoes:    form.observacoes,
        }),
      });
      if (!res.ok) {
        const e = await res.json() as { error?: string };
        setError(e.error ?? "Erro ao salvar.");
      } else {
        const prop = await res.json() as CazaCrmProposal;
        setProposals((prev) => [prop, ...prev]);
        setSource("internal");
        setShowForm(false);
        setForm({ ...EMPTY_FORM });
      }
    } catch { setError("Erro de rede."); }
    finally { setSaving(false); }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    if (IS_STATIC) return;
    const body: Record<string, unknown> = { id, status: newStatus };
    if (newStatus === "Aprovada" || newStatus === "Rejeitada") {
      body.data_resposta = new Date().toISOString().slice(0, 10);
    }
    try {
      await fetch("/api/caza/crm/propostas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setProposals((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
    } catch { /* silent */ }
  }

  return (
    <>
      <Header title="Propostas" subtitle="Gestão de Propostas Comerciais · Caza Vision" />
      <div className="page-container">

        {/* Source + action */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {source === "loading" && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500"><Database size={11} />Carregando…</span>}
            {source === "internal" && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600"><Database size={11} />Base interna AWQ</span>}
            {source === "static" && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600"><Database size={11} />Snapshot estático</span>}
            {source === "empty" && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700"><CloudOff size={11} />Sem propostas</span>}
          </div>
          {!IS_STATIC && (
            <button onClick={() => { setShowForm((v) => !v); setError(null); }}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs">
              {showForm ? <X size={13} /> : <Plus size={13} />}
              {showForm ? "Cancelar" : "Nova Proposta"}
            </button>
          )}
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Propostas",   value: proposals.length,                                   icon: FileText,    color: "text-gray-700"    },
            { label: "Em Aberto",         value: proposals.filter((p) => p.status === "Enviada").length, icon: Clock,    color: "text-blue-600"    },
            { label: "Aprovadas",         value: proposals.filter((p) => p.status === "Aprovada").length, icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Valor Aprovado",    value: fmtR(approved),                                      icon: DollarSign, color: "text-emerald-600" },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="card p-4 flex items-center gap-3">
                <Icon size={15} className={`${k.color} shrink-0`} />
                <div>
                  <div className={`text-xl font-bold ${k.color} tabular-nums`}>{k.value}</div>
                  <div className="text-[11px] text-gray-400 font-medium">{k.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add form */}
        {showForm && (
          <div className="card p-5 border border-amber-200 bg-amber-50/20">
            <SectionHeader title="Nova Proposta" />
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Oportunidade Vinculada *</label>
                <select value={form.opportunity_id} onChange={(e) => setForm((f) => ({ ...f, opportunity_id: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white">
                  <option value="">— selecione —</option>
                  {opps.filter((o) => o.stage !== "Fechado Perdido").map((o) => (
                    <option key={o.id} value={o.id}>{o.nome_oportunidade} ({o.empresa || o.id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Versão</label>
                <input type="number" min={1} value={form.versao} onChange={(e) => setForm((f) => ({ ...f, versao: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Valor Proposto (R$)</label>
                <input type="number" min={0} value={form.valor_proposto} onChange={(e) => setForm((f) => ({ ...f, valor_proposto: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white">
                  {CAZA_PROPOSAL_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Data de Envio</label>
                <input type="date" value={form.data_envio} onChange={(e) => setForm((f) => ({ ...f, data_envio: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Escopo / Descrição</label>
                <textarea rows={2} value={form.escopo} onChange={(e) => setForm((f) => ({ ...f, escopo: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white resize-none" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Observações</label>
                <textarea rows={2} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowForm(false); setError(null); setForm({ ...EMPTY_FORM }); }}
                className="px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary px-5 py-1.5 text-sm disabled:opacity-60">
                {saving ? "Salvando…" : "Salvar Proposta"}
              </button>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {["Todas", ...CAZA_PROPOSAL_STATUSES].map((s) => {
            const count = s === "Todas" ? proposals.length : proposals.filter((p) => p.status === s).length;
            return (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                  filter === s ? "bg-brand-600 text-white border-brand-600" : "text-gray-500 bg-white border-gray-200 hover:border-gray-300"
                }`}>
                {s} {count > 0 && <span className="opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="card p-5">
          <SectionHeader icon={<FileText size={15} className="text-amber-500" />} title="Propostas" />
          {filtered.length === 0 ? (
            <EmptyState compact title="Sem propostas" description="Crie propostas vinculadas às oportunidades abertas." />
          ) : (
            <div className="table-scroll mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">ID</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Oportunidade</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Escopo</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Valor</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Versão</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Enviada</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Resposta</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const opp = oppMap.get(p.opportunity_id);
                    return (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-[10px] text-gray-400 font-mono">{p.id}</td>
                        <td className="py-2.5 px-3">
                          <div className="text-xs font-medium text-gray-700">{opp?.nome_oportunidade ?? p.opportunity_id}</div>
                          {opp?.empresa && <div className="text-[10px] text-gray-400">{opp.empresa}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 max-w-[200px] truncate">{p.escopo || "—"}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">
                          {p.valor_proposto > 0 ? fmtR(p.valor_proposto) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-center text-gray-500">v{p.versao}</td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-400">{fmtDate(p.data_envio)}</td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-400">{fmtDate(p.data_resposta)}</td>
                        <td className="py-2.5 px-3">
                          {!IS_STATIC ? (
                            <select value={p.status} onChange={(e) => handleStatusChange(p.id, e.target.value)}
                              className="text-[10px] font-semibold border-0 bg-transparent focus:outline-none cursor-pointer">
                              {CAZA_PROPOSAL_STATUSES.map((s) => <option key={s}>{s}</option>)}
                            </select>
                          ) : <ProposalStatusBadge status={p.status} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {totalValue > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end gap-4 text-xs">
                  <span className="text-gray-500">Total em aberto:</span>
                  <span className="font-bold text-gray-900">{fmtR(totalValue)}</span>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
