import Header from "@/components/Header";
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

// ─── Status badges ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string; Icon: React.ElementType }> = {
  "Em Produção":         { label: "Em Produção",         className: "bg-brand-50 text-brand-600 border border-brand-200",       Icon: Clock       },
  "Em Edição":           { label: "Em Edição",           className: "bg-amber-50 text-amber-700 border border-amber-200",       Icon: Clock       },
  "Entregue":            { label: "Entregue",            className: "bg-emerald-50 text-emerald-600 border border-emerald-200", Icon: CheckCircle2 },
  "Aguardando Aprovação":{ label: "Aguardando Aprovação",className: "bg-violet-50 text-violet-700 border border-violet-200",   Icon: CheckCircle2 },
};

const alertIcon: Record<string, React.ElementType> = {
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
};

const alertColor: Record<string, string> = {
  success: "text-emerald-600",
  info: "text-brand-600",
  warning: "text-amber-700",
  error: "text-red-600",
};

// ─── KPI icons ─────────────────────────────────────────────────────────────────

const kpiIconMap: Record<string, React.ElementType> = {
  Building2,
  DollarSign,
  HandshakeIcon: CheckCircle2,
  TrendingUp,
};

const kpiColorMap: Record<string, { text: string; bg: string }> = {
  emerald: { text: "text-emerald-600", bg: "bg-emerald-50" },
  brand:   { text: "text-brand-600",   bg: "bg-brand-50"   },
  violet:  { text: "text-violet-700",  bg: "bg-violet-50"  },
  amber:   { text: "text-amber-700",   bg: "bg-amber-50"   },
};

// ─── Pipeline Summary ─────────────────────────────────────────────────────────

const pipeline = [
  { stage: "Briefings",         count: 12, color: "bg-gray-500"   },
  { stage: "Em Proposta",       count:  8, color: "bg-blue-500"   },
  { stage: "Aprovados",         count: 23, color: "bg-amber-500"  },
  { stage: "Em Pós-Produção",   count:  6, color: "bg-violet-500" },
  { stage: "Entregues",         count: 34, color: "bg-emerald-500"},
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaVisionPage() {
  const lastMonth = cazaRevenueData[cazaRevenueData.length - 1];
  const prevMonth = cazaRevenueData[cazaRevenueData.length - 2];

  return (
    <>
      <Header title="Caza Vision" subtitle="Produtora de Conteúdo · AWQ Group" />
      <div className="page-content">

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
              <div key={kpi.id} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={colors.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-900">{displayValue}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{kpi.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {up ? (
                      <ArrowUpRight size={11} className="text-emerald-600" />
                    ) : (
                      <ArrowDownRight size={11} className="text-red-600" />
                    )}
                    <span className={`text-[10px] font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>
                      {up ? "+" : ""}{delta}%
                    </span>
                    <span className="text-[10px] text-gray-400">vs período anterior</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pipeline + Alerts ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Pipeline */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Pipeline de Projetos</h2>
            <div className="space-y-3">
              {pipeline.map((s) => {
                const total = pipeline.reduce((sum, x) => sum + x.count, 0);
                const widthPct = Math.round((s.count / total) * 100);
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <div className="w-32 text-xs text-gray-400 text-right shrink-0">{s.stage}</div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: `${widthPct}%` }} />
                    </div>
                    <div className="w-8 text-xs font-semibold text-gray-900 text-right shrink-0">{s.count}</div>
                  </div>
                );
              })}
            </div>
            {/* Project type split */}
            <div className="mt-5 pt-4 border-t border-gray-200 grid grid-cols-3 gap-2">
              {projectTypeRevenue.slice(0, 3).map((pt) => (
                <div key={pt.type} className="text-center">
                  <div className="text-sm font-bold text-gray-900">{pt.projetos}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{pt.type.split(" ")[0]}</div>
                  <div className="text-[10px] text-emerald-600">{fmtCurrency(pt.receita)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Alertas & Destaques</h2>
            <div className="space-y-3">
              {cazaAlerts.map((alert) => {
                const Icon = alertIcon[alert.type] ?? Info;
                const color = alertColor[alert.type] ?? "text-gray-400";
                return (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-100 border border-gray-300/50">
                    <Icon size={15} className={`${color} mt-0.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900">{alert.title}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{alert.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Receita Trend (last 3 months) ─────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Receita — Últimos 3 Meses</h2>
            <div className="flex items-center gap-1">
              <ArrowUpRight size={13} className="text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-600">
                +{pct(lastMonth.receita, prevMonth.receita)}% vs mês anterior
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {cazaRevenueData.slice(-3).map((m) => {
              const margin = ((m.profit / m.receita) * 100).toFixed(1);
              return (
                <div key={m.month} className="p-4 rounded-xl bg-gray-100 border border-gray-300/50">
                  <div className="text-xs text-gray-500 mb-2">{m.month}</div>
                  <div className="text-lg font-bold text-gray-900">{fmtCurrency(m.receita)}</div>
                  <div className="text-[11px] text-emerald-600 mt-1">Receita</div>
                  <div className="mt-2 pt-2 border-t border-gray-300/50 flex justify-between text-[10px]">
                    <span className="text-red-600">{fmtCurrency(m.expenses)} despesas</span>
                    <span className="text-gray-500">{margin}% margem</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">Orç: {fmtCurrency(m.orcamento)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Recent Projects ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Projetos Recentes</h2>
            <a href="/caza-vision/imoveis" className="text-xs text-emerald-600 hover:text-emerald-300 transition-colors">
              Ver todos →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Projeto</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Diretor</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Prazo</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {projetos.slice(0, 6).map((p) => {
                  const sc = statusConfig[p.status];
                  const StatusIcon = sc?.Icon ?? CheckCircle2;
                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="text-gray-400 font-medium text-xs truncate max-w-[180px]">
                          {p.titulo}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                          <Film size={9} />
                          {p.cliente}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          {p.tipo}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-900 font-semibold text-xs">
                        {fmtCurrency(p.valor)}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">{p.diretor}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">{p.prazo}</td>
                      <td className="py-2.5 px-3">
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
        </div>

      </div>
    </>
  );
}
