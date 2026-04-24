"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import { fetchCazaCRM } from "@/lib/caza-crm-query";
import type { CazaCrmLead } from "@/lib/caza-crm-db";
import {
  CAZA_LEAD_ORIGENS, CAZA_LEAD_STATUSES, CAZA_SERVICE_TYPES,
} from "@/lib/caza-crm-db";
import {
  Users, Plus, X, Filter, Database, CloudOff,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
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

// ─── Form default ─────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  nome: "", empresa: "", contato_principal: "", telefone: "", email: "",
  origem: "Indicação" as string, tipo_servico: "" as string,
  interesse: "", status: "Novo" as string, owner: "", observacoes: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

export default function CazaCrmLeads() {
  const [leads,   setLeads]   = useState<CazaCrmLead[]>([]);
  const [source,  setSource]  = useState<"loading" | "internal" | "static" | "empty">("loading");
  const [filter,  setFilter]  = useState<string>("Todos");
  const [showForm, setShowForm] = useState(false);
  const [form,    setForm]    = useState({ ...EMPTY_FORM });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetchCazaCRM<CazaCrmLead>("leads").then((data) => {
      setLeads(data);
      setSource(data.length > 0 ? (IS_STATIC ? "static" : "internal") : "empty");
    });
  }, []);

  const filtered = filter === "Todos" ? leads : leads.filter((l) => l.status === filter);

  async function handleSave() {
    if (IS_STATIC) { setError("Operação não disponível no modo estático."); return; }
    if (!form.nome.trim()) { setError("Nome é obrigatório."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/caza/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, data_entrada: new Date().toISOString().slice(0, 10) }),
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

  async function handleStatusUpdate(id: string, newStatus: string) {
    if (IS_STATIC) return;
    try {
      await fetch("/api/caza/crm/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status: newStatus } : l));
    } catch { /* silent */ }
  }

  return (
    <>
      <Header title="Leads" subtitle="Prospecção Comercial · Caza Vision" />
      <div className="page-container">

        {/* Source badge */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {source === "loading" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500">
                <Database size={11} /> Carregando…
              </span>
            )}
            {source === "internal" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600">
                <Database size={11} /> Base interna AWQ
              </span>
            )}
            {source === "static" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600">
                <Database size={11} /> Snapshot estático
              </span>
            )}
            {source === "empty" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <CloudOff size={11} /> Sem leads — cadastre o primeiro
              </span>
            )}
          </div>
          {!IS_STATIC && (
            <button
              onClick={() => { setShowForm((v) => !v); setError(null); }}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              {showForm ? <X size={13} /> : <Plus size={13} />}
              {showForm ? "Cancelar" : "Novo Lead"}
            </button>
          )}
        </div>

        {/* Add form */}
        {showForm && (
          <div className="card p-5 border border-brand-200 bg-brand-50/30">
            <SectionHeader title="Cadastrar Novo Lead" />
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {[
                { key: "nome",              label: "Nome *",            type: "text"  },
                { key: "empresa",           label: "Empresa",           type: "text"  },
                { key: "contato_principal", label: "Contato Principal", type: "text"  },
                { key: "telefone",          label: "Telefone",          type: "text"  },
                { key: "email",             label: "E-mail",            type: "email" },
                { key: "owner",             label: "Responsável",       type: "text"  },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
                  <input
                    type={type}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                  />
                </div>
              ))}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Origem</label>
                <select
                  value={form.origem}
                  onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                >
                  {CAZA_LEAD_ORIGENS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Tipo de Serviço</label>
                <select
                  value={form.tipo_servico}
                  onChange={(e) => setForm((f) => ({ ...f, tipo_servico: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                >
                  <option value="">— selecione —</option>
                  {CAZA_SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                >
                  {CAZA_LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Interesse / Briefing Inicial</label>
                <textarea
                  rows={2}
                  value={form.interesse}
                  onChange={(e) => setForm((f) => ({ ...f, interesse: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white resize-none"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Observações</label>
                <textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowForm(false); setError(null); setForm({ ...EMPTY_FORM }); }}
                className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-5 py-1.5 text-sm disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Salvar Lead"}
              </button>
            </div>
          </div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {["Todos", ...CAZA_LEAD_STATUSES].map((s) => {
            const count = s === "Todos" ? leads.length : leads.filter((l) => l.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`card p-3 text-center transition-all ${filter === s ? "border-brand-300 bg-brand-50 shadow-sm" : "hover:border-gray-300"}`}
              >
                <div className={`text-xl font-bold tabular-nums ${filter === s ? "text-brand-700" : "text-gray-900"}`}>{count}</div>
                <div className={`text-[11px] font-medium mt-0.5 ${filter === s ? "text-brand-600" : "text-gray-400"}`}>{s}</div>
              </button>
            );
          })}
        </div>

        {/* Filter indicator */}
        {filter !== "Todos" && (
          <div className="flex items-center gap-2">
            <Filter size={12} className="text-gray-400" />
            <span className="text-xs text-gray-500">Filtrando por: <strong>{filter}</strong></span>
            <button onClick={() => setFilter("Todos")} className="text-xs text-brand-600 hover:underline">Limpar</button>
          </div>
        )}

        {/* Leads table */}
        <div className="card p-5">
          <SectionHeader icon={<Users size={15} className="text-blue-500" />} title={`Leads ${filter !== "Todos" ? `— ${filter}` : ""}`} />
          {source === "loading" ? (
            <div className="py-12 text-center text-sm text-gray-400">Carregando…</div>
          ) : filtered.length === 0 ? (
            <EmptyState compact title="Sem leads" description={filter !== "Todos" ? `Nenhum lead com status "${filter}".` : "Cadastre o primeiro lead usando o botão acima."} />
          ) : (
            <div className="table-scroll mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Lead</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Empresa</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Serviço</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Origem</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Owner</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Entrada</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="text-xs font-medium text-gray-800">{l.nome}</div>
                        {l.email && <div className="text-[10px] text-gray-400">{l.email}</div>}
                        {l.telefone && <div className="text-[10px] text-gray-400">{l.telefone}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-600">{l.empresa || "—"}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{l.tipo_servico || "—"}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{l.origem || "—"}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{l.owner || "—"}</td>
                      <td className="py-2.5 px-3 text-[11px] text-gray-400">{fmtDate(l.data_entrada)}</td>
                      <td className="py-2.5 px-3">
                        {!IS_STATIC ? (
                          <select
                            value={l.status}
                            onChange={(e) => handleStatusUpdate(l.id, e.target.value)}
                            className={`${statusCls(l.status)} cursor-pointer border-0 bg-transparent focus:outline-none text-[11px] font-semibold`}
                          >
                            {CAZA_LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={statusCls(l.status)}>{l.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
