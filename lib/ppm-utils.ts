// ─── AWQ PPM — Utility Functions ──────────────────────────────────────────────
// EVM (Earned Value Management), Gantt helpers, resource calendar utilities.
// Safe to import in both server and client contexts (no Node-only APIs).

import type { PpmProject, PpmTask, PpmEvm } from "@/lib/ppm-types";

// ─── EVM ──────────────────────────────────────────────────────────────────────

/**
 * Compute Earned Value Management metrics for a project.
 * PV  = Planned Value   (budget_cost at current schedule %)
 * EV  = Earned Value    (budget_cost × actual completion %)
 * AC  = Actual Cost
 * CPI = Cost Performance Index  (EV / AC)   >1 = under budget
 * SPI = Schedule Perf. Index    (EV / PV)   >1 = ahead of schedule
 * EAC = Estimate at Completion  (AC + (BAC - EV) / CPI)
 * ETC = Estimate to Complete    (EAC - AC)
 */
export function calcEvm(project: PpmProject): PpmEvm {
  const bac = project.budget_cost;          // Budget at Completion
  const pct = (project.completion_pct ?? 0) / 100;
  const schedPct = scheduleProgress(project);

  const pv = bac * schedPct;                // Planned Value
  const ev = bac * pct;                     // Earned Value
  const ac = project.actual_cost;           // Actual Cost

  const cv = ev - ac;                       // Cost Variance
  const sv = ev - pv;                       // Schedule Variance
  const cpi = ac > 0 ? ev / ac : 1;
  const spi = pv > 0 ? ev / pv : 1;
  const etc = cpi > 0 ? (bac - ev) / cpi : bac - ev;
  const eac = ac + etc;

  return { project_id: project.project_id, planned_value: pv, earned_value: ev, actual_cost: ac, cost_variance: cv, schedule_variance: sv, cpi, spi, etc, eac };
}

/** Returns 0–1 schedule progress based on today vs project date range. */
export function scheduleProgress(project: PpmProject): number {
  const start = new Date(project.start_date).getTime();
  const end   = new Date(project.planned_end_date).getTime();
  const today = Date.now();
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (today - start) / (end - start)));
}

/** CPI label and color. */
export function cpiLabel(cpi: number | null): { label: string; color: string } {
  if (cpi == null) return { label: "N/A", color: "text-gray-400" };
  if (cpi >= 1.0)  return { label: `${cpi.toFixed(2)} ✓`, color: "text-emerald-600" };
  if (cpi >= 0.9)  return { label: `${cpi.toFixed(2)} ⚠`, color: "text-amber-600" };
  return               { label: `${cpi.toFixed(2)} ✗`, color: "text-red-600" };
}

/** SPI label and color. */
export function spiLabel(spi: number | null): { label: string; color: string } {
  if (spi == null) return { label: "N/A", color: "text-gray-400" };
  if (spi >= 1.0)  return { label: `${spi.toFixed(2)} ✓`, color: "text-emerald-600" };
  if (spi >= 0.9)  return { label: `${spi.toFixed(2)} ⚠`, color: "text-amber-600" };
  return               { label: `${spi.toFixed(2)} ✗`, color: "text-red-600" };
}

// ─── Gantt helpers ────────────────────────────────────────────────────────────

export interface GanttBar {
  id:        string;
  label:     string;
  startPct:  number;   // 0–100, left offset %
  widthPct:  number;   // 0–100
  color:     string;
  isMilestone: boolean;
  completionPct: number;
}

/** Compute Gantt bar positions for a list of tasks relative to a project date range. */
export function buildGanttBars(
  tasks: PpmTask[],
  projectStart: string,
  projectEnd: string,
): GanttBar[] {
  const pStart = new Date(projectStart).getTime();
  const pEnd   = new Date(projectEnd).getTime();
  const span   = Math.max(pEnd - pStart, 1);

  const TASK_COLOR: Record<string, string> = {
    completed:   "bg-emerald-500",
    in_progress: "bg-brand-500",
    blocked:     "bg-red-400",
    cancelled:   "bg-gray-300",
    not_started: "bg-gray-300",
  };

  return tasks.map(t => {
    const start = new Date(t.start_date ?? projectStart).getTime();
    const end   = new Date(t.due_date   ?? projectEnd).getTime();
    const left  = ((start - pStart) / span) * 100;
    const width = Math.max(((end - start) / span) * 100, 0.5);
    return {
      id:            t.task_id,
      label:         t.task_name,
      startPct:      Math.max(0, Math.min(100, left)),
      widthPct:      Math.max(0, Math.min(100 - left, width)),
      color:         TASK_COLOR[t.status] ?? "bg-gray-300",
      isMilestone:   t.task_type === "milestone",
      completionPct: t.completion_pct,
    };
  });
}

/** Returns an array of week labels spanning a date range (for Gantt header). */
export function ganttWeekLabels(start: string, end: string): { label: string; pct: number }[] {
  const s = new Date(start);
  const e = new Date(end);
  const totalMs = e.getTime() - s.getTime();
  if (totalMs <= 0) return [];

  const labels: { label: string; pct: number }[] = [];
  const cur = new Date(s);
  // align to Monday
  const day = cur.getDay();
  cur.setDate(cur.getDate() - (day === 0 ? 6 : day - 1));

  while (cur < e) {
    const offset = ((cur.getTime() - s.getTime()) / totalMs) * 100;
    if (offset >= 0 && offset <= 100) {
      labels.push({
        label: cur.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        pct:   offset,
      });
    }
    cur.setDate(cur.getDate() + 7);
  }
  return labels;
}

