import Header from "@/components/Header";
import {
  cazaKpis,
  cazaRevenueData,
  propertyListings,
  cazaAlerts,
  propertyTypeRevenue,
} from "@/lib/caza-data";
import {
  Building2,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  Home,
  Briefcase,
  TreePine,
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
  Disponível: { label: "Disponível", className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", Icon: CheckCircle2 },
  "Em Negociação": { label: "Em Negociação", className: "bg-amber-500/10 text-amber-400 border border-amber-500/20", Icon: Clock },
  Vendido: { label: "Vendido", className: "bg-brand-500/10 text-brand-400 border border-brand-500/20", Icon: CheckCircle2 },
  Alugado: { label: "Alugado", className: "bg-violet-500/10 text-violet-400 border border-violet-500/20", Icon: Home },
};

const propertyTypeIcon: Record<string, React.ElementType> = {
  Residencial: Home,
  Comercial: Briefcase,
  Terreno: TreePine,
};

const alertIcon: Record<string, React.ElementType> = {
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
};

const alertColor: Record<string, string> = {
  success: "text-emerald-400",
  info: "text-brand-400",
  warning: "text-amber-400",
  error: "text-red-400",
};

// ─── KPI icons ─────────────────────────────────────────────────────────────────

const kpiIconMap: Record<string, React.ElementType> = {
  Building2,
  DollarSign,
  HandshakeIcon: CheckCircle2,
  TrendingUp,
};

const kpiColorMap: Record<string, { text: string; bg: string }> = {
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10" },
  brand:   { text: "text-brand-400",   bg: "bg-brand-500/10"   },
  violet:  { text: "text-violet-400",  bg: "bg-violet-500/10"  },
  amber:   { text: "text-amber-400",   bg: "bg-amber-500/10"   },
};

// ─── Pipeline Summary ─────────────────────────────────────────────────────────

const pipeline = [
  { stage: "Leads",           count: 42, color: "bg-gray-500" },
  { stage: "Qualificados",    count: 28, color: "bg-blue-500"  },
  { stage: "Em Negociação",   count: 14, color: "bg-amber-500" },
  { stage: "Proposta Enviada",count: 8,  color: "bg-violet-500"},
  { stage: "Fechados",        count: 34, color: "bg-emerald-500"},
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaVisionPage() {
  const lastMonth = cazaRevenueData[cazaRevenueData.length - 1];
  const prevMonth = cazaRevenueData[cazaRevenueData.length - 2];

  return (
    <>
      <Header title="Caza Vision" subtitle="Inteligência Imobiliária · AWQ Group" />
      <div className="px-8 py-6 space-y-6">

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
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
                  <div className="text-2xl font-bold text-white">{displayValue}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{kpi.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {up ? (
                      <ArrowUpRight size={11} className="text-emerald-400" />
                    ) : (
                      <ArrowDownRight size={11} className="text-red-400" />
                    )}
                    <span className={`text-[10px] font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
                      {up ? "+" : ""}{delta}%
                    </span>
                    <span className="text-[10px] text-gray-600">vs período anterior</span>
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
            <h2 className="text-sm font-semibold text-white mb-4">Pipeline de Negócios</h2>
            <div className="space-y-3">
              {pipeline.map((s) => {
                const total = pipeline.reduce((sum, x) => sum + x.count, 0);
                const widthPct = Math.round((s.count / total) * 100);
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <div className="w-32 text-xs text-gray-400 text-right shrink-0">{s.stage}</div>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: `${widthPct}%` }} />
                    </div>
                    <div className="w-8 text-xs font-semibold text-white text-right shrink-0">{s.count}</div>
                  </div>
                );
              })}
            </div>
            {/* Property type split */}
            <div className="mt-5 pt-4 border-t border-gray-800 grid grid-cols-3 gap-2">
              {propertyTypeRevenue.slice(0, 3).map((pt) => (
                <div key={pt.type} className="text-center">
                  <div className="text-sm font-bold text-white">{pt.transactions}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{pt.type.split("—")[0].trim()}</div>
                  <div className="text-[10px] text-emerald-400">{fmtCurrency(pt.gci)} GCI</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Alertas & Destaques</h2>
            <div className="space-y-3">
              {cazaAlerts.map((alert) => {
                const Icon = alertIcon[alert.type] ?? Info;
                const color = alertColor[alert.type] ?? "text-gray-400";
                return (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                    <Icon size={15} className={`${color} mt-0.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white">{alert.title}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{alert.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── GCI Trend (last 3 months) ─────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">GCI — Últimos 3 Meses</h2>
            <div className="flex items-center gap-1">
              <ArrowUpRight size={13} className="text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">
                +{pct(lastMonth.gci, prevMonth.gci)}% vs mês anterior
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {cazaRevenueData.slice(-3).map((m) => {
              const margin = ((m.profit / m.gci) * 100).toFixed(1);
              return (
                <div key={m.month} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                  <div className="text-xs text-gray-500 mb-2">{m.month}</div>
                  <div className="text-lg font-bold text-white">{fmtCurrency(m.gci)}</div>
                  <div className="text-[11px] text-emerald-400 mt-1">GCI</div>
                  <div className="mt-2 pt-2 border-t border-gray-700/50 flex justify-between text-[10px]">
                    <span className="text-red-400">{fmtCurrency(m.expenses)} despesas</span>
                    <span className="text-gray-500">{margin}% margem</span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1">Vol: {fmtCurrency(m.volume)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Recent Listings ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Imóveis Recentes</h2>
            <a href="/caza-vision/imoveis" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              Ver todos →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Imóvel</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Preço</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Área</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Agente</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {propertyListings.slice(0, 6).map((p) => {
                  const TypeIcon = propertyTypeIcon[p.type] ?? Home;
                  const sc = statusConfig[p.status];
                  const StatusIcon = sc?.Icon ?? CheckCircle2;
                  return (
                    <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="text-gray-300 font-medium text-xs truncate max-w-[180px]">
                          {p.address}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-600 mt-0.5">
                          <MapPin size={9} />
                          {p.neighborhood}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <TypeIcon size={12} />
                          {p.type}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-white font-semibold text-xs">
                        {fmtCurrency(p.price)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-400 text-xs">
                        {p.area} m²
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">{p.agent}</td>
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
