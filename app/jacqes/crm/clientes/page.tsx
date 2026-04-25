"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Users, DollarSign, Heart, TrendingUp, Plus, X, ChevronDown, Pencil, Trash2, Search,
} from "lucide-react";
import type { CrmClient } from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";
import { IS_STATIC, crmCreate, crmUpdate, crmDelete } from "@/lib/jacqes-crm-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + Math.round(n / 1_000) + "K";
  return "R$" + n;
}

type StatusFilter = "Todos" | "Ativo" | "Em Atenção" | "Em Risco";

const STATUS_COLORS: Record<string, string> = {
  Ativo:        "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Em Atenção": "bg-amber-100 text-amber-700 border-amber-200",
  "Em Risco":   "bg-red-100 text-red-700 border-red-200",
  Churned:      "bg-gray-100 text-gray-500 border-gray-200",
  Inativo:      "bg-gray-100 text-gray-500 border-gray-200",
};

const CHURN_COLORS: Record<string, string> = {
  Baixo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Médio: "bg-amber-100 text-amber-700 border-amber-200",
  Alto:  "bg-red-100 text-red-700 border-red-200",
};

function healthDot(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-400";
  return "bg-red-500";
}

function healthText(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

type FormState = {
  nome: string; razao_social: string; segmento: string; produto_ativo: string;
  ticket_mensal: string; owner: string; status_conta: string; health_score: string;
  churn_risk: string; potencial_expansao: string; observacoes: string;
};

const EMPTY_FORM: FormState = {
  nome: "", razao_social: "", segmento: "", produto_ativo: "",
  ticket_mensal: "", owner: "", status_conta: "Ativo", health_score: "80",
  churn_risk: "Baixo", potencial_expansao: "0", observacoes: "",
};

const STATUS_TABS: StatusFilter[] = ["Todos", "Ativo", "Em Atenção", "Em Risco"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [clientes, setClientes] = useState<CrmClient[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<StatusFilter>("Todos");
  const [modal, setModal]       = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [erro, setErro]         = useState("");
  const [saving, setSaving]     = useState(false);
  const [tooltip, setTooltip]   = useState<string | null>(null);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    fetchCRM<CrmClient>("clients")
      .then(d => { setClientes(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const ativos      = clientes.filter(c => c.status_conta === "Ativo");
  const mrr         = clientes.reduce((s, c) => s + c.ticket_mensal, 0);
  const healthMedia = clientes.length
    ? Math.round(clientes.reduce((s, c) => s + c.health_score, 0) / clientes.length) : 0;
  const expansao    = clientes.reduce((s, c) => s + (c.potencial_expansao ?? 0), 0);

  const statusFiltered = filter === "Todos" ? clientes : clientes.filter(c => c.status_conta === filter);
  const filtered = search.trim()
    ? statusFiltered.filter(c =>
        c.nome.toLowerCase().includes(search.toLowerCase()) ||
        c.produto_ativo.toLowerCase().includes(search.toLowerCase()) ||
        c.segmento.toLowerCase().includes(search.toLowerCase())
      )
    : statusFiltered;

  const countsByStatus = STATUS_TABS.reduce((acc, s) => {
    acc[s] = s === "Todos" ? clientes.length : clientes.filter(c => c.status_conta === s).length;
    return acc;
  }, {} as Record<string, number>);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErro("");
    setModal(true);
  }

  function openEdit(c: CrmClient) {
    setEditingId(c.id);
    setForm({
      nome: c.nome, razao_social: c.razao_social, segmento: c.segmento,
      produto_ativo: c.produto_ativo, ticket_mensal: String(c.ticket_mensal),
      owner: c.owner, status_conta: c.status_conta, health_score: String(c.health_score),
      churn_risk: c.churn_risk, potencial_expansao: String(c.potencial_expansao ?? 0),
      observacoes: c.observacoes,
    });
    setErro("");
    setModal(true);
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro("Nome é obrigatório."); return; }
    const ticket = parseFloat(form.ticket_mensal);
    if (!ticket || ticket <= 0) { setErro("Ticket mensal inválido."); return; }
    setSaving(true);

    const payload: Omit<CrmClient, "id"> = {
      nome: form.nome.trim(), razao_social: form.razao_social.trim(), cnpj: "",
      segmento: form.segmento.trim(), produto_ativo: form.produto_ativo.trim(),
      ticket_mensal: ticket, inicio_relacao: new Date().toISOString().slice(0, 10),
      owner: form.owner.trim(), status_conta: form.status_conta,
      health_score: parseInt(form.health_score) || 80,
      churn_risk: form.churn_risk,
      potencial_expansao: parseFloat(form.potencial_expansao) || 0,
      observacoes: form.observacoes.trim(),
    };

    if (IS_STATIC) {
      if (editingId) {
        crmUpdate<CrmClient>("clients", editingId, payload);
        setClientes(prev => prev.map(c => c.id === editingId ? { ...c, ...payload } : c));
      } else {
        const novo = crmCreate<CrmClient>("clients", payload, "cli");
        setClientes(prev => [novo, ...prev]);
      }
      setSaving(false);
      setModal(false);
      return;
    }

    try {
      if (editingId) {
        crmUpdate<CrmClient>("clients", editingId, payload);
        setClientes(prev => prev.map(c => c.id === editingId ? { ...c, ...payload } : c));
      } else {
        const res = await fetch("/api/jacqes/crm/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Erro ao salvar");
        const novo = await res.json();
        setClientes(prev => [novo.cliente ?? novo, ...prev]);
      }
      setModal(false);
      setForm(EMPTY_FORM);
      setErro("");
    } catch {
      setErro("Falha ao criar cliente. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    if (!confirm("Remover este cliente?")) return;
    crmDelete("clients", id);
    setClientes(prev => prev.filter(c => c.id !== id));
  }

  return (
    <>
      <Header title="Clientes — JACQES CRM" subtitle="Carteira Ativa" />
      <div className="page-container">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Clientes Ativos",   value: String(ativos.length), icon: Users,      color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "MRR Total",          value: fmtCurrency(mrr),      icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Health Médio",       value: String(healthMedia),   icon: Heart,      color: healthMedia >= 80 ? "text-emerald-600" : healthMedia >= 60 ? "text-amber-600" : "text-red-600", bg: healthMedia >= 80 ? "bg-emerald-50" : healthMedia >= 60 ? "bg-amber-50" : "bg-red-50" },
            { label: "Expansão Potencial", value: fmtCurrency(expansao), icon: TrendingUp, color: "text-teal-600",    bg: "bg-teal-50"    },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="card p-5">
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar cliente, produto, segmento…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-800 placeholder:text-gray-400"
                />
              </div>
              <button onClick={openCreate}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors shrink-0">
                <Plus size={13} /> Novo Cliente
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_TABS.map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    filter === s ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                  }`}>
                  {s}
                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                    filter === s ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
                  }`}>
                    {countsByStatus[s] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Users size={20} className="text-gray-400" />} title="Nenhum cliente encontrado"
              description="Ajuste o filtro ou adicione um novo cliente." compact />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Cliente", "Segmento", "Produto Ativo", "Ticket Mensal", "Status", "Health", "Churn Risk", "Expansão", "Owner", "Observações", ""].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-gray-900">{c.nome}</div>
                        <div className="text-[11px] text-gray-400">{c.razao_social}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">{c.segmento}</td>
                      <td className="px-3 py-3 text-xs text-gray-600">{c.produto_ativo}</td>
                      <td className="px-3 py-3"><span className="font-bold text-gray-900">{fmtCurrency(c.ticket_mensal)}</span></td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status_conta] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {c.status_conta}
                        </span>
                      </td>
                      <td className="px-3 py-3 min-w-[80px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold w-7 shrink-0 ${healthText(c.health_score)}`}>{c.health_score}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${healthDot(c.health_score)}`} style={{ width: `${c.health_score}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border ${CHURN_COLORS[c.churn_risk] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {c.churn_risk}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-teal-600">{fmtCurrency(c.potencial_expansao ?? 0)}</td>
                      <td className="px-3 py-3 text-xs text-gray-600">{c.owner}</td>
                      <td className="px-3 py-3 max-w-[180px] relative">
                        <span className="text-xs text-gray-500 truncate block cursor-default" title={c.observacoes}
                          onMouseEnter={() => setTooltip(c.id)} onMouseLeave={() => setTooltip(null)}>
                          {c.observacoes?.slice(0, 40)}{c.observacoes?.length > 40 ? "…" : ""}
                        </span>
                        {tooltip === c.id && c.observacoes && (
                          <div className="absolute z-20 bottom-full left-0 mb-1 w-64 bg-gray-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-lg pointer-events-none">
                            {c.observacoes}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(c)} title="Editar"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(c.id)} title="Remover"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-gray-900">{editingId ? "Editar Cliente" : "Novo Cliente"}</h3>
              <button onClick={() => { setModal(false); setErro(""); }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Nome *</label>
                  <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: CEM" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Razão Social</label>
                  <input type="text" value={form.razao_social} onChange={e => setForm(f => ({ ...f, razao_social: e.target.value }))}
                    placeholder="Ex: CEM Ltda" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Segmento</label>
                  <input type="text" value={form.segmento} onChange={e => setForm(f => ({ ...f, segmento: e.target.value }))}
                    placeholder="Ex: Comunicação" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Produto Ativo</label>
                  <input type="text" value={form.produto_ativo} onChange={e => setForm(f => ({ ...f, produto_ativo: e.target.value }))}
                    placeholder="Ex: FEE Mensal" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Ticket Mensal (R$) *</label>
                  <input type="number" value={form.ticket_mensal} onChange={e => setForm(f => ({ ...f, ticket_mensal: e.target.value }))}
                    placeholder="Ex: 3200" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Expansão Potencial (R$)</label>
                  <input type="number" value={form.potencial_expansao} onChange={e => setForm(f => ({ ...f, potencial_expansao: e.target.value }))}
                    placeholder="Ex: 5000" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Owner</label>
                  <input type="text" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                    placeholder="Ex: Danilo" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Status Conta</label>
                  <div className="relative">
                    <select value={form.status_conta} onChange={e => setForm(f => ({ ...f, status_conta: e.target.value }))}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                      {["Ativo", "Em Atenção", "Em Risco", "Churned", "Inativo"].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Health Score (0–100)</label>
                  <input type="number" value={form.health_score} onChange={e => setForm(f => ({ ...f, health_score: e.target.value }))}
                    min="0" max="100" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Churn Risk</label>
                  <div className="relative">
                    <select value={form.churn_risk} onChange={e => setForm(f => ({ ...f, churn_risk: e.target.value }))}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                      {["Baixo", "Médio", "Alto"].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={3} placeholder="Notas relevantes sobre o cliente..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>

              {erro && <p className="text-xs text-red-600 font-medium">{erro}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setModal(false); setErro(""); }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={salvar} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-60">
                  {saving ? "Salvando…" : editingId ? "Salvar Alterações" : "Criar Cliente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
