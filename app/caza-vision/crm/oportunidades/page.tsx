"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Target, Plus, Search, RefreshCw, X,
  DollarSign, TrendingUp, CheckCircle2, XCircle,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { CazaCrmOpportunity } from "@/lib/caza-crm-db";
import { CAZA_PIPELINE_STAGES, CAZA_SERVICE_TYPES, CAZA_RISK_LEVELS } from "@/lib/caza-crm-db";
import { fetchCazaCRM } from "@/lib/caza-crm-query";

const STAGE_COLORS: Record<string, string> = {
  "Lead Captado":     "badge badge-gray",
  "Qualificação":     "badge badge-blue",
  "Briefing Inicial": "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
  "Proposta Enviada": "badge badge-yellow",
  "Negociação":       "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 ring-1 ring-orange-200/60",
  "Fechado Ganho":    "badge badge-green",
  "Fechado Perdido":  "badge badge-red",
};
const RISCO_CFG: Record<string, string> = {
  "Baixo": "text-emerald-600", "Médio": "text-amber-600", "Alto": "text-red-600",
};

const STAGE_TABS = [
  { key: "all", label: "Todos" },
  { key: "open", label: "Abertas" },
  ...CAZA_PIPELINE_STAGES.map(s => ({ key: s, label: s })),
];

const EMPTY_OPP = {
  lead_id: "",
  nome_oportunidade: "",
  empresa: "",
  tipo_servico: "" as typeof CAZA_SERVICE_TYPES[number] | "",
  valor_estimado: 0,
  stage: "Lead Captado" as typeof CAZA_PIPELINE_STAGES[number],
  probabilidade: 10,
  owner: "",
  data_abertura: new Date().toISOString().slice(0, 10),
  prazo_estimado: "",
  proxima_acao: "",
  data_proxima_acao: "",
  risco: "Baixo" as typeof CAZA_RISK_LEVELS[number],
  motivo_perda: "",
  observacoes: "",
};

