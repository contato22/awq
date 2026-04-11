"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  CheckSquare, AlertTriangle, Clock, Flame, BarChart2, Plus, X, ChevronDown,
} from "lucide-react";
import type { CrmTask } from "@/lib/jacqes-crm-db";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + Math.round(n / 1_000) + "K";
  return "R$" + n;
}

function isPast(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

type StatusFilter = "Todos" | "Aberta" | "Em Andamento" | "Concluída" | "Bloqueada" | "Vencida";
type PrioFilter   = "Todas" | "Baixa" | "Média" | "Alta" | "Crítica";

const PRIO_BADGE: Record<string, string> = {
  Baixa:   "bg-gray-100 text-gray-500 border-gray-200",
  Média:   "bg-blue-100 text-blue-700 border-blue-200",
  Alta:    "bg-amber-100 text-amber-700 border-amber-200",
  Crítica: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_BADGE: Record<string, string> = {
  Aberta:       "bg-blue-100 text-blue-700 border-blue-200",
  "Em Andamento":"bg-amber-100 text-amber-700 border-amber-200",
  Concluída:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  Bloqueada:    "bg-red-100 text-red-700 border-red-200",
  Vencida:      "bg-red-100 text-red-700 border-red-200 badge-red",
};

// Static name lookup for linked entities
const ENTITY_NAMES: Record<string, string> = {
  "cli-001": "CEM",
  "cli-002": "Carol Bertolini",
  "cli-003": "André Vieira",
  "cli-004": "Tati Simões",
  "opp-001": "Studio MKT — FEE Gestão Digital",
  "opp-002": "Fernanda Ribeiro — Pacote Conteúdo",
  "opp-003": "CEM — Expansão Tráfego Pago",
  "lead-001": "Marcos Oliveira",
  "lead-002": "Fernanda Ribeiro",
  "lead-003": "Roberto Nascimento",
};

function vinculadoA(t: CrmTask): string {
  if (t.cliente_id)     return ENTITY_NAMES[t.cliente_id]     ?? t.cliente_id;
  if (t.opportunity_id) return ENTITY_NAMES[t.opportunity_id] ?? t.opportunity_id;
  if (t.lead_id)        return ENTITY_NAMES[t.lead_id]        ?? t.lead_id;
  return "—";
}

const CATEGORIAS = [
  "Follow-up", "Gestão de Conta", "Qualificação", "Proposta",
  "Follow-up Financeiro", "Reunião", "Outros",
];

type FormState = {
  titulo: string;
  categoria: string;
  prioridade: string;
  responsavel: string;
  prazo: string;
  sla_horas: string;
};

const EMPTY_FORM: FormState = {
  titulo: "", categoria: "Follow-up", prioridade: "Média",
  responsavel: "", prazo: "", sla_horas: "24",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TarefasPage() {
  const [tarefas, setTarefas]   = useState<CrmTask[]>([]);
  const [loading, setLoading]   = useState(true);
  const [statusF, setStatusF]   = useState<StatusFilter>("Todos");
  const [prioF, setPrioF]       = useState<PrioFilter>("Todas");
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [erro, setErro]         = useState("");
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    fetch("/api/jacqes/crm/tarefas")
      .then(r => r.json())
      .then(d => { setTarefas(d.tarefas ?? d ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // KPIs
  const abertas      = tarefas.filter(t => t.status !== "Concluída");
  const vencidas     = tarefas.filter(t => t.status !== "Concluída" && isPast(t.prazo));
  const noPrazo      = abertas.filter(t => !isPast(t.prazo));
  const altaCritica  = tarefas.filter(t => t.prioridade === "Alta" || t.prioridade === "Crítica");
  const concluidas   = tarefas.filter(t => t.status === "Concluída");
  const pctConcluidas = tarefas.length > 0 ? Math.round((concluidas.length / tarefas.length) * 100) : 0;

  const filtered = tarefas.filter(t => {
    const matchStatus = statusF === "Todos" || t.status === statusF;
    const matchPrio   = prioF === "Todas"  || t.prioridade === prioF;
    return matchStatus && matchPrio;
  });

  async function salvar() {
    if (!form.titulo.trim()) { setErro("Título é obrigatório."); return; }
    if (!form.prazo)         { setErro("Prazo é obrigatório."); return; }
    if (!form.prioridade)    { setErro("Prioridade é obrigatória."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/jacqes/crm/tarefas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sla_horas: parseInt(form.sla_horas) || 24,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      const nova = await res.json();
      setTarefas(prev => [nova.tarefa ?? nova, ...prev]);
      setModal(false);
      setForm(EMPTY_FORM);
      setErro("");
    } catch {
      setErro("Falha ao criar tarefa. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const STATUS_TABS: StatusFilter[] = ["Todos", "Aberta", "Em Andamento", "Concluída", "Bloqueada", "Vencida"];
  const PRIO_TABS: PrioFilter[]     = ["Todas", "Baixa", "Média", "Alta", "Crítica"];

  return (
    <>
      <Header
        title="Tarefas & SLA — JACQES CRM"
        subtitle="Gestão operacional"
      />
      <div className="page-container">

        {/* ── KPIs ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Abertas",          value: String(abertas.length),      icon: CheckSquare,   color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "Vencidas",               value: String(vencidas.length),     icon: AlertTriangle, color: "text-red-600",     bg: "bg-red-50"     },
            { label: "No Prazo",               value: String(noPrazo.length),      icon: Clock,         color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Alta / Crítica",         value: String(altaCritica.length),  icon: Flame,         color: "text-amber-600",   bg: "bg-amber-50"   },
            { label: "% Concluídas",           value: pctConcluidas + "%",         icon: BarChart2,     color: "text-teal-600",    bg: "bg-teal-50"    },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-[10px] font-medium text-gray-400 mt-0.5 leading-tight">{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Table Card ─────────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Status tabs */}
              <div className="flex gap-1.5 flex-wrap">
                {STATUS_TABS.map(s => (
                  <button key={s} onClick={() => setStatusF(s)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                      statusF === s ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={() => { setModal(true); setErro(""); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors shrink-0">
                <Plus size={13} /> Nova Tarefa
              </button>
            </div>
            {/* Prioridade filter */}
            <div className="flex gap-1.5 flex-wrap">
              {PRIO_TABS.map(p => (
                <button key={p} onClick={() => setPrioF(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    prioF === p ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">Carregando…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<CheckSquare size={20} className="text-gray-400" />}
              title="Nenhuma tarefa encontrada"
              description="Ajuste os filtros ou crie uma nova tarefa."
              compact
            />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Título", "Vinculado a", "Categoria", "Prioridade", "Status", "Responsável", "Prazo", "SLA (h)", "Aging"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(t => {
                    const pastPrazo = isPast(t.prazo);
                    const aging     = daysSince(t.data_criacao);
                    return (
                      <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Título */}
                        <td className="px-3 py-3">
                          <span className="font-medium text-gray-900 text-xs">{t.titulo}</span>
                        </td>
                        {/* Vinculado a */}
                        <td className="px-3 py-3 text-xs text-gray-500">{vinculadoA(t)}</td>
                        {/* Categoria */}
                        <td className="px-3 py-3 text-xs text-gray-500">{t.categoria}</td>
                        {/* Prioridade */}
                        <td className="px-3 py-3">
                          <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border ${PRIO_BADGE[t.prioridade] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                            {t.prioridade}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="px-3 py-3">
                          <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[t.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                            {t.status}
                          </span>
                        </td>
                        {/* Responsável */}
                        <td className="px-3 py-3 text-xs text-gray-600">{t.responsavel}</td>
                        {/* Prazo */}
                        <td className="px-3 py-3">
                          <span className={`text-xs font-medium ${pastPrazo && t.status !== "Concluída" ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                            {t.prazo ?? "—"}
                          </span>
                        </td>
                        {/* SLA */}
                        <td className="px-3 py-3 text-xs text-gray-500">{t.sla_horas}h</td>
                        {/* Aging */}
                        <td className="px-3 py-3 text-xs text-gray-400">{aging}d</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── Modal: Nova Tarefa ─────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-gray-900">Nova Tarefa</h3>
              <button onClick={() => { setModal(false); setErro(""); }} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Título */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Follow-up pagamento Carol" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              {/* Categoria + Prioridade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Categoria</label>
                  <div className="relative">
                    <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                      {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Prioridade *</label>
                  <div className="relative">
                    <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                      {["Baixa", "Média", "Alta", "Crítica"].map(p => <option key={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Responsável + SLA */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Responsável</label>
                  <input type="text" value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                    placeholder="Ex: Danilo" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">SLA (horas)</label>
                  <input type="number" value={form.sla_horas} onChange={e => setForm(f => ({ ...f, sla_horas: e.target.value }))}
                    min="1" placeholder="Ex: 24" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {/* Prazo */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Prazo *</label>
                <input type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              {erro && <p className="text-xs text-red-600 font-medium">{erro}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setModal(false); setErro(""); }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={salvar} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-60">
                  {saving ? "Salvando…" : "Criar Tarefa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
