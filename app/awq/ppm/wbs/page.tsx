"use client";

// ─── /awq/ppm/wbs — Work Breakdown Structure ─────────────────────────────────
// Hierarchical tree view of deliverables and tasks by project.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, ChevronRight, ChevronDown,
  Milestone, CheckCircle2, Circle, PlayCircle, AlertTriangle,
  Flag, Layers,
} from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import { ppmFetch } from "@/lib/ppm-fetch";
import type { PpmTask, PpmProject } from "@/lib/ppm-types";

type TaskStatus = "not_started" | "in_progress" | "completed" | "blocked" | "cancelled";
type TaskType   = "milestone" | "task" | "phase";

const STATUS_COLOR: Record<TaskStatus, string> = {
  not_started: "text-gray-400",
  in_progress: "text-blue-500",
  completed:   "text-emerald-500",
  blocked:     "text-red-500",
  cancelled:   "text-gray-300",
};
const STATUS_ICON: Record<TaskStatus, React.ElementType> = {
  not_started: Circle,
  in_progress: PlayCircle,
  completed:   CheckCircle2,
  blocked:     AlertTriangle,
  cancelled:   Circle,
};
const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "A Fazer", in_progress: "Em Andamento",
  completed: "Concluído", blocked: "Bloqueado", cancelled: "Cancelado",
};
const TYPE_ICON: Record<TaskType, React.ElementType> = {
  phase: Layers, milestone: Flag, task: Circle,
};
const TYPE_COLOR: Record<TaskType, string> = {
  phase: "text-violet-500", milestone: "text-amber-500", task: "text-gray-400",
};

interface WbsNode extends PpmTask {
  children: WbsNode[];
  depth: number;
}

