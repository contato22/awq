"use client";

// ─── /awq/ppm — PPM Portfolio Dashboard ──────────────────────────────────────
// Shows all projects with health, financials, completion, and portfolio KPIs.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Plus, Search, Filter, TrendingUp, TrendingDown,
  DollarSign, Clock, Users, CheckCircle2, AlertTriangle, XCircle,
  BarChart3, Briefcase, Calendar, ChevronRight, RefreshCw,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { PpmProject, PpmPortfolioMetrics } from "@/lib/ppm-types";

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthStatus  = "green" | "yellow" | "red";
type ProjectStatus = "active" | "on_hold" | "completed" | "cancelled";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEALTH_BADGE: Record<HealthStatus, string> = {
  green:  "bg-emerald-100 text-emerald-700 border border-emerald-200",
  yellow: "bg-amber-100   text-amber-700   border border-amber-200",
  red:    "bg-red-100     text-red-700     border border-red-200",
};
const HEALTH_DOT: Record<HealthStatus, string> = {
  green: "bg-emerald-500", yellow: "bg-amber-500", red: "bg-red-500",
};
const HEALTH_LABEL: Record<HealthStatus, string> = {
  green: "On Track", yellow: "At Risk", red: "Off Track",
};

const STATUS_BADGE: Record<ProjectStatus, string> = {
  active:    "bg-blue-100   text-blue-700   border border-blue-200",
  on_hold:   "bg-gray-100   text-gray-600   border border-gray-200",
  completed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  cancelled: "bg-red-100    text-red-600    border border-red-200",
};
const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Ativo", on_hold: "Em Pausa", completed: "Concluído", cancelled: "Cancelado",
};

const BU_CHIP: Record<string, string> = {
  JACQES:  "bg-brand-100  text-brand-700",
  CAZA:    "bg-violet-100 text-violet-700",
  ADVISOR: "bg-emerald-100 text-emerald-700",
  VENTURE: "bg-amber-100  text-amber-700",
  AWQ:     "bg-gray-100   text-gray-600",
};

function fmtPct(n: number) { return n.toFixed(1) + "%"; }
function marginColor(pct: number) {
  if (pct >= 60) return "text-emerald-600";
  if (pct >= 30) return "text-amber-600";
  return "text-red-600";
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={14} className="text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

// ─── Health Summary Bar ───────────────────────────────────────────────────────

function HealthSummary({ g, y, r }: { g: number; y: number; r: number }) {
  const total = g + y + r || 1;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Portfolio Health</span>
        <BarChart3 size={14} className="text-gray-400" />
      </div>
      <div className="flex gap-2 mb-2">
        {[
          { count: g, color: "bg-emerald-500", label: "On Track"  },
          { count: y, color: "bg-amber-500",   label: "At Risk"   },
          { count: r, color: "bg-red-500",      label: "Off Track" },
        ].map(({ count, color, label }) => (
          <div key={label} className="flex-1 text-center">
            <div className={`text-xl font-bold ${color.replace("bg-", "text-")}`}>{count}</div>
            <div className="text-[10px] text-gray-500">{label}</div>
          </div>
        ))}
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        <div className="bg-emerald-500 rounded-l-full transition-all" style={{ width: `${(g / total) * 100}%` }} />
        <div className="bg-amber-500 transition-all"                   style={{ width: `${(y / total) * 100}%` }} />
        <div className="bg-red-500 rounded-r-full transition-all"      style={{ width: `${(r / total) * 100}%` }} />
      </div>
    </div>
  );
}

// ─── Project Row ──────────────────────────────────────────────────────────────

