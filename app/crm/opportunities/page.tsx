"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import type { DragEvent, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLockedBU } from "@/lib/use-locked-bu";
import Link from "next/link";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Target, DollarSign, TrendingUp, Plus, X,
  Calendar, Building2, AlertCircle, Phone, Mail, Users,
  CheckCircle2, FileText, MessageSquare, Clock, Trash2, User, UserPlus,
} from "lucide-react";
import type { CrmOpportunity, CrmActivity } from "@/lib/crm-types";
import { STAGE_LABELS, STAGE_PROBABILITY, BU_OPTIONS, OWNER_OPTIONS, PIPELINE_STAGES } from "@/lib/crm-types";
import {
  applyAccountLink,
  persistOutcome,
  planStageMove,
  resolveAccountLink,
  rollbackItem,
  rowsFromPipeline,
} from "@/lib/crm-pipeline-move";

import { formatBRL, formatDateBR } from "@/lib/utils";

function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

const STAGE_CONFIG: Record<string, {
  label: string; prob: number; bg: string; border: string;
  header: string; tag: string; bar: string;
}> = {
  discovery:     { label: "Discovery",     prob: 25,  bg: "bg-blue-50",   border: "border-blue-200",   header: "bg-blue-500",   tag: "bg-blue-100 text-blue-700",   bar: "bg-blue-500" },
  qualification: { label: "Qualificação",  prob: 40,  bg: "bg-brand-50", border: "border-brand-200", header: "bg-brand-500", tag: "bg-brand-100 text-brand-700", bar: "bg-brand-500" },
  proposal:      { label: "Proposta",      prob: 60,  bg: "bg-amber-50",  border: "border-amber-200",  header: "bg-amber-500",  tag: "bg-amber-100 text-amber-700",  bar: "bg-amber-500" },
  negotiation:   { label: "Negociação",    prob: 75,  bg: "bg-orange-50", border: "border-orange-200", header: "bg-orange-500", tag: "bg-orange-100 text-orange-700", bar: "bg-orange-500" },
  closed_won:    { label: "Fechado Ganho",  prob: 100, bg: "bg-emerald-50", border: "border-emerald-200", header: "bg-emerald-600", tag: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
  closed_lost:   { label: "Perdido",       prob: 0,   bg: "bg-red-50",     border: "border-red-200",     header: "bg-red-600",     tag: "bg-red-100 text-red-700",         bar: "bg-red-500" },
};

const BU_COLORS: Record<string, string> = {
  JACQES:  "bg-blue-100 text-blue-700",
  CAZA:    "bg-brand-100 text-brand-700",
  ADVISOR: "bg-emerald-100 text-emerald-700",
  VENTURE: "bg-amber-100 text-amber-700",
  ENRD:    "bg-orange-100 text-orange-700",
};

const ACTIVITY_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  call:    { icon: Phone,         label: "Ligação",  color: "text-emerald-600 bg-emerald-50" },
  email:   { icon: Mail,          label: "E-mail",   color: "text-blue-600 bg-blue-50" },
  meeting: { icon: Users,         label: "Reunião",  color: "text-brand-600 bg-brand-50" },
  task:    { icon: CheckCircle2,  label: "Tarefa",   color: "text-amber-600 bg-amber-50" },
  note:    { icon: FileText,      label: "Nota",     color: "text-gray-600 bg-gray-100" },
};

const ACTIVE_STAGES = ["discovery","qualification","proposal","negotiation","closed_won","closed_lost"] as const;

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500";

