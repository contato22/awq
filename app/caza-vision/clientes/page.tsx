"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { lsGet, lsSet, lsLocalId } from "@/lib/caza-crm-local";
import {
  Tag, TrendingUp, Users, Building2, Database, CloudOff, HardDrive,
  AlertCircle, BarChart3, DollarSign, Plus, X, Pencil, Trash2,
  Heart, RefreshCw, AlertTriangle,
} from "lucide-react";

interface ClienteRow {
  id: string; name: string; email: string; phone: string; type: string;
  budget_anual: number; status: string; segmento: string; since: string;
  tipo_contrato: string; saude: string; mrr: number;
  churn_risk: string; upsell_potencial: string; ultimo_contato: string;
}

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";
const LS_KEY    = "clientes";

const CLIENT_TYPES    = ["Marca", "Agência", "Empresa", "Startup", "Freelancer", "Outro"];
const CLIENT_STATUSES = ["Ativo", "Em Proposta", "Inativo", "Perdido"];
const CONTRATO_TYPES  = ["Recorrente", "Projeto", "Avulso"];
const SAUDE_LEVELS    = ["Saudável", "Atenção", "Risco"];
const RISK_LEVELS     = ["Baixo", "Médio", "Alto"];

const typeIcon: Record<string, React.ElementType> = { Marca: Tag, Agência: Building2, Empresa: Building2, Startup: TrendingUp };
const typeColor: Record<string, string> = { Marca: "text-brand-600", Agência: "text-emerald-600", Empresa: "text-amber-700", Startup: "text-violet-700" };

function saudeCls(s: string) {
  if (s === "Saudável") return "text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "Atenção")  return "text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200";
  if (s === "Risco")    return "text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-red-50 text-red-600 border-red-200";
  return "text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-gray-50 text-gray-500 border-gray-200";
}

function churnCls(s: string) {
  if (s === "Alto")  return "text-[10px] font-bold px-1.5 py-0.5 rounded border bg-red-50 text-red-600 border-red-200";
  if (s === "Médio") return "text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200";
  return "text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-gray-50 text-gray-400 border-gray-200";
}

const statusCfg: Record<string, string> = {
  "Ativo":       "badge badge-green",
  "Em Proposta": "badge badge-yellow",
  "Inativo":     "bg-gray-100 text-gray-500 border border-gray-200 text-[10px] font-semibold px-2 py-0.5 rounded-full",
  "Perdido":     "bg-red-50 text-red-600 border border-red-200 text-[10px] font-semibold px-2 py-0.5 rounded-full",
};

const EMPTY_FORM = {
  name: "", email: "", phone: "", type: "Marca", budget_anual: "", status: "Ativo",
  segmento: "", since: "", tipo_contrato: "Projeto", saude: "Saudável",
  mrr: "", churn_risk: "Baixo", upsell_potencial: "Médio", ultimo_contato: "",
};
type ClientForm = typeof EMPTY_FORM;

