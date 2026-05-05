"use client";

// ─── /awq/ppm/reports — Executive Status Reports ─────────────────────────────
// Generates Red/Yellow/Green health reports, project summaries, and stakeholder updates.

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, FileText, Printer, TrendingUp, TrendingDown,
  CheckCircle2, AlertTriangle, XCircle, DollarSign, Clock, Users,
  ChevronRight, Download,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { PpmProject, PpmPortfolioMetrics } from "@/lib/ppm-types";

type HealthStatus = "green" | "yellow" | "red";

const HEALTH_CONFIG: Record<HealthStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  green:  { label: "On Track",  color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", icon: CheckCircle2 },
  yellow: { label: "At Risk",   color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   icon: AlertTriangle },
  red:    { label: "Off Track", color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200",     icon: XCircle      },
};

const BU_CHIP: Record<string, string> = {
  JACQES:  "bg-brand-100  text-brand-700",
  CAZA:    "bg-violet-100 text-violet-700",
  ADVISOR: "bg-emerald-100 text-emerald-700",
  VENTURE: "bg-amber-100  text-amber-700",
  AWQ:     "bg-gray-100   text-gray-600",
};

type ReportType = "executive" | "health" | "financial" | "project";

interface ProjectReportData extends PpmProject {
  margin_pct: number;
  budget_variance: number;
  schedule_status: "on_time" | "at_risk" | "late";
}

function enrichProject(p: PpmProject): ProjectReportData {
  const margin_pct = p.actual_revenue > 0
    ? ((p.actual_revenue - p.actual_cost) / p.actual_revenue) * 100
    : ((p.budget_revenue - p.budget_cost) / p.budget_revenue) * 100;

  const budget_variance = p.budget_cost > 0
    ? ((p.actual_cost - p.budget_cost) / p.budget_cost) * 100
    : 0;

  const today = new Date().toISOString().slice(0, 10);
  const schedule_status: "on_time" | "at_risk" | "late" =
    p.planned_end_date < today && p.status === "active" ? "late" :
    (p.schedule_variance_days ?? 0) > 7 ? "at_risk" : "on_time";

  return { ...p, margin_pct, budget_variance, schedule_status };
}

function ExecutiveReport({ projects, metrics }: { projects: ProjectReportData[]; metrics: PpmPortfolioMetrics }) {
  const reportDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const active = projects.filter(p => p.status === "active");

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-0">
      {/* Report Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 px-8 py-6 text-white print:bg-gray-900">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">AWQ Group · PPM</div>
            <h2 className="text-2xl font-bold">Relatório Executivo de Portfolio</h2>
            <p className="text-sm text-gray-300 mt-1">{reportDate}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{metrics.active_projects}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Projetos Ativos</div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-8">
        {/* KPI Summary */}
        <section>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <DollarSign size={14} className="text-emerald-600" /> Indicadores Financeiros
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Revenue Orçado",  value: formatBRL(metrics.total_budget_revenue), color: "text-gray-900" },
              { label: "Revenue Realizado",value: formatBRL(metrics.total_actual_revenue), color: "text-emerald-600" },
              { label: "Custo Total",     value: formatBRL(metrics.total_budget_cost),    color: "text-gray-700" },
              { label: "Margem Média",    value: `${metrics.avg_margin_pct.toFixed(1)}%`, color: metrics.avg_margin_pct >= 40 ? "text-emerald-600" : metrics.avg_margin_pct >= 20 ? "text-amber-600" : "text-red-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">{label}</div>
                <div className={`text-lg font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Health Summary */}
        <section>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" /> Saúde do Portfólio
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {(["green", "yellow", "red"] as HealthStatus[]).map(h => {
              const cfg = HEALTH_CONFIG[h];
              const Icon = cfg.icon;
              const count = h === "green" ? metrics.green_count : h === "yellow" ? metrics.yellow_count : metrics.red_count;
              const pct = metrics.total_projects > 0 ? (count / metrics.total_projects * 100).toFixed(0) : 0;
              return (
                <div key={h} className={`rounded-lg border p-4 ${cfg.bg} ${cfg.border}`}>
                  <div className={`flex items-center gap-2 font-bold mb-1 ${cfg.color}`}>
                    <Icon size={14} /> {cfg.label}
                  </div>
                  <div className={`text-2xl font-bold ${cfg.color}`}>{count}</div>
                  <div className={`text-xs ${cfg.color} opacity-70`}>{pct}% do portfólio</div>
                </div>
              );
            })}
          </div>

          {/* Red/Yellow projects callout */}
          {projects.filter(p => p.health_status !== "green" && p.status === "active").length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
              <div className="text-xs font-bold text-amber-700 uppercase mb-2">⚠ Projetos que Requerem Atenção</div>
              <div className="space-y-2">
                {projects.filter(p => p.health_status !== "green" && p.status === "active").map(p => {
                  const cfg = HEALTH_CONFIG[p.health_status as HealthStatus];
                  const Icon = cfg.icon;
                  return (
                    <div key={p.project_id} className="flex items-center gap-3">
                      <Icon size={12} className={cfg.color} />
                      <span className="text-sm font-semibold text-gray-800">{p.project_name}</span>
                      <span className="text-xs text-gray-500">{p.bu_code}</span>
                      {p.health_notes && <span className="text-xs text-gray-500 italic truncate">— {p.health_notes}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Project Status Table */}
        <section>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <FileText size={14} className="text-brand-600" /> Status por Projeto
          </h3>
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                {["Projeto","BU","PM","% Conclusão","Budget","Custo Real","Margem","Prazo","Health"].map(h => (
                  <th key={h} className="pb-2 text-left text-[10px] font-bold text-gray-500 uppercase pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {active.sort((a, b) => {
                const order = { red: 0, yellow: 1, green: 2 };
                return order[a.health_status as HealthStatus] - order[b.health_status as HealthStatus];
              }).map(p => {
                const cfg = HEALTH_CONFIG[p.health_status as HealthStatus];
                const Icon = cfg.icon;
                const schedColor = p.schedule_status === "on_time" ? "text-emerald-600" : p.schedule_status === "at_risk" ? "text-amber-600" : "text-red-600";
                const schedLabel = p.schedule_status === "on_time" ? "No prazo" : p.schedule_status === "at_risk" ? "Em risco" : "Atrasado";
                return (
                  <tr key={p.project_id}>
                    <td className="py-2 pr-4">
                      <div className="text-sm font-semibold text-gray-900 max-w-48 truncate">{p.project_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{p.project_code}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${BU_CHIP[p.bu_code] ?? ""}`}>
                        {p.bu_code}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-600 whitespace-nowrap">{p.project_manager ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2 min-w-24">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${p.completion_pct ?? 0}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-700 w-8 text-right">{p.completion_pct ?? 0}%</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-600 whitespace-nowrap">{formatBRL(p.budget_revenue)}</td>
                    <td className="py-2 pr-4 text-xs whitespace-nowrap">
                      <span className={p.budget_variance > 10 ? "text-red-600 font-semibold" : "text-gray-600"}>
                        {formatBRL(p.actual_cost)}
                        {Math.abs(p.budget_variance) > 1 && (
                          <span className="ml-1 text-[10px]">({p.budget_variance > 0 ? "+" : ""}{p.budget_variance.toFixed(0)}%)</span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs font-semibold whitespace-nowrap">
                      <span className={p.margin_pct >= 40 ? "text-emerald-600" : p.margin_pct >= 20 ? "text-amber-600" : "text-red-600"}>
                        {p.margin_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs whitespace-nowrap">
                      <span className={schedColor}>{schedLabel}</span>
                      <div className="text-[10px] text-gray-400">{formatDateBR(p.planned_end_date)}</div>
                    </td>
                    <td className="py-2">
                      <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                        <Icon size={10} /> {cfg.label}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Resource snapshot */}
        <section>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Users size={14} className="text-indigo-600" /> Recursos
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50 text-center">
              <div className="text-2xl font-bold text-gray-900">{metrics.total_team_members}</div>
              <div className="text-xs text-gray-500">Pessoas Alocadas</div>
            </div>
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50 text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.overdue_tasks}</div>
              <div className="text-xs text-gray-500">Tarefas Atrasadas</div>
            </div>
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50 text-center">
              <div className="text-2xl font-bold text-gray-900">{metrics.total_projects}</div>
              <div className="text-xs text-gray-500">Total de Projetos</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-4 text-[10px] text-gray-400 flex items-center justify-between">
          <span>AWQ Group PPM · Gerado em {reportDate}</span>
          <span>Confidencial</span>
        </div>
      </div>
    </div>
  );
}

function HealthReport({ projects }: { projects: ProjectReportData[] }) {
  const reportDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">AWQ Group · PPM</div>
        <h2 className="text-xl font-bold text-gray-900">Relatório de Saúde — {reportDate}</h2>
      </div>
      <div className="px-8 py-6 space-y-6">
        {(["red", "yellow", "green"] as HealthStatus[]).map(h => {
          const group = projects.filter(p => p.health_status === h && p.status === "active");
          if (group.length === 0) return null;
          const cfg = HEALTH_CONFIG[h];
          const Icon = cfg.icon;
          return (
            <section key={h}>
              <div className={`flex items-center gap-2 font-bold text-sm mb-3 ${cfg.color}`}>
                <Icon size={14} /> {cfg.label} ({group.length})
              </div>
              <div className="space-y-3">
                {group.map(p => (
                  <div key={p.project_id} className={`rounded-lg border p-4 ${cfg.bg} ${cfg.border}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{p.project_name}</div>
                        <div className="text-[10px] text-gray-500">{p.project_code} · {p.bu_code} · PM: {p.project_manager ?? "—"}</div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-xs font-bold text-gray-900">{p.completion_pct ?? 0}% concluído</div>
                        <div className="text-[10px] text-gray-500">Prazo: {formatDateBR(p.planned_end_date)}</div>
                      </div>
                    </div>
                    {p.health_notes && (
                      <div className={`text-xs italic ${cfg.color}`}>"{p.health_notes}"</div>
                    )}
                    <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-black/5 text-xs">
                      <div><span className="text-gray-500">Revenue:</span> <span className="font-semibold">{formatBRL(p.budget_revenue)}</span></div>
                      <div><span className="text-gray-500">Margem:</span> <span className={`font-semibold ${p.margin_pct >= 40 ? "text-emerald-700" : p.margin_pct >= 20 ? "text-amber-700" : "text-red-700"}`}>{p.margin_pct.toFixed(1)}%</span></div>
                      <div><span className="text-gray-500">Prazo:</span> <span className={`font-semibold ${p.schedule_status === "on_time" ? "text-emerald-700" : p.schedule_status === "at_risk" ? "text-amber-700" : "text-red-700"}`}>{p.schedule_status === "on_time" ? "No prazo" : p.schedule_status === "at_risk" ? "Em risco" : "Atrasado"}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FinancialReport({ projects, metrics }: { projects: ProjectReportData[]; metrics: PpmPortfolioMetrics }) {
  const reportDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const sortedByRevenue = [...projects].filter(p => p.status === "active").sort((a, b) => b.budget_revenue - a.budget_revenue);
  const totalMarginValue = projects.reduce((s, p) => s + (p.actual_revenue - p.actual_cost), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">AWQ Group · PPM</div>
        <h2 className="text-xl font-bold text-gray-900">Relatório Financeiro — {reportDate}</h2>
      </div>
      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Revenue Budget",    value: formatBRL(metrics.total_budget_revenue) },
            { label: "Revenue Realizado", value: formatBRL(metrics.total_actual_revenue) },
            { label: "Custo Total",       value: formatBRL(metrics.total_budget_cost)    },
            { label: "Margem R$",         value: formatBRL(totalMarginValue)             },
          ].map(({ label, value }) => (
            <div key={label} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">{label}</div>
              <div className="text-lg font-bold text-gray-900">{value}</div>
            </div>
          ))}
        </div>
        <table className="min-w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              {["Projeto","BU","Budget Rev.","Revenue Real","Budget Custo","Custo Real","Δ Custo %","Margem %"].map(h => (
                <th key={h} className="pb-2 text-left text-[10px] font-bold text-gray-500 uppercase pr-4 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedByRevenue.map(p => (
              <tr key={p.project_id}>
                <td className="py-2 pr-4">
                  <div className="text-sm font-semibold text-gray-900 max-w-40 truncate">{p.project_name}</div>
                </td>
                <td className="py-2 pr-4"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${BU_CHIP[p.bu_code] ?? ""}`}>{p.bu_code}</span></td>
                <td className="py-2 pr-4 text-xs text-gray-700">{formatBRL(p.budget_revenue)}</td>
                <td className="py-2 pr-4 text-xs font-semibold text-emerald-600">{formatBRL(p.actual_revenue)}</td>
                <td className="py-2 pr-4 text-xs text-gray-700">{formatBRL(p.budget_cost)}</td>
                <td className="py-2 pr-4 text-xs text-gray-700">{formatBRL(p.actual_cost)}</td>
                <td className="py-2 pr-4 text-xs font-semibold whitespace-nowrap">
                  <span className={p.budget_variance > 10 ? "text-red-600" : p.budget_variance > 0 ? "text-amber-600" : "text-emerald-600"}>
                    {p.budget_variance > 0 ? "+" : ""}{p.budget_variance.toFixed(1)}%
                  </span>
                </td>
                <td className="py-2 text-xs font-bold">
                  <span className={p.margin_pct >= 40 ? "text-emerald-600" : p.margin_pct >= 20 ? "text-amber-600" : "text-red-600"}>
                    {p.margin_pct.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td colSpan={2} className="py-2 pr-4 text-xs font-bold text-gray-700">Total / Média</td>
              <td className="py-2 pr-4 text-xs font-bold">{formatBRL(metrics.total_budget_revenue)}</td>
              <td className="py-2 pr-4 text-xs font-bold text-emerald-600">{formatBRL(metrics.total_actual_revenue)}</td>
              <td className="py-2 pr-4 text-xs font-bold">{formatBRL(metrics.total_budget_cost)}</td>
              <td className="py-2 pr-4 text-xs font-bold">{formatBRL(metrics.total_actual_cost)}</td>
              <td className="py-2 pr-4" />
              <td className="py-2 text-xs font-bold">
                <span className={metrics.avg_margin_pct >= 40 ? "text-emerald-600" : metrics.avg_margin_pct >= 20 ? "text-amber-600" : "text-red-600"}>
                  {metrics.avg_margin_pct.toFixed(1)}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [projects, setProjects] = useState<PpmProject[]>([]);
  const [metrics,  setMetrics]  = useState<PpmPortfolioMetrics | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [reportType, setReportType] = useState<ReportType>("executive");
  const [selectedProject, setSelectedProject] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projectsRes, metricsRes] = await Promise.all([
        fetch("/api/ppm/projects"),
        fetch("/api/ppm/metrics"),
      ]);
      const [projectsJson, metricsJson] = await Promise.all([
        projectsRes.json(), metricsRes.json(),
      ]);
      if (projectsJson.success) {
        setProjects(projectsJson.data.projects ?? []);
        setMetrics(projectsJson.data.metrics ?? null);
      }
      if (metricsJson.success && !metrics) setMetrics(metricsJson.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handlePrint() {
    window.print();
  }

  const enriched = projects.map(enrichProject);
  const singleProject = enriched.find(p => p.project_id === selectedProject);

  const REPORT_TYPES: { type: ReportType; label: string; desc: string }[] = [
    { type: "executive",  label: "Executivo",       desc: "Visão geral do portfólio para diretoria" },
    { type: "health",     label: "Saúde R/Y/G",     desc: "Status detalhado por projeto" },
    { type: "financial",  label: "Financeiro",      desc: "Budget vs real, margens, custos" },
    { type: "project",    label: "Projeto Único",   desc: "Relatório detalhado por projeto" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 print:hidden">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Relatórios Executivos</h1>
              <p className="text-xs text-gray-500">Status reports · Sumários · Stakeholder reports</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Printer size={14} /> Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* Report Type Selector */}
        <div className="print:hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {REPORT_TYPES.map(({ type, label, desc }) => (
              <button key={type} onClick={() => setReportType(type)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  reportType === type
                    ? "border-brand-300 bg-brand-50 ring-2 ring-brand-200"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className={`text-sm font-bold mb-1 ${reportType === type ? "text-brand-700" : "text-gray-800"}`}>
                  {label}
                </div>
                <div className="text-[10px] text-gray-500">{desc}</div>
              </button>
            ))}
          </div>

          {reportType === "project" && (
            <div className="mt-3">
              <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                <option value="">Selecionar projeto…</option>
                {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Report Content */}
        <div ref={printRef}>
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-sm text-gray-400">
              Gerando relatório…
            </div>
          ) : !metrics ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-sm text-gray-400">
              Sem dados disponíveis.
            </div>
          ) : reportType === "executive" ? (
            <ExecutiveReport projects={enriched} metrics={metrics} />
          ) : reportType === "health" ? (
            <HealthReport projects={enriched} />
          ) : reportType === "financial" ? (
            <FinancialReport projects={enriched} metrics={metrics} />
          ) : reportType === "project" ? (
            singleProject ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Project Report */}
                <div className="px-8 py-6 border-b border-gray-100">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">AWQ Group · PPM</div>
                  <h2 className="text-xl font-bold text-gray-900">{singleProject.project_name}</h2>
                  <p className="text-xs text-gray-400 mt-1">{singleProject.project_code} · {singleProject.bu_code}</p>
                </div>
                <div className="px-8 py-6 space-y-6">
                  {/* Charter */}
                  <section className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase mb-2">Objetivos</div>
                      <p className="text-sm text-gray-700">{singleProject.objectives ?? singleProject.description ?? "—"}</p>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase mb-2">Critérios de Sucesso</div>
                      <p className="text-sm text-gray-700">{singleProject.success_criteria ?? "—"}</p>
                    </div>
                  </section>
                  {/* KPIs */}
                  <section>
                    <div className="text-xs font-bold text-gray-500 uppercase mb-3">Indicadores</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Conclusão",   value: `${singleProject.completion_pct ?? 0}%` },
                        { label: "Revenue",     value: formatBRL(singleProject.budget_revenue) },
                        { label: "Custo Real",  value: formatBRL(singleProject.actual_cost) },
                        { label: "Margem",      value: `${singleProject.margin_pct.toFixed(1)}%` },
                      ].map(({ label, value }) => (
                        <div key={label} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                          <div className="text-[10px] text-gray-500 uppercase mb-1">{label}</div>
                          <div className="text-lg font-bold text-gray-900">{value}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                  {/* Health */}
                  {(() => {
                    const cfg = HEALTH_CONFIG[singleProject.health_status as HealthStatus];
                    const Icon = cfg.icon;
                    return (
                      <div className={`rounded-lg border p-4 ${cfg.bg} ${cfg.border}`}>
                        <div className={`flex items-center gap-2 font-bold text-sm mb-1 ${cfg.color}`}>
                          <Icon size={14} /> Status: {cfg.label}
                        </div>
                        {singleProject.health_notes && (
                          <p className={`text-sm ${cfg.color}`}>{singleProject.health_notes}</p>
                        )}
                      </div>
                    );
                  })()}
                  <div className="text-[10px] text-gray-400 pt-2 border-t border-gray-100">
                    Gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} · AWQ Group PPM
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-sm text-gray-400">
                Selecione um projeto acima para gerar o relatório.
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
