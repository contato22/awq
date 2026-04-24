"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import Link from "next/link";
import { fetchCazaCRM } from "@/lib/caza-crm-query";
import type { CazaCrmOpportunity } from "@/lib/caza-crm-db";
import { CAZA_PIPELINE_STAGES, CAZA_SERVICE_TYPES, CAZA_RISK_LEVELS, CAZA_TIPO_NEGOCIO, daysSince } from "@/lib/caza-crm-db";
import { lsGet, lsSet } from "@/lib/caza-crm-local";
import {
  Target, DollarSign, TrendingUp, Clock,
  Database, CloudOff, HardDrive, ArrowRight,
  AlertTriangle, Pencil, Trash2, X, ChevronRight, Timer,
} from "lucide-react";

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const TODAY = new Date().toISOString().slice(0, 10);

const STAGE_CFG: Record<string, { label: string; text: string; bg: string; border: string; colBg: string; head: string }> = {
  "Lead Captado":    { label: "Lead Captado",    text: "text-gray-700",    bg: "bg-gray-50",    border: "border-gray-200",   colBg: "bg-gray-50",    head: "bg-gray-100"    },
  "Qualificação":    { label: "Qualificação",    text: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200",   colBg: "bg-blue-50/40", head: "bg-blue-100"    },
  "Briefing Inicial":{ label: "Briefing Inicial",text: "text-violet-700", bg: "bg-violet-50",  border: "border-violet-200", colBg: "bg-violet-50/40",head: "bg-violet-100"  },
  "Proposta Enviada":{ label: "Proposta Enviada",text: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200",  colBg: "bg-amber-50/40",head: "bg-amber-100"   },
  "Negociação":      { label: "Negociação",      text: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200", colBg: "bg-orange-50/40",head: "bg-orange-100"  },
  "Fechado Ganho":   { label: "Fechado Ganho",   text: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-200",colBg: "bg-emerald-50/40",head: "bg-emerald-100" },
  "Fechado Perdido": { label: "Fechado Perdido", text: "text-red-700",   bg: "bg-red-50",     border: "border-red-200",    colBg: "bg-red-50/30",   head: "bg-red-100"     },
};

const STAGE_NEXT: Record<string, string | null> = {
  "Lead Captado":    "Qualificação",
  "Qualificação":    "Briefing Inicial",
  "Briefing Inicial":"Proposta Enviada",
  "Proposta Enviada":"Negociação",
  "Negociação":      "Fechado Ganho",
  "Fechado Ganho":   null,
  "Fechado Perdido": null,
};

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const LS_KEY    = "crm_oportunidades";

const EMPTY_EDIT = {
  nome_oportunidade: "", empresa: "", tipo_servico: "" as string,
  valor_estimado: "" as string | number, stage: "Lead Captado" as string,
  probabilidade: "10" as string | number, owner: "",
  prazo_estimado: "", proxima_acao: "", risco: "Baixo" as string,
  observacoes: "", tipo_negocio: "" as string, data_ultima_interacao: "",
};
type EditForm = typeof EMPTY_EDIT;

function ProbBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : pct >= 25 ? "bg-orange-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1">
      <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-gray-400 tabular-nums w-6 text-right">{pct}%</span>
    </div>
  );
}

export default function CazaCrmPipeline() {
  const [opps,       setOpps]       = useState<CazaCrmOpportunity[]>([]);
  const [source,     setSource]     = useState<"loading" | "internal" | "static" | "local" | "empty">("loading");
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editForm,   setEditForm]   = useState({ ...EMPTY_EDIT });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    fetchCazaCRM<CazaCrmOpportunity>("oportunidades").then((staticData) => {
      if (IS_STATIC) {
        const local = lsGet<CazaCrmOpportunity>(LS_KEY);
        if (local !== null) {
          setOpps(local); setSource(local.length > 0 ? "local" : "empty");
        } else {
          lsSet(LS_KEY, staticData); setOpps(staticData);
          setSource(staticData.length > 0 ? "static" : "empty");
        }
      } else {
        setOpps(staticData); setSource(staticData.length > 0 ? "internal" : "empty");
      }
    });
  }, []);

  function persist(updated: CazaCrmOpportunity[]) {
    if (IS_STATIC) lsSet(LS_KEY, updated);
    setOpps(updated); setSource("local");
  }

  function moveStage(id: string, newStage: string) {
    persist(opps.map((o) => o.id === id ? { ...o, stage: newStage } : o));
  }

  function startEdit(o: CazaCrmOpportunity) {
    setEditingId(o.id);
    setEditForm({
      nome_oportunidade: o.nome_oportunidade, empresa: o.empresa, tipo_servico: o.tipo_servico,
      valor_estimado: String(o.valor_estimado), stage: o.stage,
      probabilidade: String(o.probabilidade), owner: o.owner,
      prazo_estimado: o.prazo_estimado ?? "", proxima_acao: o.proxima_acao,
      risco: o.risco, observacoes: o.observacoes,
      tipo_negocio: o.tipo_negocio ?? "",
      data_ultima_interacao: o.data_ultima_interacao ?? "",
    });
    setError(null);
  }

  async function handleUpdate() {
    if (!editingId) return;
    if (IS_STATIC) {
      persist(opps.map((o) => o.id === editingId ? {
        ...o, ...editForm,
        valor_estimado: Number(editForm.valor_estimado) || 0,
        probabilidade:  Number(editForm.probabilidade)  || 0,
        prazo_estimado: (editForm.prazo_estimado as string) || null,
        data_ultima_interacao: (editForm.data_ultima_interacao as string) || null,
      } : o));
      setEditingId(null);
      return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/caza/crm/oportunidades/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          valor_estimado: Number(editForm.valor_estimado) || 0,
          probabilidade:  Number(editForm.probabilidade)  || 0,
          prazo_estimado: String(editForm.prazo_estimado) || null,
        }),
      });
      if (!res.ok) { const e = await res.json() as { error?: string }; setError(e.error ?? "Erro."); }
      else { const u = await res.json() as CazaCrmOpportunity; setOpps((p) => p.map((o) => o.id === editingId ? u : o)); setEditingId(null); }
    } catch { setError("Erro de rede."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (IS_STATIC) {
      persist(opps.filter((o) => o.id !== id));
      setDeletingId(null); if (editingId === id) setEditingId(null);
      return;
    }
    try {
      await fetch(`/api/caza/crm/oportunidades/${id}`, { method: "DELETE" });
      setOpps((p) => p.filter((o) => o.id !== id));
      setDeletingId(null); if (editingId === id) setEditingId(null);
    } catch { /* ignore */ }
  }

  const activeOpps = opps.filter((o) => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido");
  const valorTotal = activeOpps.reduce((s, o) => s + o.valor_estimado, 0);
  const valorGanho = opps.filter((o) => o.stage === "Fechado Ganho").reduce((s, o) => s + o.valor_estimado, 0);
  const vencendo   = activeOpps.filter((o) => o.prazo_estimado && o.prazo_estimado < TODAY).length;

  const cls = "mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white";
  const lbl = "text-[11px] font-semibold text-gray-500 uppercase tracking-wide";

  return (
    <>
      <Header title="Pipeline Comercial" subtitle="Kanban de Oportunidades · Caza Vision" />
      <div className="page-container">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {source === "loading"  && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500"><Database size={11} />Carregando…</span>}
            {source === "internal" && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600"><Database size={11} />Base interna AWQ</span>}
            {source === "static"   && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600"><Database size={11} />Snapshot estático</span>}
            {source === "local"    && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-xs text-violet-600"><HardDrive size={11} />Armazenamento local</span>}
            {source === "empty"    && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700"><CloudOff size={11} />Pipeline vazio</span>}
          </div>
          <Link href="/caza-vision/crm/oportunidades"
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs">
            Nova Oportunidade <ArrowRight size={12} />
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Pipeline Aberto",    value: fmtR(valorTotal),    icon: DollarSign,  color: "text-brand-600"   },
            { label: "Oportunidades",      value: activeOpps.length,   icon: Target,      color: "text-violet-600"  },
            { label: "Valor Ganho",        value: fmtR(valorGanho),    icon: TrendingUp,  color: "text-emerald-600" },
            { label: "Vencendo / Vencido", value: vencendo,            icon: Clock,       color: "text-red-500"     },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="card p-4 flex items-center gap-3">
                <Icon size={16} className={`${k.color} shrink-0`} />
                <div>
                  <div className={`text-xl font-bold ${k.color} tabular-nums`}>{k.value}</div>
                  <div className="text-[11px] text-gray-400 font-medium">{k.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit panel */}
        {editingId && (
          <div className="card p-5 border border-emerald-200 bg-emerald-50/20">
            <div className="flex items-center justify-between mb-3">
              <SectionHeader title="Editar Oportunidade" />
              <button onClick={() => { setEditingId(null); setError(null); }} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X size={15} /></button>
            </div>
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {([
                { key: "nome_oportunidade", label: "Nome *",              type: "text"   },
                { key: "empresa",           label: "Empresa",             type: "text"   },
                { key: "owner",             label: "Responsável",         type: "text"   },
                { key: "valor_estimado",    label: "Valor Estimado (R$)", type: "number" },
                { key: "probabilidade",     label: "Probabilidade (%)",   type: "number" },
                { key: "prazo_estimado",    label: "Prazo Estimado",      type: "date"   },
                { key: "proxima_acao",      label: "Próxima Ação",        type: "text"   },
              ] as const).map(({ key, label, type }) => (
                <div key={key}>
                  <label className={lbl}>{label}</label>
                  <input type={type} value={String(editForm[key as keyof EditForm])}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))} className={cls} />
                </div>
              ))}
              <div>
                <label className={lbl}>Tipo de Serviço</label>
                <select value={editForm.tipo_servico} onChange={(e) => setEditForm((f) => ({ ...f, tipo_servico: e.target.value }))} className={cls}>
                  <option value="">— selecione —</option>
                  {CAZA_SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Etapa</label>
                <select value={editForm.stage} onChange={(e) => setEditForm((f) => ({ ...f, stage: e.target.value }))} className={cls}>
                  {CAZA_PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Risco</label>
                <select value={editForm.risco} onChange={(e) => setEditForm((f) => ({ ...f, risco: e.target.value }))} className={cls}>
                  {CAZA_RISK_LEVELS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Tipo de Negócio</label>
                <select value={editForm.tipo_negocio} onChange={(e) => setEditForm((f) => ({ ...f, tipo_negocio: e.target.value }))} className={cls}>
                  <option value="">— selecione —</option>
                  {CAZA_TIPO_NEGOCIO.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Última Interação</label>
                <input type="date" value={editForm.data_ultima_interacao} onChange={(e) => setEditForm((f) => ({ ...f, data_ultima_interacao: e.target.value }))} className={cls} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={lbl}>Observações</label>
                <textarea rows={2} value={String(editForm.observacoes)} onChange={(e) => setEditForm((f) => ({ ...f, observacoes: e.target.value }))}
                  className={`${cls} resize-none`} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setEditingId(null); setError(null); }}
                className="px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleUpdate} disabled={saving}
                className="btn-primary px-5 py-1.5 text-sm disabled:opacity-60">
                {saving ? "Salvando…" : "Salvar Alterações"}
              </button>
            </div>
          </div>
        )}

        {/* Kanban board */}
        {source === "loading" ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando pipeline…</div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3" style={{ minWidth: "max-content" }}>
              {CAZA_PIPELINE_STAGES.map((stage) => {
                const cfg   = STAGE_CFG[stage];
                const cards = opps.filter((o) => o.stage === stage);
                const total = cards.reduce((s, o) => s + o.valor_estimado, 0);
                const next  = STAGE_NEXT[stage];
                return (
                  <div key={stage} className="w-[230px] flex flex-col gap-2">
                    {/* Column header */}
                    <div className={`rounded-xl px-3 py-2.5 ${cfg.head} border ${cfg.border}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold ${cfg.text}`}>{cfg.label}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>{cards.length}</span>
                      </div>
                      {total > 0 && <div className={`text-[10px] font-semibold mt-0.5 ${cfg.text} opacity-70`}>{fmtR(total)}</div>}
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-2 min-h-[80px]">
                      {cards.length === 0 && (
                        <div className={`rounded-xl border-2 border-dashed ${cfg.border} px-3 py-4 text-center text-[10px] text-gray-400`}>
                          Sem oportunidades
                        </div>
                      )}
                      {cards.map((o) => {
                        const isOverdue  = o.prazo_estimado && o.prazo_estimado < TODAY &&
                          stage !== "Fechado Ganho" && stage !== "Fechado Perdido";
                        const isEditing  = editingId  === o.id;
                        const isDeleting = deletingId === o.id;
                        return (
                          <div key={o.id}
                            className={`rounded-xl border p-3 bg-white shadow-sm transition-shadow hover:shadow-md
                              ${isEditing ? "border-emerald-300 ring-1 ring-emerald-200" : cfg.border}
                              ${isOverdue ? "border-red-300" : ""}`}>

                            {/* Card header */}
                            <div className="flex items-start justify-between gap-1 mb-1.5">
                              <div className="text-[11px] font-semibold text-gray-800 leading-snug flex-1">
                                {o.nome_oportunidade}
                              </div>
                              {isDeleting ? (
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <span className="text-[9px] text-red-600 font-medium">Excluir?</span>
                                  <button onClick={() => handleDelete(o.id)}
                                    className="text-[9px] font-bold text-white bg-red-500 hover:bg-red-600 px-1.5 py-0.5 rounded">S</button>
                                  <button onClick={() => setDeletingId(null)}
                                    className="text-[9px] font-bold text-gray-500 px-1 py-0.5 rounded border border-gray-200">N</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button onClick={() => startEdit(o)}
                                    className="p-1 rounded hover:bg-emerald-50 text-gray-300 hover:text-emerald-500 transition-colors">
                                    <Pencil size={11} />
                                  </button>
                                  <button onClick={() => setDeletingId(o.id)}
                                    className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Empresa */}
                            {o.empresa && <div className="text-[10px] text-gray-500 mb-1">{o.empresa}</div>}

                            {/* Tipo negócio + days stalled */}
                            <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                              {o.tipo_negocio && (
                                <span className={`text-[9px] font-semibold px-1 py-0.5 rounded border ${
                                  o.tipo_negocio === "Recorrente" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  o.tipo_negocio === "Projeto" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  "bg-gray-50 text-gray-500 border-gray-200"}`}>
                                  {o.tipo_negocio}
                                </span>
                              )}
                              {(() => {
                                const ds = daysSince(o.data_ultima_interacao);
                                if (ds === null) return null;
                                const stale = ds > 14;
                                return (
                                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.5 rounded border ${stale ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}>
                                    <Timer size={8} />{ds}d
                                  </span>
                                );
                              })()}
                            </div>

                            {/* Valor */}
                            {o.valor_estimado > 0 && (
                              <div className={`text-[12px] font-bold mb-1.5 ${cfg.text}`}>{fmtR(o.valor_estimado)}</div>
                            )}

                            {/* Prob bar */}
                            <ProbBar pct={o.probabilidade} />

                            {/* Prazo + Risco */}
                            <div className="flex items-center justify-between mt-1.5 gap-1">
                              {fmtDate(o.prazo_estimado) ? (
                                <span className={`text-[9px] font-medium ${isOverdue ? "text-red-600" : "text-gray-400"}`}>
                                  {isOverdue && <AlertTriangle size={8} className="inline mr-0.5" />}
                                  {fmtDate(o.prazo_estimado)}
                                </span>
                              ) : <span />}
                              {o.risco === "Alto" && (
                                <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200">Alto</span>
                              )}
                              {o.risco === "Médio" && (
                                <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">Médio</span>
                              )}
                            </div>

                            {/* Move to next stage */}
                            {next && (
                              <button onClick={() => moveStage(o.id, next)}
                                className={`mt-2 w-full flex items-center justify-center gap-1 text-[10px] font-semibold py-1 rounded-lg border transition-colors
                                  ${STAGE_CFG[next].text} ${STAGE_CFG[next].bg} ${STAGE_CFG[next].border} hover:opacity-80`}>
                                <ChevronRight size={11} />
                                {next}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
