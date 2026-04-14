"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  TrendingUp, DollarSign, BarChart2, Target, Hash, Plus, X, AlertTriangle,
} from "lucide-react";
import { fetchCRM } from "@/lib/jacqes-crm-query";

// ─── Types ────────────────────────────────────────────────────────────────────

type CrmOpportunity = {
  id: string;
  lead_id: string | null;
  cliente_id: string | null;
  nome_oportunidade: string;
  empresa: string;
  segmento: string;
  produto: string;
  ticket_estimado: number;
  valor_potencial: number;
  stage: string;
  probabilidade: number;
  owner: string;
  data_abertura: string;
  proxima_acao: string;
  data_proxima_acao: string | null;
  risco: string;
  motivo_perda: string;
  data_fechamento_prevista: string | null;
  observacoes: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  "Novo Lead", "Qualificação", "Diagnóstico", "Proposta", "Negociação",
  "Fechado Ganho", "Fechado Perdido",
] as const;

const RISK_LEVELS = ["Baixo", "Médio", "Alto"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + Math.round(n / 1_000) + "K";
  return "R$" + n;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function agingDays(dataAbertura: string) {
  if (!dataAbertura) return 0;
  return Math.floor((Date.now() - new Date(dataAbertura + "T00:00:00").getTime()) / 86400000);
}

function isDatePast(iso: string | null) {
  if (!iso) return false;
  return new Date(iso + "T00:00:00").getTime() < Date.now();
}

function stageBadgeClass(stage: string) {
  switch (stage) {
    case "Novo Lead":       return "bg-gray-100 text-gray-600 border-gray-200";
    case "Qualificação":    return "bg-blue-50 text-blue-700 border-blue-200";
    case "Diagnóstico":     return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "Proposta":        return "bg-amber-50 text-amber-700 border-amber-200";
    case "Negociação":      return "bg-orange-50 text-orange-700 border-orange-200";
    case "Fechado Ganho":   return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Fechado Perdido": return "bg-red-50 text-red-700 border-red-200";
    default:                return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function riskBadgeClass(risco: string) {
  switch (risco) {
    case "Baixo": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Médio": return "bg-amber-50 text-amber-700 border-amber-200";
    case "Alto":  return "bg-red-50 text-red-700 border-red-200";
    default:      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

// ─── Default form state ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  nome_oportunidade: "",
  empresa: "",
  produto: "",
  ticket_estimado: "",
  valor_potencial: "",
  stage: "Novo Lead",
  probabilidade: "50",
  owner: "",
  proxima_acao: "",
  data_proxima_acao: "",
  risco: "Baixo",
  data_fechamento_prevista: "",
  observacoes: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OportunidadesPage() {
  const [opps, setOpps]           = useState<CrmOpportunity[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("Todos");
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");

  // ── Fetch ────────────────────────────────────────────────────────────────────
  async function fetchOpps() {
    setLoading(true);
    setError(null);
    fetchCRM<CrmOpportunity>("opportunities")
      .then(d => { setOpps(d); setLoading(false); })
      .catch(() => { setError("Erro ao carregar oportunidades."); setLoading(false); });
  }

  useEffect(() => { fetchOpps(); }, []);

  // ── Derived KPIs ──────────────────────────────────────────────────────────────
  const total      = opps.length;
  const abertas    = opps.filter(o => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido").length;
  const pipeline   = opps
    .filter(o => o.stage !== "Fechado Perdido")
    .reduce((s, o) => s + (o.valor_potencial || 0), 0);
  const recPond    = opps
    .filter(o => o.stage !== "Fechado Perdido")
    .reduce((s, o) => s + (o.valor_potencial || 0) * ((o.probabilidade || 0) / 100), 0);
  const ticketMed  = abertas > 0
    ? opps.filter(o => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido")
        .reduce((s, o) => s + (o.ticket_estimado || 0), 0) / abertas
    : 0;

  // Stage filter counts
  const stageCounts: Record<string, number> = { Todos: opps.length };
  PIPELINE_STAGES.forEach(s => {
    stageCounts[s] = opps.filter(o => o.stage === s).length;
  });

  const filtered = stageFilter === "Todos"
    ? opps
    : opps.filter(o => o.stage === stageFilter);

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  function openModal() {
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setModal(true);
  }

  function closeModal() {
    setModal(false);
    setFormError("");
  }

  function field(key: keyof typeof EMPTY_FORM, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.nome_oportunidade.trim()) { setFormError("Nome da oportunidade é obrigatório."); return; }
    if (!form.empresa.trim())           { setFormError("Empresa é obrigatória."); return; }
    if (!form.owner.trim())             { setFormError("Owner é obrigatório."); return; }
    if (!form.proxima_acao.trim())      { setFormError("Próxima Ação é obrigatória."); return; }
    if (!form.data_proxima_acao)        { setFormError("Data da Próxima Ação é obrigatória."); return; }

    setSaving(true);
    setFormError("");
    try {
      const payload = {
        ...form,
        ticket_estimado:         form.ticket_estimado ? parseFloat(form.ticket_estimado) : 0,
        valor_potencial:         form.valor_potencial ? parseFloat(form.valor_potencial) : 0,
        probabilidade:           parseInt(form.probabilidade, 10) || 50,
        data_fechamento_prevista: form.data_fechamento_prevista || null,
      };
      const res = await fetch("/api/jacqes/crm/oportunidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      closeModal();
      await fetchOpps();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Erro ao salvar oportunidade.");
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <Header
        title="Oportunidades — JACQES CRM"
        subtitle="Pipeline comercial"
      />

      <div className="page-container">

        {/* ── KPI Strip ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total",           value: String(total),       icon: Hash,       color: "text-gray-600",    bg: "bg-gray-100"   },
            { label: "Abertas",         value: String(abertas),     icon: Target,     color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "Pipeline Total",  value: fmtCurrency(pipeline), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Rec. Ponderada",  value: fmtCurrency(recPond),  icon: BarChart2,  color: "text-blue-600",    bg: "bg-blue-50"    },
            { label: "Ticket Médio",    value: fmtCurrency(ticketMed), icon: TrendingUp, color: "text-amber-600",  bg: "bg-amber-50"   },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card p-5 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={16} className={color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xl font-bold ${color} truncate`}>{value}</div>
                <div className="text-[10px] font-medium text-gray-400 mt-0.5 truncate">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main card ────────────────────────────────────────────────────────── */}
        <div className="card p-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
            <SectionHeader
              icon={<TrendingUp size={14} />}
              title="Pipeline"
              badge={
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                  {filtered.length}
                </span>
              }
              className="mb-0"
            />
            <button
              onClick={openModal}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <Plus size={13} /> Nova Oportunidade
            </button>
          </div>

          {/* Stage filter tabs */}
          <div className="flex flex-wrap gap-2 mb-5">
            {(["Todos", ...PIPELINE_STAGES] as const).map(s => (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  stageFilter === s
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {s}
                <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                  stageFilter === s ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {stageCounts[s] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Carregando oportunidades…</div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-500">{error}</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<TrendingUp size={20} className="text-gray-400" />}
              title="Nenhuma oportunidade encontrada"
              description={stageFilter === "Todos" ? "Adicione a primeira oportunidade." : `Nenhuma oportunidade em "${stageFilter}".`}
            />
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[1000px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Oportunidade", "Stage", "Valor Potencial", "Prob.", "Próxima Ação", "Risco", "Owner", "Aging"].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 last:pr-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(opp => {
                    const aging = agingDays(opp.data_abertura);
                    const actionPast = isDatePast(opp.data_proxima_acao);
                    return (
                      <tr key={opp.id} className="card-hover">
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-gray-900 text-[13px] leading-snug">
                            {opp.nome_oportunidade}
                          </div>
                          {opp.empresa && (
                            <div className="text-[11px] text-gray-400 mt-0.5">{opp.empresa}</div>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${stageBadgeClass(opp.stage)}`}>
                            {opp.stage}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-[13px] font-bold text-gray-900">
                            {fmtCurrency(opp.valor_potencial)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 min-w-[90px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-semibold text-gray-700 w-8 shrink-0">
                              {opp.probabilidade}%
                            </span>
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden min-w-[48px]">
                              <div
                                className="h-full rounded-full bg-brand-500"
                                style={{ width: `${Math.min(100, Math.max(0, opp.probabilidade))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 max-w-[200px]">
                          <div className="text-[13px] text-gray-700 truncate" title={opp.proxima_acao}>
                            {opp.proxima_acao || "—"}
                          </div>
                          {opp.data_proxima_acao && (
                            <div className={`text-[11px] mt-0.5 ${actionPast ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                              {fmtDate(opp.data_proxima_acao)}
                              {actionPast && <span className="ml-1">!</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${riskBadgeClass(opp.risco)}`}>
                            {opp.risco === "Alto" && <AlertTriangle size={9} />}
                            {opp.risco}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-[13px] text-gray-700">{opp.owner}</span>
                        </td>
                        <td className="py-3">
                          <span className={`text-[13px] font-semibold ${aging > 30 ? "text-red-500" : "text-gray-600"}`}>
                            {aging}d
                          </span>
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

      {/* ── Modal: Nova Oportunidade ─────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5 sticky top-0 bg-white pb-1">
              <h3 className="text-sm font-bold text-gray-900">Nova Oportunidade</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nome Oportunidade */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Nome Oportunidade *</label>
                <input
                  type="text"
                  placeholder="Ex: Cliente X — FEE Mensal"
                  value={form.nome_oportunidade}
                  onChange={e => field("nome_oportunidade", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Empresa */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Empresa *</label>
                <input
                  type="text"
                  placeholder="Nome da empresa"
                  value={form.empresa}
                  onChange={e => field("empresa", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Produto / Serviço */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Produto / Serviço</label>
                <input
                  type="text"
                  placeholder="Ex: FEE Mensal, Tráfego Pago"
                  value={form.produto}
                  onChange={e => field("produto", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Ticket + Valor Potencial */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Ticket Estimado (R$)</label>
                  <input
                    type="number"
                    placeholder="Ex: 3000"
                    value={form.ticket_estimado}
                    onChange={e => field("ticket_estimado", e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Valor Potencial (R$)</label>
                  <input
                    type="number"
                    placeholder="Ex: 36000"
                    value={form.valor_potencial}
                    onChange={e => field("valor_potencial", e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Stage */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Stage *</label>
                <select
                  value={form.stage}
                  onChange={e => field("stage", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Probabilidade */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Probabilidade — {form.probabilidade}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={form.probabilidade}
                  onChange={e => field("probabilidade", e.target.value)}
                  className="w-full accent-brand-600"
                />
              </div>

              {/* Owner */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Owner *</label>
                <input
                  type="text"
                  placeholder="Responsável"
                  value={form.owner}
                  onChange={e => field("owner", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Próxima Ação */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Próxima Ação *</label>
                <input
                  type="text"
                  placeholder="Descreva a próxima ação"
                  value={form.proxima_acao}
                  onChange={e => field("proxima_acao", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Data Próxima Ação + Risco */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Data Próxima Ação *</label>
                  <input
                    type="date"
                    value={form.data_proxima_acao}
                    onChange={e => field("data_proxima_acao", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Risco</label>
                  <select
                    value={form.risco}
                    onChange={e => field("risco", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {RISK_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Data Fechamento Prevista */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Data Fechamento Prevista</label>
                <input
                  type="date"
                  value={form.data_fechamento_prevista}
                  onChange={e => field("data_fechamento_prevista", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Observações</label>
                <textarea
                  rows={3}
                  placeholder="Notas adicionais"
                  value={form.observacoes}
                  onChange={e => field("observacoes", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              {/* Error */}
              {formError && (
                <p className="text-xs text-red-600 font-medium">{formError}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-60"
                >
                  {saving ? "Salvando…" : "Salvar Oportunidade"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
