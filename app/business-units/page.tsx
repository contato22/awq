import Header from "@/components/Header";
import Link from "next/link";
import { BarChart3, Building2, TrendingUp, ChevronRight, Users, DollarSign, Briefcase } from "lucide-react";
import { kpis as jacqesKpis } from "@/lib/data";

function fmtRevenue(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$ " + n.toLocaleString("pt-BR");
  return "R$ " + n.toLocaleString("pt-BR");
}
function fmtNumber(n: number): string { return n.toLocaleString("pt-BR"); }
function fmtPct(n: number): string { return n.toFixed(1) + "%"; }

const _revenue   = jacqesKpis.find((k) => k.id === "revenue")?.value   ?? 0;
const _customers = jacqesKpis.find((k) => k.id === "customers")?.value ?? 0;
const _margin    = jacqesKpis.find((k) => k.id === "margin")?.value    ?? 0;

const BUS = [
  {
    id: "jacqes",
    label: "JACQES",
    sub: "Agência",
    href: "/jacqes",
    color: "bg-brand-600",
    icon: BarChart3,
    kpis: [
      { label: "Receita", value: fmtRevenue(_revenue) },
      { label: "Clientes", value: fmtNumber(_customers) },
      { label: "Margem", value: fmtPct(_margin) },
    ],
    status: "Ativa",
    active: true,
  },
  {
    id: "caza",
    label: "Caza Vision",
    sub: "Produtora",
    href: "/caza-vision",
    color: "bg-emerald-600",
    icon: Building2,
    kpis: [
      { label: "Projetos Ativos", value: "23" },
      { label: "Proj. Entregues", value: "34" },
      { label: "Receita YTD", value: "R$2.42M" },
    ],
    status: "Ativa",
    active: true,
  },
  {
    id: "venture",
    label: "AWQ Venture",
    sub: "Investimentos",
    href: "/awq-venture",
    color: "bg-awq-gold",
    icon: TrendingUp,
    kpis: [
      { label: "Portfolio", value: "—" },
      { label: "AUM", value: "—" },
      { label: "IRR", value: "—" },
    ],
    status: "Em breve",
    active: false,
  },
  {
    id: "advisor",
    label: "Advisor",
    sub: "Consultoria",
    href: "/advisor",
    color: "bg-violet-600",
    icon: Briefcase,
    kpis: [
      { label: "Clientes", value: "—" },
      { label: "AUM", value: "—" },
      { label: "Retorno", value: "—" },
    ],
    status: "Ativa",
    active: true,
  },
];

export default function BusinessUnitsPage() {
  return (
    <>
      <Header title="Business Units" subtitle="Portfolio de empresas do AWQ Group" />
      <div className="px-8 py-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Building2, label: "Total de BUs", value: "4" },
            { icon: Users, label: "BUs Ativas", value: "3" },
            { icon: DollarSign, label: "Receita Consolidada", value: "$4.82M" },
          ].map((s) => (
            <div key={s.label} className="card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <s.icon size={18} className="text-slate-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{s.value}</div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* BU Cards — G4 navy style */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {BUS.map((bu) => {
            const Icon = bu.icon;
            return (
              <Link
                key={bu.id}
                href={bu.href}
                className={`card-elevated flex flex-col transition-all hover:scale-[1.01] hover:shadow-xl ${
                  bu.active ? "cursor-pointer" : "cursor-default opacity-70"
                }`}
              >
                {/* Navy header band */}
                <div className="bg-slate-800 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${bu.color} flex items-center justify-center`}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{bu.label}</div>
                      <div className="text-[10px] text-slate-400">{bu.sub} · AWQ Group</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    bu.active ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {bu.status}
                  </span>
                </div>

                {/* KPIs on white */}
                <div className="px-5 py-4 grid grid-cols-3 gap-2">
                  {bu.kpis.map((kpi) => (
                    <div key={kpi.label} className="text-center">
                      <div className="text-sm font-bold text-slate-800">{kpi.value}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{kpi.label}</div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">
                    {bu.active ? "Acessar dashboard" : "Em desenvolvimento"}
                  </span>
                  {bu.active && <ChevronRight size={14} className="text-awq-gold" />}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