function ClientFormFields({ values, onChange }: { values: ClientForm; onChange: (k: string, v: string) => void }) {
  const cls = "mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white";
  const lbl = "text-[11px] font-semibold text-gray-500 uppercase tracking-wide";
  const sec = "text-[10px] font-bold text-gray-400 uppercase tracking-widest col-span-full pt-3 border-t border-gray-100 mt-1";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
      {([
        { key: "name",         label: "Nome *",            type: "text"   },
        { key: "email",        label: "E-mail",            type: "email"  },
        { key: "phone",        label: "Telefone",          type: "text"   },
        { key: "segmento",     label: "Segmento",          type: "text"   },
        { key: "budget_anual", label: "Budget Anual (R$)", type: "number" },
        { key: "since",        label: "Cliente desde",     type: "date"   },
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
      <div>
        <label className={lbl}>Tipo de Contrato</label>
        <select value={values.tipo_contrato} onChange={(e) => onChange("tipo_contrato", e.target.value)} className={cls}>
          {CONTRATO_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className={sec}>Saúde da Conta</div>
      <div>
        <label className={lbl}>Saúde</label>
        <select value={values.saude} onChange={(e) => onChange("saude", e.target.value)} className={cls}>
          {SAUDE_LEVELS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Risco de Churn</label>
        <select value={values.churn_risk} onChange={(e) => onChange("churn_risk", e.target.value)} className={cls}>
          {RISK_LEVELS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Potencial de Upsell</label>
        <select value={values.upsell_potencial} onChange={(e) => onChange("upsell_potencial", e.target.value)} className={cls}>
          {RISK_LEVELS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>MRR (R$)</label>
        <input type="number" value={values.mrr}
          onChange={(e) => onChange("mrr", e.target.value)} className={cls} />
      </div>
      <div>
        <label className={lbl}>Último Contato</label>
        <input type="date" value={values.ultimo_contato}
          onChange={(e) => onChange("ultimo_contato", e.target.value)} className={cls} />
      </div>
    </div>
  );
}

function coerceClient(raw: Record<string, unknown>): ClienteRow {
  return {
    id: String(raw.id ?? ""), name: String(raw.name ?? ""),
    email: String(raw.email ?? ""), phone: String(raw.phone ?? ""),
    type: String(raw.type ?? "Empresa"), budget_anual: Number(raw.budget_anual ?? 0),
    status: String(raw.status ?? "Ativo"), segmento: String(raw.segmento ?? ""),
    since: String(raw.since ?? ""),
    tipo_contrato: String(raw.tipo_contrato ?? "Projeto"),
    saude: String(raw.saude ?? "Atenção"),
    mrr: Number(raw.mrr ?? 0),
    churn_risk: String(raw.churn_risk ?? "Médio"),
    upsell_potencial: String(raw.upsell_potencial ?? "Médio"),
    ultimo_contato: String(raw.ultimo_contato ?? ""),
  };
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
            const data = await res.json() as Record<string, unknown>[];
            if (Array.isArray(data) && data.length > 0) {
              setClients(data.map(coerceClient)); setSource("internal"); return;
            }
          }
        } catch { /* fall through */ }
      }
      try {
        const res = await fetch(`${BASE_PATH}/data/caza-clients.json`);
        if (res.ok) {
          const raw = await res.json() as Record<string, unknown>[];
          const staticData = Array.isArray(raw) ? raw.map(coerceClient) : [];
          if (IS_STATIC) {
            const local = lsGet<ClienteRow>(LS_KEY);
            if (local !== null) {
              setClients(local); setSource(local.length > 0 ? "local" : "empty");
            } else {
              lsSet(LS_KEY, staticData);
              setClients(staticData);
              setSource(staticData.length > 0 ? "static" : "empty");
            }
          } else {
            setClients(staticData);
            setSource(staticData.length > 0 ? "static" : "empty");
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
  const mrrTotal     = clients.reduce((s, c) => s + (c.mrr ?? 0), 0);
  const recorrentes  = clients.filter((c) => c.tipo_contrato === "Recorrente").length;
  const emRisco      = clients.filter((c) => c.churn_risk === "Alto").length;

  async function handleCreate() {
    if (!form.name.trim()) { setError("Nome é obrigatório."); return; }
    const newClient: ClienteRow = {
      id: lsLocalId("CL"),
      name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
      type: form.type, budget_anual: Number(form.budget_anual) || 0,
      status: form.status, segmento: form.segmento.trim(),
      since: form.since || new Date().toISOString().slice(0, 10),
      tipo_contrato: form.tipo_contrato, saude: form.saude,
      mrr: Number(form.mrr) || 0, churn_risk: form.churn_risk,
      upsell_potencial: form.upsell_potencial, ultimo_contato: form.ultimo_contato,
    };
    if (IS_STATIC) {
      const updated = [newClient, ...clients];
      lsSet(LS_KEY, updated); setClients(updated); setSource("local");
      setShowForm(false); setForm({ ...EMPTY_FORM }); return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/caza/clients", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      });
      if (!res.ok) { const e = await res.json() as {error?:string}; setError(e.error ?? "Erro."); }
      else {
        const client = coerceClient(await res.json() as Record<string, unknown>);
        setClients((prev) => [client, ...prev]); setSource("internal");
        setShowForm(false); setForm({ ...EMPTY_FORM });
      }
    } catch { setError("Erro de rede."); }
    finally { setSaving(false); }
  }

  function startEdit(c: ClienteRow) {
    setEditingId(c.id);
    setEditForm({
      name: c.name, email: c.email, phone: c.phone, type: c.type,
      budget_anual: String(c.budget_anual), status: c.status,
      segmento: c.segmento, since: c.since,
      tipo_contrato: c.tipo_contrato ?? "Projeto",
      saude: c.saude ?? "Atenção", mrr: String(c.mrr ?? 0),
      churn_risk: c.churn_risk ?? "Médio",
      upsell_potencial: c.upsell_potencial ?? "Médio",
      ultimo_contato: c.ultimo_contato ?? "",
    });
    setShowForm(false); setError(null);
  }

  async function handleUpdate() {
    if (!editingId) return;
    const patch: ClienteRow = {
      id: editingId,
      name: editForm.name.trim(), email: editForm.email.trim(),
      phone: editForm.phone.trim(), type: editForm.type,
      budget_anual: Number(editForm.budget_anual) || 0,
      status: editForm.status, segmento: editForm.segmento.trim(), since: editForm.since,
      tipo_contrato: editForm.tipo_contrato, saude: editForm.saude,
      mrr: Number(editForm.mrr) || 0, churn_risk: editForm.churn_risk,
      upsell_potencial: editForm.upsell_potencial, ultimo_contato: editForm.ultimo_contato,
    };
    if (IS_STATIC) {
      const updated = clients.map((c) => c.id === editingId ? patch : c);
      lsSet(LS_KEY, updated); setClients(updated); setEditingId(null); return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/caza/clients/${editingId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) { const e = await res.json() as {error?:string}; setError(e.error ?? "Erro."); }
      else {
        const updated = coerceClient(await res.json() as Record<string, unknown>);
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
      if (editingId === id) setEditingId(null); return;
    }
    try {
      await fetch(`/api/caza/clients/${id}`, { method: "DELETE" });
      setClients((prev) => prev.filter((c) => c.id !== id));
      setDeletingId(null); if (editingId === id) setEditingId(null);
    } catch { /* ignore */ }
  }

  return (
    <>
      <Header title="Carteira de Clientes" subtitle="Saúde, recorrência e churn · Caza Vision" />
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

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total de Clientes",    value: String(total),       color: "text-gray-900",    icon: Users       },
            { label: "Base Recorrente",       value: String(recorrentes), color: "text-emerald-600", icon: RefreshCw   },
            { label: "MRR Total",             value: fmtR(mrrTotal),      color: "text-brand-600",   icon: DollarSign  },
            { label: "Churn Risk Alto",       value: String(emRisco),     color: emRisco > 0 ? "text-red-600" : "text-gray-400", icon: AlertTriangle },
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

        {/* Budget concentration */}
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
                      <div className={`h-full rounded-full ${c.saude === "Saudável" ? "bg-emerald-500" : c.saude === "Atenção" ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${share}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-900 w-16 text-right shrink-0">{fmtR(c.budget_anual)}</span>
                    <span className="text-[10px] text-gray-400 w-10 text-right shrink-0">{share.toFixed(0)}%</span>
                    <span className={`${saudeCls(c.saude)} shrink-0`}>{c.saude}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Client table */}
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
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Contrato</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Saúde</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Churn</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Upsell</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">MRR</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Último Contato</th>
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
                          <div className="flex items-center gap-1.5">
                            <TypeIcon size={12} className={typeColor[c.type] ?? "text-gray-400"} />
                            <span className="text-gray-700 font-medium text-xs">{c.name}</span>
                          </div>
                          {c.segmento && <div className="text-[10px] text-gray-400 mt-0.5 ml-4">{c.segmento}</div>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            c.tipo_contrato === "Recorrente" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            c.tipo_contrato === "Projeto" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-gray-50 text-gray-500 border-gray-200"}`}>
                            {c.tipo_contrato || "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <Heart size={10} className={c.saude === "Saudável" ? "text-emerald-500" : c.saude === "Atenção" ? "text-amber-500" : "text-red-500"} />
                            <span className={saudeCls(c.saude)}>{c.saude || "—"}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={churnCls(c.churn_risk)}>{c.churn_risk || "—"}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            c.upsell_potencial === "Alto" ? "bg-violet-50 text-violet-700 border-violet-200" :
                            c.upsell_potencial === "Médio" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-gray-50 text-gray-400 border-gray-200"}`}>
                            {c.upsell_potencial || "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-900 font-semibold text-xs">
                          {c.budget_anual > 0 ? fmtR(c.budget_anual) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs">
                          {(c.mrr ?? 0) > 0
                            ? <span className="text-emerald-600 font-semibold">{fmtR(c.mrr)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-400">{fmtDate(c.ultimo_contato)}</td>
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
