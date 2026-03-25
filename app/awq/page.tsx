import Header from "@/components/Header";
import Link from "next/link";
import {
  BarChart3, Building2, TrendingUp, DollarSign, Users,
  Activity, Zap, ChevronRight, ArrowUpRight,
} from "lucide-react";

const GROUP_KPIS = [
  {
    label: "Receita Consolidada",
    value: "$4.82M",
    sub: "YTD · Março 2026",
    icon: DollarSign,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    label: "Business Units Ativas",
    value: "1 / 3",
    sub: "JACQES operacional",
    icon: Building2,
    color: "text-brand-500",
    bg: "bg-brand-500/10",
  },
  {
    label: "Clientes no Grupo",
    value: "3.847",
    sub: "Base ativa JACQES",
    icon: Users,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    label: "Margem Média",
    value: "67.4%",
    sub: "Grupo consolidado",
    icon: Activity,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

const BUS = [
  {
    id: "jacqes",
    label: "JACQES",
    sub: "Agência · AWQ Group",
    href: "/jacqes",
    color: "bg-brand-600",
    icon: BarChart3,
    status: "Ativa",
    statusColor: "badge-green",
    kpis: [
      { label: "Receita", value: "$4.82M" },
      { label: "Clientes", value: "3.847" },
      { label: "Margem", value: "67.4%" },
    ],
  },
  {
    id: "caza",
    label: "Caza Vision",
    sub: "Tecnologia · AWQ Group",
    href: "/caza-vision",
    color: "bg-emerald-600",
    icon: Building2,
    status: "Em breve",
    statusColor: "badge-yellow",
    kpis: [
      { label: "Projetos", value: "—" },
      { label: "Equipe", value: "—" },
      { label: "Pipeline", value: "—" },
    ],
  },
  {
    id: "venture",
    label: "AWQ Venture",
    sub: "Investimentos · AWQ Group",
    href: "/awq-venture",
    color: "bg-amber-600",
    icon: TrendingUp,
    status: "Em breve",
    statusColor: "badge-yellow",
    kpis: [
      { label: "Portfolio", value: "—" },
      { label: "AUM", value: "—" },
      { label: "IRR", value: "—" },
    ],
  },
];

const ACTIVITY = [
  { label: "JACQES atingiu margem de 67.4% em Março", time: "Hoje", type: "success" },
  { label: "3.847 clientes ativos na base JACQES", time: "Atualizado", type: "info" },
  { label: "Caza Vision — lançamento previsto para Q2 2026", time: "Planejado", type: "warn" },
  { label: "AWQ Venture — estruturação do fundo em andamento", time: "Planejado", type: "warn" },
];

export default function AwqGroupPage() {
  return (
    <>
      <Header
        title="AWQ Group"
        subtitle="Visão geral consolidada do grupo · Março 2026"
      />

      <div className="px-8 py-6 space-y-6">
        {/* Group KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {GROUP_KPIS.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={kpi.color} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{kpi.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{kpi.label}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">{kpi.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Business Units + Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* BU cards */}
          <div className="xl:col-span-2 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-white">Business Units</h2>
              <Link href="/business-units" className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                Ver todas <ArrowUpRight size={12} />
              </Link>
            </div>
            {BUS.map((bu) => {
              const Icon = bu.icon;
              const isActive = bu.status === "Ativa";
              return (
                <Link
                  key={bu.id}
                  href={bu.href}
                  className={`card p-4 flex items-center gap-4 border border-gray-800 hover:border-gray-700 transition-all ${!isActive ? "opacity-60" : ""}`}
                >
                  <div className={`w-10 h-10 rounded-xl ${bu.color} flex items-center justify-center shrink-0 shadow-md`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{bu.label}</span>
                      <span className={`badge ${bu.statusColor}`}>{bu.status}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{bu.sub}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 mr-2">
                    {bu.kpis.map((kpi) => (
                      <div key={kpi.label} className="text-center">
                        <div className="text-sm font-bold text-white">{kpi.value}</div>
                        <div className="text-[10px] text-gray-600">{kpi.label}</div>
                      </div>
                    ))}
                  </div>
                  {isActive && <ChevronRight size={16} className="text-brand-400 shrink-0" />}
                </Link>
              );
            })}
          </div>

          {/* Activity */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-awq-gold" />
              <h2 className="text-sm font-semibold text-white">Atividade do Grupo</h2>
            </div>
            <div className="space-y-3">
              {ACTIVITY.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    item.type === "success" ? "bg-emerald-500" :
                    item.type === "warn" ? "bg-amber-500" : "bg-brand-500"
                  }`} />
                  <div>
                    <div className="text-xs text-gray-300">{item.label}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
