"use client";

import { useEffect, useState, useCallback } from "react";
import type { ReactNode, FormEvent } from "react";
import Header from "@/components/Header";
import {
  Mail, Plus, Search, LayoutTemplate, GitBranch, Clock,
  CheckCircle2, MousePointerClick, MessageSquare, AlertTriangle,
  Send, Eye, X, ChevronRight, Zap, Users, BarChart3,
  Toggle3Off, ToggleLeft, Edit2, Copy, ArrowRight, PlayCircle,
} from "lucide-react";
import type { EmailTemplate, EmailSequence, EmailLog } from "@/lib/crm-types";
import {
  SEED_EMAIL_TEMPLATES, SEED_EMAIL_SEQUENCES, SEED_EMAIL_LOG,
} from "@/lib/crm-db";
import { formatDateBR } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  prospecting: { label: "Prospecção",  color: "text-blue-700",   bg: "bg-blue-50"   },
  follow_up:   { label: "Follow-up",   color: "text-violet-700", bg: "bg-violet-50" },
  proposal:    { label: "Proposta",    color: "text-amber-700",  bg: "bg-amber-50"  },
  onboarding:  { label: "Onboarding",  color: "text-emerald-700",bg: "bg-emerald-50"},
  nurturing:   { label: "Nurturing",   color: "text-rose-700",   bg: "bg-rose-50"   },
  other:       { label: "Outro",       color: "text-gray-600",   bg: "bg-gray-100"  },
};

const TRIGGER_LABELS: Record<string, string> = {
  manual:          "Manual",
  lead_created:    "Lead criado",
  lead_qualified:  "Lead qualificado",
  opp_created:     "Oportunidade criada",
  opp_proposal:    "Proposta enviada",
};

const STATUS_CONFIG: Record<string, { label: string; icon: ReactNode; color: string; bg: string }> = {
  sent:    { label: "Enviado",   icon: <Send size={11} />,              color: "text-blue-700",   bg: "bg-blue-50"   },
  opened:  { label: "Aberto",    icon: <Eye size={11} />,               color: "text-violet-700", bg: "bg-violet-50" },
  clicked: { label: "Clicado",   icon: <MousePointerClick size={11} />, color: "text-emerald-700",bg: "bg-emerald-50"},
  replied: { label: "Respondido",icon: <MessageSquare size={11} />,     color: "text-amber-700",  bg: "bg-amber-50"  },
  bounced: { label: "Bounce",    icon: <AlertTriangle size={11} />,     color: "text-red-700",    bg: "bg-red-50"    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDatetime(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{[a-z_]+\}\}/g) ?? [];
  return [...new Set(matches)];
}

const inputCls = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

// ─── Template Preview Modal ───────────────────────────────────────────────────

