import Header from "@/components/Header";
import Link from "next/link";
import { BarChart3, Building2, TrendingUp, ChevronRight, Users, DollarSign, Briefcase } from "lucide-react";
import { kpis as jacqesKpis, revenueData } from "@/lib/data";
import { cazaRevenueData } from "@/lib/caza-data";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtUSD(n: number) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n;
}
function fmtBRL(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

// ── JACQES (lib/data.ts) ──────────────────────────────────────────────────────
const jRevenue = jacqesKpis.find(k => k.id === "revenue")!.value; // 4_821_500
const jMargin  = jacqesKpis.find(k => k.id === "margin")!.value;  // 67.4
const jProfit  = revenueData[revenueData.length - 1].profit;       // 3_241_500

// ── Caza Vision (lib/caza-data.ts) ───────────────────────────────────────────
const cazaYtd  = cazaRevenueData.filter(r => r.month.includes("/26"));
const cReceita = cazaYtd.reduce((s, r) => s + r.receita, 0); // 2_418_000
const cLucro   = cazaYtd.reduce((s, r) => s + r.profit,  0); // 1_730_000
const cMargem  = cReceita > 0 ? (cLucro / cReceita * 100) : 0;

// ── Data ──────────────────────────────────────────────────────────────────────

const BUS = [
  {
    id: "jacqes",
    label: "JACQES",
    sub: "Agência",
    href: "https://contato22.github.io/jacqes-bi/",
    color: "bg-brand-600",
    borderColor: "border-brand-200",
    bgColor: "bg-brand-50",
    textColor: "text-brand-700",
    badgeColor: "bg-brand-100 text-brand-600 border-brand-200",
    icon: BarChart3,
    kpis: [
      { label: "Receita", value: fmtUSD(jRevenue) },
      { label: "Lucro",   value: fmtUSD(jProfit) },
      { label: "Margem",  value: jMargin.toFixed(1) + "%" },
    ],
    status: "Ativa",
    statusColor: "badge-green",
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
      { label: "Receita YTD", value: fmtBRL(cReceita) },
      { label: "Lucro YTD",   value: fmtBRL(cLucro) },
      { label: "Margem",      value: cMargem.toFixed(1) + "%" },
    ],
    status: "Ativa",
    statusColor: "badge-green",
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
      { label: "AUM",       value: "—" },
      { label: "IRR",       value: "—" },
    ],
    status: "Em breve",
    statusColor: "badge-yellow",
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
      { label: "AUM",      value: "—" },
      { label: "Retorno",  value: "—" },
    ],
    status: "Ativa",
    statusColor: "badge-green",
  },
];

const activeBUs   = BUS.filter(b => b.status === "Ativa").length;
const consolidado = fmtUSD(jRevenue);

export default function BusinessUnitsPage() {
  return (
    <>
      <Header title="Business Units" subtitle="Portfolio de empresas do AWQ Group" />
      <div className="px-8 py-6 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Building2,  label: "Total de BUs",         value: String(BUS.length) },
            { icon: Users,      label: "BUs Ativas",           value: String(activeBUs) },
            { icon: DollarSign, label: "Receita Consolidada",  value: consolidado },
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
                  <div className="text-xs text-gray-500 mt-0.5">{bu.sub} · AWQ Group</div>
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
