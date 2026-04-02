import Header from "@/components/Header";
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  Briefcase,
  Users,
  TrendingUp,
  Shield,
  BarChart3,
} from "lucide-react";

// ─── Report Definitions ───────────────────────────────────────────────────────

const reports = [
  {
    id: "performance-mensal",
    title: "Relatório de Performance Mensal",
    description: "Retorno das carteiras vs benchmarks, alpha gerado, ranking por estratégia e análise de risco.",
    icon: TrendingUp,
    color: "text-violet-700",
    bg: "bg-violet-50",
    frequency: "Mensal",
    lastGenerated: "Mar/26",
  },
  {
    id: "financeiro",
    title: "Demonstrativo Financeiro",
    description: "Receita de taxas (gestão, performance, consultoria), despesas operacionais e EBITDA.",
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    frequency: "Mensal",
    lastGenerated: "Mar/26",
  },
  {
    id: "clientes",
    title: "Relatório de Clientes & AUM",
    description: "Base de clientes, AUM por perfil, concentração, movimentações e captação líquida.",
    icon: Users,
    color: "text-brand-600",
    bg: "bg-brand-50",
    frequency: "Mensal",
    lastGenerated: "Mar/26",
  },
  {
    id: "risco",
    title: "Relatório de Risco & Compliance",
    description: "Exposição por classe, concentração, limites regulatórios, stress test e alertas de compliance.",
    icon: Shield,
    color: "text-red-600",
    bg: "bg-red-50",
    frequency: "Semanal",
    lastGenerated: "Sem 13/26",
  },
  {
    id: "alocacao",
    title: "Análise de Alocação",
    description: "Distribuição por estratégia, desvio do target, rebalanceamento sugerido e cenários.",
    icon: BarChart3,
    color: "text-amber-700",
    bg: "bg-amber-50",
    frequency: "Mensal",
    lastGenerated: "Mar/26",
  },
  {
    id: "board",
    title: "Relatório para o Board — AWQ",
    description: "Visão consolidada do sleeve Advisor para a camada de governança da holding.",
    icon: Briefcase,
    color: "text-gray-600",
    bg: "bg-gray-100",
    frequency: "Trimestral",
    lastGenerated: "Q1/26",
  },
];

// ─── Summary data ─────────────────────────────────────────────────────────────

const summaryMetrics = [
  { label: "AUM Total",         value: "R$142.80M", icon: Briefcase,  color: "text-violet-700",  bg: "bg-violet-50" },
  { label: "Carteiras",         value: "6",          icon: Users,      color: "text-brand-600",   bg: "bg-brand-50" },
  { label: "Retorno Médio",     value: "+14.8%",     icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Receita YTD",       value: "R$1.57M",    icon: DollarSign, color: "text-amber-700",   bg: "bg-amber-50" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdvisorRelatoriosPage() {
  return (
    <>
      <Header title="Relatórios — Advisor" subtitle="Relatórios gerenciais, regulatórios e de performance" />
      <div className="px-8 py-6 space-y-6">

        {/* ── Quick Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryMetrics.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={kpi.color} />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{kpi.value}</div>
                  <div className="text-[10px] text-gray-500">{kpi.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Report Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <div key={report.id} className="card p-5 flex items-start gap-4 group hover:border-violet-200 transition-colors">
                <div className={`w-11 h-11 rounded-xl ${report.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={20} className={report.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{report.title}</div>
                  <div className="text-xs text-gray-400 mt-1 leading-relaxed">{report.description}</div>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Calendar size={10} />
                      {report.frequency}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <FileText size={10} />
                      Último: {report.lastGenerated}
                    </div>
                  </div>
                </div>
                <button className="shrink-0 p-2 rounded-lg bg-gray-100 hover:bg-violet-50 text-gray-400 hover:text-violet-700 transition-colors" title="Baixar relatório">
                  <Download size={14} />
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </>
  );
}
