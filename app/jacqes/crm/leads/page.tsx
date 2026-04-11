"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Users, Star, Clock, Leaf, Plus, X, Filter, PlusCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CrmLead = {
  id: string;
  nome: string;
  empresa: string;
  contato_principal: string;
  telefone: string;
  email: string;
  origem: string;
  segmento: string;
  canal: string;
  interesse: string;
  status: string;
  owner: string;
  data_entrada: string;
  observacoes: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ["Todos", "Novo", "Qualificando", "Convertido", "Perdido", "Nurturing"] as const;

const ORIGENS = ["Indicação", "Instagram", "LinkedIn", "WhatsApp", "Site", "Evento", "Outro"] as const;
const STATUS_OPTIONS = ["Novo", "Qualificando", "Nurturing"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statusBadge(status: string) {
  switch (status) {
    case "Novo":
      return "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200";
    case "Qualificando":
      return "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200";
    case "Convertido":
      return "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "Perdido":
      return "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200";
    case "Nurturing":
      return "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200";
    default:
      return "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200";
  }
}

// ─── Default form state ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  nome: "",
  empresa: "",
  telefone: "",
  email: "",
  origem: "Indicação",
  segmento: "",
  canal: "",
  interesse: "",
  status: "Novo",
  owner: "",
  observacoes: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leads, setLeads]         = useState<CrmLead[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [filter, setFilter]       = useState<string>("Todos");
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");

  // ── Fetch ────────────────────────────────────────────────────────────────────
  async function fetchLeads() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jacqes/crm/leads");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLeads(data.leads ?? data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar leads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLeads(); }, []);

  // ── Derived KPIs ──────────────────────────────────────────────────────────────
  const total       = leads.length;
  const qualif      = leads.filter(l => l.status === "Qualificando").length;
  const sevenDays   = leads.filter(l => {
    if (!l.data_entrada) return false;
    const diff = (Date.now() - new Date(l.data_entrada + "T00:00:00").getTime()) / 86400000;
    return diff <= 7;
  }).length;
  const nurturing   = leads.filter(l => l.status === "Nurturing").length;

  const filtered = filter === "Todos" ? leads : leads.filter(l => l.status === filter);

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  function openModal() {
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setModal(true);
  }

  function closeModal() {
    setModal(false);
    setFormError("");
  }

  function field(key: keyof typeof EMPTY_FORM, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.nome.trim())  { setFormError("Nome é obrigatório."); return; }
    if (!form.owner.trim()) { setFormError("Owner é obrigatório."); return; }
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/jacqes/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      closeModal();
      await fetchLeads();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Erro ao salvar lead.");
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <Header
        title="Leads — JACQES CRM"
        subtitle="Prospecção ativa"
      />

      <div className="page-container">

        {/* ── KPI Strip ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Leads",    value: total,     icon: Users,  color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "Qualificando",   value: qualif,    icon: Star,   color: "text-blue-600",    bg: "bg-blue-50"    },
            { label: "Novos (7 dias)", value: sevenDays, icon: Clock,  color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Nurturing",      value: nurturing, icon: Leaf,   color: "text-purple-600",  bg: "bg-purple-50"  },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs font-medium text-gray-400 mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main card ────────────────────────────────────────────────────────── */}
        <div className="card p-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
            <SectionHeader
              icon={<Filter size={14} />}
              title="Leads"
              badge={
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                  {filtered.length}
                </span>
              }
              className="mb-0"
            />
            <button
              onClick={openModal}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <Plus size={13} /> Novo Lead
            </button>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 mb-5">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  filter === s
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Carregando leads…</div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-500">{error}</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users size={20} className="text-gray-400" />}
              title="Nenhum lead encontrado"
              description={filter === "Todos" ? "Adicione o primeiro lead." : `Nenhum lead com status "${filter}".`}
            />
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Nome / Empresa", "Status", "Origem · Canal", "Segmento", "Interesse", "Owner", "Entrada", ""].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 last:pr-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(lead => (
                    <tr key={lead.id} className="card-hover group">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-gray-900 text-[13px]">{lead.nome}</div>
                        {lead.empresa && (
                          <div className="text-[11px] text-gray-400 mt-0.5">{lead.empresa}</div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={statusBadge(lead.status)}>{lead.status}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-[13px] text-gray-700">{lead.origem}</div>
                        {lead.canal && (
                          <div className="text-[11px] text-gray-400 mt-0.5">{lead.canal}</div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[13px] text-gray-700">{lead.segmento || "—"}</span>
                      </td>
                      <td className="py-3 pr-4 max-w-[180px]">
                        <span className="text-[13px] text-gray-700 truncate block" title={lead.interesse}>
                          {lead.interesse || "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[13px] text-gray-700">{lead.owner}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[13px] text-gray-600">{fmtDate(lead.data_entrada)}</span>
                      </td>
                      <td className="py-3">
                        <button
                          title="Adicionar tarefa"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <PlusCircle size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── Modal: Novo Lead ────────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5 sticky top-0 bg-white pb-1">
              <h3 className="text-sm font-bold text-gray-900">Novo Lead</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Nome *</label>
                <input
                  type="text"
                  placeholder="Nome do contato"
                  value={form.nome}
                  onChange={e => field("nome", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Empresa */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Empresa</label>
                <input
                  type="text"
                  placeholder="Nome da empresa"
                  value={form.empresa}
                  onChange={e => field("empresa", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Telefone + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Telefone</label>
                  <input
                    type="text"
                    placeholder="+55 11 9..."
                    value={form.telefone}
                    onChange={e => field("telefone", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="email@empresa.com"
                    value={form.email}
                    onChange={e => field("email", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Origem */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Origem</label>
                <select
                  value={form.origem}
                  onChange={e => field("origem", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Segmento + Canal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Segmento</label>
                  <input
                    type="text"
                    placeholder="Ex: Marketing Digital"
                    value={form.segmento}
                    onChange={e => field("segmento", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Canal</label>
                  <input
                    type="text"
                    placeholder="Ex: WhatsApp"
                    value={form.canal}
                    onChange={e => field("canal", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Interesse */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Interesse</label>
                <input
                  type="text"
                  placeholder="Produto ou serviço de interesse"
                  value={form.interesse}
                  onChange={e => field("interesse", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => field("status", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Owner */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Owner *</label>
                <input
                  type="text"
                  placeholder="Responsável"
                  value={form.owner}
                  onChange={e => field("owner", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Observações</label>
                <textarea
                  rows={3}
                  placeholder="Notas adicionais"
                  value={form.observacoes}
                  onChange={e => field("observacoes", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              {/* Error */}
              {formError && (
                <p className="text-xs text-red-600 font-medium">{formError}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-60"
                >
                  {saving ? "Salvando…" : "Salvar Lead"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