function ProjectRow({ project }: { project: PpmProject }) {
  const health  = project.health_status as HealthStatus;
  const status  = project.status as ProjectStatus;
  const margPct = project.actual_revenue > 0
    ? ((project.actual_revenue - project.actual_cost) / project.actual_revenue) * 100
    : project.budget_revenue > 0
    ? ((project.budget_revenue - project.budget_cost) / project.budget_revenue) * 100
    : 0;

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[health]}`} />
          <span className="text-xs font-mono text-gray-400">{project.project_code}</span>
        </div>
      </td>
      <td className="px-4 py-3 max-w-xs">
        <Link href={`/awq/ppm/${project.project_id}`} className="text-sm font-semibold text-gray-900 hover:text-brand-600 line-clamp-1">
          {project.project_name}
        </Link>
        {project.customer_name && (
          <div className="text-xs text-gray-500 truncate">{project.customer_name}</div>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BU_CHIP[project.bu_code] ?? "bg-gray-100 text-gray-600"}`}>
          {project.bu_code}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {project.project_manager ?? "—"}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="w-28">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Conclusão</span>
            <span>{(project.completion_pct ?? 0).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${project.completion_pct ?? 0}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        <div className="font-semibold text-gray-900">{formatBRL(project.budget_revenue)}</div>
        <div className="text-xs text-gray-400">Budget</div>
      </td>
      <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${marginColor(margPct)}`}>
        {fmtPct(margPct)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
        {formatDateBR(project.planned_end_date)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${HEALTH_BADGE[health]}`}>
          {HEALTH_LABEL[health]}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <Link
          href={`/awq/ppm/${project.project_id}`}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Ver <ChevronRight size={12} />
        </Link>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PpmPortfolioPage() {
  const [projects,  setProjects]  = useState<PpmProject[]>([]);
  const [metrics,   setMetrics]   = useState<PpmPortfolioMetrics | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filterBU,      setFilterBU]      = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterHealth,  setFilterHealth]  = useState("");
  const [filterType,    setFilterType]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.set("search",       search);
      if (filterBU)     params.set("bu_code",      filterBU);
      if (filterStatus) params.set("status",       filterStatus);
      if (filterHealth) params.set("health_status",filterHealth);
      if (filterType)   params.set("project_type", filterType);

      const res  = await fetch(`/api/ppm/projects?${params}`);
      const json = await res.json();
      if (json.success) {
        setProjects(json.data.projects);
        setMetrics(json.data.metrics);
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterBU, filterStatus, filterHealth, filterType]);

  useEffect(() => { void load(); }, [load]);

  const totalRevenue = metrics?.total_budget_revenue ?? 0;
  const totalActual  = metrics?.total_actual_revenue ?? 0;
  const avgMargin    = metrics?.avg_margin_pct ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <Briefcase size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Portfolio de Projetos</h1>
              <p className="text-xs text-gray-500">PPM — AWQ Group · {metrics?.total_projects ?? 0} projetos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <Link
              href="/awq/ppm/resources"
              className="text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Recursos
            </Link>
            <Link
              href="/awq/ppm/profitability"
              className="text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Rentabilidade
            </Link>
            <Link
              href="/awq/ppm/add"
              className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-1.5 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
            >
              <Plus size={14} /> Novo Projeto
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <KpiCard label="Projetos Ativos"  value={String(metrics?.active_projects ?? 0)}  sub={`${metrics?.total_projects ?? 0} total`}  icon={Briefcase}   color="bg-brand-600" />
          <KpiCard label="Revenue Total"    value={formatBRL(totalRevenue)}  sub={`Realizado: ${formatBRL(totalActual)}`} icon={DollarSign}  color="bg-emerald-600" />
          <KpiCard label="Margem Média"     value={fmtPct(avgMargin)}        sub="Portfolio ativo"                         icon={TrendingUp}  color="bg-violet-600" />
          <KpiCard label="Time Alocado"     value={String(metrics?.total_team_members ?? 0)} sub="pessoas ativas"          icon={Users}       color="bg-amber-600" />
          <HealthSummary g={metrics?.green_count ?? 0} y={metrics?.yellow_count ?? 0} r={metrics?.red_count ?? 0} />
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/awq/ppm/tasks",        label: "Tarefas",     icon: CheckCircle2, desc: "Kanban de tarefas"    },
            { href: "/awq/ppm/timesheets",   label: "Timesheets",  icon: Clock,        desc: "Apontamento de horas" },
            { href: "/awq/ppm/resources",    label: "Recursos",    icon: Users,        desc: "Alocação de pessoas"  },
            { href: "/awq/ppm/risks",        label: "Riscos",      icon: AlertTriangle,desc: "Registro de riscos"   },
          ].map(({ href, label, icon: Icon, desc }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3.5 hover:border-brand-200 hover:bg-brand-50 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
                <Icon size={14} className="text-gray-500 group-hover:text-brand-600 transition-colors" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800 group-hover:text-brand-700">{label}</div>
                <div className="text-[10px] text-gray-400">{desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar projeto ou código..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            {[
              { value: filterBU, setter: setFilterBU, label: "BU", opts: [["","Todas BUs"],["JACQES","JACQES"],["CAZA","Caza Vision"],["ADVISOR","Advisor"],["VENTURE","Venture"]] },
              { value: filterStatus, setter: setFilterStatus, label: "Status", opts: [["","Todos Status"],["active","Ativo"],["on_hold","Em Pausa"],["completed","Concluído"],["cancelled","Cancelado"]] },
              { value: filterHealth, setter: setFilterHealth, label: "Health", opts: [["","Todos"],["green","🟢 On Track"],["yellow","🟡 At Risk"],["red","🔴 Off Track"]] },
              { value: filterType, setter: setFilterType, label: "Tipo", opts: [["","Todos Tipos"],["one_off","One-off"],["retainer","Retainer"],["internal","Interno"]] },
            ].map(({ value, setter, label, opts }) => (
              <select
                key={label}
                value={value} onChange={e => setter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white text-gray-700"
              >
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            <button onClick={() => void load()} className="flex items-center gap-1.5 text-sm bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors">
              <Filter size={13} /> Filtrar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Código","Projeto","BU","PM","Progresso","Revenue","Margem","Prazo","Health","Status",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={11} className="px-4 py-12 text-center text-sm text-gray-400">Carregando projetos…</td></tr>
                ) : projects.length === 0 ? (
                  <tr><td colSpan={11} className="px-4 py-12 text-center text-sm text-gray-400">Nenhum projeto encontrado.</td></tr>
                ) : (
                  projects.map(p => <ProjectRow key={p.project_id} project={p} />)
                )}
              </tbody>
            </table>
          </div>
          {projects.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              {projects.length} projeto(s)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
