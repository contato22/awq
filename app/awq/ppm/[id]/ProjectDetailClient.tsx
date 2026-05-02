"use client";

// ─── /awq/ppm/[id] — Project Detail ──────────────────────────────────────────
// Shows full project detail: financials, Gantt-style timeline, tasks, milestones,
// team allocation, risks, issues, and EVM metrics.

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Clock, DollarSign, Users, CheckCircle2, AlertTriangle,
  Calendar, TrendingUp, TrendingDown, Flag, Pencil, Plus, RefreshCw,
  XCircle, Circle, PlayCircle,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { PpmProject, PpmTask, PpmMilestone, PpmAllocation, PpmRisk, PpmIssue } from "@/lib/ppm-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEALTH_COLOR  = { green: "text-emerald-600 bg-emerald-50 border-emerald-200", yellow: "text-amber-600 bg-amber-50 border-amber-200", red: "text-red-600 bg-red-50 border-red-200" } as const;
const HEALTH_LABEL  = { green: "🟢 On Track", yellow: "🟡 At Risk", red: "🔴 Off Track" } as const;
const PHASE_STEPS   = ["initiation","planning","execution","monitoring","closure"] as const;
const PHASE_LABEL   = { initiation: "Iniciação", planning: "Planejamento", execution: "Execução", monitoring: "Monitoramento", closure: "Encerramento" } as const;
const TASK_STATUS_ICON: Record<string, React.ElementType> = { completed: CheckCircle2, in_progress: PlayCircle, blocked: XCircle, cancelled: XCircle, not_started: Circle };
const TASK_STATUS_COLOR: Record<string, string> = { completed: "text-emerald-600", in_progress: "text-blue-600", blocked: "text-red-500", cancelled: "text-gray-400", not_started: "text-gray-400" };
const RISK_SCORE_COLOR = (s: number) => s >= 6 ? "bg-red-100 text-red-700" : s >= 3 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
const SEV_COLOR: Record<string, string> = { critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-amber-100 text-amber-700", low: "bg-gray-100 text-gray-600" };
const ISSUE_STATUS_COLOR: Record<string, string> = { open: "bg-red-100 text-red-700", in_progress: "bg-blue-100 text-blue-700", resolved: "bg-emerald-100 text-emerald-700", closed: "bg-gray-100 text-gray-600" };

function fmtPct(n: number) { return n.toFixed(1) + "%"; }

// ─── Gantt Chart (CSS-based) ──────────────────────────────────────────────────

function GanttBar({ task, projectStart, projectEnd }: { task: PpmTask; projectStart: string; projectEnd: string }) {
  const start = new Date(task.start_date ?? projectStart).getTime();
  const end   = new Date(task.due_date   ?? projectEnd).getTime();
  const pStart= new Date(projectStart).getTime();
  const pEnd  = new Date(projectEnd).getTime();
  const span  = pEnd - pStart || 1;

  const left  = ((start - pStart) / span) * 100;
  const width = Math.max(((end - start) / span) * 100, 1);

  const COLOR: Record<string, string> = { completed: "bg-emerald-500", in_progress: "bg-brand-500", blocked: "bg-red-400", not_started: "bg-gray-300", cancelled: "bg-gray-200" };
  const bar = COLOR[task.status] ?? "bg-gray-300";

  return (
    <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`absolute top-1 h-4 rounded-full ${bar} transition-all`}
        style={{ left: `${Math.max(0, left)}%`, width: `${Math.min(width, 100 - left)}%` }}
        title={`${task.task_name}: ${task.start_date ?? "—"} → ${task.due_date ?? "—"}`}
      >
        {task.completion_pct > 0 && task.completion_pct < 100 && (
          <div className="h-full bg-white/30 rounded-full" style={{ width: `${task.completion_pct}%` }} />
        )}
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, action }: {
  title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xl font-bold ${color ?? "text-gray-900"}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams();
  const id     = (params?.id ?? "") as string;

  const [project,     setProject]     = useState<PpmProject | null>(null);
  const [tasks,       setTasks]       = useState<PpmTask[]>([]);
  const [milestones,  setMilestones]  = useState<PpmMilestone[]>([]);
  const [allocations, setAllocations] = useState<PpmAllocation[]>([]);
  const [risks,       setRisks]       = useState<PpmRisk[]>([]);
  const [issues,      setIssues]      = useState<PpmIssue[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<"overview"|"gantt"|"risks"|"team">("overview");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/ppm/projects/${id}`);
      const json = await res.json();
      if (json.success) {
        setProject(json.data.project);
        setTasks(json.data.tasks);
        setMilestones(json.data.milestones);
        setAllocations(json.data.allocations);
        setRisks(json.data.risks);
        setIssues(json.data.issues);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(status: string) {
    await fetch(`/api/ppm/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    void load();
  }

  async function updateHealth(health_status: string) {
    await fetch(`/api/ppm/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ health_status }),
    });
    void load();
  }

  async function toggleTask(task: PpmTask) {
    const next = task.status === "completed" ? "in_progress" : task.status === "not_started" ? "in_progress" : "completed";
    await fetch("/api/ppm/tasks", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: task.task_id, status: next }),
    });
    void load();
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-sm text-gray-500">Carregando projeto…</div>
    </div>
  );
  if (!project) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-sm text-red-500">Projeto não encontrado.</div>
    </div>
  );

  const health = project.health_status as keyof typeof HEALTH_COLOR;
  const phase  = project.phase as keyof typeof PHASE_LABEL;

  const budgetMargin    = project.budget_revenue - project.budget_cost;
  const actualMargin    = project.actual_revenue - project.actual_cost;
  const budgetMarginPct = project.budget_revenue > 0 ? (budgetMargin / project.budget_revenue) * 100 : 0;
  const actualMarginPct = project.actual_revenue > 0 ? (actualMargin / project.actual_revenue) * 100 : 0;

  // EVM
  const pv  = project.budget_cost;
  const ac  = project.actual_cost;
  const ev  = project.budget_revenue > 0 ? (project.actual_revenue / project.budget_revenue) * project.budget_cost : 0;
  const cpi = ac > 0 ? ev / ac  : null;
  const spi = pv > 0 ? ev / pv  : null;

  // Phase stepper
  const phaseIdx = PHASE_STEPS.indexOf(project.phase as typeof PHASE_STEPS[number]);

  const TABS = [
    { key: "overview", label: "Visão Geral"  },
    { key: "gantt",    label: "Cronograma"   },
    { key: "risks",    label: `Riscos (${risks.length})`  },
    { key: "team",     label: `Time (${allocations.length})` },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors mt-0.5">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-400">{project.project_code}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${HEALTH_COLOR[health]}`}>
                    {HEALTH_LABEL[health]}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">{project.bu_code}</span>
                </div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">{project.project_name}</h1>
                {project.customer_name && <p className="text-sm text-gray-500">{project.customer_name}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <RefreshCw size={14} />
              </button>
              <select
                value={project.health_status}
                onChange={e => void updateHealth(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white"
              >
                <option value="green">🟢 On Track</option>
                <option value="yellow">🟡 At Risk</option>
                <option value="red">🔴 Off Track</option>
              </select>
              <select
                value={project.status}
                onChange={e => void updateStatus(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white"
              >
                <option value="active">Ativo</option>
                <option value="on_hold">Em Pausa</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
              <Link href="/awq/ppm/timesheets" className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                + Horas
              </Link>
            </div>
          </div>

          {/* Phase stepper */}
          <div className="flex items-center gap-0 mt-4 ml-11">
            {PHASE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  i < phaseIdx  ? "bg-brand-100 text-brand-600" :
                  i === phaseIdx? "bg-brand-600 text-white shadow-sm" :
                  "bg-gray-100 text-gray-400"
                }`}>
                  {i < phaseIdx && <CheckCircle2 size={10} />}
                  {PHASE_LABEL[step]}
                </div>
                {i < PHASE_STEPS.length - 1 && (
                  <div className={`h-px w-4 ${i < phaseIdx ? "bg-brand-300" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-screen-xl mx-auto flex gap-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === t.key
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <Stat label="Completion"  value={`${(project.completion_pct ?? 0).toFixed(0)}%`} sub={`${tasks.filter(t=>t.status==="completed").length}/${tasks.length} tarefas`} color="text-brand-600" />
              <Stat label="Revenue"     value={formatBRL(project.budget_revenue)} sub={`Realizado: ${formatBRL(project.actual_revenue)}`} />
              <Stat label="Custo"       value={formatBRL(project.budget_cost)}    sub={`Realizado: ${formatBRL(project.actual_cost)}`} />
              <Stat label="Margem Budget" value={fmtPct(budgetMarginPct)} sub={formatBRL(budgetMargin)} color={budgetMarginPct >= 40 ? "text-emerald-600" : "text-amber-600"} />
              <Stat label="Margem Real" value={project.actual_revenue > 0 ? fmtPct(actualMarginPct) : "—"} sub={project.actual_revenue > 0 ? formatBRL(actualMargin) : "sem receita"} color={actualMarginPct >= 40 ? "text-emerald-600" : "text-amber-600"} />
              <Stat label="Horas"       value={`${project.actual_hours}h`} sub={`Budget: ${project.budget_hours ?? "—"}h`} color="text-gray-900" />
            </div>

            {/* EVM */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "CPI (Cost Performance)", value: cpi != null ? cpi.toFixed(2) : "—", note: cpi != null ? (cpi >= 1 ? "Dentro do orçamento" : "Acima do orçamento") : "Sem custo registrado", good: cpi == null || cpi >= 1 },
                { label: "SPI (Schedule Performance)", value: spi != null ? spi.toFixed(2) : "—", note: spi != null ? (spi >= 1 ? "Dentro do prazo" : "Atrasado") : "Sem receita registrada", good: spi == null || spi >= 1 },
                { label: "Earned Value (EV)", value: formatBRL(ev), note: `PV: ${formatBRL(pv)} · AC: ${formatBRL(ac)}`, good: ev >= ac },
              ].map(({ label, value, note, good }) => (
                <div key={label} className={`rounded-xl border p-4 ${good ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                  <div className="text-xs font-semibold text-gray-500 mb-1">{label}</div>
                  <div className={`text-2xl font-bold ${good ? "text-emerald-700" : "text-red-700"}`}>{value}</div>
                  <div className="text-xs text-gray-500 mt-1">{note}</div>
                </div>
              ))}
            </div>

            {/* Progress bar + milestones */}
            <Section title="Progresso & Milestones" icon={Flag}>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Conclusão geral</span>
                  <span>{(project.completion_pct ?? 0).toFixed(0)}%</span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${project.completion_pct ?? 0}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                {milestones.map(m => (
                  <div key={m.milestone_id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      m.status === "achieved" ? "bg-emerald-100" : m.status === "missed" ? "bg-red-100" : "bg-gray-100"
                    }`}>
                      {m.status === "achieved" ? <CheckCircle2 size={12} className="text-emerald-600" /> :
                       m.status === "missed"   ? <XCircle size={12} className="text-red-500" /> :
                       <Circle size={12} className="text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{m.milestone_name}</div>
                      {m.triggers_payment && (
                        <div className="text-xs text-emerald-600">{m.payment_percentage}% do contrato</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 shrink-0">{formatDateBR(m.planned_date)}</div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      m.status === "achieved" ? "bg-emerald-100 text-emerald-700" :
                      m.status === "missed"   ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{m.status}</span>
                  </div>
                ))}
                {milestones.length === 0 && <p className="text-sm text-gray-400">Nenhum milestone cadastrado.</p>}
              </div>
            </Section>

            {/* Issues */}
            {issues.length > 0 && (
              <Section title={`Impedimentos Abertos (${issues.filter(i => i.status === "open" || i.status === "in_progress").length})`} icon={AlertTriangle}>
                <div className="space-y-2">
                  {issues.map(issue => (
                    <div key={issue.issue_id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${SEV_COLOR[issue.severity]}`}>{issue.severity.toUpperCase()}</span>
                      <div className="flex-1 text-sm text-gray-700">{issue.issue_description}</div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ISSUE_STATUS_COLOR[issue.status]}`}>{issue.status}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Description */}
            {(project.description || project.objectives) && (
              <Section title="Escopo & Objetivos" icon={Flag}>
                {project.description && <p className="text-sm text-gray-700 mb-3">{project.description}</p>}
                {project.objectives  && <p className="text-sm text-gray-700">{project.objectives}</p>}
              </Section>
            )}
          </>
        )}

        {/* ── Gantt / Tasks Tab ────────────────────────────────────────────── */}
        {activeTab === "gantt" && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Cronograma (Gantt)</span>
              </div>
              <Link href="/awq/ppm/tasks" className="text-xs text-brand-600 hover:underline">Ver Kanban →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase w-8">#</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase min-w-48">Tarefa</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase w-24">Responsável</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase w-20">Início</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase w-20">Término</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase w-16">Horas</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase w-48">Progresso</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase w-20">Status</th>
                    <th className="px-4 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tasks.map(task => {
                    const Icon  = TASK_STATUS_ICON[task.status]  ?? Circle;
                    const color = TASK_STATUS_COLOR[task.status] ?? "text-gray-400";
                    const isPhase = task.task_type === "phase";
                    return (
                      <tr key={task.task_id} className={`hover:bg-gray-50 transition-colors ${isPhase ? "bg-gray-50/50" : ""}`}>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{task.wbs_code}</td>
                        <td className="px-4 py-2.5">
                          <div className={`text-sm ${isPhase ? "font-bold text-gray-800" : "font-medium text-gray-700"} ${task.parent_task_id ? "pl-4" : ""}`}>
                            {task.task_name}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{task.assigned_name ?? "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{task.start_date ? formatDateBR(task.start_date) : "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{task.due_date   ? formatDateBR(task.due_date)   : "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">
                          {task.actual_hours > 0 ? `${task.actual_hours}h` : task.estimated_hours ? `${task.estimated_hours}h est.` : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {(task.start_date || task.due_date) ? (
                            <GanttBar task={task} projectStart={project.start_date} projectEnd={project.planned_end_date} />
                          ) : (
                            <div className="text-xs text-gray-300">—</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-semibold ${color}`}>{task.status.replace("_"," ")}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => void toggleTask(task)} title="Alternar status" className="p-1 rounded hover:bg-gray-100 transition-colors">
                            <Icon size={14} className={color} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {tasks.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma tarefa cadastrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Risks Tab ────────────────────────────────────────────────────── */}
        {activeTab === "risks" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Link href={`/awq/ppm/risks?project_id=${id}`} className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <Plus size={14} /> Adicionar Risco
              </Link>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>{["Score","Risco","Impacto","Prob.","Plano de Mitigação","Owner","Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {risks.map(r => (
                    <tr key={r.risk_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${RISK_SCORE_COLOR(r.risk_score ?? 0)}`}>{r.risk_score ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-sm text-gray-900 line-clamp-2">{r.risk_description}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 capitalize">{r.impact}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 capitalize">{r.probability}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-xs text-gray-600 line-clamp-2">{r.mitigation_plan ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.owner_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          r.status === "closed" ? "bg-gray-100 text-gray-500" :
                          r.status === "occurred" ? "bg-red-100 text-red-700" :
                          r.status === "mitigating" ? "bg-amber-100 text-amber-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                  {risks.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum risco registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Team Tab ─────────────────────────────────────────────────────── */}
        {activeTab === "team" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allocations.map(a => (
                <div key={a.allocation_id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{a.user_name}</div>
                      <div className="text-xs text-gray-500">{a.role}</div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      a.allocation_pct > 100 ? "bg-red-100 text-red-700" :
                      a.allocation_pct >= 80  ? "bg-amber-100 text-amber-700" :
                      "bg-emerald-100 text-emerald-700"
                    }`}>{a.allocation_pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-3">
                    <div className={`h-full rounded-full ${a.allocation_pct > 100 ? "bg-red-500" : "bg-brand-500"}`} style={{ width: `${Math.min(a.allocation_pct, 100)}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-400 space-y-0.5">
                    <div>{a.hours_per_week ? `${a.hours_per_week}h/semana` : "—"}</div>
                    <div>{formatDateBR(a.start_date)} → {a.end_date ? formatDateBR(a.end_date) : "—"}</div>
                    {a.billable_rate && <div>R${a.billable_rate}/h billable · R${a.cost_rate}/h custo</div>}
                  </div>
                </div>
              ))}
              {allocations.length === 0 && (
                <div className="col-span-3 text-center py-8 text-sm text-gray-400">Nenhuma alocação registrada.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