export default function CazaOportunidadesPage() {
  const [opps, setOpps]         = useState<CazaCrmOpportunity[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [stageTab, setStageTab] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState({ ...EMPTY_OPP });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [updatingStage, setUpdatingStage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await fetchCazaCRM<CazaCrmOpportunity>("oportunidades");
    setOpps(data);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    return opps.filter(o => {
      if (stageTab === "open") {
        if (o.stage === "Fechado Ganho" || o.stage === "Fechado Perdido") return false;
      } else if (stageTab !== "all" && o.stage !== stageTab) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.nome_oportunidade.toLowerCase().includes(q) &&
          !o.empresa.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [opps, stageTab, search]);

  const kpiAbertas   = opps.filter(o => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido").length;
  const kpiGanhas    = opps.filter(o => o.stage === "Fechado Ganho").length;
  const kpiPerdidas  = opps.filter(o => o.stage === "Fechado Perdido").length;
  const kpiPipeline  = opps.filter(o => o.stage !== "Fechado Perdido").reduce((s, o) => s + o.valor_estimado, 0);

  async function handleSave() {
    if (!form.nome_oportunidade.trim()) { setError("Nome é obrigatório"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/caza/crm/oportunidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lead_id:          form.lead_id || null,
          prazo_estimado:   form.prazo_estimado || null,
          data_proxima_acao:form.data_proxima_acao || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        throw new Error(j.error ?? "Erro ao salvar");
      }
      const created = await res.json() as CazaCrmOpportunity;
      setOpps(prev => [created, ...prev]);
      setShowModal(false);
      setForm({ ...EMPTY_OPP });
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleStageChange(id: string, stage: string) {
    setUpdatingStage(id);
    try {
      const res = await fetch("/api/caza/crm/oportunidades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, stage }),
      });
      if (res.ok) {
        const updated = await res.json() as CazaCrmOpportunity;
        setOpps(prev => prev.map(o => o.id === id ? updated : o));
      }
    } finally {
      setUpdatingStage(null);
    }
  }

  return (
    <>
      <Header title="Oportunidades — CRM Caza Vision" subtitle="Pipeline comercial de produção" />
      <div className="page-container">

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Nova Oportunidade
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Target size={16} className="text-violet-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiAbertas}</div>
              <div className="text-[10px] text-gray-500">Em aberto</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <DollarSign size={16} className="text-amber-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{formatBRL(kpiPipeline)}</div>
              <div className="text-[10px] text-gray-500">Valor pipeline</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiGanhas}</div>
              <div className="text-[10px] text-gray-500">Fechado Ganho</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <XCircle size={16} className="text-red-500" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiPerdidas}</div>
              <div className="text-[10px] text-gray-500">Fechado Perdido</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex flex-wrap gap-1 flex-1">
            {STAGE_TABS.slice(0, 4).map(tab => (
              <button
                key={tab.key}
                onClick={() => setStageTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  stageTab === tab.key ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <select
              value={STAGE_TABS.find(t => t.key === stageTab && t.key !== "all" && t.key !== "open") ? stageTab : ""}
              onChange={e => setStageTab(e.target.value || "all")}
              className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-600 focus:outline-none bg-gray-50"
            >
              <option value="">Estágio…</option>
              {CAZA_PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-44 pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <SectionHeader
              icon={<Target size={15} />}
              title="Oportunidades"
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
              title="Nenhuma oportunidade encontrada"
              description="Ajuste os filtros ou crie uma nova oportunidade."
              action={
                <button onClick={() => setShowModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
                  <Plus size={13} /> Nova Oportunidade
                </button>
              }
            />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Oportunidade</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Estágio</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Prob.</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Risco</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Próx. ação</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Abertura</th>
                    <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Mover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(o => {
                    const stageCls = STAGE_COLORS[o.stage] ?? "badge badge-gray";
                    const riscoCls = RISCO_CFG[o.risco] ?? "text-gray-600";
                    const isUpdating = updatingStage === o.id;
                    return (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900 text-[12px] max-w-[160px] truncate">{o.nome_oportunidade}</div>
                          <div className="text-[11px] text-gray-500">{o.empresa}</div>
                          <div className="text-[10px] text-gray-400">{o.tipo_servico || "—"}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`${stageCls} text-[10px]`}>{o.stage}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] font-semibold text-gray-800 tabular-nums">{formatBRL(o.valor_estimado)}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${o.probabilidade}%` }} />
                            </div>
                            <span className="text-[11px] text-gray-600 tabular-nums">{o.probabilidade}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[11px] font-semibold ${riscoCls}`}>{o.risco}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-[11px] text-gray-700 truncate max-w-[120px]">{o.proxima_acao || "—"}</div>
                          {o.data_proxima_acao && (
                            <div className="text-[10px] text-gray-400">{formatDateBR(o.data_proxima_acao)}</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] text-gray-600">{o.owner || "—"}</span>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-gray-400">
                          {formatDateBR(o.data_abertura)}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={o.stage}
                            disabled={isUpdating}
                            onChange={e => void handleStageChange(o.id, e.target.value)}
                            className="text-[11px] px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 disabled:opacity-50"
                          >
                            {CAZA_PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
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

      {/* Add Opportunity Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Nova Oportunidade</h2>
              <button onClick={() => { setShowModal(false); setError(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ["nome_oportunidade", "Nome *", "text"],
                ["empresa", "Empresa", "text"],
                ["owner", "Responsável", "text"],
                ["data_abertura", "Data de abertura", "date"],
                ["prazo_estimado", "Prazo estimado", "date"],
                ["valor_estimado", "Valor estimado (R$)", "number"],
                ["probabilidade", "Probabilidade (%)", "number"],
              ] as [keyof typeof EMPTY_OPP, string, string][]).map(([key, label, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type={type}
                    value={String(form[key])}
                    onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
              ))}
              {([
                ["tipo_servico", "Tipo de serviço", ["", ...CAZA_SERVICE_TYPES]],
                ["stage", "Estágio", [...CAZA_PIPELINE_STAGES]],
                ["risco", "Risco", [...CAZA_RISK_LEVELS]],
              ] as [keyof typeof EMPTY_OPP, string, string[]][]).map(([key, label, opts]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <select
                    value={String(form[key])}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  >
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Próxima ação</label>
                <input
                  type="text"
                  value={form.proxima_acao}
                  onChange={e => setForm(f => ({ ...f, proxima_acao: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"
                />
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
