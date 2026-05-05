"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { lsGet, lsSet, lsLocalId } from "@/lib/caza-crm-local";
import {
  Tag, TrendingUp, Users, Building2, Database, CloudOff, HardDrive,
  AlertCircle, BarChart3, DollarSign, Plus, X, Pencil, Trash2,
} from "lucide-react";

interface ClienteRow {
  id: string; name: string; email: string; phone: string; type: string;
  budget_anual: number; status: string; segmento: string; since: string;
}

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";
const LS_KEY    = "clientes";

const CLIENT_TYPES    = ["Marca", "Agência", "Empresa", "Startup", "Freelancer", "Outro"];
const CLIENT_STATUSES = ["Ativo", "Em Proposta", "Inativo", "Perdido"];

const typeIcon: Record<string, React.ElementType> = { Marca: Tag, Agência: Building2, Empresa: Building2, Startup: TrendingUp };
const typeColor: Record<string, string> = { Marca: "text-brand-600", Agência: "text-emerald-600", Empresa: "text-amber-700", Startup: "text-violet-700" };
const statusCfg: Record<string, string> = {
  "Ativo":       "badge badge-green",
  "Em Proposta": "badge badge-yellow",
  "Inativo":     "bg-gray-100 text-gray-500 border border-gray-200 text-[10px] font-semibold px-2 py-0.5 rounded-full",
  "Perdido":     "bg-red-50 text-red-600 border border-red-200 text-[10px] font-semibold px-2 py-0.5 rounded-full",
};

const EMPTY_FORM = { name: "", email: "", phone: "", type: "Marca", budget_anual: "", status: "Ativo", segmento: "", since: "" };
type ClientForm = typeof EMPTY_FORM;