function TemplatePreviewModal({ tpl, onClose }: { tpl: EmailTemplate; onClose: () => void }) {
  const cfg = CATEGORY_CONFIG[tpl.category] ?? CATEGORY_CONFIG.other;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{tpl.name}</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Assunto</p>
            <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">{tpl.subject}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Corpo</p>
            <pre className="text-xs text-gray-700 bg-gray-50 px-3 py-3 rounded-lg border border-gray-100 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">{tpl.body_text}</pre>
          </div>
          {tpl.variables.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Variáveis</p>
              <div className="flex flex-wrap gap-1.5">
                {tpl.variables.map(v => (
                  <code key={v} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">{v}</code>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-[11px] text-gray-500">Usado {tpl.times_used}x · Criado por {tpl.created_by}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(tpl.body_text); }}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium"
          >
            <Copy size={12} />
            Copiar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Template Editor Modal ────────────────────────────────────────────────────

type TplForm = {
  name: string; category: string; bu: string; subject: string; body_text: string;
};

function TemplateEditorModal({ initial, onClose, onSave }: {
  initial?: EmailTemplate;
  onClose: () => void;
  onSave: (t: EmailTemplate) => void;
}) {
  const [form, setForm] = useState<TplForm>({
    name:      initial?.name      ?? "",
    category:  initial?.category  ?? "prospecting",
    bu:        initial?.bu        ?? "ALL",
    subject:   initial?.subject   ?? "",
    body_text: initial?.body_text ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof TplForm, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const detectedVars = extractVariables(form.subject + " " + form.body_text);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim() || !form.body_text.trim()) {
      setError("Nome, assunto e corpo são obrigatórios"); return;
    }
    setSaving(true);
    try {
      const payload = {
        action: initial ? "update" : "create",
        ...(initial ? { template_id: initial.template_id } : {}),
        ...form,
        variables: detectedVars,
        created_by: "Miguel",
      };
      const res = await fetch("/api/crm/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) { onSave(json.data); }
      else setError(json.error ?? "Erro ao salvar");
    } catch { setError("Erro de conexão"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">{initial ? "Editar Template" : "Novo Template de E-mail"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
        </div>
        <form onSubmit={handleSave} className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome do template *</label>
              <input type="text" className={inputCls} placeholder="Ex: Follow-up pós proposta" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Categoria</label>
              <select className={selectCls} value={form.category} onChange={e => set("category", e.target.value)}>
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">BU</label>
              <select className={selectCls} value={form.bu} onChange={e => set("bu", e.target.value)}>
                <option value="ALL">Todas</option>
                <option value="JACQES">JACQES</option>
                <option value="CAZA">Caza Vision</option>
                <option value="ADVISOR">Advisor</option>
                <option value="VENTURE">Venture</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Assunto *</label>
            <input type="text" className={inputCls} placeholder="Ex: {{empresa}} + AWQ — Vamos conversar?" value={form.subject} onChange={e => set("subject", e.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700">Corpo *</label>
              <span className="text-[10px] text-gray-400">Use {"{{variavel}}"} para personalização</span>
            </div>
            <textarea
              rows={10}
              className={`${inputCls} resize-none font-mono text-xs`}
              placeholder="Olá {{nome}},&#10;&#10;Meu nome é {{remetente}}…"
              value={form.body_text}
              onChange={e => set("body_text", e.target.value)}
            />
          </div>

          {detectedVars.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Variáveis detectadas</p>
              <div className="flex flex-wrap gap-1.5">
                {detectedVars.map(v => (
                  <code key={v} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">{v}</code>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
          <button
            onClick={handleSave as unknown as React.MouseEventHandler}
            disabled={saving}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={14} />}
            {initial ? "Salvar alterações" : "Criar template"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Templates Tab ────────────────────────────────────────────────────────────

function TemplatesTab({ templates, onRefresh }: { templates: EmailTemplate[]; onRefresh: () => void }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [preview, setPreview] = useState<EmailTemplate | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; tpl?: EmailTemplate }>({ open: false });

  const filtered = templates.filter(t => {
    if (catFilter !== "all" && t.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
    }
    return true;
  });

  function handleSaved(tpl: EmailTemplate) {
    setEditor({ open: false });
    onRefresh();
    void tpl;
  }

  return (
    <>
      {preview && <TemplatePreviewModal tpl={preview} onClose={() => setPreview(null)} />}
      {editor.open && <TemplateEditorModal initial={editor.tpl} onClose={() => setEditor({ open: false })} onSave={handleSaved} />}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar templates…"
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none cursor-pointer"
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          <option value="all">Todas categorias</option>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button
          onClick={() => setEditor({ open: true })}
          className="btn-primary flex items-center gap-2 text-sm shrink-0"
        >
          <Plus size={14} />
          Novo Template
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: templates.length, icon: <LayoutTemplate size={14} className="text-blue-600" />, bg: "bg-blue-50" },
          { label: "Ativos", value: templates.filter(t => t.is_active).length, icon: <CheckCircle2 size={14} className="text-emerald-600" />, bg: "bg-emerald-50" },
          { label: "Usos totais", value: templates.reduce((s, t) => s + t.times_used, 0), icon: <Send size={14} className="text-violet-600" />, bg: "bg-violet-50" },
        ].map(k => (
          <div key={k.label} className="card p-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>{k.icon}</div>
            <div>
              <div className="text-lg font-bold text-gray-900">{k.value}</div>
              <div className="text-[10px] text-gray-500">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(tpl => {
          const cfg = CATEGORY_CONFIG[tpl.category] ?? CATEGORY_CONFIG.other;
          return (
            <div key={tpl.template_id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-[10px] text-gray-400">{tpl.bu === "ALL" ? "Todas BUs" : tpl.bu}</span>
                    {!tpl.is_active && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Inativo</span>}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{tpl.name}</p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">{tpl.subject}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                {tpl.variables.slice(0, 3).map(v => (
                  <code key={v} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{v}</code>
                ))}
                {tpl.variables.length > 3 && <span className="text-[9px] text-gray-400">+{tpl.variables.length - 3}</span>}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Usado {tpl.times_used}x</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditor({ open: true, tpl })} className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors">
                    <Edit2 size={11} />Editar
                  </button>
                  <button onClick={() => setPreview(tpl)} className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
                    <Eye size={11} />Ver
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <LayoutTemplate size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum template encontrado</p>
        </div>
      )}
    </>
  );
}

// ─── Sequences Tab ────────────────────────────────────────────────────────────

function SequencesTab({ sequences }: { sequences: EmailSequence[] }) {
  const [selected, setSelected] = useState<EmailSequence | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* List */}
      <div className="lg:col-span-1 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-700">Sequências ({sequences.length})</h3>
          <button className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors">
            <Plus size={12} />Nova
          </button>
        </div>
        {sequences.map(seq => (
          <button
            key={seq.sequence_id}
            onClick={() => setSelected(seq)}
            className={`w-full text-left card p-3 transition-all hover:shadow-md ${selected?.sequence_id === seq.sequence_id ? "ring-2 ring-blue-500/40 border-blue-200" : ""}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-900 truncate">{seq.name}</span>
              <span className={`shrink-0 w-2 h-2 rounded-full ml-2 ${seq.is_active ? "bg-emerald-400" : "bg-gray-300"}`} />
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><Users size={9} />{seq.enrolled_count ?? 0} inscritos</span>
              <span className="flex items-center gap-1"><GitBranch size={9} />{seq.steps?.length ?? 0} passos</span>
            </div>
            <div className="mt-1">
              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{TRIGGER_LABELS[seq.trigger]}</span>
            </div>
          </button>
        ))}
        {sequences.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <GitBranch size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">Nenhuma sequência criada</p>
          </div>
        )}
      </div>

      {/* Detail */}
      <div className="lg:col-span-2">
        {selected ? (
          <div className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{selected.name}</h3>
                {selected.description && <p className="text-xs text-gray-500 mt-0.5">{selected.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${selected.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {selected.is_active ? "Ativa" : "Inativa"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Inscritos", value: selected.enrolled_count ?? 0, icon: <Users size={13} className="text-blue-600" />, bg: "bg-blue-50" },
                { label: "Passos", value: selected.steps?.length ?? 0, icon: <GitBranch size={13} className="text-violet-600" />, bg: "bg-violet-50" },
                { label: "BU", value: selected.bu, icon: <Zap size={13} className="text-amber-600" />, bg: "bg-amber-50" },
              ].map(k => (
                <div key={k.label} className={`${k.bg} rounded-xl p-3 text-center`}>
                  <div className="flex justify-center mb-1">{k.icon}</div>
                  <div className="text-base font-bold text-gray-900">{k.value}</div>
                  <div className="text-[10px] text-gray-500">{k.label}</div>
                </div>
              ))}
            </div>

            {/* Steps */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Passos da sequência</h4>
              <div className="space-y-2">
                {(selected.steps ?? []).map((step, idx) => (
                  <div key={step.step_id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                        {idx + 1}
                      </div>
                      {idx < (selected.steps?.length ?? 0) - 1 && (
                        <div className="w-px h-6 bg-gray-200 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        {step.delay_days === 0 ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Dia 0</span>
                        ) : (
                          <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                            <Clock size={9} />+{step.delay_days}d
                          </span>
                        )}
                        <ArrowRight size={10} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-800">{step.template_name ?? "Template não definido"}</span>
                      </div>
                      {step.template_subject && (
                        <p className="text-[10px] text-gray-500 mt-1 truncate">{step.template_subject}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                <PlayCircle size={12} />
                Inscrever lead
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Edit2 size={12} />
                Editar sequência
              </button>
            </div>
          </div>
        ) : (
          <div className="card p-8 flex flex-col items-center justify-center text-gray-400 min-h-48">
            <GitBranch size={28} className="mb-3 opacity-40" />
            <p className="text-sm">Selecione uma sequência para ver detalhes</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Log Tab ──────────────────────────────────────────────────────────────────

function LogTab({ log }: { log: EmailLog[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = log.filter(l => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.to_name.toLowerCase().includes(q) ||
        l.to_email.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const total  = log.length;
  const opened = log.filter(l => l.status === "opened" || l.status === "clicked" || l.status === "replied").length;
  const clicked = log.filter(l => l.status === "clicked" || l.status === "replied").length;
  const bounced = log.filter(l => l.bounced).length;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Enviados", value: total, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Taxa abertura", value: total > 0 ? `${Math.round(opened / total * 100)}%` : "—", color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Taxa clique", value: total > 0 ? `${Math.round(clicked / total * 100)}%` : "—", color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Bounces", value: bounced, color: "text-red-600", bg: "bg-red-50" },
        ].map(k => (
          <div key={k.label} className="card p-3 text-center">
            <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por destinatário ou assunto…"
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none cursor-pointer"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Destinatário</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Assunto</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Template</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Enviado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(entry => {
              const sc = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.sent;
              return (
                <tr key={entry.log_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900 text-xs">{entry.to_name}</div>
                    <div className="text-[10px] text-gray-400">{entry.to_email}</div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-xs text-gray-700 truncate block max-w-xs">{entry.subject}</span>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <span className="text-[11px] text-gray-500">{entry.template_name ?? "—"}</span>
                    {entry.sequence_name && (
                      <div className="text-[10px] text-violet-500 flex items-center gap-1">
                        <GitBranch size={9} />{entry.sequence_name}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                      {sc.icon}{sc.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <span className="text-[11px] text-gray-500">{fmtDatetime(entry.sent_at)}</span>
                    <div className="text-[10px] text-gray-400">{entry.sent_by}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Mail size={24} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum e-mail no log</p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "templates" | "sequences" | "log";

export default function EmailPage() {
  const [tab, setTab] = useState<Tab>("templates");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [emailLog, setEmailLog] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, sRes, lRes] = await Promise.all([
        fetch("/api/crm/email/templates"),
        fetch("/api/crm/email/sequences"),
        fetch("/api/crm/email/log"),
      ]);
      const [tJson, sJson, lJson] = await Promise.all([tRes.json(), sRes.json(), lRes.json()]);
      setTemplates(tJson.success ? tJson.data : SEED_EMAIL_TEMPLATES);
      setSequences(sJson.success ? sJson.data : SEED_EMAIL_SEQUENCES);
      setEmailLog(lJson.success ? lJson.data : SEED_EMAIL_LOG);
    } catch {
      setTemplates(SEED_EMAIL_TEMPLATES);
      setSequences(SEED_EMAIL_SEQUENCES);
      setEmailLog(SEED_EMAIL_LOG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const TABS: { key: Tab; label: string; icon: ReactNode; count?: number }[] = [
    { key: "templates",  label: "Templates",  icon: <LayoutTemplate size={14} />, count: templates.length },
    { key: "sequences",  label: "Sequências", icon: <GitBranch size={14} />,      count: sequences.length },
    { key: "log",        label: "Log de Envio", icon: <BarChart3 size={14} />,    count: emailLog.length  },
  ];

  return (
    <>
      <Header title="E-mail — CRM AWQ" subtitle="Templates, sequências e rastreamento" />
      <div className="page-container">

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 pb-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === "templates" && <TemplatesTab templates={templates} onRefresh={load} />}
            {tab === "sequences" && <SequencesTab sequences={sequences} />}
            {tab === "log"       && <LogTab log={emailLog} />}
          </>
        )}
      </div>
    </>
  );
}
