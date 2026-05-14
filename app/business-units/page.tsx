import Header from "@/components/Header";
import Link from "next/link";
import { BarChart3, Building2, TrendingUp, ChevronRight, Users, DollarSign, Briefcase, Zap, CheckCircle2 } from "lucide-react";
import { buData, consolidated, ventureFeeMRR, ventureFeeARR } from "@/lib/awq-derived-metrics";
import { getAWQGroupKPIs, fmtBRL } from "@/lib/financial-metric-query";

// ── Formatters ──────────────────────────────────────────────────────────────
function fmtR(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}
function fmtPct(n: number): string {
  return n.toFixed(1) + "%";
}

// ── BU display config — links internal; KPIs sourced from awq-group-data ────
const jacqes = buData.find((b) => b.id === "jacqes")!;
const caza   = buData.find((b) => b.id === "caza")!;
const venture = buData.find((b) => b.id === "venture");
const advisor = buData.find((b) => b.id === "advisor");

const BUS = [
  {
    id: "jacqes",
    label: "JACQES",
    sub: "Agência",
    href: "/jacqes",
    bgColor: "bg-brand-50",
    textColor: "text-brand-700",
    badgeColor: "bg-brand-100 text-brand-600 border-brand-200",
    icon: BarChart3,
    kpis: [
      { label: "Receita",  value: fmtR(jacqes.revenue)                },
      { label: "Clientes", value: String(jacqes.customers)            },
      { label: "EBITDA %", value: fmtPct((jacqes.ebitda / jacqes.revenue) * 100) },
    ],
    status: jacqes.status,
    statusColor: "bg-emerald-100 text-emerald-600 border-emerald-200",
  },
  {
    id: "caza",
    label: "Caza Vision",
    sub: "Produtora",
    href: "/caza-vision",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    badgeColor: "bg-emerald-100 text-emerald-600 border-emerald-200",
    icon: Building2,
    kpis: [
      { label: "Receita",  value: fmtR(caza.revenue)                },
      { label: "Clientes", value: String(caza.customers)            },
      { label: "EBITDA %", value: fmtPct((caza.ebitda / caza.revenue) * 100) },
    ],
    status: caza.status,
    statusColor: "bg-emerald-100 text-emerald-600 border-emerald-200",
  },
  {
    id: "venture",
    label: "AWQ Venture",
    sub: "Investimentos (híbrido)",
    href: "/awq-venture",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    badgeColor: "bg-amber-100 text-amber-600 border-amber-200",
    icon: TrendingUp,
    kpis: [
      { label: "Fee MRR",   value: fmtR(ventureFeeMRR) },
      { label: "CDB DI",    value: fmtR(venture?.capitalAllocated ?? 0) },
      { label: "Fee ARR",   value: fmtR(ventureFeeARR) },
    ],
    status: venture?.status ?? "Em construção",
    statusColor: "bg-amber-100 text-amber-600 border-amber-200",
  },
  {
    id: "advisor",
    label: "Advisor",
    sub: "Consultoria (pré-receita)",
    href: "/advisor",
    bgColor: "bg-violet-50",
    textColor: "text-violet-700",
    badgeColor: "bg-violet-100 text-violet-600 border-violet-200",
    icon: Briefcase,
    kpis: [
      { label: "Receita",  value: "—" },
      { label: "Status",   value: "Pré-receita" },
      { label: "Tipo",     value: "Estratégico" },
    ],
    status: advisor?.status ?? "Em construção",
    statusColor: "bg-violet-100 text-violet-600 border-violet-200",
  },
];

export default async function BusinessUnitsPage() {
  const kpis = await getAWQGroupKPIs();

  return (
    <>
      <Header title="Business Units" subtitle="Portfolio de empresas do AWQ Group" />
      <div className="page-container">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Building2,    label: "Total de BUs",              value: String(buData.length),                                         isReal: false },
            { icon: Users,        label: "BUs Ativas",                value: String(buData.filter((b) => b.status === "Ativo").length),     isReal: false },
            { icon: Zap,          label: "FCO Real (base bancária)",  value: kpis.hasRealData ? fmtBRL(kpis.operationalNetCash.value!) : "Aguardando extratos", isReal: true },
          ].map((s) => (
            <div key={s.label} className="card p-5 flex items-center gap-4">
              <div className={`w-9 h-9 rounded-xl ${s.isReal ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50 border border-gray-200"} flex items-center justify-center`}>
                <s.icon size={16} className={s.isReal ? "text-emerald-600" : "text-gray-400"} />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  {s.label}
                  {s.isReal && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={7} /> REAL
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* BU Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BUS.map((bu) => {
            const Icon = bu.icon;
            const isActive = bu.status === "Ativo";
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
                <div className="text-[9px] text-amber-500 font-semibold tracking-wide">⚠ snapshot accrual</div>

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