function buildTree(tasks: PpmTask[]): WbsNode[] {
  const map = new Map<string, WbsNode>();
  const roots: WbsNode[] = [];

  tasks.forEach(t => map.set(t.task_id, { ...t, children: [], depth: 0 }));

  map.forEach(node => {
    if (node.parent_task_id && map.has(node.parent_task_id)) {
      map.get(node.parent_task_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  function setDepth(nodes: WbsNode[], d: number) {
    nodes.forEach(n => { n.depth = d; setDepth(n.children, d + 1); });
  }
  setDepth(roots, 0);

  roots.sort((a, b) => a.sort_order - b.sort_order);
  return roots;
}

function WbsRow({
  node, expanded, onToggle, onStatusChange,
}: {
  node: WbsNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onStatusChange: (id: string, s: TaskStatus) => void;
}) {
  const isExpanded = expanded.has(node.task_id);
  const hasChildren = node.children.length > 0;
  const StatusIcon = STATUS_ICON[node.status as TaskStatus] ?? Circle;
  const TypeIcon   = TYPE_ICON[node.task_type as TaskType]  ?? Circle;
  const overdue = node.due_date && node.due_date < new Date().toISOString().slice(0, 10) && node.status !== "completed";

  return (
    <>
      <tr className={`hover:bg-gray-50 transition-colors ${node.task_type === "phase" ? "bg-gray-50/60" : ""}`}>
        {/* Indent + expand */}
        <td className="px-4 py-2.5 whitespace-nowrap">
          <div className="flex items-center" style={{ paddingLeft: `${node.depth * 20}px` }}>
            {hasChildren ? (
              <button onClick={() => onToggle(node.task_id)} className="p-0.5 text-gray-400 hover:text-gray-600 mr-1">
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : (
              <span className="w-5 mr-1" />
            )}
            <TypeIcon size={12} className={TYPE_COLOR[node.task_type as TaskType] ?? "text-gray-400"} />
          </div>
        </td>
        {/* WBS code */}
        <td className="px-3 py-2.5 text-[10px] font-mono text-gray-400 whitespace-nowrap">
          {node.wbs_code ?? "—"}
        </td>
        {/* Name */}
        <td className="px-3 py-2.5">
          <div className={`text-sm font-${node.task_type === "phase" ? "bold" : "medium"} text-gray-900`}>
            {node.task_name}
          </div>
          {node.description && (
            <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{node.description}</div>
          )}
          {node.is_deliverable && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded mt-0.5 inline-block">
              ENTREGÁVEL
            </span>
          )}
        </td>
        {/* Assigned */}
        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
          {node.assigned_name ?? "—"}
        </td>
        {/* Dates */}
        <td className="px-3 py-2.5 text-xs whitespace-nowrap">
          <div className="text-gray-500">{node.start_date ? formatDateBR(node.start_date) : "—"}</div>
          <div className={overdue ? "text-red-500 font-semibold" : "text-gray-400"}>
            {node.due_date ? formatDateBR(node.due_date) : "—"}
            {overdue && " ⚠"}
          </div>
        </td>
        {/* Hours */}
        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
          <span className="font-medium text-gray-800">{node.actual_hours}h</span>
          {node.estimated_hours ? ` / ${node.estimated_hours}h` : ""}
        </td>
        {/* Progress */}
        <td className="px-3 py-2.5 w-28">
          {node.task_type !== "phase" && (
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                <span>{node.completion_pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${node.status === "completed" ? "bg-emerald-500" : node.status === "blocked" ? "bg-red-400" : "bg-brand-500"}`}
                  style={{ width: `${node.completion_pct}%` }}
                />
              </div>
            </div>
          )}
        </td>
        {/* Status */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <StatusIcon size={12} className={STATUS_COLOR[node.status as TaskStatus]} />
            <select
              value={node.status}
              onChange={e => onStatusChange(node.task_id, e.target.value as TaskStatus)}
              className="text-[10px] border-0 bg-transparent text-gray-600 focus:outline-none cursor-pointer pr-1"
            >
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </td>
      </tr>
      {isExpanded && node.children
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(child => (
          <WbsRow
            key={child.task_id}
            node={child}
            expanded={expanded}
            onToggle={onToggle}
            onStatusChange={onStatusChange}
          />
        ))}
    </>
  );
}

export default function WbsPage() {
  const [tasks,    setTasks]    = useState<PpmTask[]>([]);
  const [projects, setProjects] = useState<PpmProject[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [projectId, setProjectId] = useState("");
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksJson, projectsJson] = await Promise.all([
        ppmFetch(projectId ? `/api/ppm/tasks?project_id=${projectId}` : "/api/ppm/tasks"),
        ppmFetch("/api/ppm/projects"),
      ]) as [{ success: boolean; data: PpmTask[] }, { success: boolean; data: { projects: PpmProject[] } }];
      if (tasksJson.success)    setTasks(tasksJson.data ?? []);
      if (projectsJson.success) {
        const projs: PpmProject[] = projectsJson.data.projects ?? [];
        setProjects(projs);
        if (!projectId && projs.length > 0) setProjectId(projs[0].project_id);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  // Auto-expand first level
  useEffect(() => {
    const phaseIds = tasks.filter(t => t.task_type === "phase").map(t => t.task_id);
    setExpanded(new Set(phaseIds));
  }, [tasks]);

  async function handleStatusChange(task_id: string, status: TaskStatus) {
    const pct = status === "completed" ? 100 : status === "not_started" ? 0 : undefined;
    await fetch("/api/ppm/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id, status, ...(pct !== undefined && { completion_pct: pct }) }),
    });
    void load();
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(tasks.map(t => t.task_id)));
  }
  function collapseAll() {
    setExpanded(new Set());
  }

  const tree = buildTree(tasks.filter(t => t.project_id === (projectId || t.project_id)));
  const total       = tasks.length;
  const done        = tasks.filter(t => t.status === "completed").length;
  const inProg      = tasks.filter(t => t.status === "in_progress").length;
  const blocked     = tasks.filter(t => t.status === "blocked").length;
  const deliverables = tasks.filter(t => t.is_deliverable).length;

  const currentProject = projects.find(p => p.project_id === projectId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">WBS — Work Breakdown Structure</h1>
              <p className="text-xs text-gray-500">
                {currentProject?.project_name ?? "Todos projetos"} · {total} tarefas · {deliverables} entregáveis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={expandAll} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              Expandir tudo
            </button>
            <button onClick={collapseAll} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              Recolher tudo
            </button>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30">
              <option value="">Todos projetos</option>
              {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total",        value: total,       color: "text-gray-900"    },
            { label: "Concluídas",   value: done,        color: "text-emerald-600" },
            { label: "Em Andamento", value: inProg,      color: "text-blue-600"    },
            { label: "Bloqueadas",   value: blocked,     color: "text-red-600"     },
            { label: "Entregáveis",  value: deliverables,color: "text-violet-600"  },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 flex-wrap items-center text-[10px] text-gray-500">
          <div className="flex items-center gap-1"><Layers size={11} className="text-violet-500" /> Fase</div>
          <div className="flex items-center gap-1"><Flag size={11} className="text-amber-500" /> Marco</div>
          <div className="flex items-center gap-1"><Circle size={11} className="text-gray-400" /> Tarefa</div>
          <div className="h-3 w-px bg-gray-200" />
          <div className="flex items-center gap-1"><Circle size={10} className="text-gray-400" /> A Fazer</div>
          <div className="flex items-center gap-1"><PlayCircle size={10} className="text-blue-500" /> Em Andamento</div>
          <div className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> Concluído</div>
          <div className="flex items-center gap-1"><AlertTriangle size={10} className="text-red-500" /> Bloqueado</div>
        </div>

        {/* Tree Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {["","WBS","Tarefa / Entregável","Responsável","Início / Prazo","Horas","Progresso","Status"].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Carregando…</td></tr>
              ) : tree.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                  Nenhuma tarefa. <Link href="/awq/ppm/tasks" className="text-brand-600 hover:underline">Adicione tarefas →</Link>
                </td></tr>
              ) : (
                tree.map(node => (
                  <WbsRow
                    key={node.task_id}
                    node={node}
                    expanded={expanded}
                    onToggle={toggleExpand}
                    onStatusChange={(id, s) => void handleStatusChange(id, s)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Milestone summary */}
        {tasks.filter(t => t.task_type === "milestone").length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Milestone size={12} className="text-amber-500" /> Marcos do Projeto
            </div>
            <div className="space-y-2">
              {tasks.filter(t => t.task_type === "milestone").map(m => {
                const st = m.status as TaskStatus;
                const Icon = STATUS_ICON[st];
                const overdue = m.due_date && m.due_date < new Date().toISOString().slice(0, 10) && st !== "completed";
                return (
                  <div key={m.task_id} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${st === "completed" ? "border-emerald-200 bg-emerald-50" : overdue ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
                    <Icon size={13} className={STATUS_COLOR[st]} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800">{m.task_name}</div>
                      {m.wbs_code && <div className="text-[10px] text-gray-400 font-mono">{m.wbs_code}</div>}
                    </div>
                    {m.due_date && (
                      <div className={`text-xs whitespace-nowrap font-medium ${overdue ? "text-red-600" : "text-gray-500"}`}>
                        {overdue ? "⚠ Atrasado · " : ""}{formatDateBR(m.due_date)}
                      </div>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[st]}`}>
                      {STATUS_LABEL[st]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