function ClientFormFields({ values, onChange }: { values: ClientForm; onChange: (k: string, v: string) => void }) {
  const cls = "mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white";
  const lbl = "text-[11px] font-semibold text-gray-500 uppercase tracking-wide";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
      {([
        { key: "name",         label: "Nome *",           type: "text"   },
        { key: "email",        label: "E-mail",           type: "email"  },
        { key: "phone",        label: "Telefone",         type: "text"   },
        { key: "segmento",     label: "Segmento",         type: "text"   },
        { key: "budget_anual", label: "Budget Anual (R$)",type: "number" },
        { key: "since",        label: "Cliente desde",    type: "date"   },
      ] as const).map(({ key, label, type }) => (
        <div key={key}>
          <label className={lbl}>{label}</label>
          <input type={type} value={values[key as keyof ClientForm]}
            onChange={(e) => onChange(key, e.target.value)} className={cls} />
        </div>
      ))}
      <div>
        <label className={lbl}>Tipo</label>
        <select value={values.type} onChange={(e) => onChange("type", e.target.value)} className={cls}>
          {CLIENT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Status</label>
        <select value={values.status} onChange={(e) => onChange("status", e.target.value)} className={cls}>
          {CLIENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const [clients,    setClients]    = useState<ClienteRow[]>([]);
  const [source,     setSource]     = useState<"internal" | "static" | "local" | "empty" | "loading">("loading");
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editForm,   setEditForm]   = useState({ ...EMPTY_FORM });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!IS_STATIC) {
        try {
          const res = await fetch("/api/caza/clients");
          if (res.ok) {
            const data = await res.json() as ClienteRow[];
            if (Array.isArray(data) && data.length > 0) { setClients(data); setSource("internal"); return; }
          }
        } catch { /* fall through */ }
      }
      try {
        const res = await fetch(`${BASE_PATH}/data/caza-clients.json`);
        if (res.ok) {
          const staticData = await res.json() as ClienteRow[];
          if (IS_STATIC) {
            const local = lsGet<ClienteRow>(LS_KEY);
            if (local !== null) {
              setClients(local); setSource(local.length > 0 ? "local" : "empty");
            } else {
              lsSet(LS_KEY, Array.isArray(staticData) ? staticData : []);
              setClients(Array.isArray(staticData) ? staticData : []);
              setSource(Array.isArray(staticData) && staticData.length > 0 ? "static" : "empty");
            }
          } else {
            setClients(Array.isArray(staticData) ? staticData : []);
            setSource(Array.isArray(staticData) && staticData.length > 0 ? "static" : "empty");
          }
          return;
        }
      } catch { /* ignore */ }
      setClients([]); setSource("empty");
    }
    load();
  }, []);

  const total        = clients.length;
  const ativos       = clients.filter((c) => c.status === "Ativo" || c.status === "Em Proposta").length;
  const totalWallet  = clients.reduce((s, c) => s + c.budget_anual, 0);
  const avgBudget    = total > 0 ? Math.round(totalWallet / total) : 0;
  const ativosWallet = clients.filter((c) => c.status === "Ativo").reduce((s, c) => s + c.budget_anual, 0);

  async function handleCreate() {
    if (!form.name.trim()) { setError("Nome é obrigatório."); return; }
    if (IS_STATIC) {
      const newClient: ClienteRow = {
        id: lsLocalId("CL"),
        name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        type: form.type, budget_anual: Number(form.budget_anual) || 0,
        status: form.status, segmento: form.segmento.trim(),
        since: form.since || new Date().toISOString().slice(0, 10),
      };
      const updated = [newClient, ...clients];
      lsSet(LS_KEY, updated); setClients(updated); setSource("local");
      setShowForm(false); setForm({ ...EMPTY_FORM });
      return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/caza/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
          type: form.type, budget_anual: Number(form.budget_anual) || 0,
          status: form.status, segmento: form.segmento.trim(),
          since: form.since || new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) { const e = await res.json() as {error?:string}; setError(e.error ?? "Erro."); }
      else {
        const client = await res.json() as ClienteRow;
        setClients((prev) => [client, ...prev]); setSource("internal");
        setShowForm(false); setForm({ ...EMPTY_FORM });
      }
    } catch { setError("Erro de rede."); }
    finally { setSaving(false); }
  }

  function startEdit(c: ClienteRow) {
    setEditingId(c.id);
    setEditForm({ name: c.name, email: c.email, phone: c.phone, type: c.type,
      budget_anual: String(c.budget_anual), status: c.status, segmento: c.segmento, since: c.since });
    setShowForm(false); setError(null);
  }

  async function handleUpdate() {
    if (!editingId) return;
    if (IS_STATIC) {
      const updated = clients.map((c) => c.id === editingId ? {
        ...c, name: editForm.name.trim(), email: editForm.email.trim(),
        phone: editForm.phone.trim(), type: editForm.type,
        budget_anual: Number(editForm.budget_anual) || 0,
        status: editForm.status, segmento: editForm.segmento.trim(), since: editForm.since,
      } : c);
      lsSet(LS_KEY, updated); setClients(updated); setEditingId(null);
      return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/caza/clients/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(), email: editForm.email.trim(),
          phone: editForm.phone.trim(), type: editForm.type,
          budget_anual: Number(editForm.budget_anual) || 0,
          status: editForm.status, segmento: editForm.segmento.trim(), since: editForm.since,
        }),
      });
      if (!res.ok) { const e = await res.json() as {error?:string}; setError(e.error ?? "Erro."); }
      else {
        const updated = await res.json() as ClienteRow;
        setClients((prev) => prev.map((c) => c.id === editingId ? updated : c));
        setEditingId(null);
      }
    } catch { setError("Erro de rede."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (IS_STATIC) {
      const updated = clients.filter((c) => c.id !== id);
      lsSet(LS_KEY, updated); setClients(updated); setDeletingId(null);
      if (editingId === id) setEditingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/caza/clients/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Erro ao remover");
      setClients((prev) => prev.filter((c) => c.id !== id));
      setDeletingId(null); if (editingId === id) setEditingId(null);
    } catch {
      alert("Falha ao remover cliente. Tente novamente.");
      setDeletingId(null);
    }
  }

  return (
    <>
      <Header title="Clientes" subtitle="Marcas, agências e empresas — Caza Vision" />
      <div className="page-container">

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {source === "loading"  && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500"><Database size={11} />Carregando…</span>}
            {source === "internal" && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600"><Database size={11} />Base interna AWQ</span>}
            {source === "static"   && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600"><Database size={11} />Snapshot estático</span>}
            {source === "local"    && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-xs text-violet-600"><HardDrive size={11} />Armazenamento local</span>}
            {source === "empty"    && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700"><CloudOff size={11} />Sem clientes</span>}
          </div>
          <button onClick={() => { setShowForm((v) => !v); setEditingId(null); setError(null); }}
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs">
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancelar" : "Novo Cliente"}
          </button>
        </div>

        {showForm && (
          <div className="card p-5 border border-brand-200 bg-brand-50/30">
            <p className="text-sm font-semibold text-gray-900">Cadastrar Novo Cliente</p>
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">{error}</div>}
            <ClientFormFields values={form} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowForm(false); setError(null); setForm({ ...EMPTY_FORM }); }}
                className="px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreate} disabled={saving}
                className="btn-primary px-5 py-1.5 text-sm disabled:opacity-60">
                {saving ? "Salvando…" : "Salvar Cliente"}
              </button>
            </div>
          </div>
        )}

        {editingId && (
          <div className="card p-5 border border-emerald-200 bg-emerald-50/20">
            <p className="text-sm font-semibold text-gray-900">Editar Cliente</p>
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">{error}</div>}
            <ClientFormFields values={editForm} onChange={(k, v) => setEditForm((f) => ({ ...f, [k]: v }))} />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total de Clientes",      value: String(total),      color: "text-gray-900",    icon: Users      },
            { label: "Ativos / Em Proposta",   value: String(ativos),     color: "text-emerald-600", icon: BarChart3  },
            { label: "Wallet Total (Ativos)",  value: fmtR(ativosWallet), color: "text-brand-600",   icon: DollarSign },
            { label: "Budget Médio / Cliente", value: fmtR(avgBudget),    color: "text-amber-700",   icon: TrendingUp },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Icon size={15} className={s.color} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {clients.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Concentração de Budget por Cliente</h2>
            <div className="space-y-2">
              {[...clients].filter((c) => c.budget_anual > 0).sort((a, b) => b.budget_anual - a.budget_anual).map((c) => {
                const share = totalWallet > 0 ? (c.budget_anual / totalWallet) * 100 : 0;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-32 shrink-0 truncate">{c.name}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${share}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-900 w-16 text-right shrink-0">{fmtR(c.budget_anual)}</span>
                    <span className="text-[10px] text-gray-400 w-10 text-right shrink-0">{share.toFixed(0)}%</span>
                    <span className={`${statusCfg[c.status] ?? "badge"} shrink-0`}>{c.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Todos os Clientes</h2>
          {source === "loading" ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2"><AlertCircle size={16} />Carregando…</div>
          ) : clients.length === 0 ? (
            <EmptyState compact title="Nenhum cliente" description="Crie o primeiro cliente usando o botão acima." />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Cliente</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Perfil</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">%</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Segmento</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Desde</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                    <th className="py-2 px-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => {
                    const TypeIcon  = typeIcon[c.type] ?? Users;
                    const isEditing  = editingId === c.id;
                    const isDeleting = deletingId === c.id;
                    return (
                      <tr key={c.id}
                        className={`border-b border-gray-100 transition-colors ${isEditing ? "bg-emerald-50/40" : "hover:bg-gray-50/80"}`}>
                        <td className="py-2.5 px-3">
                          <div className="text-gray-700 font-medium text-xs">{c.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{c.email}</div>
                          <div className="text-[10px] text-gray-400">{c.phone}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className={`flex items-center gap-1.5 text-xs ${typeColor[c.type] ?? "text-gray-400"}`}>
                            <TypeIcon size={12} />{c.type || "—"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-900 font-semibold text-xs">
                          {c.budget_anual > 0 ? fmtR(c.budget_anual) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs">
                          {c.budget_anual > 0 && totalWallet > 0
                            ? <span className="text-brand-600 font-semibold">{((c.budget_anual / totalWallet) * 100).toFixed(0)}%</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500">{c.segmento || "—"}</td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-400">{c.since || "—"}</td>
                        <td className="py-2.5 px-3"><span className={statusCfg[c.status] ?? "badge"}>{c.status || "—"}</span></td>
                        <td className="py-2.5 px-3 text-right">
                          {isDeleting ? (
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-[10px] text-red-600 font-medium">Excluir?</span>
                              <button onClick={() => handleDelete(c.id)}
                                className="text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded">Sim</button>
                              <button onClick={() => setDeletingId(null)}
                                className="text-[10px] font-semibold text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">Não</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => startEdit(c)}
                                className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors" title="Editar">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setDeletingId(c.id)}
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