// ─── Resource calendar ────────────────────────────────────────────────────────

export interface WeekSlot {
  weekStart: string;   // YYYY-MM-DD (Monday)
  allocatedHours: number;
  capacityHours: number;
  utilizationPct: number;
  status: "overallocated" | "fully_allocated" | "well_utilized" | "underutilized";
}

/** Build a week-by-week utilization calendar for a resource between two dates. */
export function buildResourceCalendar(
  allocations: { start_date: string; end_date?: string; hours_per_week?: number }[],
  capacityHours: number,
  fromDate: string,
  toDate: string,
): WeekSlot[] {
  const slots: WeekSlot[] = [];
  const from = new Date(fromDate);
  const to   = new Date(toDate);

  // Align to Monday
  const monday = new Date(from);
  const d = monday.getDay();
  monday.setDate(monday.getDate() - (d === 0 ? 6 : d - 1));

  const cur = new Date(monday);
  while (cur <= to) {
    const weekStart = cur.toISOString().slice(0, 10);
    const weekEnd   = new Date(cur);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const allocated = allocations.reduce((sum, a) => {
      const aStart = new Date(a.start_date);
      const aEnd   = a.end_date ? new Date(a.end_date) : to;
      const overlap = cur <= aEnd && weekEnd >= aStart;
      return overlap ? sum + (a.hours_per_week ?? 0) : sum;
    }, 0);

    const utilizationPct = capacityHours > 0 ? (allocated / capacityHours) * 100 : 0;
    const status =
      utilizationPct > 100 ? "overallocated" :
      utilizationPct >= 90 ? "fully_allocated" :
      utilizationPct >= 50 ? "well_utilized" :
      "underutilized";

    slots.push({ weekStart, allocatedHours: allocated, capacityHours, utilizationPct, status });
    cur.setDate(cur.getDate() + 7);
  }
  return slots;
}

// ─── Budget helpers ───────────────────────────────────────────────────────────

export interface BudgetHealth {
  variance: number;
  variancePct: number;
  status: "on_budget" | "warning" | "over_budget";
  label: string;
  color: string;
}

export function calcBudgetHealth(budgetCost: number, actualCost: number): BudgetHealth {
  const variance    = budgetCost - actualCost;
  const variancePct = budgetCost > 0 ? (variance / budgetCost) * 100 : 0;
  const status =
    variancePct >= 0   ? "on_budget" :
    variancePct >= -10 ? "warning"   :
    "over_budget";
  const color =
    status === "on_budget"   ? "text-emerald-600" :
    status === "warning"     ? "text-amber-600"   :
    "text-red-600";
  const label =
    status === "on_budget"   ? `${Math.abs(variancePct).toFixed(1)}% below budget` :
    status === "warning"     ? `${Math.abs(variancePct).toFixed(1)}% over budget`  :
    `${Math.abs(variancePct).toFixed(1)}% OVER BUDGET`;
  return { variance, variancePct, status, label, color };
}

/** Compute project margin percentage. */
export function marginPct(revenue: number, cost: number): number {
  if (revenue <= 0) return 0;
  return ((revenue - cost) / revenue) * 100;
}

/** Return Tailwind color class for a margin percentage. */
export function marginColor(pct: number): string {
  if (pct >= 60) return "text-emerald-600";
  if (pct >= 30) return "text-amber-600";
  return "text-red-600";
}

// ─── Schedule helpers ─────────────────────────────────────────────────────────

/** Days overdue (positive = late, negative = still has time). */
export function daysOverdue(plannedEnd: string, today?: string): number {
  const end = new Date(plannedEnd).getTime();
  const now = today ? new Date(today).getTime() : Date.now();
  return Math.floor((now - end) / 86_400_000);
}

/** Working-days between two dates (Mon–Fri, no holidays). */
export function workingDaysBetween(start: string, end: string): number {
  let count = 0;
  const cur = new Date(start);
  const fin = new Date(end);
  while (cur <= fin) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ─── Project code generator ───────────────────────────────────────────────────

export function generateProjectCode(buCode: string, year?: number): string {
  const y   = year ?? new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `PRJ-${buCode}-${y}-${seq}`;
}

// ─── Colour/label helpers ──────────────────────────────────────────────────────

export const HEALTH_LABEL: Record<string, string> = {
  green: "On Track", yellow: "At Risk", red: "Off Track",
};
export const HEALTH_COLOR: Record<string, string> = {
  green:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-100   text-amber-700   border-amber-200",
  red:    "bg-red-100     text-red-700     border-red-200",
};
export const PHASE_LABEL: Record<string, string> = {
  initiation: "Iniciação", planning: "Planejamento", execution: "Execução",
  monitoring: "Monitoramento", closure: "Encerramento",
};
export const STATUS_LABEL: Record<string, string> = {
  active: "Ativo", on_hold: "Em Pausa", completed: "Concluído", cancelled: "Cancelado",
};
export const TASK_STATUS_LABEL: Record<string, string> = {
  not_started: "A Fazer", in_progress: "Em Andamento", blocked: "Bloqueado",
  completed: "Concluído", cancelled: "Cancelado",
};
export const BU_COLOR: Record<string, string> = {
  JACQES:  "bg-brand-100  text-brand-700",
  CAZA:    "bg-violet-100 text-violet-700",
  ADVISOR: "bg-emerald-100 text-emerald-700",
  VENTURE: "bg-amber-100  text-amber-700",
  AWQ:     "bg-gray-100   text-gray-600",
};
