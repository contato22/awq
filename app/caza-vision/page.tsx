import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import {
  cazaKpis,
  cazaRevenueData,
  projetos,
  cazaAlerts,
  projectTypeRevenue,
} from "@/lib/caza-data";
import {
  Building2,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Film,
  CheckCircle2,
  Clock,
  Info,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  BarChart3,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

function fmtNumber(n: number) {
  return n.toLocaleString("pt-BR");
}

function pct(current: number, previous: number) {
  return (((current - previous) / previous) * 100).toFixed(1);
}

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string; Icon: React.ElementType }> = {
  "Em Produção":         { label: "Em Produção",         className: "bg-brand-50 text-brand-600 ring-1 ring-brand-200/60",     Icon: Clock       },
  "Em Edição":           { label: "Em Edição",           className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",     Icon: Clock       },
  "Entregue":            { label: "Entregue",            className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60", Icon: CheckCircle2 },
  "Aguardando Aprovação":{ label: "Aguardando Aprovação",className: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",   Icon: CheckCircle2 },
};

const alertIcon: Record<string, React.ElementType> = {
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
};

const alertBg: Record<string, string> = {
  success: "bg-emerald-50 border-emerald-200/60",
  info:    "bg-blue-50 border-blue-200/60",
  warning: "bg-amber-50 border-amber-200/60",
  error:   "bg-red-50 border-red-200/60",
};

const alertTextColor: Record<string, string> = {
  success: "text-emerald-700",
  info:    "text-blue-700",
  warning: "text-amber-800",
  error:   "text-red-700",
};

// ─── KPI Config ───────────────────────────────────────────────────────────────

const kpiIconMap: Record<string, React.ElementType> = {
  Building2,
  DollarSign,
  HandshakeIcon: CheckCircle2,
  TrendingUp,
};

const kpiColorMap: Record<string, { text: string; bg: string }> = {
  emerald: { text: "text-emerald-600", bg: "bg-emerald-50" },
  brand:   { text: "text-brand-600",   bg: "bg-brand-50"   },
  violet:  { text: "text-violet-600",  bg: "bg-violet-50"  },
  amber:   { text: "text-amber-700",   bg: "bg-amber-50"   },
};

// ─── Pipeline ─────────────────────────────────────────────────────────────────

const pipeline: { stage: string; count: number; color: string }[] = [];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaVisionPage() {
  const lastMonth = cazaRevenueData.length > 0 ? cazaRevenueData[cazaRevenueData.length - 1] : null;
  const prevMonth = cazaRevenueData.length > 1 ? cazaRevenueData[cazaRevenueData.length - 2] : null;

  return (
    <>
      <Header title="Caza Vision — Overview" subtitle="Produtora de Conteúdo · AWQ Group · Mar 2026" />
      <div className="page-container">

        {/* ── KPI Cards ──────────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cazaKpis.map((kpi) => {
              const Icon = kpiIconMap[kpi.icon] ?? Building2;
              const colors = kpiColorMap[kpi.color] ?? kpiColorMap.emerald;
              const delta = pct(kpi.value, kpi.previousValue);
              const up = kpi.value >= kpi.previousValue;
              const displayValue =
                kpi.unit === "currency"
                  ? fmtCurrency(kpi.value)
                  : kpi.unit === "percent"
                  ? kpi.value.toFixed(1) + "%"
                  : fmtNumber(kpi.value);
              return (
                <div key={kpi.id} className="card card-hover p-5 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={17} className={colors.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight">{displayValue}</div>
                    <div className="text-xs font-medium text-gray-500 mt-1">{kpi.label}</div>
                    <div className="flex items-center gap-1 mt-1.5">
                      {up ? (
                        <ArrowUpRight size={11} className="text-emerald-600 shrink-0" />
                      ) : (
                        <ArrowDownRight size={11} className="text-red-600 shrink-0" />
                      )}
                      <span className={`text-[11px] font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>
                        {up ? "+" : ""}{delta}%
                      </span>
                      <span className="text-[10px] text-gray-400 hidden sm:inline">vs anterior</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Pipeline + Alerts ──────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Pipeline */}
          <section className="card p-5 lg:p-6">
            <SectionHeader
              icon={<BarChart3 size={15} className="text-emerald-500" />}
              title="Pipeline de Projetos"
            />
            <div className="space-y-3">
              {pipeline.map((s) => {
                const total = pipeline.reduce((sum, x) => sum + x.count, 0);
                const widthPct = Math.max(4, Math.round((s.count / total) * 100));
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <div className="w-28 lg:w-32 text-xs text-gray-500 text-right shrink-0 font-medium">{s.stage}</div>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.color} transition-all duration-500`} style={{ width: `${widthPct}%` }} />
                    </div>
                    <div className="w-8 text-xs font-bold text-gray-900 text-right shrink-0 tabular-nums">{s.count}</div>
                  </div>
                );
              })}
            </div>
            {/* Project type split */}
            <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3">
              {projectTypeRevenue.slice(0, 3).map((pt) => (
                <div key={pt.type} className="text-center p-2 rounded-lg bg-gray-50">
                  <div className="text-sm font-bold text-gray-900">{pt.projetos}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5 font-medium">{pt.type.split(" ")[0]}</div>
                  <div className="text-[11px] text-emerald-600 font-semibold">{fmtCurrency(pt.receita)}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Alerts */}
          <section className="card p-5 lg:p-6">
            <SectionHeader
              icon={<AlertTriangle size={15} className="text-amber-500" />}
              title="Alertas & Destaques"
            />
            <div className="space-y-2.5">
              {cazaAlerts.length === 0 ? (
                <EmptyState
                  compact
                  title="Nenhum alerta"
                  description="Nenhum alerta ou destaque pendente"
                  icon={<CheckCircle size={20} className="text-emerald-500" />}
                />
              ) : (
                cazaAlerts.map((alert) => {
                  const Icon = alertIcon[alert.type] ?? Info;
                  const bg = alertBg[alert.type] ?? "bg-gray-50 border-gray-200";
                  const color = alertTextColor[alert.type] ?? "text-gray-600";
                  return (
                    <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${bg} border`}>
                      <Icon size={14} className={`${color} mt-0.5 shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-900">{alert.title}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{alert.message}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* ── Receita Trend ──────────────────────────────────────── */}
        <section className="card p-5 lg:p-6">
          <SectionHeader
            title="Receita — Últimos 3 Meses"
            badge={
              lastMonth && prevMonth ? (
                <div className="flex items-center gap-1 ml-2">
                  <ArrowUpRight size={12} className="text-emerald-600" />
                  <span className="text-[11px] font-semibold text-emerald-600">
                    +{pct(lastMonth.receita, prevMonth.receita)}% vs mês anterior
                  </span>
                </div>
              ) : undefined
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cazaRevenueData.slice(-3).map((m) => {
              const margin = ((m.profit / m.receita) * 100).toFixed(1);
              return (
                <div key={m.month} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="text-xs text-gray-500 mb-2 font-medium">{m.month}</div>
                  <div className="text-lg font-bold text-gray-900 tabular-nums">{fmtCurrency(m.receita)}</div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1">Receita</div>
                  <div className="mt-3 pt-3 border-t border-gray-200/60 flex justify-between text-[11px]">
                    <span className="text-red-600 font-medium">{fmtCurrency(m.expenses)} despesas</span>
                    <span className="text-gray-500 font-medium">{margin}% margem</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1.5">Orç: {fmtCurrency(m.orcamento)}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Recent Projects ────────────────────────────────────── */}
        <section className="card p-5 lg:p-6">
          <SectionHeader
            icon={<Film size={15} className="text-violet-500" />}
            title="Projetos Recentes"
            linkLabel="Ver todos"
            linkHref="/caza-vision/imoveis"
          />
          {projetos.length === 0 ? (
            <EmptyState
              compact
              title="Nenhum projeto"
              description="Nenhum projeto cadastrado no momento"
            />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header">Projeto</th>
                    <th className="table-header">Tipo</th>
                    <th className="table-header-right">Valor</th>
                    <th className="table-header">Diretor</th>
                    <th className="table-header">Prazo</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projetos.slice(0, 6).map((p) => {
                    const sc = statusConfig[p.status];
                    const StatusIcon = sc?.Icon ?? CheckCircle2;
                    return (
                      <tr key={p.id} className="table-row">
                        <td className="py-3 px-3">
                          <div className="text-xs text-gray-900 font-medium truncate max-w-[200px]" title={p.titulo}>
                            {p.titulo}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                            <Film size={9} />
                            {p.cliente}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs text-gray-500 font-medium">{p.tipo}</span>
                        </td>
                        <td className="py-3 px-3 text-right text-gray-900 font-semibold text-xs tabular-nums">
                          {fmtCurrency(p.valor)}
                        </td>
                        <td className="py-3 px-3 text-xs text-gray-500">{p.diretor}</td>
                        <td className="py-3 px-3 text-xs text-gray-500">{p.prazo}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc?.className ?? ""}`}>
                            <StatusIcon size={9} />
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </>
  );
}
