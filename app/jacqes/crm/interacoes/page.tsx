"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  MessageCircle, Phone, Users, Mail, Send, RefreshCw,
  AlertTriangle, Plus, X, ChevronDown, Clock, Layers,
  Pencil, Trash2,
} from "lucide-react";
import type { CrmInteraction } from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";
import { IS_STATIC, crmCreate, crmUpdate, crmDelete } from "@/lib/jacqes-crm-store";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function isThisWeek(dateStr: string): boolean {
  const d     = new Date(dateStr);
  const now   = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

const TIPO_ICONS: Record<string, React.ReactNode> = {
  Ligação:                 <Phone size={13} />,
  Reunião:                 <Users size={13} />,
  Visita:                  <Users size={13} />,
  WhatsApp:                <MessageCircle size={13} />,
  "E-mail":                <Mail size={13} />,
  "Follow-up":             <RefreshCw size={13} />,
  "Proposta Enviada":      <Send size={13} />,
  Contraproposta:          <Send size={13} />,
  "Alinhamento Interno":   <Layers size={13} />,
  "Observação de Risco":   <AlertTriangle size={13} />,
};

const TIPO_DOT: Record<string, string> = {
  Ligação:                "bg-brand-500",
  Reunião:                "bg-emerald-500",
  Visita:                 "bg-emerald-600",
  WhatsApp:               "bg-green-500",
  "E-mail":               "bg-blue-500",
  "Follow-up":            "bg-amber-400",
  "Proposta Enviada":     "bg-teal-500",
  Contraproposta:         "bg-teal-600",
  "Alinhamento Interno":  "bg-gray-400",
  "Observação de Risco":  "bg-red-500",
};

const TIPO_BORDER: Record<string, string> = {
  Ligação:                "border-brand-300",
  Reunião:                "border-emerald-300",
  Visita:                 "border-emerald-400",
  WhatsApp:               "border-green-300",
  "E-mail":               "border-blue-300",
  "Follow-up":            "border-amber-300",
  "Proposta Enviada":     "border-teal-300",
  Contraproposta:         "border-teal-400",
  "Alinhamento Interno":  "border-gray-300",
  "Observação de Risco":  "border-red-300",
};

const SATISFACAO_BADGE: Record<string, string> = {
  Alta:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  Neutro: "bg-gray-100 text-gray-500 border-gray-200",
  Baixa:  "bg-red-100 text-red-700 border-red-200",
};

const RISCO_BADGE: Record<string, string> = {
  Médio: "bg-amber-100 text-amber-700 border-amber-200",
  Alto:  "bg-red-100 text-red-700 border-red-200",
};

const ALL_TIPOS = [
  "Todos", "Ligação", "Reunião", "Visita", "WhatsApp", "E-mail",
  "Follow-up", "Proposta Enviada", "Contraproposta", "Alinhamento Interno", "Observação de Risco",
] as const;

type TipoFilter = typeof ALL_TIPOS[number];

type FormState = {
  tipo: string;
  canal: string;
  data: string;
  resumo: string;
  proximo_passo: string;
  responsavel: string;
  satisfacao_percebida: string;
  risco_percebido: string;
};

const EMPTY_FORM: FormState = {
  tipo: "Ligação", canal: "", data: new Date().toISOString().slice(0, 10),
  resumo: "", proximo_passo: "", responsavel: "",
  satisfacao_percebida: "Neutro", risco_percebido: "Baixo",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InteracoesPage() {
  const [interacoes, setInteracoes] = useState<CrmInteraction[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tipoF, setTipoF]           = useState<TipoFilter>("Todos");
  const [modal, setModal]           = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [erro, setErro]             = useState("");
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    fetchCRM<CrmInteraction>("interactions")
      .then(d => { setInteracoes(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // KPIs
  const total        = interacoes.length;
  const estasSemana  = interacoes.filter(i => isThisWeek(i.data)).length;
  const riscoAlto    = interacoes.filter(i => i.risco_percebido === "Alto").length;

  const filtered = tipoF === "Todos"
    ? interacoes
    : interacoes.filter(i => i.tipo === tipoF);

  const sorted = [...filtered].sort((a, b) => b.data.localeCompare(a.data));

  function openEdit(i: CrmInteraction) {
    setEditingId(i.id);
    setForm({
      tipo:                  i.tipo,
      canal:                 i.canal ?? "",
      data:                  i.data,
      resumo:                i.resumo,
      proximo_passo:         i.proximo_passo ?? "",
      responsavel:           i.responsavel,
      satisfacao_percebida:  i.satisfacao_percebida ?? "Neutro",
      risco_percebido:       i.risco_percebido ?? "Baixo",
    });
    setErro("");
    setModal(true);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErro("");
    setModal(true);
  }

  async function salvar() {
    if (!form.resumo.trim()) { setErro("Resumo é obrigatório."); return; }
    if (!form.data)          { setErro("Data é obrigatória."); return; }
    setSaving(true);

    const payload = {
      tipo:                  form.tipo,
      canal:                 form.canal.trim(),
      data:                  form.data,
      resumo:                form.resumo.trim(),
      proximo_passo:         form.proximo_passo.trim(),
      responsavel:           form.responsavel.trim(),
      satisfacao_percebida:  form.satisfacao_percebida,
      risco_percebido:       form.risco_percebido,
    };

    try {
      if (IS_STATIC) {
        if (editingId) {
          crmUpdate<CrmInteraction>("interactions", editingId, payload);
          setInteracoes(prev => prev.map(i => i.id === editingId ? { ...i, ...payload } : i));
        } else {
          const nova = crmCreate<CrmInteraction>("interactions", payload as Omit<CrmInteraction, "id">, "int");
          setInteracoes(prev => [nova, ...prev]);
        }
      } else if (editingId) {
        crmUpdate<CrmInteraction>("interactions", editingId, payload);
        setInteracoes(prev => prev.map(i => i.id === editingId ? { ...i, ...payload } : i));
      } else {
        const res = await fetch("/api/jacqes/crm/interacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const nova = await res.json();
          setInteracoes(prev => [nova.interacao ?? nova, ...prev]);
        } else {
          throw new Error("API error");
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
    if (!confirm("Remover esta interação?")) return;
    crmDelete("interactions", id);
    setInteracoes(prev => prev.filter(i => i.id !== id));
  }

  return (
    <>
      <Header
        title="Interações — JACQES CRM"
        subtitle="Timeline & histórico"
      />
      <div className="page-container">

        {/* ── KPIs ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Interações", value: String(total),       icon: MessageCircle, color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "Esta Semana",      value: String(estasSemana), icon: Clock,         color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Risco Alto",       value: String(riscoAlto),   icon: AlertTriangle, color: "text-red-600",     bg: "bg-red-50"     },
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

        {/* ── Timeline ───────────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <SectionHeader
              icon={<MessageCircle size={15} />}
              title="Timeline de Interações"
              badge={
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                  {sorted.length} registros
                </span>
              }
              className="mb-0 flex-1"
            />
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <Plus size={13} /> Nova Interação
            </button>
          </div>

          {/* Tipo filter pills */}
          <div className="flex gap-1.5 flex-wrap mb-6">
            {ALL_TIPOS.map(t => (
              <button key={t} onClick={() => setTipoF(t)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  tipoF === t
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}>
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">Carregando…</div>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={<MessageCircle size={20} className="text-gray-400" />}
              title="Nenhuma interação encontrada"
              description="Ajuste os filtros ou registre uma nova interação."
              compact
            />
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />

              <div className="space-y-6 ml-10">
                {sorted.map((i) => {
                  const dotColor    = TIPO_DOT[i.tipo]    ?? "bg-gray-300";
                  const borderColor = TIPO_BORDER[i.tipo] ?? "border-gray-200";
                  const icon        = TIPO_ICONS[i.tipo]  ?? <MessageCircle size={13} />;

                  return (
                    <div key={i.id} className="relative group">
                      {/* Dot on line */}
                      <div className={`absolute -left-[2.35rem] top-3 w-4 h-4 rounded-full ${dotColor} flex items-center justify-center ring-2 ring-white text-white`}>
                        {icon}
                      </div>

                      <div className={`border-l-2 ${borderColor} pl-4 pb-2`}>
                        {/* Header row */}
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-gray-900">{i.tipo}</span>
                          {i.canal && (
                            <span className="text-[11px] text-gray-400 font-medium">· {i.canal}</span>
                          )}
                          <span className="text-[11px] text-gray-400 ml-auto">{fmtDate(i.data)}</span>
                          {/* Action buttons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(i)}
                              title="Editar"
                              className="p-1 rounded hover:bg-blue-50 text-gray-300 hover:text-blue-600 transition-colors">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => handleDelete(i.id)}
                              title="Remover"
                              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Resumo */}
                        <p className="text-xs text-gray-700 leading-relaxed mb-2">{i.resumo}</p>

                        {/* Próximo passo */}
                        {i.proximo_passo && (
                          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-2">
                            <div className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-0.5">Próximo Passo</div>
                            <p className="text-xs text-blue-800">{i.proximo_passo}</p>
                          </div>
                        )}

                        {/* Footer row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-gray-500 font-medium">{i.responsavel}</span>
                          {i.satisfacao_percebida && (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${SATISFACAO_BADGE[i.satisfacao_percebida] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                              {i.satisfacao_percebida}
                            </span>
                          )}
                          {(i.risco_percebido === "Médio" || i.risco_percebido === "Alto") && (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${RISCO_BADGE[i.risco_percebido]}`}>
                              <AlertTriangle size={9} />
                              Risco {i.risco_percebido}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Modal: Nova / Editar Interação ────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-gray-900">{editingId ? "Editar Interação" : "Nova Interação"}</h3>
              <button onClick={() => { setModal(false); setErro(""); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Tipo *</label>
                  <div className="relative">
                    <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                      {["Ligação", "Reunião", "Visita", "WhatsApp", "E-mail", "Follow-up",
                        "Proposta Enviada", "Contraproposta", "Alinhamento Interno", "Observação de Risco"].map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Canal</label>
                  <input type="text" value={form.canal} onChange={e => setForm(f => ({ ...f, canal: e.target.value }))}
                    placeholder="Ex: WhatsApp" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Data</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Responsável</label>
                  <input type="text" value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                    placeholder="Ex: Danilo" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Resumo *</label>
                <textarea value={form.resumo} onChange={e => setForm(f => ({ ...f, resumo: e.target.value }))}
                  rows={3} placeholder="Descreva o que aconteceu nesta interação..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Próximo Passo</label>
                <input type="text" value={form.proximo_passo} onChange={e => setForm(f => ({ ...f, proximo_passo: e.target.value }))}
                  placeholder="Ex: Enviar proposta até 15/04" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Satisfação Percebida</label>
                  <div className="relative">
                    <select value={form.satisfacao_percebida} onChange={e => setForm(f => ({ ...f, satisfacao_percebida: e.target.value }))}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                      {["Alta", "Neutro", "Baixa"].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Risco Percebido</label>
                  <div className="relative">
                    <select value={form.risco_percebido} onChange={e => setForm(f => ({ ...f, risco_percebido: e.target.value }))}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                      {["Baixo", "Médio", "Alto"].map(r => <option key={r}>{r}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {erro && <p className="text-xs text-red-600 font-medium">{erro}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setModal(false); setErro(""); setEditingId(null); }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={salvar} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-60">
                  {saving ? "Salvando…" : editingId ? "Salvar Alterações" : "Registrar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
