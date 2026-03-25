import Header from "@/components/Header";
import Link from "next/link";
import { BarChart3, Building2, TrendingUp, ChevronRight, Users, DollarSign } from "lucide-react";

const BUS = [
  {
    id: "jacqes",
    label: "JACQES",
    sub: "Agência · AWQ Group",
    href: "/jacqes",
    color: "bg-brand-600",
    borderColor: "border-brand-200",
    bgColor: "bg-brand-50",
    textColor: "text-brand-700",
    badgeColor: "bg-brand-100 text-brand-600 border-brand-200",
    icon: BarChart3,
    kpis: [
      { label: "Receita", value: "$4.82M" },
      { label: "Clientes", value: "3.847" },
      { label: "Margem", value: "67.4%" },
    ],
    status: "Ativa",
    statusColor: "badge-green",
  },
  {
    id: "caza",
    label: "Caza Vision",
    sub: "Tecnologia · AWQ Group",
    href: "/caza-vision",
    color: "bg-emerald-600",
    borderColor: "border-emerald-200",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    badgeColor: "bg-emerald-100 text-emerald-600 border-emerald-200",
    icon: Building2,
    kpis: [
      { label: "Projetos", value: "—" },
      { label: "Equipe", value: "—" },
      { label: "Pipeline", value: "—" },
    ],
    status: "Em breve",
    statusColor: "badge-yellow",
  },
  {
    id: "venture",
    label: "AWQ Venture",
    sub: "Investimentos · AWQ Group",
    href: "/awq-venture",
    color: "bg-amber-600",
    borderColor: "border-amber-200",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    badgeColor: "bg-amber-100 text-amber-600 border-amber-200",
    icon: TrendingUp,
    kpis: [
      { label: "Portfolio", value: "—" },
      { label: "AUM", value: "—" },
      { label: "IRR", value: "—" },
    ],
    status: "Em breve",
    statusColor: "badge-yellow",
  },
];

export default function BusinessUnitsPage() {
  return (
    <>
      <Header
        title="Business Units"
        subtitle="Portfolio de empresas do AWQ Group"
      />

      <div className="px-8 py-6 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Building2, label: "Total de BUs", value: "3" },
            { icon: Users, label: "BUs Ativas", value: "1" },
            { icon: DollarSign, label: "Receita Consolidada", value: "$4.82M" },
          ].map((s) => (
            <div key={s.label} className="card p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                <s.icon size={16} className="text-gray-400" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* BU Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BUS.map((bu) => {
            const Icon = bu.icon;
            const isActive = bu.status === "Ativa";

            return (
              <Link
                key={bu.id}
                href={bu.href}
                className={`card p-6 flex flex-col gap-5 border-2 transition-all hover:scale-[1.01] hover:shadow-lg ${
                  isActive ? "cursor-pointer" : "cursor-default opacity-75"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-xl ${bu.color} flex items-center justify-center shadow-md`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <span className={`badge ${bu.statusColor}`}>{bu.status}</span>
                </div>

                {/* Name */}
                <div>
                  <div className="text-lg font-bold text-white">{bu.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{bu.sub}</div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-800">
                  {bu.kpis.map((kpi) => (
                    <div key={kpi.label} className="text-center">
                      <div className="text-sm font-bold text-white">{kpi.value}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{kpi.label}</div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-500">
                    {isActive ? "Clique para acessar" : "Em desenvolvimento"}
                  </span>
                  {isActive && <ChevronRight size={14} className="text-brand-400" />}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
