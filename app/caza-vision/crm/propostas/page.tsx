"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  FileText, Plus, Search, RefreshCw, X,
  CheckCircle2, DollarSign,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { CazaCrmProposal } from "@/lib/caza-crm-db";
import { CAZA_PROPOSAL_STATUSES, CAZA_PIPELINE_STAGES } from "@/lib/caza-crm-db";
import { fetchCazaCRM } from "@/lib/caza-crm-query";

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  "Em Elaboração": { label: "Em Elaboração", cls: "badge badge-gray"   },
  "Enviada":       { label: "Enviada",        cls: "badge badge-blue"  },
  "Aprovada":      { label: "Aprovada",       cls: "badge badge-green" },
  "Rejeitada":     { label: "Rejeitada",      cls: "badge badge-red"   },
  "Em Revisão":    { label: "Em Revisão",     cls: "badge badge-yellow"},
};

const STATUS_TABS = [
  { key: "all", label: "Todas" },
  ...CAZA_PROPOSAL_STATUSES.map(s => ({ key: s, label: STATUS_CFG[s]?.label ?? s })),
];

const EMPTY_PROP = {
  opportunity_id: "",
  versao: 1,
  valor_proposto: 0,
  escopo: "",
  status: "Em Elaboração" as typeof CAZA_PROPOSAL_STATUSES[number],
  data_envio: "",
  data_resposta: "",
  observacoes: "",
};

export default function CazaPropostasPage() {
  const [propostas, setPropostas] = useState<CazaCrmProposal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_PROP });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await fetchCazaCRM<CazaCrmProposal>("propostas");
    setPropostas(data);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    return propostas.filter(p => {
      if (statusTab !== "all" && p.status !== statusTab) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.id.toLowerCase().includes(q) &&
          !p.opportunity_id.toLowerCase().includes(q) &&
          !p.escopo.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [propostas, statusTab, search]);

  const kpiTotal     = propostas.length;
  const kpiEnviadas  = propostas.filter(p => p.status !== "Em Elaboração").length;
  const kpiAprovadas = propostas.filter(p => p.status === "Aprovada").length;
  const kpiValorAprov= propostas.filter(p => p.status === "Aprovada").reduce((s, p) => s + p.valor_proposto, 0);

  async function handleSave() {
    if (!form.opportunity_id.trim()) { setError("ID da oportunidade é obrigatório"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/caza/crm/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          data_envio:    form.data_envio    || null,
          data_resposta: form.data_resposta || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        throw new Error(j.error ?? "Erro ao salvar");
      }
      const created = await res.json() as CazaCrmProposal;
      setPropostas(prev => [created, ...prev]);
      setShowModal(false);
      setForm({ ...EMPTY_PROP });
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    setUpdatingStatus(id);
    try {
      const res = await fetch("/api/caza/crm/propostas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        const updated = await res.json() as CazaCrmProposal;
        setPropostas(prev => prev.map(p => p.id === id ? updated : p));
      }
    } finally {
      setUpdatingStatus(null);
    }
  }

  return (
    <>
      <Header title="Propostas — CRM Caza Vision" subtitle="Propostas comerciais vinculadas a oportunidades" />
      <div className="page-container">

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Nova Proposta
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <FileText size={16} className="text-indigo-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiTotal}</div>
              <div className="text-[10px] text-gray-500">Total</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <FileText size={16} className="text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiEnviadas}</div>
              <div className="text-[10px] text-gray-500">Enviadas</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiAprovadas}</div>
              <div className="text-[10px] text-gray-500">Aprovadas</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <DollarSign size={16} className="text-teal-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{formatBRL(kpiValorAprov)}</div>
              <div className="text-[10px] text-gray-500">Valor aprovado</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex flex-wrap gap-1 flex-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusTab === tab.key ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-44 pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <SectionHeader
              icon={<FileText size={15} />}
              title="Propostas"
              badge={<span className="badge badge-gray ml-1 text-[10px]">{filtered.length}</span>}
            />
          </div>

          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-sm font-medium">Carregando…</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              compact
              icon={<Search size={16} className="text-gray-400" />}
              title="Nenhuma proposta encontrada"
              description="Crie propostas vinculadas a oportunidades."
              action={
                <button onClick={() => setShowModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
                  <Plus size={13} /> Nova Proposta
                </button>
              }
            />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Oportunidade</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Versão</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Escopo</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Envio</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Resposta</th>
                    <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Mover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(p => {
                    const cfg  = STATUS_CFG[p.status];
                    const isUp = updatingStatus === p.id;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-[11px] font-mono text-gray-500">{p.id}</td>
                        <td className="py-3 px-3 text-[11px] text-gray-700 font-mono">{p.opportunity_id}</td>
                        <td className="py-3 px-3 text-[11px] text-gray-600 text-center">v{p.versao}</td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] font-semibold text-gray-800 tabular-nums">{formatBRL(p.valor_proposto)}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] text-gray-600 truncate max-w-[160px] block">{p.escopo || "—"}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`${cfg?.cls ?? "badge badge-gray"} text-[10px]`}>{cfg?.label ?? p.status}</span>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-gray-400">{formatDateBR(p.data_envio)}</td>
                        <td className="py-3 px-3 text-[11px] text-gray-400">{formatDateBR(p.data_resposta)}</td>
                        <td className="py-3 px-4">
                          <select
                            value={p.status}
                            disabled={isUp}
                            onChange={e => void handleStatusChange(p.id, e.target.value)}
                            className="text-[11px] px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 disabled:opacity-50"
                          >
                            {CAZA_PROPOSAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
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

      {/* Add Proposal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Nova Proposta</h2>
              <button onClick={() => { setShowModal(false); setError(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">ID da Oportunidade *</label>
                <input
                  type="text"
                  placeholder="CV-OPP-XXXXXX"
                  value={form.opportunity_id}
                  onChange={e => setForm(f => ({ ...f, opportunity_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Versão</label>
                <input type="number" min={1} value={form.versao} onChange={e => setForm(f => ({ ...f, versao: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor proposto (R$)</label>
                <input type="number" min={0} value={form.valor_proposto} onChange={e => setForm(f => ({ ...f, valor_proposto: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof CAZA_PROPOSAL_STATUSES[number] }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
                  {CAZA_PROPOSAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data de envio</label>
                <input type="date" value={form.data_envio} onChange={e => setForm(f => ({ ...f, data_envio: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Escopo</label>
                <textarea rows={3} value={form.escopo} onChange={e => setForm(f => ({ ...f, escopo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                <textarea rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none" />
              </div>
            </div>
            {error && (
              <div className="mx-6 mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
            )}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => { setShowModal(false); setError(null); }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={() => void handleSave()} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
