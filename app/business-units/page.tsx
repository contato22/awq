import Header from "@/components/Header";
import Link from "next/link";
import { BarChart3, Building2, TrendingUp, ChevronRight, Users, DollarSign, Briefcase } from "lucide-react";
import { kpis as jacqesKpis } from "@/lib/data";

// ── Formatters ──────────────────────────────────────────────────────────────
function fmtRevenue(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$ " + n.toLocaleString("pt-BR");
  return "R$ " + n.toLocaleString("pt-BR");
}
function fmtNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}
function fmtPct(n: number): string {
  return n.toFixed(1) + "%";
}

// ── JACQES KPIs from shared data source (lib/data.ts) ──────────────────────
const _revenue   = jacqesKpis.find((k) => k.id === "revenue")?.value   ?? 0;
const _customers = jacqesKpis.find((k) => k.id === "customers")?.value ?? 0;
const _margin    = jacqesKpis.find((k) => k.id === "margin")?.value    ?? 0;

const BUS = [
  {
    id: "jacqes",
    label: "JACQES",
    sub: "Agência",
    href: "https://contato22.github.io/jacqes-bi/financial/",
    color: "bg-brand-600",
    borderColor: "border-brand-200",
    bgColor: "bg-brand-50",
    textColor: "text-brand-700",
    badgeColor: "bg-brand-100 text-brand-600 border-brand-200",
    icon: BarChart3,
    kpis: [
      { label: "Receita",  value: fmtRevenue(_revenue)   },
      { label: "Clientes", value: fmtNumber(_customers)  },
      { label: "Margem",   value: fmtPct(_margin)        },
    ],
    status: "Ativa",
    statusColor: "bg-emerald-100 text-emerald-600 border-emerald-200",
  },
  {
    id: "caza",
    label: "Caza Vision",
    sub: "Produtora",
    href: "/caza-vision",
    color: "bg-emerald-600",
    borderColor: "border-emerald-200",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    badgeColor: "bg-emerald-100 text-emerald-600 border-emerald-200",
    icon: Building2,
    kpis: [
      { label: "Projetos Ativos", value: "23" },
      { label: "Proj. Entregues", value: "34" },
      { label: "Receita YTD", value: "R$2.42M" },
    ],
    status: "Ativa",
    statusColor: "bg-emerald-100 text-emerald-600 border-emerald-200",
  },
  {
    id: "venture",
    label: "AWQ Venture",
    sub: "Investimentos",
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
    statusColor: "bg-amber-100 text-amber-600 border-amber-200",
  },
  {
    id: "advisor",
    label: "Advisor",
    sub: "Consultoria",
    href: "https://contato22.github.io/advisor-bi/",
    color: "bg-violet-600",
    borderColor: "border-violet-200",
    bgColor: "bg-violet-50",
    textColor: "text-violet-700",
    badgeColor: "bg-violet-100 text-violet-600 border-violet-200",
    icon: Briefcase,
    kpis: [
      { label: "Clientes", value: "—" },
      { label: "AUM", value: "—" },
      { label: "Retorno", value: "—" },
    ],
    status: "Ativa",
    statusColor: "bg-emerald-100 text-emerald-600 border-emerald-200",
  },
];

export default function BusinessUnitsPage() {
  return (
    <>
      <Header title="Business Units" subtitle="Portfolio de empresas do AWQ Group" />
      <div className="page-container">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Building2, label: "Total de BUs", value: "4" },
            { icon: Users, label: "BUs Ativas", value: "3" },
            { icon: DollarSign, label: "Receita Consolidada", value: "$4.82M" },
          ].map((s) => (
            <div key={s.label} className="card p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                <s.icon size={16} className="text-gray-400" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* BU Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BUS.map((bu) => {
            const Icon = bu.icon;
            const isActive = bu.status === "Ativa";
            return (
              <Link
                key={bu.id}
                href={bu.href}
                className={`card card-interactive p-6 flex flex-col gap-5 ${
                  isActive ? "cursor-pointer" : "cursor-default opacity-60 pointer-events-none"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-xl ${bu.bgColor} flex items-center justify-center`}>
                    <Icon size={20} className={bu.textColor} />
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${bu.badgeColor}`}>{bu.status}</span>
                </div>

                {/* Name */}
                <div>
                  <div className="text-lg font-bold text-gray-900">{bu.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{bu.sub} · AWQ Group</div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                  {bu.kpis.map((kpi) => (
                    <div key={kpi.label} className="text-center">
                      <div className="text-sm font-bold text-gray-900 tabular-nums">{kpi.value}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{kpi.label}</div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-500">
                    {isActive ? "Acessar dashboard" : "Em desenvolvimento"}
                  </span>
                  {isActive && <ChevronRight size={14} className="text-brand-500" />}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