function agingDays(created: string | null | undefined): number | null {
  if (!created) return null;
  const time = new Date(created).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function riskOf(daysUntilClose: number | null): "Alto" | "Médio" | "Baixo" {
  if (daysUntilClose !== null && daysUntilClose < 0) return "Alto";
  if (daysUntilClose !== null && daysUntilClose <= 7) return "Médio";
  return "Baixo";
}

// ─── Detail Modal (Detalhes + Atividades) ────────────────────────────────────

function OppDetailModal({
  opp,
  initialTab,
  onSave,
  onDelete,
  onClose,
}: {
  opp: CrmOpportunity;
  initialTab: "edit" | "activity";
  onSave: (updated: CrmOpportunity) => void;
  onDelete: (opp: CrmOpportunity) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"edit" | "activity">(initialTab);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    opportunity_name: opp.opportunity_name,
    bu: opp.bu,
    owner: opp.owner,
    stage: opp.stage,
    deal_value: String(opp.deal_value),
    expected_close_date: opp.expected_close_date ?? "",
    proposal_sent_date: opp.proposal_sent_date ?? "",
    lost_reason: opp.lost_reason ?? "",
  });

  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [actLoading, setActLoading] = useState(true);
  const [actSaving, setActSaving] = useState(false);
  const [actForm, setActForm] = useState({
    activity_type: "call",
    subject: "",
    description: "",
    outcome: "",
    scheduled_at: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    setActLoading(true);
    fetch(`/api/crm/activities?related_to_id=${opp.opportunity_id}&related_to_type=opportunity`)
      .then(r => r.json())
      .then(json => { if (json.data) setActivities(json.data as CrmActivity[]); })
      .catch(() => undefined)
      .finally(() => setActLoading(false));
  }, [opp.opportunity_id]);

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmitEdit(e: FormEvent) {
    e.preventDefault();
    if (!form.opportunity_name.trim()) return;
    const stage = form.stage as CrmOpportunity["stage"];
    const probability = STAGE_PROBABILITY[stage] ?? opp.probability;
    onSave({
      ...opp,
      opportunity_name: form.opportunity_name.trim(),
      bu: form.bu as CrmOpportunity["bu"],
      owner: form.owner as CrmOpportunity["owner"],
      stage,
      probability,
      deal_value: parseFloat(form.deal_value) || 0,
      expected_close_date: form.expected_close_date || null,
      proposal_sent_date: form.proposal_sent_date || null,
      lost_reason: form.lost_reason || null,
    });
  }

  async function handleAddActivity(e: FormEvent) {
    e.preventDefault();
    if (!actForm.subject.trim()) return;
    setActSaving(true);
    try {
      const res = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          activity_type: actForm.activity_type,
          related_to_type: "opportunity",
          related_to_id: opp.opportunity_id,
          subject: actForm.subject.trim(),
          description: actForm.description.trim() || null,
          outcome: actForm.outcome || null,
          scheduled_at: actForm.scheduled_at || null,
          status: "completed",
          created_by: opp.owner,
        }),
      });
      const json = await res.json();
      const newActivity: CrmActivity = (json.success && json.data)
        ? json.data as CrmActivity
        : {
            activity_id: crypto.randomUUID(),
            activity_type: actForm.activity_type as CrmActivity["activity_type"],
            related_to_type: "opportunity",
            related_to_id: opp.opportunity_id,
            subject: actForm.subject.trim(),
            description: actForm.description.trim() || null,
            outcome: actForm.outcome as CrmActivity["outcome"] || null,
            duration_minutes: null,
            scheduled_at: actForm.scheduled_at || null,
            completed_at: new Date().toISOString(),
            status: "completed",
            created_by: opp.owner,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
      setActivities(prev => [newActivity, ...prev]);
      setActForm({ activity_type: "call", subject: "", description: "", outcome: "", scheduled_at: new Date().toISOString().slice(0, 16) });
    } catch { /* ignore */ }
    setActSaving(false);
  }

  const noActivities = !actLoading && activities.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{opp.opportunity_name}</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{opp.opportunity_code}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 shrink-0">
          <button
            onClick={() => setTab("edit")}
            className={`py-2.5 text-xs font-semibold mr-5 border-b-2 transition-colors ${
              tab === "edit" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Detalhes
          </button>
          <button
            onClick={() => setTab("activity")}
            className={`py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              tab === "activity" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Atividades
            {noActivities && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">
                <AlertCircle size={8} /> obrigatório
              </span>
            )}
            {activities.length > 0 && (
              <span className="text-[9px] font-bold text-brand-600 bg-brand-50 rounded-full px-1.5 py-0.5">
                {activities.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Detalhes Tab ─────────────────────────────────────── */}
          {tab === "edit" && (
            <form onSubmit={handleSubmitEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome da Oportunidade *</label>
                <input
                  value={form.opportunity_name}
                  onChange={e => setField("opportunity_name", e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Business Unit</label>
                  <select value={form.bu} onChange={e => setField("bu", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                    {BU_OPTIONS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Owner</label>
                  <select value={form.owner} onChange={e => setField("owner", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                    {OWNER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Estágio</label>
                <select value={form.stage} onChange={e => setField("stage", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                  {PIPELINE_STAGES.map(s => (
                    <option key={s} value={s}>{STAGE_LABELS[s]} — {STAGE_PROBABILITY[s]}%</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input type="number" min="0" step="100" value={form.deal_value}
                    onChange={e => setField("deal_value", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Previsão Fechamento</label>
                  <input type="date" value={form.expected_close_date}
                    onChange={e => setField("expected_close_date", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
              </div>

              {(form.stage === "proposal" || form.stage === "negotiation" || form.stage === "closed_won") && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data de Envio da Proposta</label>
                  <input type="date" value={form.proposal_sent_date}
                    onChange={e => setField("proposal_sent_date", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
              )}

              {form.stage === "closed_lost" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motivo da Perda</label>
                  <select value={form.lost_reason} onChange={e => setField("lost_reason", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                    <option value="">— Selecionar —</option>
                    <option>Preço elevado</option>
                    <option>Perdido para concorrente</option>
                    <option>Momento inadequado</option>
                    <option>Corte de budget</option>
                    <option>Sem decisão</option>
                  </select>
                </div>
              )}

              {noActivities && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Nenhuma atividade registrada com o lead.{" "}
                    <button type="button" onClick={() => setTab("activity")}
                      className="font-semibold underline hover:text-amber-900">
                      Registrar agora →
                    </button>
                  </p>
                </div>
              )}

              {confirmDelete ? (
                <div className="flex flex-col gap-2 pt-1 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertCircle size={13} /> Confirmar exclusão da oportunidade?
                  </p>
                  <p className="text-xs text-red-600">O lead e o contato associados não serão apagados.</p>
                  <div className="flex gap-2 mt-1">
                    <button type="button" onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-white transition-colors">
                      Cancelar
                    </button>
                    <button type="button" onClick={() => onDelete(opp)}
                      className="flex-1 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors">
                      Apagar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setConfirmDelete(true)}
                    className="p-2 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                  <button type="button" onClick={onClose}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit"
                    className="flex-1 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors">
                    Salvar
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ── Atividades Tab ───────────────────────────────────── */}
          {tab === "activity" && (
            <div className="p-5 space-y-4">

              {noActivities && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-medium">
                    Registro de atividade com o lead é obrigatório. Preencha o formulário abaixo.
                  </p>
                </div>
              )}

              {/* Form nova atividade */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Plus size={12} className="text-brand-500" />
                    Registrar atividade com o lead
                    <span className="text-red-500 font-bold">*</span>
                  </p>
                </div>
                <form onSubmit={handleAddActivity} className="p-4 space-y-3">
                  {/* Tipo */}
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(ACTIVITY_TYPE_CONFIG).map(([type, cfg]) => {
                      const Icon = cfg.icon;
                      const isSelected = actForm.activity_type === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setActForm(p => ({ ...p, activity_type: type }))}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                            isSelected
                              ? `${cfg.color} border-current shadow-sm`
                              : "text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                          }`}
                        >
                          <Icon size={11} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Assunto */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Assunto <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={actForm.subject}
                      onChange={e => setActForm(p => ({ ...p, subject: e.target.value }))}
                      required
                      placeholder={`Ex: Ligação de follow-up com ${opp.account_name ?? "o lead"}`}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                    />
                  </div>

                  {/* Data + Resultado */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <Clock size={10} className="inline mr-1" />Data/Hora
                      </label>
                      <input
                        type="datetime-local"
                        value={actForm.scheduled_at}
                        onChange={e => setActForm(p => ({ ...p, scheduled_at: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Resultado</label>
                      <select
                        value={actForm.outcome}
                        onChange={e => setActForm(p => ({ ...p, outcome: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      >
                        <option value="">— Selecionar —</option>
                        <option value="successful">Sucesso</option>
                        <option value="unsuccessful">Sem sucesso</option>
                        <option value="no_answer">Sem resposta</option>
                      </select>
                    </div>
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                    <textarea
                      value={actForm.description}
                      onChange={e => setActForm(p => ({ ...p, description: e.target.value }))}
                      rows={2}
                      placeholder="Resumo da interação com o lead..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actSaving || !actForm.subject.trim()}
                    className="w-full py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                  >
                    {actSaving ? (
                      <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Salvando…</>
                    ) : (
                      <><CheckCircle2 size={12} /> Registrar Atividade</>
                    )}
                  </button>
                </form>
              </div>

              {/* Histórico */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <MessageSquare size={11} />
                  Histórico ({activities.length})
                </p>

                {actLoading && (
                  <div className="flex items-center gap-2 py-4 justify-center text-gray-400">
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                    <span className="text-xs">Carregando…</span>
                  </div>
                )}

                {!actLoading && activities.length === 0 && (
                  <div className="text-center py-6 text-gray-400">
                    <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Nenhuma atividade registrada</p>
                  </div>
                )}

                {!actLoading && activities.length > 0 && (
                  <div className="space-y-2">
                    {activities.map(act => {
                      const cfg = ACTIVITY_TYPE_CONFIG[act.activity_type];
                      const Icon = cfg?.icon ?? MessageSquare;
                      const dateStr = act.completed_at ?? act.scheduled_at ?? act.created_at;
                      return (
                        <div key={act.activity_id} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg?.color ?? "text-gray-600 bg-gray-100"}`}>
                            <Icon size={13} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{act.subject}</p>
                            {act.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{act.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                act.status === "completed" ? "bg-emerald-50 text-emerald-600" :
                                act.status === "scheduled" ? "bg-blue-50 text-blue-600" :
                                "bg-gray-100 text-gray-500"
                              }`}>
                                {act.status === "completed" ? "Concluído" : act.status === "scheduled" ? "Agendado" : "Cancelado"}
                              </span>
                              {act.outcome && (
                                <span className={`text-xs font-medium ${
                                  act.outcome === "successful" ? "text-emerald-500" :
                                  act.outcome === "no_answer" ? "text-amber-500" : "text-red-400"
                                }`}>
                                  {act.outcome === "successful" ? "Sucesso" : act.outcome === "no_answer" ? "Sem resposta" : "Sem sucesso"}
                                </span>
                              )}
                              <span className="text-xs text-gray-400 ml-auto">
                                {formatDateBR(dateStr?.slice(0, 10))}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function OppCard({
  opp,
  activityCount,
  onDragStart,
  onClick,
  onActivityClick,
  onDeleteClick,
  onMove,
  onConvert,
}: {
  opp: CrmOpportunity;
  activityCount?: number;
  onDragStart: (e: DragEvent, id: string) => void;
  onClick: () => void;
  onActivityClick: (e: React.MouseEvent) => void;
  onDeleteClick: (e: React.MouseEvent) => void;
  onMove: (id: string, stage: string) => void;
  onConvert: (opp: CrmOpportunity, trigger?: HTMLElement | null) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const days = daysUntil(opp.expected_close_date);
  const isUrgent = days !== null && days <= 7 && days >= 0;
  const isOverdue = days !== null && days < 0;
  const hasNoActivity = activityCount === 0;
  const age = agingDays(opp.created_at);
  const risk = riskOf(days);
  const probability = Math.max(0, Math.min(100, opp.probability || 0));
  const probColor = probability >= 75 ? "bg-emerald-500" : probability >= 50 ? "bg-amber-500" : probability >= 25 ? "bg-orange-400" : "bg-red-400";
  const riskColor = risk === "Alto" ? "bg-red-500" : risk === "Médio" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div
      role="listitem"
      draggable
      data-opp-id={opp.opportunity_id}
      onDragStart={e => onDragStart(e, opp.opportunity_id)}
      onClick={confirmDelete ? undefined : onClick}
      className="bg-white border border-gray-200 rounded-xl p-3.5 cursor-pointer active:cursor-grabbing shadow-sm hover:shadow-md hover:border-brand-300 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-gray-600">{opp.opportunity_code}</span>
        <div className="flex items-center gap-1.5">
          {age !== null && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${age > 30 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>
              {age}d
            </span>
          )}
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${BU_COLORS[opp.bu] ?? "bg-gray-100 text-gray-600"}`}>
            {opp.bu}
          </span>
          <button
            type="button"
            aria-label="Apagar oportunidade"
            onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
            className={`p-0.5 rounded text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors ${FOCUS}`}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <p className="text-xs font-semibold text-gray-900 leading-snug mb-1 line-clamp-2">
        {opp.opportunity_name}
      </p>

      {(opp.account_name || opp.contact_name) && (
        <div className="flex flex-col gap-0.5 mb-2">
          {opp.account_name && (
            <div className="flex items-center gap-1">
              <Building2 size={12} className="text-gray-600 shrink-0" />
              <span className="text-xs text-gray-600 truncate">{opp.account_name}</span>
            </div>
          )}
          {opp.contact_name && (
            <div className="flex items-center gap-1">
              <User size={12} className="text-gray-600 shrink-0" />
              <span className="text-xs text-gray-600 truncate">{opp.contact_name}</span>
            </div>
          )}
        </div>
      )}

      <div className="text-sm font-bold text-gray-900 mb-2">{formatBRL(opp.deal_value)}</div>

      <div className="flex items-center gap-1.5 mb-2" title={`Probabilidade ${probability}%`}>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${probColor}`} style={{ width: `${probability}%` }} />
        </div>
        <span className="text-xs font-semibold text-gray-600 tabular-nums">{probability}%</span>
      </div>

      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${riskColor}`} />
          Risco {risk}
        </span>
        <span className="text-xs text-gray-600 truncate">
          {opp.expected_close_date ? `Próximo marco ${formatDateBR(opp.expected_close_date)}` : "Sem próxima ação"}
        </span>
      </div>

      <button
        type="button"
        onClick={onActivityClick}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium mb-2 border transition-all ${FOCUS} ${
          hasNoActivity
            ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700"
        }`}
      >
        <span className="flex items-center gap-1">
          <MessageSquare size={12} />
          {hasNoActivity
            ? "Sem atividades — registrar agora"
            : `${activityCount} atividade${activityCount !== 1 ? "s" : ""} registrada${activityCount !== 1 ? "s" : ""}`}
        </span>
        {hasNoActivity && <AlertCircle size={12} className="text-red-600" />}
      </button>

      <label className="flex items-center gap-2 mb-2" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        <span className="text-xs font-semibold text-gray-600 shrink-0">Etapa</span>
        <select
          aria-label={`Mover ${opp.opportunity_name} para etapa`}
          value={opp.stage}
          onChange={e => onMove(opp.opportunity_id, e.target.value)}
          className={`min-w-0 flex-1 text-xs text-gray-600 border border-gray-300 rounded-md px-1.5 py-1 bg-white ${FOCUS}`}
        >
          {ACTIVE_STAGES.map(stage => (
            <option key={stage} value={stage}>{STAGE_CONFIG[stage]!.label}</option>
          ))}
        </select>
      </label>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
            {opp.owner.slice(0, 1)}
          </div>
          <span className="text-xs text-gray-600">{opp.owner}</span>
        </div>
        {opp.expected_close_date && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${isOverdue ? "text-red-600" : isUrgent ? "text-amber-700" : "text-gray-600"}`}>
            <Calendar size={12} />
            {formatDateBR(opp.expected_close_date)}
          </div>
        )}
      </div>

      {(isOverdue || isUrgent) && (
        <div className={`mt-2 text-xs font-semibold flex items-center gap-1 ${isOverdue ? "text-red-600" : "text-amber-700"}`}>
          <AlertCircle size={12} />
          {isOverdue ? `${Math.abs(days!)} dias atraso` : `${days} dias restantes`}
        </div>
      )}

      {opp.stage === "closed_won" && (
        <>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onConvert(opp, e.currentTarget); }}
            className={`mt-2 flex items-center justify-center gap-1 w-full text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg py-1 hover:bg-emerald-100 transition-colors ${FOCUS}`}
          >
            <UserPlus size={12} /> Converter em Cliente
          </button>
          <Link
            href={`/awq/ppm/add?opportunity_id=${opp.opportunity_id}&customer=${encodeURIComponent(opp.account_name ?? "")}&revenue=${opp.deal_value}&bu=${opp.bu}`}
            className={`mt-2 flex items-center justify-center gap-1 w-full text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg py-1 hover:bg-brand-100 transition-colors ${FOCUS}`}
            onClick={e => e.stopPropagation()}
          >
            Criar Projeto PPM
          </Link>
        </>
      )}

      {confirmDelete && (
        <div className="mt-2 flex items-center justify-between gap-2 p-2 bg-red-50 border border-red-200 rounded-lg" onClick={e => e.stopPropagation()}>
          <span className="text-xs text-red-700 font-medium">Apagar oportunidade?</span>
          <div className="flex gap-1">
            <button type="button" onClick={e => { e.stopPropagation(); onDeleteClick(e); }}
              className={`px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition-colors ${FOCUS}`}>
              Apagar
            </button>
            <button type="button" onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
              className={`px-2 py-0.5 bg-white border border-gray-300 text-gray-600 text-xs font-medium rounded hover:bg-gray-50 transition-colors ${FOCUS}`}>
              Não
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function KanbanColumn({
  stage, opps, activityCounts, onDrop, onDragOver, onDragLeave, isDragOver, onCardClick, onActivityClick, onDeleteClick, onMove, onConvert,
}: {
  stage: string;
  opps: CrmOpportunity[];
  activityCounts: Record<string, number>;
  onDrop: (e: DragEvent, stage: string) => void;
  onDragOver: (e: DragEvent, stage: string) => void;
  onDragLeave: () => void;
  isDragOver: boolean;
  onCardClick: (opp: CrmOpportunity) => void;
  onActivityClick: (opp: CrmOpportunity) => void;
  onDeleteClick: (opp: CrmOpportunity) => void;
  onMove: (id: string, stage: string) => void;
  onConvert: (opp: CrmOpportunity, trigger?: HTMLElement | null) => void;
}) {
  const cfg = STAGE_CONFIG[stage]!;
  const total = opps.reduce((s, o) => s + o.deal_value, 0);
  const missingActivity = opps.filter(o => (activityCounts[o.opportunity_id] ?? 0) === 0).length;

  return (
    <div
      className={`snap-start shrink-0 flex flex-col min-w-[260px] w-[260px] rounded-xl border-2 transition-colors ${
        isDragOver ? "border-brand-400 bg-brand-50/50" : "border-gray-200 bg-gray-50/60"
      }`}
      onDrop={e => onDrop(e, stage)}
      onDragOver={e => onDragOver(e, stage)}
      onDragLeave={onDragLeave}
    >
      {/* Header */}
      <div className={`px-3 py-2.5 rounded-t-[10px] ${cfg.header} flex items-center justify-between`}>
        <div>
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            {cfg.label}
            {missingActivity > 0 && (
              <span className="text-xs font-bold bg-white/30 text-white rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                <AlertCircle size={12} /> {missingActivity} sem ativ.
              </span>
            )}
          </div>
          <div className="text-xs text-white">{cfg.prob}% win rate</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-white">{formatBRL(total)}</div>
          <div className="text-xs text-white">{opps.length} deals</div>
        </div>
      </div>

      <div role="list" aria-label={cfg.label} className="flex-1 p-2 space-y-2 min-h-[120px]">
        {opps.map(o => (
          <OppCard
            key={o.opportunity_id}
            opp={o}
            activityCount={activityCounts[o.opportunity_id] ?? 0}
            onDragStart={(e, id) => {
              e.dataTransfer.setData("text/plain", id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => onCardClick(o)}
            onActivityClick={e => { e.stopPropagation(); onActivityClick(o); }}
            onDeleteClick={e => { e.stopPropagation(); onDeleteClick(o); }}
            onMove={onMove}
            onConvert={onConvert}
          />
        ))}
        {opps.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-gray-600 border-2 border-dashed border-gray-200 rounded-lg">
            Arraste aqui
          </div>
        )}
      </div>

      {/* Add button — hidden for closed stages */}
      {stage !== "closed_won" && stage !== "closed_lost" && (
        <div className="p-2 border-t border-gray-200">
          <Link
            href={`/crm/opportunities/add?stage=${stage}`}
            className={`flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-medium text-gray-600 hover:text-brand-700 hover:bg-white rounded-lg transition-colors border border-dashed border-gray-300 hover:border-brand-300 ${FOCUS}`}
          >
            <Plus size={12} /> Nova oportunidade
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Converter em Cliente ─────────────────────────────────────────────────────

function ConvertClientModal({
  opportunityName,
  name,
  saving,
  onNameChange,
  onClose,
  onSubmit,
}: {
  opportunityName: string;
  name: string;
  saving: boolean;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    inputRef.current?.focus();
    const node = dialogRef.current;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href]")].filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
      );
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !node.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-client-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onMouseDown={event => event.stopPropagation()}
      >
        <form onSubmit={onSubmit}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 id="convert-client-title" className="text-sm font-bold text-gray-900">Converter em Cliente</h3>
              <p className="text-xs text-gray-600 mt-0.5">{opportunityName}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className={`text-gray-600 hover:text-gray-900 ${FOCUS}`}>
              <X size={16} />
            </button>
          </div>
          <label className="block" htmlFor="convert-client-name">
            <span className="text-xs font-semibold text-gray-600">Nome do cliente</span>
            <input
              id="convert-client-name"
              ref={inputRef}
              required
              value={name}
              onChange={event => onNameChange(event.target.value)}
              className={`mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 ${FOCUS}`}
            />
          </label>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={onClose} className={`flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 ${FOCUS}`}>
              Cancelar
            </button>
            <button type="submit" disabled={saving || !name.trim()} className={`flex-1 py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 ${FOCUS}`}>
              {saving ? "Salvando…" : "Converter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PipelinePageInner() {
  const searchParams = useSearchParams();
  const { lockedBU, sessionLoading } = useLockedBU();
  const [opps, setOpps] = useState<CrmOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const urlBu = searchParams?.get("bu") ?? null;
  const [filterBU, setFilterBU] = useState(
    lockedBU ?? (urlBu && BU_OPTIONS.includes(urlBu as typeof BU_OPTIONS[number]) ? urlBu : "Todos")
  );

  useEffect(() => { if (lockedBU) setFilterBU(lockedBU); }, [lockedBU]);
  const [filterOwner, setFilterOwner] = useState("Todos");
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editingOpp, setEditingOpp] = useState<CrmOpportunity | null>(null);
  const [editingTab, setEditingTab] = useState<"edit" | "activity">("edit");
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>({});
  const [canScroll, setCanScroll] = useState(false);
  const [convertOpp, setConvertOpp] = useState<CrmOpportunity | null>(null);
  const [convertName, setConvertName] = useState("");
  const [convertSaving, setConvertSaving] = useState(false);
  const draggingId = useRef<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const convertTrigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try { localStorage.removeItem("crm-opportunities-v3"); } catch { /* ignore */ }

    fetch("/api/crm/pipeline")
      .then(r => r.json())
      .then((json: { success: boolean; data?: { byStage?: Record<string, CrmOpportunity[]>; closedWon?: CrmOpportunity[]; closedLost?: CrmOpportunity[] }; error?: string }) => {
        const parsed = rowsFromPipeline<CrmOpportunity>(json);
        if (parsed.error) throw new Error(parsed.error);
        setOpps(parsed.rows);
        setApiError(null);
      })
      .catch(e => { setApiError(String(e)); setOpps([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/crm/activities?related_to_type=opportunity")
      .then(r => r.json())
      .then(json => {
        if (!json.data) return;
        const counts: Record<string, number> = {};
        for (const act of json.data as { related_to_id: string }[]) {
          counts[act.related_to_id] = (counts[act.related_to_id] ?? 0) + 1;
        }
        setActivityCounts(counts);
      })
      .catch(() => undefined);
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setCanScroll(el.scrollWidth > el.clientWidth + 8);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [loading]);

  function restoreItem(id: string, prior: CrmOpportunity | null, index?: number) {
    setOpps(cur => rollbackItem(cur, id, prior, index));
  }

  async function postAction(
    body: unknown,
    item: { id: string; prior: CrmOpportunity | null; index?: number },
    failure: string,
  ) {
    try {
      const res = await fetch("/api/crm/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let payload: { success?: boolean; error?: string } | null = null;
      try { payload = await res.json(); } catch { payload = null; }
      if (persistOutcome(res.ok, payload) === "rollback") {
        restoreItem(item.id, item.prior, item.index);
        showToast(payload?.error ?? failure, false);
        return false;
      }
      return true;
    } catch {
      restoreItem(item.id, item.prior, item.index);
      showToast(failure, false);
      return false;
    }
  }

  function persistStageMove(id: string, toStage: string) {
    const prior = opps.find(row => row.opportunity_id === id) ?? null;
    const plan = planStageMove(opps, id, toStage);
    if (!plan || !prior) return;
    setOpps(cur => planStageMove(cur, id, toStage)?.next ?? cur);
    const label = STAGE_CONFIG[toStage]?.label ?? toStage;
    void postAction(plan.body, { id, prior }, "Não foi possível mover. A etapa voltou ao lugar.").then(ok => {
      if (ok) showToast(`Movido para ${label}`, true);
    });
  }

  function filtered(stage: string) {
    return opps.filter(o => {
      if (o.stage !== stage) return false;
      if (filterBU !== "Todos" && o.bu !== filterBU) return false;
      if (filterOwner !== "Todos" && o.owner !== filterOwner) return false;
      return true;
    });
  }

  function openCard(opp: CrmOpportunity, tab: "edit" | "activity" = "edit") {
    setEditingOpp(opp);
    setEditingTab(tab);
  }

  function handleDrop(e: DragEvent, toStage: string) {
    e.preventDefault();
    setDragOverStage(null);
    const id = e.dataTransfer.getData("text/plain") || draggingId.current || "";
    draggingId.current = null;
    if (!id) return;
    persistStageMove(id, toStage);
  }

  function handleSaveEdit(updated: CrmOpportunity) {
    const prior = opps.find(row => row.opportunity_id === updated.opportunity_id) ?? null;
    setOpps(cur => cur.map(row => row.opportunity_id === updated.opportunity_id ? updated : row));
    setEditingOpp(null);

    const { opportunity_id, account_name, contact_name, opportunity_code, created_at, updated_at, ...fields } = updated;
    void postAction(
      { action: "update", opportunity_id, ...fields },
      { id: opportunity_id, prior },
      "Não foi possível salvar. A oportunidade voltou ao estado anterior.",
    ).then(ok => { if (ok) showToast("Oportunidade atualizada", true); });
  }

  function handleDelete(opp: CrmOpportunity) {
    const index = opps.findIndex(row => row.opportunity_id === opp.opportunity_id);
    setOpps(cur => cur.filter(row => row.opportunity_id !== opp.opportunity_id));
    setEditingOpp(null);
    void postAction(
      { action: "delete", opportunity_id: opp.opportunity_id },
      { id: opp.opportunity_id, prior: opp, index: index === -1 ? undefined : index },
      "Não foi possível apagar. A oportunidade voltou ao quadro.",
    ).then(ok => { if (ok) showToast("Oportunidade apagada", true); });
  }

  function closeConvert() {
    setConvertOpp(null);
    const trigger = convertTrigger.current;
    convertTrigger.current = null;
    if (!trigger) return;
    requestAnimationFrame(() => {
      if (trigger.isConnected) trigger.focus();
    });
  }

  function openConvert(opp: CrmOpportunity, trigger?: HTMLElement | null) {
    if (opp.account_id) {
      showToast("Esta oportunidade já está ligada a um cliente.", true);
      return;
    }
    convertTrigger.current = trigger ?? null;
    setConvertOpp(opp);
    setConvertName(opp.account_name || opp.opportunity_name);
  }

  async function saveConvert(event: FormEvent) {
    event.preventDefault();
    if (!convertOpp || convertSaving) return;
    const opp = convertOpp;
    const requestedName = convertName.trim();
    if (!requestedName) return;
    if (opp.account_id) {
      showToast("Esta oportunidade já está ligada a um cliente.", true);
      closeConvert();
      return;
    }

    setConvertSaving(true);
    try {
      const searchRes = await fetch(`/api/crm/accounts?search=${encodeURIComponent(requestedName)}`);
      let searchPayload: { success?: boolean; data?: { account_id?: string; account_name?: string }[] } | null = null;
      try { searchPayload = await searchRes.json(); } catch { searchPayload = null; }
      if (!searchRes.ok || !searchPayload?.success || !Array.isArray(searchPayload.data)) {
        showToast("Não foi possível verificar clientes existentes.", false);
        return;
      }
      const accounts = searchPayload.data.flatMap(row =>
        row.account_id && row.account_name ? [{ account_id: row.account_id, account_name: row.account_name }] : [],
      );
      const decision = resolveAccountLink({
        existingAccountId: opp.account_id,
        requestedName,
        accounts,
      });
      if (decision.kind === "invalid" || decision.kind === "already-linked") {
        showToast(
          decision.kind === "already-linked"
            ? "Esta oportunidade já está ligada a um cliente."
            : "Informe o nome do cliente.",
          decision.kind === "already-linked",
        );
        if (decision.kind === "already-linked") closeConvert();
        return;
      }

      let account = decision.kind === "reuse"
        ? { account_id: decision.account_id, account_name: decision.account_name }
        : null;
      if (!account) {
        const createRes = await fetch("/api/crm/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            account_name: decision.account_name,
            bu: opp.bu,
            owner: opp.owner,
            account_type: "customer",
          }),
        });
        let created: { success?: boolean; error?: string; data?: { account_id?: string; account_name?: string } } | null = null;
        try { created = await createRes.json(); } catch { created = null; }
        if (persistOutcome(createRes.ok, created) === "rollback" || !created?.data?.account_id) {
          showToast(created?.error ?? "Não foi possível criar o cliente.", false);
          return;
        }
        account = {
          account_id: created.data.account_id,
          account_name: created.data.account_name || decision.account_name,
        };
      }

      const prior = opps.find(row => row.opportunity_id === opp.opportunity_id) ?? opp;
      setOpps(cur => applyAccountLink(cur, opp.opportunity_id, account));
      closeConvert();
      const linked = await postAction(
        { action: "update", opportunity_id: opp.opportunity_id, account_id: account.account_id },
        { id: opp.opportunity_id, prior },
        "Não foi possível ligar o cliente. A oportunidade voltou ao estado anterior.",
      );
      if (linked) {
        showToast(decision.kind === "reuse" ? "Cliente existente ligado à oportunidade" : "Cliente criado e ligado à oportunidade", true);
      }
    } catch {
      showToast("Não foi possível converter em cliente.", false);
    } finally {
      setConvertSaving(false);
    }
  }

  const openOpps = opps.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");
  const totalPipeline = openOpps.reduce((s, o) => s + o.deal_value, 0);
  const weightedForecast = openOpps.reduce((s, o) => s + o.deal_value * o.probability / 100, 0);
  const wonThisMonth = opps.filter(o => o.stage === "closed_won");
  const closedAll = opps.filter(o => o.stage === "closed_won" || o.stage === "closed_lost");
  const winRate = closedAll.length > 0 ? Math.round(wonThisMonth.length / closedAll.length * 100) : 0;

  if (loading) return (
    <>
      <Header title="Pipeline — CRM AWQ" subtitle="Visão kanban do funil de vendas" />
      <div className="page-container">
        <div className="card p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
            <span className="text-sm">Carregando pipeline…</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Header title="Pipeline — CRM AWQ" subtitle="Visão kanban do funil de vendas" />
      <div className="page-container">

        {/* Non-blocking error banner */}
        {apiError && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <AlertCircle size={14} className="text-amber-500 shrink-0" />
            <span>Não foi possível carregar os dados. </span>
            <button type="button" onClick={() => window.location.reload()} className={`underline font-semibold hover:text-amber-900 ${FOCUS}`}>
              Tentar novamente
            </button>
          </div>
        )}

        {/* Detail modal */}
        {editingOpp && (
          <OppDetailModal
            opp={editingOpp}
            initialTab={editingTab}
            onSave={handleSaveEdit}
            onDelete={handleDelete}
            onClose={() => setEditingOpp(null)}
          />
        )}

        <div className="sr-only" aria-live="polite" aria-atomic="true">{toast?.msg ?? ""}</div>
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
            {toast.msg}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pipeline Total", value: formatBRL(totalPipeline), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Forecast Ponderado", value: formatBRL(weightedForecast), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Negócios Abertos", value: openOpps.length.toString(), icon: Target, color: "text-brand-600", bg: "bg-brand-50" },
            { label: "Win Rate", value: `${winRate}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
          ].map(kpi => (
            <div key={kpi.label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                <kpi.icon size={16} className={kpi.color} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{kpi.value}</div>
                <div className="text-xs text-gray-600">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {lockedBU ? (
            <span className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs font-semibold text-orange-700">{lockedBU}</span>
          ) : (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {["Todos","JACQES","CAZA","ADVISOR","VENTURE","ENRD"].map(bu => (
                <button key={bu} onClick={() => setFilterBU(bu)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${FOCUS} ${filterBU === bu ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
                  {bu}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {["Todos","Miguel","Danilo"].map(o => (
              <button key={o} onClick={() => setFilterOwner(o)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${FOCUS} ${filterOwner === o ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
                {o}
              </button>
            ))}
          </div>
          <Link href="/crm/opportunities/add"
            className={`ml-auto flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors ${FOCUS}`}>
            <Plus size={13} /> Nova Oportunidade
          </Link>
        </div>

        {canScroll && (
          <p className="text-xs text-gray-600">Deslize para o lado para ver todas as etapas.</p>
        )}
        <div className="relative">
          <div
            ref={scrollerRef}
            tabIndex={0}
            aria-label="Quadro do pipeline. Role na horizontal para ver as etapas."
            className={`overflow-x-auto pb-4 snap-x snap-mandatory ${FOCUS}`}
            onDragStart={(event) => {
              const card = (event.target as HTMLElement).closest("[data-opp-id]");
              draggingId.current = card?.getAttribute("data-opp-id") ?? null;
            }}
          >
            <div className="flex gap-4 min-w-max">
              {ACTIVE_STAGES.map(stage => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  opps={filtered(stage)}
                  activityCounts={activityCounts}
                  onDrop={handleDrop}
                  onDragOver={(e: DragEvent, s: string) => { e.preventDefault(); setDragOverStage(s); }}
                  onDragLeave={() => setDragOverStage(null)}
                  isDragOver={dragOverStage === stage}
                  onCardClick={opp => openCard(opp, "edit")}
                  onActivityClick={opp => openCard(opp, "activity")}
                  onDeleteClick={handleDelete}
                  onMove={persistStageMove}
                  onConvert={openConvert}
                />
              ))}
            </div>
          </div>
          {canScroll && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-4 w-10 bg-gradient-to-l from-white to-transparent" aria-hidden="true" />
          )}
        </div>

        {convertOpp && (
          <ConvertClientModal
            opportunityName={convertOpp.opportunity_name}
            name={convertName}
            saving={convertSaving}
            onNameChange={setConvertName}
            onClose={closeConvert}
            onSubmit={saveConvert}
          />
        )}

      </div>
    </>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={null}>
      <PipelinePageInner />
    </Suspense>
  );
}
