"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import {
  CheckSquare, AlertTriangle, Clock, Flame, BarChart2, Plus, X, ChevronDown,
  Pencil, Trash2, CheckCircle2, LayoutList, KanbanSquare,
} from "lucide-react";
import type { CrmTask } from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";
import { IS_STATIC, crmCreate, crmUpdate, crmDelete } from "@/lib/jacqes-crm-store";

// ─── helpers ─────────────────────────────────────────────────────────────────

function isPast(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

type StatusFilter = "Todos" | "Aberta" | "Em Andamento" | "Concluída" | "Bloqueada" | "Vencida";
type PrioFilter   = "Todas" | "Baixa" | "Média" | "Alta" | "Crítica";
type ViewMode     = "lista" | "kanban";

const PRIO_BADGE: Record<string, string> = {
  Baixa:   "bg-gray-100 text-gray-500 border-gray-200",
  Média:   "bg-blue-100 text-blue-700 border-blue-200",
  Alta:    "bg-amber-100 text-amber-700 border-amber-200",
  Crítica: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_BADGE: Record<string, string> = {
  Aberta:          "bg-blue-100 text-blue-700 border-blue-200",
  "Em Andamento":  "bg-amber-100 text-amber-700 border-amber-200",
  Concluída:       "bg-emerald-100 text-emerald-700 border-emerald-200",
  Bloqueada:       "bg-red-100 text-red-700 border-red-200",
  Vencida:         "bg-orange-100 text-orange-700 border-orange-200",
};

const KANBAN_COLS: {
  status: string;
  colBg: string; border: string; headerBg: string;
  countCls: string; text: string; emptyBorder: string; emptyText: string;
}[] = [
  { status: "Aberta",       colBg: "bg-blue-50",    border: "border-blue-200",    headerBg: "bg-blue-50",    countCls: "bg-blue-100 text-blue-700",      text: "text-blue-700",    emptyBorder: "border-blue-300",    emptyText: "text-blue-400"    },
  { status: "Em Andamento", colBg: "bg-amber-50",   border: "border-amber-200",   headerBg: "bg-amber-50",   countCls: "bg-amber-100 text-amber-700",    text: "text-amber-700",   emptyBorder: "border-amber-300",   emptyText: "text-amber-400"   },
  { status: "Bloqueada",    colBg: "bg-red-50",     border: "border-red-200",     headerBg: "bg-red-50",     countCls: "bg-red-100 text-red-700",        text: "text-red-700",     emptyBorder: "border-red-300",     emptyText: "text-red-400"     },
  { status: "Vencida",      colBg: "bg-orange-50",  border: "border-orange-200",  headerBg: "bg-orange-50",  countCls: "bg-orange-100 text-orange-700",  text: "text-orange-700",  emptyBorder: "border-orange-300",  emptyText: "text-orange-400"  },
  { status: "Concluída",    colBg: "bg-emerald-50", border: "border-emerald-200", headerBg: "bg-emerald-50", countCls: "bg-emerald-100 text-emerald-700", text: "text-emerald-700", emptyBorder: "border-emerald-300", emptyText: "text-emerald-400" },
];

const ENTITY_NAMES: Record<string, string> = {
  "cli-001": "CEM",
  "cli-002": "Carol Bertolini",
  "cli-003": "André Vieira",
  "cli-004": "Tati Simões",
  "opp-001": "Studio MKT — FEE Gestão Digital",
  "opp-002": "Fernanda Ribeiro — Pacote Conteúdo",
  "opp-003": "CEM — Expansão Tráfego Pago",
  "lead-001": "Marcos Oliveira",
  "lead-002": "Fernanda Ribeiro",
  "lead-003": "Roberto Nascimento",
};

function vinculadoA(t: CrmTask): string {
  if (t.cliente_id)     return ENTITY_NAMES[t.cliente_id]     ?? t.cliente_id;
  if (t.opportunity_id) return ENTITY_NAMES[t.opportunity_id] ?? t.opportunity_id;
  if (t.lead_id)        return ENTITY_NAMES[t.lead_id]        ?? t.lead_id;
  return "—";
}

const CATEGORIAS = [
  "Follow-up", "Gestão de Conta", "Qualificação", "Proposta",
  "Follow-up Financeiro", "Reunião", "Outros",
];
const STATUS_OPTIONS = ["Aberta", "Em Andamento", "Concluída", "Bloqueada"];

type FormState = {
  titulo: string; categoria: string; prioridade: string; status: string;
  responsavel: string; prazo: string; sla_horas: string;
};
const EMPTY_FORM: FormState = {
  titulo: "", categoria: "Follow-up", prioridade: "Média", status: "Aberta",
  responsavel: "", prazo: "", sla_horas: "24",
};

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({
  task, onEdit, onDelete, onConcluir,
}: {
  task: CrmTask;
  onEdit: () => void;
  onDelete: () => void;
  onConcluir: () => void;
}) {
  const pastPrazo = isPast(task.prazo);
  const aging     = daysSince(task.data_criacao);
  const vinc      = vinculadoA(task);

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData("taskId", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm
                 hover:border-gray-300 hover:shadow-md transition-all
                 cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95 group"
    >
      {/* title + aging */}
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <p className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-2 flex-1">
          {task.titulo}
        </p>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
          aging > 14 ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500"
        }`}>{aging}d</span>
      </div>

      {/* vinculado */}
      {vinc !== "—" && (
        <p className="text-[9px] text-gray-400 truncate mb-1.5">{vinc}</p>
      )}

      {/* badges row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIO_BADGE[task.prioridade] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
          {task.prioridade}
        </span>
        <span className="text-[9px] text-gray-400 truncate max-w-[80px]">{task.categoria}</span>
      </div>

      {/* footer: responsável + prazo + actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="min-w-0">
          <p className="text-[9px] text-gray-500 font-medium truncate max-w-[90px]">{task.responsavel || "—"}</p>
          {task.prazo && (
            <p className={`text-[9px] font-semibold ${pastPrazo && task.status !== "Concluída" ? "text-red-500" : "text-gray-400"}`}>
              {task.prazo}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {task.status !== "Concluída" && (
            <button onClick={e => { e.stopPropagation(); onConcluir(); }}
              title="Concluir" className="p-1 rounded hover:bg-emerald-50 text-gray-300 hover:text-emerald-600 transition-colors">
              <CheckCircle2 size={12} />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            title="Editar" className="p-1 rounded hover:bg-blue-50 text-gray-300 hover:text-blue-600 transition-colors">
            <Pencil size={12} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Remover" className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  cfg, tasks, onDrop, onEdit, onDelete, onConcluir,
}: {
  cfg: typeof KANBAN_COLS[number];
  tasks: CrmTask[];
  onDrop: (taskId: string, newStatus: string) => void;
  onEdit: (t: CrmTask) => void;
  onDelete: (id: string) => void;
  onConcluir: (t: CrmTask) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`flex-shrink-0 w-[210px] flex flex-col rounded-xl border ${cfg.border} ${cfg.colBg} transition-all duration-150
                  ${dragOver ? "ring-2 ring-brand-400/60 scale-[1.01]" : ""}`}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        const id = e.dataTransfer.getData("taskId");
        if (id) onDrop(id, cfg.status);
      }}
    >
      {/* header */}
      <div className={`px-3 py-2.5 rounded-t-xl ${cfg.headerBg} border-b ${cfg.border} shrink-0`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] font-bold ${cfg.text} truncate`}>{cfg.status}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.countCls} shrink-0`}>
            {tasks.length}
          </span>
        </div>
      </div>

      {/* cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 320px)", minHeight: 80 }}>
        {tasks.map(t => (
          <KanbanCard
            key={t.id}
            task={t}
            onEdit={() => onEdit(t)}
            onDelete={() => onDelete(t.id)}
            onConcluir={() => onConcluir(t)}
          />
        ))}
        {dragOver && (
          <div className={`h-14 rounded-lg border-2 border-dashed ${cfg.emptyBorder} flex items-center justify-center`}>
            <span className={`text-[10px] ${cfg.emptyText}`}>Soltar aqui</span>
          </div>
        )}
        {!dragOver && tasks.length === 0 && (
          <div className={`rounded-lg border border-dashed ${cfg.emptyBorder} px-3 py-4 flex items-center justify-center`}>
            <span className={`text-[10px] ${cfg.emptyText}`}>Sem tarefas</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TarefasPage() {
  const [tarefas, setTarefas]     = useState<CrmTask[]>([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<ViewMode>("lista");
  const [statusF, setStatusF]     = useState<StatusFilter>("Todos");
  const [prioF, setPrioF]         = useState<PrioFilter>("Todas");
  const [modal, setModal]         = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [erro, setErro]           = useState("");
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    fetchCRM<CrmTask>("tasks")
      .then(d => { setTarefas(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // KPIs
  const abertas      = tarefas.filter(t => t.status !== "Concluída");
  const vencidas     = tarefas.filter(t => t.status !== "Concluída" && isPast(t.prazo));
  const noPrazo      = abertas.filter(t => !isPast(t.prazo));
  const altaCritica  = tarefas.filter(t => t.prioridade === "Alta" || t.prioridade === "Crítica");
  const concluidas   = tarefas.filter(t => t.status === "Concluída");
  const pctConcluidas = tarefas.length > 0 ? Math.round((concluidas.length / tarefas.length) * 100) : 0;

  const filtered = tarefas.filter(t => {
    const matchStatus = view === "kanban" || statusF === "Todos" || t.status === statusF;
    const matchPrio   = prioF === "Todas" || t.prioridade === prioF;
    return matchStatus && matchPrio;
  });

  function openEdit(t: CrmTask) {
    setEditingId(t.id);
    setForm({
      titulo: t.titulo, categoria: t.categoria, prioridade: t.prioridade,
      status: t.status, responsavel: t.responsavel,
      prazo: t.prazo ?? "", sla_horas: String(t.sla_horas),
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
    if (!form.titulo.trim()) { setErro("Título é obrigatório."); return; }
    if (!form.prazo)         { setErro("Prazo é obrigatório."); return; }
    setSaving(true);
    const payload = {
      titulo: form.titulo.trim(), categoria: form.categoria, prioridade: form.prioridade,
      status: form.status, responsavel: form.responsavel.trim(), prazo: form.prazo,
      sla_horas: parseInt(form.sla_horas) || 24,
      data_criacao: new Date().toISOString().slice(0, 10),
    };
    try {
      if (IS_STATIC) {
        if (editingId) {
          crmUpdate<CrmTask>("tasks", editingId, payload);
          setTarefas(prev => prev.map(t => t.id === editingId ? { ...t, ...payload } : t));
        } else {
          const nova = crmCreate<CrmTask>("tasks", payload as Omit<CrmTask, "id">, "task");
          setTarefas(prev => [nova, ...prev]);
        }
      } else if (editingId) {
        const res = await fetch(`/api/jacqes/crm/tarefas/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setTarefas(prev => prev.map(t => t.id === editingId ? updated : t));
        } else {
          crmUpdate<CrmTask>("tasks", editingId, payload);
          setTarefas(prev => prev.map(t => t.id === editingId ? { ...t, ...payload } : t));
        }
      } else {
        const res = await fetch("/api/jacqes/crm/tarefas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const nova = await res.json();
          setTarefas(prev => [nova.tarefa ?? nova, ...prev]);
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

  async function handleDelete(id: string) {
    if (!confirm("Remover esta tarefa?")) return;
    if (!IS_STATIC) {
      const res = await fetch(`/api/jacqes/crm/tarefas/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) { alert("Falha ao remover."); return; }
    }
    crmDelete("tasks", id);
    setTarefas(prev => prev.filter(t => t.id !== id));
  }

  async function concluirRapido(t: CrmTask) {
    if (t.status === "Concluída") return;
    if (!IS_STATIC) {
      const res = await fetch(`/api/jacqes/crm/tarefas/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Concluída" }),
      });
      if (res.ok) {
        setTarefas(prev => prev.map(x => x.id === t.id ? { ...x, status: "Concluída" } : x));
        return;
      }
    }
    crmUpdate<CrmTask>("tasks", t.id, { status: "Concluída" });
    setTarefas(prev => prev.map(x => x.id === t.id ? { ...x, status: "Concluída" } : x));
  }

  async function handleKanbanDrop(taskId: string, newStatus: string) {
    const task = tarefas.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;
    if (!IS_STATIC) {
      await fetch(`/api/jacqes/crm/tarefas/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    }
    crmUpdate<CrmTask>("tasks", taskId, { status: newStatus });
    setTarefas(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  }

  const STATUS_TABS: StatusFilter[] = ["Todos", "Aberta", "Em Andamento", "Concluída", "Bloqueada", "Vencida"];
  const PRIO_TABS:   PrioFilter[]   = ["Todas", "Baixa", "Média", "Alta", "Crítica"];

  return (
    <>
      <Header title="Tarefas & SLA — JACQES CRM" subtitle="Gestão operacional" />
      <div className="page-container">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Abertas",  value: String(abertas.length),     icon: CheckSquare,   color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "Vencidas",       value: String(vencidas.length),    icon: AlertTriangle, color: "text-red-600",     bg: "bg-red-50"     },
            { label: "No Prazo",       value: String(noPrazo.length),     icon: Clock,         color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Alta / Crítica", value: String(altaCritica.length), icon: Flame,         color: "text-amber-600",   bg: "bg-amber-50"   },
            { label: "% Concluídas",   value: pctConcluidas + "%",        icon: BarChart2,     color: "text-teal-600",    bg: "bg-teal-50"    },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-[10px] font-medium text-gray-400 mt-0.5 leading-tight">{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="card p-5">
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

              {/* status tabs — hidden in kanban (columns are the statuses) */}
              {view === "lista" && (
                <div className="flex gap-1.5 flex-wrap">
                  {STATUS_TABS.map(s => (
                    <button key={s} onClick={() => setStatusF(s)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                        statusF === s ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {view === "kanban" && <div />}

              {/* right side: view toggle + new button */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button onClick={() => setView("lista")}
                    title="Lista"
                    className={`px-2.5 py-1.5 flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                      view === "lista" ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}>
                    <LayoutList size={13} /> Lista
                  </button>
                  <button onClick={() => setView("kanban")}
                    title="Kanban"
                    className={`px-2.5 py-1.5 flex items-center gap-1 text-[11px] font-semibold transition-colors border-l border-gray-200 ${
                      view === "kanban" ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}>
                    <KanbanSquare size={13} /> Kanban
                  </button>
                </div>
                <button onClick={openCreate}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={13} /> Nova Tarefa
                </button>
              </div>
            </div>

            {/* priority filter — visible in both views */}
            <div className="flex gap-1.5 flex-wrap">
              {PRIO_TABS.map(p => (
                <button key={p} onClick={() => setPrioF(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    prioF === p ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">Carregando…</div>
          ) : view === "lista" ? (
            /* ── LIST VIEW ── */
            filtered.length === 0 ? (
              <EmptyState
                icon={<CheckSquare size={20} className="text-gray-400" />}
                title="Nenhuma tarefa encontrada"
                description="Ajuste os filtros ou crie uma nova tarefa."
                compact
              />
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Título", "Vinculado a", "Categoria", "Prioridade", "Status", "Responsável", "Prazo", "SLA (h)", "Aging", ""].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(t => {
                      const pastPrazo = isPast(t.prazo);
                      const aging     = daysSince(t.data_criacao);
                      return (
                        <tr key={t.id} className="hover:bg-gray-50/60 transition-colors group">
                          <td className="px-3 py-3"><span className="font-medium text-gray-900 text-xs">{t.titulo}</span></td>
                          <td className="px-3 py-3 text-xs text-gray-500">{vinculadoA(t)}</td>
                          <td className="px-3 py-3 text-xs text-gray-500">{t.categoria}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border ${PRIO_BADGE[t.prioridade] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                              {t.prioridade}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[t.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600">{t.responsavel}</td>
                          <td className="px-3 py-3">
                            <span className={`text-xs font-medium ${pastPrazo && t.status !== "Concluída" ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                              {t.prazo ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500">{t.sla_horas}h</td>
                          <td className="px-3 py-3 text-xs text-gray-400">{aging}d</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {t.status !== "Concluída" && (
                                <button onClick={() => concluirRapido(t)} title="Marcar como concluída"
                                  className="p-1 rounded hover:bg-emerald-50 text-gray-300 hover:text-emerald-600 transition-colors">
                                  <CheckCircle2 size={13} />
                                </button>
                              )}
                              <button onClick={() => openEdit(t)} title="Editar"
                                className="p-1 rounded hover:bg-blue-50 text-gray-300 hover:text-blue-600 transition-colors">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => handleDelete(t.id)} title="Remover"
                                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* ── KANBAN VIEW ── */
            <div className="overflow-x-auto -mx-5 px-5 pb-2">
              <div className="flex gap-3 min-w-max">
                {KANBAN_COLS.map(cfg => (
                  <KanbanColumn
                    key={cfg.status}
                    cfg={cfg}
                    tasks={filtered.filter(t => t.status === cfg.status)}
                    onDrop={handleKanbanDrop}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onConcluir={concluirRapido}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Nova / Editar Tarefa */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-gray-900">{editingId ? "Editar Tarefa" : "Nova Tarefa"}</h3>
              <button onClick={() => { setModal(false); setErro(""); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Follow-up pagamento Carol"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Categoria</label>
                  <div className="relative">
                    <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                      {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Prioridade *</label>
                  <div className="relative">
                    <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                      {["Baixa", "Média", "Alta", "Crítica"].map(p => <option key={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
                  <div className="relative">
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8">
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">SLA (horas)</label>
                  <input type="number" value={form.sla_horas} onChange={e => setForm(f => ({ ...f, sla_horas: e.target.value }))}
                    min="1" placeholder="24"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Responsável</label>
                  <input type="text" value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                    placeholder="Ex: Danilo"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Prazo *</label>
                  <input type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
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
                  {saving ? "Salvando…" : editingId ? "Salvar Alterações" : "Criar Tarefa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
