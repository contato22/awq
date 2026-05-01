"use client";

// ─── /awq/ppm/gantt — Full Gantt Chart View ───────────────────────────────────
// Shows all active projects and their tasks on a unified Gantt timeline.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Calendar } from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import type { PpmProject, PpmTask } from "@/lib/ppm-types";

const STATUS_COLOR: Record<string, string> = {
  completed:   "bg-emerald-500",
  in_progress: "bg-brand-500",
  blocked:     "bg-red-400",
  not_started: "bg-gray-300",
  cancelled:   "bg-gray-200",
};

const HEALTH_DOT: Record<string, string> = {
  green: "bg-emerald-500", yellow: "bg-amber-400", red: "bg-red-500",
};

function GanttBar({ start, end, projectStart, projectEnd, status, pct }: {
  start: string; end: string; projectStart: Date; projectEnd: Date;
  status: string; pct: number;
}) {
  const s    = new Date(start).getTime();
  const e    = new Date(end).getTime();
  const ps   = projectStart.getTime();
  const pe   = projectEnd.getTime();
  const span = pe - ps || 1;
  const left  = Math.max(0, ((s - ps) / span) * 100);
  const width = Math.max(0.5, Math.min(((e - s) / span) * 100, 100 - left));
  const bar   = STATUS_COLOR[status] ?? "bg-gray-300";

  return (
    <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden flex-1">
      <div
        className={`absolute top-0.5 h-4 rounded-full ${bar} transition-all`}
        style={{ left: `${left}%`, width: `${width}%` }}
      >
        {pct > 0 && pct < 100 && (
          <div className="h-full bg-white/30 rounded-full" style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
}

function monthsBetween(start: Date, end: Date): string[] {
  const months: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

export default function GanttPage() {
  const [projects, setProjects] = useState<PpmProject[]>([]);
  const [tasksByProject, setTasksByProject] = useState<Record<string, PpmTask[]>>({});
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filterBU, setFilterBU] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: "active" });
      if (filterBU) params.set("bu_code", filterBU);
      const res  = await fetch(`/api/ppm/projects?${params}`);
      const json = await res.json();
      if (!json.success) return;
      const projs: PpmProject[] = json.data.projects ?? [];
      setProjects(projs);

      // Load tasks for each project
      const tasks: Record<string, PpmTask[]> = {};
      await Promise.all(projs.map(async p => {
        const r    = await fetch(`/api/ppm/projects/${p.project_id}`);
        const j    = await r.json();
        tasks[p.project_id] = j.success ? (j.data.tasks as PpmTask[]) : [];
      }));
      setTasksByProject(tasks);
      // Expand all by default
      const initExpanded: Record<string, boolean> = {};
      projs.forEach(p => { initExpanded[p.project_id] = true; });
      setExpanded(initExpanded);
    } finally {
      setLoading(false);
    }
  }, [filterBU]);

  useEffect(() => { void load(); }, [load]);

  // Determine global date range
  const allDates = projects.flatMap(p => [p.start_date, p.planned_end_date]).filter(Boolean);
  const globalStart = allDates.length ? new Date(allDates.reduce((a, b) => a < b ? a : b)) : new Date();
  const globalEnd   = allDates.length ? new Date(allDates.reduce((a, b) => a > b ? a : b)) : new Date(Date.now() + 86400000 * 90);
  const months = monthsBetween(globalStart, globalEnd);

  const todayPct = (() => {
    const now  = Date.now();
    const ps   = globalStart.getTime();
    const pe   = globalEnd.getTime();
    const span = pe - ps || 1;
    return Math.max(0, Math.min(100, ((now - ps) / span) * 100));
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-brand-600" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Gantt — Portfólio Completo</h1>
                <p className="text-xs text-gray-500">{projects.length} projetos ativos · {formatDateBR(globalStart.toISOString().slice(0,10))} → {formatDateBR(globalEnd.toISOString().slice(0,10))}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <select value={filterBU} onChange={e => setFilterBU(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none"
            >
              <option value="">Todas BUs</option>
              {["JACQES","CAZA","ADVISOR","VENTURE"].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-400">Carregando Gantt…</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Month header */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <div className="w-80 shrink-0 px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase border-r border-gray-200">Projeto / Tarefa</div>
              <div className="flex-1 flex relative px-2 py-2 overflow-hidden">
                {months.map(m => (
                  <div key={m} className="flex-1 text-center text-[10px] text-gray-500 font-medium">
                    {m.slice(5,7)}/{m.slice(2,4)}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100">
              {projects.map(project => {
                const tasks    = tasksByProject[project.project_id] ?? [];
                const isOpen   = expanded[project.project_id] ?? true;
                const health   = project.health_status as string;
                const topTasks = tasks.filter(t => !t.parent_task_id);

                return (
                  <div key={project.project_id}>
                    {/* Project row */}
                    <div
                      className="flex items-center bg-gray-50/70 hover:bg-gray-100/50 cursor-pointer transition-colors"
                      onClick={() => setExpanded(e => ({ ...e, [project.project_id]: !isOpen }))}
                    >
                      <div className="w-80 shrink-0 px-4 py-2.5 border-r border-gray-200 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[health] ?? "bg-gray-400"}`} />
                        <span className="text-xs font-bold text-gray-800 truncate flex-1">{project.project_name}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{isOpen ? "▼" : "▶"}</span>
                      </div>
                      <div className="flex-1 px-2 py-2 flex items-center gap-2">
                        <GanttBar
                          start={project.start_date}
                          end={project.planned_end_date}
                          projectStart={globalStart}
                          projectEnd={globalEnd}
                          status={project.status === "active" ? "in_progress" : project.status === "completed" ? "completed" : "not_started"}
                          pct={project.completion_pct ?? 0}
                        />
                        <span className="text-[10px] text-gray-500 shrink-0 w-8 text-right">{(project.completion_pct ?? 0).toFixed(0)}%</span>
                      </div>
                    </div>

                    {/* Task rows */}
                    {isOpen && topTasks.map(task => (
                      <div key={task.task_id} className="flex items-center hover:bg-gray-50 transition-colors">
                        <div className="w-80 shrink-0 px-4 py-2 border-r border-gray-100 flex items-center gap-2 pl-8">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLOR[task.status]?.replace("bg-","bg-") ?? "bg-gray-300"}`} />
                          <span className="text-[11px] text-gray-600 truncate flex-1">{task.task_name}</span>
                          {task.wbs_code && <span className="text-[10px] font-mono text-gray-400 shrink-0">{task.wbs_code}</span>}
                        </div>
                        <div className="flex-1 px-2 py-1.5 flex items-center gap-2">
                          {task.start_date && task.due_date ? (
                            <>
                              <GanttBar
                                start={task.start_date}
                                end={task.due_date}
                                projectStart={globalStart}
                                projectEnd={globalEnd}
                                status={task.status}
                                pct={task.completion_pct}
                              />
                              <span className="text-[10px] text-gray-400 shrink-0 w-8 text-right">{task.completion_pct}%</span>
                            </>
                          ) : (
                            <span className="text-[10px] text-gray-300">sem datas</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              {projects.length === 0 && (
                <div className="px-6 py-12 text-center text-sm text-gray-400">Nenhum projeto ativo encontrado.</div>
              )}
            </div>

            {/* Today marker legend */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-4 text-[10px] text-gray-500">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Concluído</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-500 inline-block" /> Em Andamento</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Bloqueado</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Não Iniciado</div>
              <div className="ml-auto">Hoje: {todayPct.toFixed(1)}% do período</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
