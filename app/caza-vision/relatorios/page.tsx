import Header from "@/components/Header";
import { cazaRevenueData, projetos, projectTypeRevenue, cazaClients } from "@/lib/caza-data";
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  Film,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

// ─── Report Definitions ───────────────────────────────────────────────────────

const reports = [
  {
    id: "prod-mensal",
    title: "Relatório de Produção Mensal",
    description: "Visão consolidada de projetos, entregas, receita e indicadores operacionais do mês.",
    icon: Film,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    frequency: "Mensal",
    lastGenerated: "Mar/26",
  },
  {
    id: "financeiro-ytd",
    title: "Demonstrativo Financeiro YTD",
    description: "Receita, despesas, margem e comparativo com orçamento — acumulado do ano.",
    icon: DollarSign,
    color: "text-brand-600",
    bg: "bg-brand-50",
    frequency: "Mensal",
    lastGenerated: "Mar/26",
  },
  {
    id: "clientes",
    title: "Relatório de Clientes",
    description: "Base de clientes ativa, concentração de receita, status de propostas e budget gerenciado.",
    icon: Users,
    color: "text-violet-700",
    bg: "bg-violet-50",
    frequency: "Mensal",
    lastGenerated: "Mar/26",
  },
  {
    id: "pipeline",
    title: "Status do Pipeline",
    description: "Pipeline de projetos, propostas em negociação, taxas de conversão e forecast.",
    icon: TrendingUp,
    color: "text-amber-700",
    bg: "bg-amber-50",
    frequency: "Semanal",
    lastGenerated: "Sem 13/26",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaRelatoriosPage() {
  const lastMonth = cazaRevenueData[cazaRevenueData.length - 1];
  const activeProjects = projetos.filter((p) => p.status !== "Entregue");
  const delivered = projetos.filter((p) => p.status === "Entregue");
  const activeClients = cazaClients.filter((c) => c.status === "Ativo").length;

  return (
    <>
      <Header title="Relatórios — Caza Vision" subtitle="Relatórios gerenciais e operacionais" />
      <div className="px-8 py-6 space-y-6">

        {/* ── Quick Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Receita Mar/26",     value: fmtCurrency(lastMonth.receita),  icon: DollarSign,  color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Projetos Ativos",    value: String(activeProjects.length),    icon: Clock,       color: "text-brand-600",   bg: "bg-brand-50" },
            { label: "Entregues YTD",      value: String(delivered.length),         icon: CheckCircle2,color: "text-violet-700",  bg: "bg-violet-50" },
            { label: "Clientes Ativos",    value: String(activeClients),            icon: Users,       color: "text-amber-700",   bg: "bg-amber-50" },
          ].map((kpi) => {
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

        {/* ── Available Reports ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <div key={report.id} className="card p-5 flex items-start gap-4 group hover:border-emerald-200 transition-colors">
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
                <button className="shrink-0 p-2 rounded-lg bg-gray-100 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors" title="Baixar relatório">
                  <Download size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Monthly Summary Table ────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Resumo Mensal — Últimos 6 Meses</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Despesas</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Margem</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Orçamento</th>
                </tr>
              </thead>
              <tbody>
                {cazaRevenueData.slice(-6).map((row) => {
                  const margin = ((row.profit / row.receita) * 100).toFixed(1);
                  return (
                    <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3 text-xs font-medium text-gray-800">{row.month}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtCurrency(row.receita)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-red-600">{fmtCurrency(row.expenses)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-emerald-600 font-semibold">{fmtCurrency(row.profit)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{margin}%</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-400">{fmtCurrency(row.orcamento)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Type Breakdown ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Receita por Tipo de Projeto</h2>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            {projectTypeRevenue.map((pt) => (
              <div key={pt.type} className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                <div className="text-lg font-bold text-gray-900">{fmtCurrency(pt.receita)}</div>
                <div className="text-xs text-gray-500 mt-1">{pt.type}</div>
                <div className="text-[10px] text-gray-400 mt-1">{pt.projetos} projetos · {fmtCurrency(pt.avgValue)} ticket</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
