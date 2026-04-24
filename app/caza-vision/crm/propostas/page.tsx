"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import { fetchCazaCRM } from "@/lib/caza-crm-query";
import type { CazaCrmProposal, CazaCrmOpportunity } from "@/lib/caza-crm-db";
import { CAZA_PROPOSAL_STATUSES } from "@/lib/caza-crm-db";
import { lsGet, lsSet, lsLocalId } from "@/lib/caza-crm-local";
import { FileText, Plus, X, Database, CloudOff, HardDrive, DollarSign, CheckCircle2, Clock, Pencil, Trash2 } from "lucide-react";

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

const STATUS_CFG: Record<string, { text: string; bg: string; border: string }> = {
  "Em Elaboração": { text: "text-gray-600",    bg: "bg-gray-100",   border: "border-gray-200"   },
  "Enviada":       { text: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200"   },
  "Aprovada":      { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  "Rejeitada":     { text: "text-red-700",     bg: "bg-red-50",     border: "border-red-200"    },
  "Em Revisão":    { text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200"  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG["Em Elaboração"];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.text} ${cfg.bg} ${cfg.border}`}>
      {status}
    </span>
  );
}

const EMPTY_FORM = {
  opportunity_id: "", versao: "1", valor_proposto: "", escopo: "",
  status: "Em Elaboração" as string, data_envio: "", data_resposta: "", observacoes: "",
};
type PropostaForm = typeof EMPTY_FORM;

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const LS_KEY = "crm_propostas";

function PropostaFormFields({
  values, onChange, opps, isEdit = false,
}: { values: PropostaForm; onChange: (k: string, v: string) => void; opps: CazaCrmOpportunity[]; isEdit?: boolean }) {
  const cls = "mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white";
  const lbl = "text-[11px] font-semibold text-gray-500 uppercase tracking-wide";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
      {!isEdit && (
        <div>
          <label className={lbl}>Oportunidade *</label>
          <select value={values.opportunity_id} onChange={(e) => onChange("opportunity_id", e.target.value)} className={cls}>
            <option value="">— selecione —</option>
            {opps.filter((o) => o.stage !== "Fechado Perdido").map((o) => (
              <option key={o.id} value={o.id}>{o.nome_oportunidade} ({o.empresa || o.id})</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className={lbl}>Versão</label>
        <input type="number" min={1} value={values.versao} onChange={(e) => onChange("versao", e.target.value)} className={cls} />
      </div>
      <div>
        <label className={lbl}>Valor Proposto (R$)</label>
        <input type="number" min={0} value={values.valor_proposto} onChange={(e) => onChange("valor_proposto", e.target.value)} className={cls} />
      </div>
      <div>
        <label className={lbl}>Status</label>
        <select value={values.status} onChange={(e) => onChange("status", e.target.value)} className={cls}>
          {CAZA_PROPOSAL_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Data de Envio</label>
        <input type="date" value={values.data_envio} onChange={(e) => onChange("data_envio", e.target.value)} className={cls} />
      </div>
      {isEdit && (
        <div>
          <label className={lbl}>Data de Resposta</label>
          <input type="date" value={values.data_resposta} onChange={(e) => onChange("data_resposta", e.target.value)} className={cls} />
        </div>
      )}
      <div className="sm:col-span-2 lg:col-span-3">
        <label className={lbl}>Escopo / Descrição</label>
        <textarea rows={2} value={values.escopo} onChange={(e) => onChange("escopo", e.target.value)}
          className={`${cls} resize-none`} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label className={lbl}>Observações</label>
        <textarea rows={2} value={values.observacoes} onChange={(e) => onChange("observacoes", e.target.value)}
          className={`${cls} resize-none`} />
      </div>
    </div>
  );
}

export default function CazaCrmPropostas() {
  const [proposals,  setProposals]  = useState<CazaCrmProposal[]>([]);
  const [opps,       setOpps]       = useState<CazaCrmOpportunity[]>([]);
  const [source,     setSource]     = useState<"loading" | "internal" | "static" | "local" | "empty">("loading");
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [filter,     setFilter]     = useState("Todas");
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editForm,   setEditForm]   = useState({ ...EMPTY_FORM });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchCazaCRM<CazaCrmProposal>("propostas"),
      fetchCazaCRM<CazaCrmOpportunity>("oportunidades"),
    ]).then(([staticProps, oppsData]) => {
      setOpps(
        IS_STATIC ? (lsGet<CazaCrmOpportunity>("crm_oportunidades") ?? oppsData) : oppsData
      );
      if (IS_STATIC) {
        const local = lsGet<CazaCrmProposal>(LS_KEY);
        if (local !== null) {
          setProposals(local); setSource(local.length > 0 ? "local" : "empty");
        } else {
          lsSet(LS_KEY, staticProps); setProposals(staticProps);
          setSource(staticProps.length > 0 ? "static" : "empty");
        }
      } else {
        setProposals(staticProps); setSource(staticProps.length > 0 ? "internal" : "empty");
      }
    });
  }, []);

  const filtered   = filter === "Todas" ? proposals : proposals.filter((p) => p.status === filter);
  const totalValue = proposals.filter((p) => p.status !== "Rejeitada").reduce((s, p) => s + p.valor_proposto, 0);
  const approved   = proposals.filter((p) => p.status === "Aprovada").reduce((s, p) => s + p.valor_proposto, 0);
  const oppMap     = new Map(opps.map((o) => [o.id, o]));

  async function handleSave() {
    if (!form.opportunity_id) { setError("Vincule uma oportunidade."); return; }
    if (IS_STATIC) {
      const newProp: CazaCrmProposal = {
        id: lsLocalId("CV-PROP"),
        opportunity_id: form.opportunity_id,
        versao:         Number(form.versao) || 1,
        valor_proposto: Number(form.valor_proposto) || 0,
        escopo:         form.escopo,
        status:         form.status,
        data_envio:    form.data_envio || null,
        data_resposta: null,
        validade:      null,
        objecoes:      "",
        observacoes:   form.observacoes,
      };
      const updated = [newProp, ...proposals];
      lsSet(LS_KEY, updated);
      setProposals(updated); setSource("local"); setShowForm(false); setForm({ ...EMPTY_FORM });
      return;
    }
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
        setProposals((prev) => [prop, ...prev]); setSource("internal");
        setShowForm(false); setForm({ ...EMPTY_FORM });
      }
    } catch { setError("Erro de rede."); }
    finally { setSaving(false); }
  }

  function startEdit(p: CazaCrmProposal) {
    setEditingId(p.id);
    setEditForm({
      opportunity_id: p.opportunity_id, versao: String(p.versao),
      valor_proposto: String(p.valor_proposto), escopo: p.escopo, status: p.status,
      data_envio: p.data_envio ?? "", data_resposta: p.data_resposta ?? "",
      observacoes: p.observacoes,
    });
    setShowForm(false); setError(null);
  }

  async function handleUpdate() {
    if (!editingId) return;
    if (IS_STATIC) {
      const updated = proposals.map((p) => p.id === editingId ? {
        ...p,
        versao:         Number(editForm.versao) || 1,
        valor_proposto: Number(editForm.valor_proposto) || 0,
        escopo:         editForm.escopo,
        status:         editForm.status,
        data_envio:     editForm.data_envio || null,
        data_resposta:  editForm.data_resposta || null,
        observacoes:    editForm.observacoes,
      } : p);
      lsSet(LS_KEY, updated); setProposals(updated); setEditingId(null);
      return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/caza/crm/propostas/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versao:         Number(editForm.versao) || 1,
          valor_proposto: Number(editForm.valor_proposto) || 0,
          escopo:         editForm.escopo, status: editForm.status,
          data_envio:     editForm.data_envio || null,
          data_resposta:  editForm.data_resposta || null,
          observacoes:    editForm.observacoes,
        }),
      });
      if (!res.ok) {
        const e = await res.json() as { error?: string };
        setError(e.error ?? "Erro ao salvar.");
      } else {
        const updated = await res.json() as CazaCrmProposal;
        setProposals((prev) => prev.map((p) => p.id === editingId ? updated : p));
        setEditingId(null);
      }
    } catch { setError("Erro de rede."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (IS_STATIC) {
      const updated = proposals.filter((p) => p.id !== id);
      lsSet(LS_KEY, updated); setProposals(updated); setDeletingId(null);
      if (editingId === id) setEditingId(null);
      return;
    }
    try {
      await fetch(`/api/caza/crm/propostas/${id}`, { method: "DELETE" });
      setProposals((prev) => prev.filter((p) => p.id !== id));
      setDeletingId(null); if (editingId === id) setEditingId(null);
    } catch { /* ignore */ }
  }

  return (
    <>
      <Header title="Propostas" subtitle="Gestão de Propostas Comerciais · Caza Vision" />
      <div className="page-container">

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {source === "loading"  && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500"><Database size={11} />Carregando…</span>}
            {source === "internal" && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600"><Database size={11} />Base interna AWQ</span>}
            {source === "static"   && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600"><Database size={11} />Snapshot estático</span>}
            {source === "local"    && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-xs text-violet-600"><HardDrive size={11} />Armazenamento local</span>}
            {source === "empty"    && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700"><CloudOff size={11} />Sem propostas</span>}
          </div>
          <button onClick={() => { setShowForm((v) => !v); setEditingId(null); setError(null); }}
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs">
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancelar" : "Nova Proposta"}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total",      value: proposals.length,                                        icon: FileText,    color: "text-gray-700"    },
            { label: "Em Aberto",  value: proposals.filter((p) => p.status === "Enviada").length,  icon: Clock,       color: "text-blue-600"    },
            { label: "Aprovadas",  value: proposals.filter((p) => p.status === "Aprovada").length, icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Aprovado R$", value: fmtR(approved),                                         icon: DollarSign,  color: "text-emerald-600" },
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

        {showForm && (
          <div className="card p-5 border border-amber-200 bg-amber-50/20">
            <SectionHeader title="Nova Proposta" />
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
            <PropostaFormFields values={form} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} opps={opps} />
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

        {editingId && (
          <div className="card p-5 border border-emerald-200 bg-emerald-50/20">
            <SectionHeader title="Editar Proposta" />
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
            <PropostaFormFields values={editForm} onChange={(k, v) => setEditForm((f) => ({ ...f, [k]: v }))} opps={opps} isEdit />
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

        <div className="card p-5">
          <SectionHeader icon={<FileText size={15} className="text-amber-500" />} title="Propostas" />
          {filtered.length === 0 ? (
            <EmptyState compact title="Sem propostas" description="Crie propostas vinculadas às oportunidades." />
          ) : (
            <div className="table-scroll mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">ID</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Oportunidade</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Escopo</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Valor</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400">Ver.</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Enviada</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Resposta</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Status</th>
                    <th className="py-2 px-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const opp        = oppMap.get(p.opportunity_id);
                    const isEditing  = editingId === p.id;
                    const isDeleting = deletingId === p.id;
                    return (
                      <tr key={p.id}
                        className={`border-b border-gray-50 transition-colors ${isEditing ? "bg-emerald-50/40" : "hover:bg-gray-50/80"}`}>
                        <td className="py-2.5 px-3 text-[10px] text-gray-400 font-mono">{p.id}</td>
                        <td className="py-2.5 px-3">
                          <div className="text-xs font-medium text-gray-700">{opp?.nome_oportunidade ?? p.opportunity_id}</div>
                          {opp?.empresa && <div className="text-[10px] text-gray-400">{opp.empresa}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 max-w-[180px] truncate">{p.escopo || "—"}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">
                          {p.valor_proposto > 0 ? fmtR(p.valor_proposto) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-center text-gray-500">v{p.versao}</td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-400">{fmtDate(p.data_envio)}</td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-400">{fmtDate(p.data_resposta)}</td>
                        <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                        <td className="py-2.5 px-3 text-right">
                          {isDeleting ? (
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-[10px] text-red-600 font-medium">Excluir?</span>
                              <button onClick={() => handleDelete(p.id)}
                                className="text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded">Sim</button>
                              <button onClick={() => setDeletingId(null)}
                                className="text-[10px] font-semibold text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">Não</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => startEdit(p)}
                                className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors" title="Editar">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setDeletingId(p.id)}
                                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
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
