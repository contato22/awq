"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import { fetchCazaCRM } from "@/lib/caza-crm-query";
import type { CazaCrmLead } from "@/lib/caza-crm-db";
import {
  CAZA_LEAD_ORIGENS, CAZA_LEAD_STATUSES, CAZA_SERVICE_TYPES,
  CAZA_ICP_LEVELS, CAZA_URGENCIA_LEVELS, CAZA_CONSCIENCIA_LEVELS, CAZA_TIPO_NEGOCIO,
  calcSqlScore,
} from "@/lib/caza-crm-db";
import { lsGet, lsSet, lsLocalId } from "@/lib/caza-crm-local";
import { Users, Plus, X, Filter, Database, CloudOff, HardDrive, Pencil, Trash2, Zap } from "lucide-react";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function statusCls(s: string) {
  switch (s) {
    case "Novo":         return "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200";
    case "Qualificando": return "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200";
    case "Convertido":   return "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "Perdido":      return "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200";
    case "Nurturing":    return "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200";
    default:             return "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200";
  }
}

function SqlBadge({ lead }: { lead: CazaCrmLead }) {
  if (!lead.fit_icp && !lead.urgencia && !lead.estagio_consciencia) return <span className="text-gray-300 text-[10px]">—</span>;
  const { score, label } = calcSqlScore(lead);
  const cfg: Record<string, string> = {
    SQL:       "bg-emerald-100 text-emerald-700 border-emerald-300",
    MQL:       "bg-blue-100 text-blue-700 border-blue-300",
    Aquecendo: "bg-amber-100 text-amber-700 border-amber-300",
    Frio:      "bg-gray-100 text-gray-500 border-gray-300",
  };
  return (
    <div className="flex items-center gap-1">
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold ${cfg[label]}`}>
        <Zap size={9} />{label}
      </span>
      <span className="text-[10px] text-gray-400 tabular-nums">{score}</span>
    </div>
  );
}

const EMPTY_FORM = {
  nome: "", cargo: "", empresa: "", cnpj: "", contato_principal: "", telefone: "", email: "",
  origem: "Indicação" as string, tipo_servico: "" as string,
  interesse: "", status: "Novo" as string, owner: "", observacoes: "",
  fit_icp: "" as string, decisor: "", urgencia: "" as string,
  dor_principal: "", cidade: "", estagio_consciencia: "" as string,
  data_ultima_interacao: "", data_proxima_acao_crm: "", tipo_negocio: "" as string,
};
type LeadForm = typeof EMPTY_FORM;

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const LS_KEY = "crm_leads";

function LeadFormFields({ values, onChange }: { values: LeadForm; onChange: (k: string, v: string) => void }) {
  const cls = "mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white";
  const lbl = "text-[11px] font-semibold text-gray-500 uppercase tracking-wide";
  const sec = "text-[10px] font-bold text-gray-400 uppercase tracking-widest col-span-full pt-3 border-t border-gray-100 mt-1";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
      {/* Identificação */}
      {([
        { key: "nome",              label: "Nome *",            type: "text"  },
        { key: "cargo",             label: "Cargo",             type: "text"  },
        { key: "empresa",           label: "Empresa",           type: "text"  },
        { key: "cnpj",              label: "CNPJ",              type: "text"  },
        { key: "contato_principal", label: "Contato Principal", type: "text"  },
        { key: "telefone",          label: "Telefone",          type: "tel"   },
        { key: "email",             label: "E-mail",            type: "email" },
        { key: "cidade",            label: "Cidade",            type: "text"  },
        { key: "owner",             label: "Responsável",       type: "text"  },
      ] as const).map(({ key, label, type }) => (
        <div key={key}>
          <label className={lbl}>{label}</label>
          <input type={type} value={values[key as keyof LeadForm] as string}
            onChange={(e) => onChange(key, e.target.value)} className={cls} />
        </div>
      ))}
      <div>
        <label className={lbl}>Origem</label>
        <select value={values.origem} onChange={(e) => onChange("origem", e.target.value)} className={cls}>
          {CAZA_LEAD_ORIGENS.map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Tipo de Serviço</label>
        <select value={values.tipo_servico} onChange={(e) => onChange("tipo_servico", e.target.value)} className={cls}>
          <option value="">— selecione —</option>
          {CAZA_SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Status</label>
        <select value={values.status} onChange={(e) => onChange("status", e.target.value)} className={cls}>
          {CAZA_LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Tipo de Negócio</label>
        <select value={values.tipo_negocio} onChange={(e) => onChange("tipo_negocio", e.target.value)} className={cls}>
          <option value="">— selecione —</option>
          {CAZA_TIPO_NEGOCIO.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Qualificação SQL */}
      <div className={sec}>Qualificação SQL</div>
      <div>
        <label className={lbl}>Fit ICP</label>
        <select value={values.fit_icp} onChange={(e) => onChange("fit_icp", e.target.value)} className={cls}>
          <option value="">— selecione —</option>
          {CAZA_ICP_LEVELS.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Decisor</label>
        <input type="text" value={values.decisor} onChange={(e) => onChange("decisor", e.target.value)} className={cls} />
      </div>
      <div>
        <label className={lbl}>Urgência</label>
        <select value={values.urgencia} onChange={(e) => onChange("urgencia", e.target.value)} className={cls}>
          <option value="">— selecione —</option>
          {CAZA_URGENCIA_LEVELS.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Estágio de Consciência</label>
        <select value={values.estagio_consciencia} onChange={(e) => onChange("estagio_consciencia", e.target.value)} className={cls}>
          <option value="">— selecione —</option>
          {CAZA_CONSCIENCIA_LEVELS.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Última Interação</label>
        <input type="date" value={values.data_ultima_interacao} onChange={(e) => onChange("data_ultima_interacao", e.target.value)} className={cls} />
      </div>
      <div>
        <label className={lbl}>Próxima Ação CRM</label>
        <input type="date" value={values.data_proxima_acao_crm} onChange={(e) => onChange("data_proxima_acao_crm", e.target.value)} className={cls} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label className={lbl}>Dor Principal</label>
        <input type="text" value={values.dor_principal} onChange={(e) => onChange("dor_principal", e.target.value)} className={cls} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label className={lbl}>Interesse / Briefing</label>
        <textarea rows={2} value={values.interesse} onChange={(e) => onChange("interesse", e.target.value)}
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

function formFromLead(l: CazaCrmLead): LeadForm {
  return {
    nome: l.nome, cargo: l.cargo, empresa: l.empresa, cnpj: l.cnpj,
    contato_principal: l.contato_principal, telefone: l.telefone,
    email: l.email, origem: l.origem, tipo_servico: l.tipo_servico,
    interesse: l.interesse, status: l.status, owner: l.owner, observacoes: l.observacoes,
    fit_icp: l.fit_icp ?? "", decisor: l.decisor ?? "",
    urgencia: l.urgencia ?? "", dor_principal: l.dor_principal ?? "",
    cidade: l.cidade ?? "", estagio_consciencia: l.estagio_consciencia ?? "",
    data_ultima_interacao: l.data_ultima_interacao ?? "",
    data_proxima_acao_crm: l.data_proxima_acao_crm ?? "",
    tipo_negocio: l.tipo_negocio ?? "",
  };
}

export default function CazaCrmLeads() {
  const [leads,      setLeads]      = useState<CazaCrmLead[]>([]);
  const [source,     setSource]     = useState<"loading" | "internal" | "static" | "local" | "empty">("loading");
  const [filter,     setFilter]     = useState("Todos");
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editForm,   setEditForm]   = useState({ ...EMPTY_FORM });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCazaCRM<CazaCrmLead>("leads").then((staticData) => {
      if (IS_STATIC) {
        const local = lsGet<CazaCrmLead>(LS_KEY);
        if (local !== null) {
          setLeads(local);
          setSource(local.length > 0 ? "local" : "empty");
        } else {
          lsSet(LS_KEY, staticData);
          setLeads(staticData);
          setSource(staticData.length > 0 ? "static" : "empty");
        }
      } else {
        setLeads(staticData);
        setSource(staticData.length > 0 ? "internal" : "empty");
      }
    });
  }, []);

  const filtered = filter === "Todos" ? leads : leads.filter((l) => l.status === filter);

  async function handleSave() {
    if (!form.nome.trim()) { setError("Nome é obrigatório."); return; }
    if (IS_STATIC) {
      const newLead: CazaCrmLead = {
        id: lsLocalId("CV-LEAD"),
        ...form,
        data_ultima_interacao: form.data_ultima_interacao || null,
        data_proxima_acao_crm: form.data_proxima_acao_crm || null,
        data_entrada: new Date().toISOString().slice(0, 10),
      };
      const updated = [newLead, ...leads];
      lsSet(LS_KEY, updated);
      setLeads(updated);
      setSource("local");
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/caza/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          data_ultima_interacao: form.data_ultima_interacao || null,
          data_proxima_acao_crm: form.data_proxima_acao_crm || null,
          data_entrada: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) {
        const e = await res.json() as { error?: string };
        setError(e.error ?? "Erro ao salvar.");
      } else {
        const lead = await res.json() as CazaCrmLead;
        setLeads((prev) => [lead, ...prev]);
        setSource("internal");
        setShowForm(false);
        setForm({ ...EMPTY_FORM });
      }
    } catch { setError("Erro de rede."); }
    finally { setSaving(false); }
  }

  function startEdit(l: CazaCrmLead) {
    setEditingId(l.id);
    setEditForm(formFromLead(l));
    setShowForm(false); setError(null);
  }

  async function handleUpdate() {
    if (!editingId) return;
    if (IS_STATIC) {
      const updated = leads.map((l) => l.id === editingId ? {
        ...l, ...editForm,
        data_ultima_interacao: editForm.data_ultima_interacao || null,
        data_proxima_acao_crm: editForm.data_proxima_acao_crm || null,
      } : l);
      lsSet(LS_KEY, updated);
      setLeads(updated);
      setEditingId(null);
      return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/caza/crm/leads/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          data_ultima_interacao: editForm.data_ultima_interacao || null,
          data_proxima_acao_crm: editForm.data_proxima_acao_crm || null,
        }),
      });
      if (!res.ok) {
        const e = await res.json() as { error?: string };
        setError(e.error ?? "Erro ao salvar.");
      } else {
        const updated = await res.json() as CazaCrmLead;
        setLeads((prev) => prev.map((l) => l.id === editingId ? updated : l));
        setEditingId(null);
      }
    } catch { setError("Erro de rede."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (IS_STATIC) {
      const updated = leads.filter((l) => l.id !== id);
      lsSet(LS_KEY, updated);
      setLeads(updated);
      setDeletingId(null);
      if (editingId === id) setEditingId(null);
      return;
    }
    try {
      await fetch(`/api/caza/crm/leads/${id}`, { method: "DELETE" });
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setDeletingId(null);
      if (editingId === id) setEditingId(null);
    } catch { /* ignore */ }
  }

  return (
    <>
      <Header title="Leads" subtitle="Prospecção Comercial · Caza Vision" />
      <div className="page-container">

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {source === "loading"  && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500"><Database size={11} />Carregando…</span>}
            {source === "internal" && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600"><Database size={11} />Base interna AWQ</span>}
            {source === "static"   && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600"><Database size={11} />Snapshot estático</span>}
            {source === "local"    && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-xs text-violet-600"><HardDrive size={11} />Armazenamento local</span>}
            {source === "empty"    && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700"><CloudOff size={11} />Sem leads</span>}
          </div>
          <button onClick={() => { setShowForm((v) => !v); setEditingId(null); setError(null); }}
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs">
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancelar" : "Novo Lead"}
          </button>
        </div>

        {showForm && (
          <div className="card p-5 border border-brand-200 bg-brand-50/30">
            <SectionHeader title="Cadastrar Novo Lead" />
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
            <LeadFormFields values={form} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowForm(false); setError(null); setForm({ ...EMPTY_FORM }); }}
                className="px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary px-5 py-1.5 text-sm disabled:opacity-60">
                {saving ? "Salvando…" : "Salvar Lead"}
              </button>
            </div>
          </div>
        )}

        {editingId && (
          <div className="card p-5 border border-emerald-200 bg-emerald-50/20">
            <SectionHeader title="Editar Lead" />
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
            <LeadFormFields values={editForm} onChange={(k, v) => setEditForm((f) => ({ ...f, [k]: v }))} />
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

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {["Todos", ...CAZA_LEAD_STATUSES].map((s) => {
            const count = s === "Todos" ? leads.length : leads.filter((l) => l.status === s).length;
            return (
              <button key={s} onClick={() => setFilter(s)}
                className={`card p-3 text-center transition-all ${filter === s ? "border-brand-300 bg-brand-50 shadow-sm" : "hover:border-gray-300"}`}>
                <div className={`text-xl font-bold tabular-nums ${filter === s ? "text-brand-700" : "text-gray-900"}`}>{count}</div>
                <div className={`text-[11px] font-medium mt-0.5 ${filter === s ? "text-brand-600" : "text-gray-400"}`}>{s}</div>
              </button>
            );
          })}
        </div>

        {filter !== "Todos" && (
          <div className="flex items-center gap-2">
            <Filter size={12} className="text-gray-400" />
            <span className="text-xs text-gray-500">Filtrando por: <strong>{filter}</strong></span>
            <button onClick={() => setFilter("Todos")} className="text-xs text-brand-600 hover:underline">Limpar</button>
          </div>
        )}

        <div className="card p-5">
          <SectionHeader icon={<Users size={15} className="text-blue-500" />}
            title={`Leads${filter !== "Todos" ? ` — ${filter}` : ""}`} />
          {source === "loading" ? (
            <div className="py-12 text-center text-sm text-gray-400">Carregando…</div>
          ) : filtered.length === 0 ? (
            <EmptyState compact title="Sem leads"
              description={filter !== "Todos" ? `Nenhum lead com status "${filter}".` : "Cadastre o primeiro lead."} />
          ) : (
            <div className="table-scroll mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Lead</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Cargo / Empresa</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Serviço</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">SQL Score</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Fit / Urgência</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Tipo</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Última Int.</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Status</th>
                    <th className="py-2 px-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const isEditing  = editingId === l.id;
                    const isDeleting = deletingId === l.id;
                    return (
                      <tr key={l.id}
                        className={`border-b border-gray-50 transition-colors ${isEditing ? "bg-emerald-50/40" : "hover:bg-gray-50/80"}`}>
                        <td className="py-2.5 px-3">
                          <div className="text-xs font-medium text-gray-800">{l.nome}</div>
                          {l.email && <div className="text-[10px] text-gray-400">{l.email}</div>}
                          {l.telefone && <div className="text-[10px] text-gray-400">{l.telefone}</div>}
                          {l.cidade && <div className="text-[10px] text-gray-400">{l.cidade}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500">
                          <div>{l.cargo || "—"}</div>
                          <div className="text-[10px] text-gray-400">{l.empresa}</div>
                          {l.cnpj && <div className="text-[10px] text-gray-300">{l.cnpj}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500">{l.tipo_servico || "—"}</td>
                        <td className="py-2.5 px-3"><SqlBadge lead={l} /></td>
                        <td className="py-2.5 px-3">
                          {l.fit_icp && (
                            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border mr-1 ${
                              l.fit_icp === "Alto" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              l.fit_icp === "Médio" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-red-50 text-red-600 border-red-200"}`}>
                              {l.fit_icp}
                            </span>
                          )}
                          {l.urgencia && (
                            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                              l.urgencia === "Alta" ? "bg-red-50 text-red-600 border-red-200" :
                              l.urgencia === "Média" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-gray-50 text-gray-500 border-gray-200"}`}>
                              {l.urgencia}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {l.tipo_negocio ? (
                            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                              l.tipo_negocio === "Recorrente" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              l.tipo_negocio === "Projeto" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              "bg-gray-50 text-gray-500 border-gray-200"}`}>
                              {l.tipo_negocio}
                            </span>
                          ) : <span className="text-gray-300 text-[10px]">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-400">{fmtDate(l.data_ultima_interacao)}</td>
                        <td className="py-2.5 px-3"><span className={statusCls(l.status)}>{l.status}</span></td>
                        <td className="py-2.5 px-3 text-right">
                          {isDeleting ? (
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-[10px] text-red-600 font-medium">Excluir?</span>
                              <button onClick={() => handleDelete(l.id)}
                                className="text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded">Sim</button>
                              <button onClick={() => setDeletingId(null)}
                                className="text-[10px] font-semibold text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">Não</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => startEdit(l)}
                                className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors" title="Editar">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setDeletingId(l.id)}
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
            </div>
          )}
        </div>

      </div>
    </>
  );
}
