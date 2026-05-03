"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Users, Plus, Search, RefreshCw, X,
  Target, TrendingUp, BarChart3,
} from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import type { CazaCrmLead } from "@/lib/caza-crm-db";
import {
  CAZA_LEAD_STATUSES, CAZA_LEAD_ORIGENS, CAZA_SERVICE_TYPES,
} from "@/lib/caza-crm-db";
import { fetchCazaCRM } from "@/lib/caza-crm-query";

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  "Novo":        { label: "Novo",        cls: "badge badge-blue"   },
  "Qualificando":{ label: "Qualificando",cls: "badge badge-yellow" },
  "Convertido":  { label: "Convertido",  cls: "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60" },
  "Perdido":     { label: "Perdido",     cls: "badge badge-red"    },
  "Nurturing":   { label: "Nurturing",   cls: "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200/60" },
};

const STATUS_TABS = [
  { key: "all", label: "Todos" },
  ...CAZA_LEAD_STATUSES.map(s => ({ key: s, label: STATUS_CFG[s]?.label ?? s })),
];

const EMPTY_LEAD = {
  nome: "", cargo: "", empresa: "", cnpj: "", contato_principal: "",
  telefone: "", email: "", origem: "Outro" as typeof CAZA_LEAD_ORIGENS[number],
  tipo_servico: "" as typeof CAZA_SERVICE_TYPES[number] | "",
  interesse: "", status: "Novo" as typeof CAZA_LEAD_STATUSES[number],
  owner: "", data_entrada: new Date().toISOString().slice(0, 10), observacoes: "",
};

export default function CazaLeadsPage() {
  const [leads, setLeads]       = useState<CazaCrmLead[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState({ ...EMPTY_LEAD });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await fetchCazaCRM<CazaCrmLead>("leads");
    setLeads(data);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (statusTab !== "all" && l.status !== statusTab) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.nome.toLowerCase().includes(q) &&
          !l.empresa.toLowerCase().includes(q) &&
          !l.email.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [leads, statusTab, search]);

  const kpiTotal     = leads.length;
  const kpiNovos     = leads.filter(l => l.status === "Novo").length;
  const kpiQualif    = leads.filter(l => l.status === "Qualificando").length;
  const kpiConvert   = leads.filter(l => l.status === "Convertido").length;

  async function handleSave() {
    if (!form.nome.trim()) { setError("Nome é obrigatório"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/caza/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        throw new Error(j.error ?? "Erro ao salvar");
      }
      const created = await res.json() as CazaCrmLead;
      setLeads(prev => [created, ...prev]);
      setShowModal(false);
      setForm({ ...EMPTY_LEAD });
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function field(key: keyof typeof EMPTY_LEAD, label: string, type = "text", opts?: string[]) {
    if (opts) {
      return (
        <div key={key}>
          <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
          <select
            value={String(form[key])}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          >
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div key={key}>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <input
          type={type}
          value={String(form[key])}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
        />
      </div>
    );
  }

  return (
    <>
      <Header title="Leads — CRM Caza Vision" subtitle="Prospecção e qualificação de clientes" />
      <div className="page-container">

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Novo Lead
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Users size={16} className="text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiTotal}</div>
              <div className="text-[10px] text-gray-500">Total</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Target size={16} className="text-violet-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiNovos}</div>
              <div className="text-[10px] text-gray-500">Novos</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <BarChart3 size={16} className="text-amber-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiQualif}</div>
              <div className="text-[10px] text-gray-500">Qualificando</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpiConvert}</div>
              <div className="text-[10px] text-gray-500">Convertidos</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex flex-wrap gap-1 flex-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusTab === tab.key ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-48 pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <SectionHeader
              icon={<Users size={15} />}
              title="Leads"
              badge={<span className="badge badge-gray ml-1 text-[10px]">{filtered.length}</span>}
            />
          </div>

          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-sm font-medium">Carregando…</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              compact
              icon={<Search size={16} className="text-gray-400" />}
              title="Nenhum lead encontrado"
              description="Ajuste os filtros ou adicione um novo lead."
              action={
                <button onClick={() => setShowModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
                  <Plus size={13} /> Novo Lead
                </button>
              }
            />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Nome / Empresa</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Contato</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Origem</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Serviço</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Entrada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(l => {
                    const cfg = STATUS_CFG[l.status];
                    return (
                      <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900 text-[12px]">{l.nome}</div>
                          <div className="text-[11px] text-gray-500 truncate max-w-[160px]">{l.empresa}</div>
                          {l.cargo && <div className="text-[10px] text-gray-400">{l.cargo}</div>}
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-[11px] text-gray-700">{l.contato_principal || l.email || "—"}</div>
                          {l.telefone && <div className="text-[10px] text-gray-400">{l.telefone}</div>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] text-gray-600">{l.origem || "—"}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] text-gray-600 truncate max-w-[120px] block">{l.tipo_servico || "—"}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`${cfg?.cls ?? "badge badge-gray"} text-[10px]`}>
                            {cfg?.label ?? l.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {l.owner && (
                              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[9px] font-bold text-emerald-700 shrink-0">
                                {l.owner.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-[11px] text-gray-600 truncate max-w-[80px]">{l.owner || "—"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-gray-400">
                          {formatDateBR(l.data_entrada)}
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

      {/* Add Lead Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Novo Lead</h2>
              <button onClick={() => { setShowModal(false); setError(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("nome", "Nome *")}
              {field("cargo", "Cargo")}
              {field("empresa", "Empresa")}
              {field("cnpj", "CNPJ")}
              {field("contato_principal", "Contato principal")}
              {field("telefone", "Telefone", "tel")}
              {field("email", "E-mail", "email")}
              {field("origem", "Origem", "text", [...CAZA_LEAD_ORIGENS])}
              {field("tipo_servico", "Tipo de serviço", "text", ["", ...CAZA_SERVICE_TYPES])}
              {field("status", "Status", "text", [...CAZA_LEAD_STATUSES])}
              {field("owner", "Responsável")}
              {field("data_entrada", "Data de entrada", "date")}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Interesse / Briefing</label>
                <textarea
                  rows={2}
                  value={form.interesse}
                  onChange={e => setForm(f => ({ ...f, interesse: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"
                />
              </div>
            </div>
            {error && (
              <div className="mx-6 mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
            )}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => { setShowModal(false); setError(null); }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={() => void handleSave()} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Salvando…" : "Salvar Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
