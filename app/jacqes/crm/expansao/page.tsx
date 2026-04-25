"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  TrendingUp, ArrowUpRight, RefreshCw, Layers, Plus,
  User, Zap, Target, CheckCircle2, X, ChevronDown,
  Pencil, Trash2,
} from "lucide-react";
import {
  type CrmExpansion,
  type CrmClient,
} from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";
import { IS_STATIC, crmCreate, crmUpdate, crmDelete } from "@/lib/jacqes-crm-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + Math.round(n / 1_000) + "K";
  return "R$" + n;
}

const TIPO_FILTERS = ["Todos", "Upsell", "Cross-sell", "Upgrade", "Projeto Extra", "Reativação"] as const;
type TipoFilter = (typeof TIPO_FILTERS)[number];

const TIPOS    = ["Upsell", "Cross-sell", "Upgrade", "Projeto Extra", "Reativação"];
const STATUSES = ["Identificada", "Em Diagnóstico", "Proposta", "Fechado"];

function statusColor(status: string): string {
  switch (status) {
    case "Identificada":   return "bg-blue-100 text-blue-700 border border-blue-200";
    case "Em Diagnóstico": return "bg-amber-100 text-amber-700 border border-amber-200";
    case "Proposta":       return "bg-violet-100 text-violet-700 border border-violet-200";
    case "Fechado":        return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    default:               return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

function tipoColor(tipo: string): string {
  switch (tipo) {
    case "Upsell":        return "bg-brand-50 text-brand-700 border border-brand-200";
    case "Cross-sell":    return "bg-cyan-50 text-cyan-700 border border-cyan-200";
    case "Upgrade":       return "bg-purple-50 text-purple-700 border border-purple-200";
    case "Projeto Extra": return "bg-orange-50 text-orange-700 border border-orange-200";
    case "Reativação":    return "bg-rose-50 text-rose-700 border border-rose-200";
    default:              return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  tipo: string;
  status: string;
  valor_potencial: string;
  owner: string;
  proxima_acao: string;
  observacoes: string;
};

const EMPTY_FORM: FormState = {
  tipo: "Upsell", status: "Identificada", valor_potencial: "",
  owner: "", proxima_acao: "", observacoes: "",
};

// ─── Components ───────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="text-xl font-bold text-gray-900 mt-0.5">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function ExpansionCard({
  expansion, client, onEdit, onDelete,
}: {
  expansion: CrmExpansion;
  client: CrmClient | undefined;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card card-hover p-5 flex flex-col gap-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {client?.nome ?? expansion.cliente_id}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{client?.segmento ?? "—"}</div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} title="Editar"
              className="p-1 rounded hover:bg-blue-50 text-gray-300 hover:text-blue-600 transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={onDelete} title="Remover"
              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${tipoColor(expansion.tipo)}`}>
              {expansion.tipo}
            </span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor(expansion.status)}`}>
              {expansion.status}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] text-gray-400 uppercase tracking-wide">Valor Potencial</div>
          <div className="text-lg font-bold text-gray-900">{fmtCurrency(expansion.valor_potencial)}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-gray-400 uppercase tracking-wide">Owner</div>
          <div className="flex items-center gap-1 text-xs text-gray-700 font-medium mt-0.5">
            <User size={11} className="text-gray-400" />
            {expansion.owner}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-1.5">
        <div className="flex items-start gap-1.5">
          <Zap size={11} className="text-amber-500 mt-0.5 shrink-0" />
          <span className="text-xs text-gray-600">
            <span className="font-medium">Próxima ação:</span> {expansion.proxima_acao}
          </span>
        </div>
        {expansion.observacoes && (
          <div className="text-xs text-gray-500 leading-relaxed pl-3.5">
            {expansion.observacoes}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpansaoPage() {
  const [expansions, setExpansions] = useState<CrmExpansion[]>([]);
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("Todos");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [erro, setErro] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchCRM<CrmExpansion>("expansion"),
      fetchCRM<CrmClient>("clients"),
    ]).then(([e, c]) => { setExpansions(e); setClients(c); setLoading(false); });
  }, []);

  const totalPotencial = expansions.reduce((s, e) => s + e.valor_potencial, 0);
  const emDiagnostico  = expansions.filter((e) => e.status === "Em Diagnóstico").length;
  const fechadasGanhas = expansions.filter((e) => e.status === "Fechado").length;

  const filtered =
    tipoFilter === "Todos"
      ? expansions
      : expansions.filter((e) => e.tipo === tipoFilter);

  const countsByTipo = TIPO_FILTERS.reduce((acc, t) => {
    acc[t] = t === "Todos" ? expansions.length : expansions.filter(e => e.tipo === t).length;
    return acc;
  }, {} as Record<string, number>);

  const totalMrr = clients.reduce((s, c) => s + c.ticket_mensal, 0);
  const expansaoRatio = totalMrr > 0 ? ((totalPotencial / totalMrr) * 100).toFixed(0) : "0";

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErro("");
    setModal(true);
  }

  function openEdit(exp: CrmExpansion) {
    setEditingId(exp.id);
    setForm({
      tipo:            exp.tipo,
      status:          exp.status,
      valor_potencial: String(exp.valor_potencial),
      owner:           exp.owner,
      proxima_acao:    exp.proxima_acao,
      observacoes:     exp.observacoes ?? "",
    });
    setErro("");
    setModal(true);
  }

  async function salvar() {
    if (!form.owner.trim())        { setErro("Owner é obrigatório."); return; }
    if (!form.proxima_acao.trim()) { setErro("Próxima ação é obrigatória."); return; }
    const valor = parseFloat(form.valor_potencial);
    if (isNaN(valor) || valor <= 0) { setErro("Valor potencial deve ser um número positivo."); return; }
    setSaving(true);

    const payload = {
      tipo:            form.tipo,
      status:          form.status,
      valor_potencial: valor,
      owner:           form.owner.trim(),
      proxima_acao:    form.proxima_acao.trim(),
      observacoes:     form.observacoes.trim() || null,
      data_criacao:    new Date().toISOString().slice(0, 10),
      cliente_id:      "cli-001",
    };

    try {
      if (IS_STATIC) {
        if (editingId) {
          crmUpdate<CrmExpansion>("expansion", editingId, payload);
          setExpansions(prev => prev.map(e => e.id === editingId ? { ...e, ...payload } : e));
        } else {
          const nova = crmCreate<CrmExpansion>("expansion", payload as Omit<CrmExpansion, "id">, "exp");
          setExpansions(prev => [nova, ...prev]);
        }
      } else {
        if (editingId) {
          crmUpdate<CrmExpansion>("expansion", editingId, payload);
          setExpansions(prev => prev.map(e => e.id === editingId ? { ...e, ...payload } : e));
        } else {
          const nova = crmCreate<CrmExpansion>("expansion", payload as Omit<CrmExpansion, "id">, "exp");
          setExpansions(prev => [nova, ...prev]);
        }
      }
      setModal(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      setErro("");
    } catch {
      setErro("Falha ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    if (!confirm("Remover esta oportunidade de expansão?")) return;
    crmDelete("expansion", id);
    setExpansions(prev => prev.filter(e => e.id !== id));
  }

  return (
    <>
      <Header
        title="Expansão"
        subtitle="JACQES CRM · Upsell · Cross-sell · Upgrade"
      />

      <div className="page-container">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Expansões Identificadas"
            value={String(expansions.length)}
            sub="oportunidades ativas"
            icon={Target}
            color="bg-brand-50 border border-brand-200 text-brand-600"
          />
          <KpiCard
            label="Valor Total Potencial"
            value={fmtCurrency(totalPotencial)}
            sub="receita incremental"
            icon={TrendingUp}
            color="bg-emerald-50 border border-emerald-200 text-emerald-600"
          />
          <KpiCard
            label="Em Diagnóstico"
            value={String(emDiagnostico)}
            sub="em andamento"
            icon={RefreshCw}
            color="bg-amber-50 border border-amber-200 text-amber-600"
          />
          <KpiCard
            label="Fechadas Ganhas"
            value={String(fechadasGanhas)}
            sub="este período"
            icon={CheckCircle2}
            color="bg-violet-50 border border-violet-200 text-violet-600"
          />
        </div>

        {/* Filter bar + New button */}
        <div className="card p-4 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mr-1">
            Filtrar por tipo:
          </span>
          {TIPO_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTipoFilter(t)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors border ${
                tipoFilter === t
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {t}
              <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                tipoFilter === t ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {countsByTipo[t] ?? 0}
              </span>
            </button>
          ))}
          <div className="ml-auto">
            <button onClick={openCreate}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={13} /> Nova Expansão
            </button>
          </div>
        </div>

        {/* Cards grid */}
        <div>
          <SectionHeader
            icon={<ArrowUpRight size={15} />}
            title="Oportunidades de Expansão"
            badge={
              <span className="badge badge-blue ml-1">{filtered.length}</span>
            }
          />

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="card p-5 h-40 animate-pulse bg-gray-50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Layers size={20} className="text-gray-400" />}
              title="Nenhuma expansão encontrada"
              description="Crie uma nova oportunidade de expansão ou ajuste o filtro."
              compact
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((exp) => (
                <ExpansionCard
                  key={exp.id}
                  expansion={exp}
                  client={clients.find((c) => c.id === exp.cliente_id)}
                  onEdit={() => openEdit(exp)}
                  onDelete={() => handleDelete(exp.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Summary bar */}
        <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
              <Plus size={14} />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700">
                Potencial vs MRR Atual
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {fmtCurrency(totalPotencial)} potencial /{" "}
                {fmtCurrency(totalMrr)} MRR atual
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[11px] text-gray-400 uppercase tracking-wide">Índice de Expansão</div>
              <div className="text-lg font-bold text-emerald-600">{expansaoRatio}%</div>
            </div>
            <div className="w-16 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${Math.min(Number(expansaoRatio), 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Nova / Editar Expansão ─────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-gray-900">{editingId ? "Editar Expansão" : "Nova Expansão"}</h3>
              <button onClick={() => { setModal(false); setErro(""); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Tipo</label>
                  <div className="relative">
                    <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                      {TIPOS.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
                  <div className="relative">
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Valor Potencial (R$) *</label>
                  <input type="number" value={form.valor_potencial} onChange={e => setForm(f => ({ ...f, valor_potencial: e.target.value }))}
                    placeholder="Ex: 2500" min="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Owner *</label>
                  <input type="text" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                    placeholder="Ex: Danilo"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Próxima Ação *</label>
                <input type="text" value={form.proxima_acao} onChange={e => setForm(f => ({ ...f, proxima_acao: e.target.value }))}
                  placeholder="Ex: Apresentar proposta de upsell"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={2} placeholder="Contexto adicional..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>

              {erro && <p className="text-xs text-red-600 font-medium">{erro}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setModal(false); setErro(""); setEditingId(null); }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={salvar} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-60">
                  {saving ? "Salvando…" : editingId ? "Salvar Alterações" : "Criar Expansão"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
