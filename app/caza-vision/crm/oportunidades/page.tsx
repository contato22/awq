"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import { fetchCazaCRM } from "@/lib/caza-crm-query";
import type { CazaCrmOpportunity } from "@/lib/caza-crm-db";
import {
  CAZA_PIPELINE_STAGES, CAZA_SERVICE_TYPES, CAZA_RISK_LEVELS,
} from "@/lib/caza-crm-db";
import {
  Target, Plus, X, Database, CloudOff, Pencil, Trash2,
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

const STAGE_CFG: Record<string, { text: string; bg: string; border: string }> = {
  "Lead Captado":    { text: "text-gray-600",    bg: "bg-gray-100",   border: "border-gray-200"   },
  "Qualificação":    { text: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200"   },
  "Briefing Inicial":{ text: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200" },
  "Proposta Enviada":{ text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200"  },
  "Negociação":      { text: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200" },
  "Fechado Ganho":   { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200"},
  "Fechado Perdido": { text: "text-red-700",     bg: "bg-red-50",     border: "border-red-200"    },
};

function StageBadge({ stage }: { stage: string }) {
  const cfg = STAGE_CFG[stage] ?? STAGE_CFG["Lead Captado"];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.text} ${cfg.bg} ${cfg.border}`}>
      {stage}
    </span>
  );
}

const PROB_MAP: Record<string, number> = {
  "Lead Captado": 10, "Qualificação": 25, "Briefing Inicial": 40,
  "Proposta Enviada": 60, "Negociação": 75,
  "Fechado Ganho": 100, "Fechado Perdido": 0,
};

const EMPTY_FORM = {
  nome_oportunidade: "", empresa: "", tipo_servico: "" as string,
  valor_estimado: "" as string | number, stage: "Lead Captado" as string,
  probabilidade: "10" as string | number, owner: "",
  prazo_estimado: "", proxima_acao: "", risco: "Baixo" as string,
  observacoes: "",
};

type OppForm = typeof EMPTY_FORM;

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

// ─── Shared form fields ────────────────────────────────────────────────────────

function OppFormFields({
  values, onChange,
}: {
  values: OppForm;
  onChange: (k: string, v: string) => void;
}) {
  const inputCls = "mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white";
  const labelCls = "text-[11px] font-semibold text-gray-500 uppercase tracking-wide";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
      {([
        { key: "nome_oportunidade", label: "Nome da Oportunidade *", type: "text"   },
        { key: "empresa",           label: "Empresa",                type: "text"   },
        { key: "owner",             label: "Responsável",            type: "text"   },
        { key: "valor_estimado",    label: "Valor Estimado (R$)",    type: "number" },
        { key: "probabilidade",     label: "Probabilidade (%)",      type: "number" },
        { key: "prazo_estimado",    label: "Prazo Estimado",         type: "date"   },
        { key: "proxima_acao",      label: "Próxima Ação",           type: "text"   },
      ] as const).map(({ key, label, type }) => (
        <div key={key}>
          <label className={labelCls}>{label}</label>
          <input type={type} value={String(values[key as keyof OppForm])}
            onChange={(e) => onChange(key, e.target.value)}
            className={inputCls} />
        </div>
      ))}
      <div>
        <label className={labelCls}>Tipo de Serviço</label>
        <select value={values.tipo_servico} onChange={(e) => onChange("tipo_servico", e.target.value)} className={inputCls}>
          <option value="">— selecione —</option>
          {CAZA_SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Etapa</label>
        <select value={values.stage} onChange={(e) => onChange("stage", e.target.value)} className={inputCls}>
          {CAZA_PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Risco</label>
        <select value={values.risco} onChange={(e) => onChange("risco", e.target.value)} className={inputCls}>
          {CAZA_RISK_LEVELS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label className={labelCls}>Observações</label>
        <textarea rows={2} value={String(values.observacoes)} onChange={(e) => onChange("observacoes", e.target.value)}
          className={`${inputCls} resize-none`} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaCrmOportunidades() {
  const [opps,       setOpps]       = useState<CazaCrmOpportunity[]>([]);
  const [source,     setSource]     = useState<"loading" | "internal" | "static" | "empty">("loading");
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState("Todas");
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editForm,   setEditForm]   = useState({ ...EMPTY_FORM });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCazaCRM<CazaCrmOpportunity>("oportunidades").then((data) => {
      setOpps(data);
      setSource(data.length > 0 ? (IS_STATIC ? "static" : "internal") : "empty");
    });
  }, []);

  const visible    = stageFilter === "Todas" ? opps : opps.filter((o) => o.stage === stageFilter);
  const valorTotal = opps.filter((o) => o.stage !== "Fechado Perdido").reduce((s, o) => s + o.valor_estimado, 0);

  async function handleSave() {
    if (IS_STATIC) { setError("Operação não disponível no modo estático."); return; }
    if (!String(form.nome_oportunidade).trim()) { setError("Nome da oportunidade é obrigatório."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/caza/crm/oportunidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          valor_estimado: Number(form.valor_estimado) || 0,
          probabilidade:  Number(form.probabilidade)  || (PROB_MAP[form.stage as string] ?? 10),
          prazo_estimado: String(form.prazo_estimado) || null,
          data_abertura:  new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) {
        const e = await res.json() as { error?: string };
        setError(e.error ?? "Erro ao salvar.");
      } else {
        const opp = await res.json() as CazaCrmOpportunity;
        setOpps((prev) => [opp, ...prev]);
        setSource("internal");
        setShowForm(false);
        setForm({ ...EMPTY_FORM });
      }
    } catch { setError("Erro de rede."); }
    finally { setSaving(false); }
  }

  function startEdit(o: CazaCrmOpportunity) {
    setEditingId(o.id);
    setEditForm({
      nome_oportunidade: o.nome_oportunidade,
      empresa:           o.empresa,
      tipo_servico:      o.tipo_servico,
      valor_estimado:    String(o.valor_estimado),
      stage:             o.stage,
      probabilidade:     String(o.probabilidade),
      owner:             o.owner,
      prazo_estimado:    o.prazo_estimado ?? "",
      proxima_acao:      o.proxima_acao,
      risco:             o.risco,
      observacoes:       o.observacoes,
    });
    setShowForm(false);
    setError(null);
  }

  async function handleUpdate() {
    if (!editingId) return;
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
      if (!res.ok) {
        const e = await res.json() as { error?: string };
        setError(e.error ?? "Erro ao salvar.");
      } else {
        const updated = await res.json() as CazaCrmOpportunity;
        setOpps((prev) => prev.map((o) => o.id === editingId ? updated : o));
        setEditingId(null);
      }
    } catch { setError("Erro de rede."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/caza/crm/oportunidades/${id}`, { method: "DELETE" });
      setOpps((prev) => prev.filter((o) => o.id !== id));
      setDeletingId(null);
      if (editingId === id) setEditingId(null);
    } catch { /* ignore */ }
  }

  return (
    <>
      <Header title="Oportunidades" subtitle="Pipeline Comercial · Caza Vision" />
      <div className="page-container">

        {/* Source + action */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {source === "loading" && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500"><Database size={11} />Carregando…</span>}
            {source === "internal" && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600"><Database size={11} />Base interna AWQ</span>}
            {source === "static" && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600"><Database size={11} />Snapshot estático</span>}
            {source === "empty" && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700"><CloudOff size={11} />Sem oportunidades</span>}
          </div>
          {!IS_STATIC && (
            <button onClick={() => { setShowForm((v) => !v); setEditingId(null); setError(null); }}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs">
              {showForm ? <X size={13} /> : <Plus size={13} />}
              {showForm ? "Cancelar" : "Nova Oportunidade"}
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(["Lead Captado", "Proposta Enviada", "Negociação", "Fechado Ganho"] as const).map((s) => {
            const count = opps.filter((o) => o.stage === s).length;
            const valor = opps.filter((o) => o.stage === s).reduce((acc, o) => acc + o.valor_estimado, 0);
            const cfg   = STAGE_CFG[s];
            return (
              <button key={s} onClick={() => setStageFilter(stageFilter === s ? "Todas" : s)}
                className={`card p-4 text-left transition-all ${stageFilter === s ? `border-2 ${cfg.border}` : "hover:border-gray-300"}`}>
                <div className={`text-xl font-bold tabular-nums ${cfg.text}`}>{count}</div>
                <div className="text-[11px] font-medium text-gray-500 mt-0.5">{s}</div>
                {valor > 0 && <div className="text-[10px] text-gray-400 mt-1">{fmtR(valor)}</div>}
              </button>
            );
          })}
        </div>

        {/* Create form */}
        {showForm && (
          <div className="card p-5 border border-violet-200 bg-violet-50/20">
            <SectionHeader title="Nova Oportunidade" />
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
            <OppFormFields values={form} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowForm(false); setError(null); setForm({ ...EMPTY_FORM }); }}
                className="px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary px-5 py-1.5 text-sm disabled:opacity-60">
                {saving ? "Salvando…" : "Salvar Oportunidade"}
              </button>
            </div>
          </div>
        )}

        {/* Edit form */}
        {editingId && (
          <div className="card p-5 border border-emerald-200 bg-emerald-50/20">
            <SectionHeader title="Editar Oportunidade" />
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
            <OppFormFields values={editForm} onChange={(k, v) => setEditForm((f) => ({ ...f, [k]: v }))} />
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

        {/* Table */}
        <div className="card p-5">
          <SectionHeader icon={<Target size={15} className="text-violet-500" />}
            title={`Oportunidades${stageFilter !== "Todas" ? ` — ${stageFilter}` : ""}`} />
          <div className="flex items-center gap-2 mt-2 mb-3 flex-wrap">
            {["Todas", ...CAZA_PIPELINE_STAGES].map((s) => (
              <button key={s} onClick={() => setStageFilter(s)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  stageFilter === s ? "bg-brand-600 text-white border-brand-600" : "text-gray-500 bg-white border-gray-200 hover:border-gray-300"
                }`}>
                {s}
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <EmptyState compact title="Sem oportunidades" description="Crie uma nova oportunidade ou converta leads." />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Oportunidade</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Empresa</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Serviço</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Valor</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Etapa</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Prazo</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Owner</th>
                    {!IS_STATIC && <th className="py-2 px-3 w-20" />}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((o) => {
                    const isEditing  = editingId === o.id;
                    const isDeleting = deletingId === o.id;
                    return (
                      <tr key={o.id}
                        className={`border-b border-gray-50 transition-colors ${isEditing ? "bg-emerald-50/40" : "hover:bg-gray-50/80"}`}>
                        <td className="py-2.5 px-3">
                          <div className="text-xs font-medium text-gray-800">{o.nome_oportunidade}</div>
                          <div className="text-[10px] text-gray-400">{o.id}</div>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-600">{o.empresa || "—"}</td>
                        <td className="py-2.5 px-3 text-xs text-gray-500">{o.tipo_servico || "—"}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">
                          {o.valor_estimado > 0 ? fmtR(o.valor_estimado) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3"><StageBadge stage={o.stage} /></td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-400">{fmtDate(o.prazo_estimado)}</td>
                        <td className="py-2.5 px-3 text-xs text-gray-500">{o.owner || "—"}</td>
                        {!IS_STATIC && (
                          <td className="py-2.5 px-3 text-right">
                            {isDeleting ? (
                              <div className="flex items-center gap-1 justify-end">
                                <span className="text-[10px] text-red-600 font-medium">Excluir?</span>
                                <button onClick={() => handleDelete(o.id)}
                                  className="text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded">Sim</button>
                                <button onClick={() => setDeletingId(null)}
                                  className="text-[10px] font-semibold text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">Não</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 justify-end">
                                <button onClick={() => startEdit(o)}
                                  className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                                  title="Editar">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => setDeletingId(o.id)}
                                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Excluir">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {valorTotal > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end gap-6 text-xs">
                  <span className="text-gray-500">Total pipeline (excl. perdidas):</span>
                  <span className="font-bold text-gray-900">{fmtR(valorTotal)}</span>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
