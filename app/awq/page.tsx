import Header from "@/components/Header";
import Link from "next/link";
import {
    BarChart3,
    Building2,
    TrendingUp,
    DollarSign,
    Users,
    Activity,
    Zap,
    ChevronRight,
    ArrowUpRight,
    LineChart,
    Briefcase,
} from "lucide-react";
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
const jRevenue   = jacqesKpis.find(k => k.id === "revenue")!.value;   // 4_821_500
const jMargin    = jacqesKpis.find(k => k.id === "margin")!.value;    // 67.4
const jCustomers = jacqesKpis.find(k => k.id === "customers")!.value; // 3_847
const jProfit    = revenueData[revenueData.length - 1].profit;         // 3_241_500

// ── Caza Vision (lib/caza-data.ts) ───────────────────────────────────────────
const cazaYtd  = cazaRevenueData.filter(r => r.month.includes("/26"));
const cReceita = cazaYtd.reduce((s, r) => s + r.receita, 0); // 2_418_000
const cLucro   = cazaYtd.reduce((s, r) => s + r.profit,  0); // 1_730_000
const cMargem  = cReceita > 0 ? (cLucro / cReceita * 100) : 0;

// ── Data ──────────────────────────────────────────────────────────────────────

const GROUP_KPIS = [
  {
        label: "Receita Consolidada",
        value: fmtUSD(jRevenue),
        sub: "YTD · Março 2026",
        icon: DollarSign,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
  },
  {
        label: "Business Units Ativas",
        value: "3 / 4",
        sub: "JACQES, Caza Vision e Advisor",
        icon: Building2,
        color: "text-brand-500",
        bg: "bg-brand-500/10",
  },
  {
        label: "Clientes no Grupo",
        value: jCustomers.toLocaleString("pt-BR"),
        sub: "Base ativa JACQES",
        icon: Users,
        color: "text-violet-500",
        bg: "bg-violet-500/10",
  },
  {
        label: "Margem Média",
        value: jMargin.toFixed(1) + "%",
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
        sub: "Agência",
        href: "https://contato22.github.io/jacqes-bi/",
        color: "bg-brand-600",
        icon: BarChart3,
        status: "Ativa",
        statusColor: "badge-green",
        kpis: [
          { label: "Receita", value: fmtUSD(jRevenue) },
          { label: "Lucro",   value: fmtUSD(jProfit) },
          { label: "Margem",  value: jMargin.toFixed(1) + "%" },
        ],
  },
  {
        id: "caza",
        label: "Caza Vision",
        sub: "Produtora",
        href: "/caza-vision",
        color: "bg-emerald-600",
        icon: Building2,
        status: "Ativa",
        statusColor: "badge-green",
        kpis: [
          { label: "Receita YTD", value: fmtBRL(cReceita) },
          { label: "Lucro YTD",   value: fmtBRL(cLucro) },
          { label: "Margem",      value: cMargem.toFixed(1) + "%" },
        ],
  },
  {
        id: "venture",
        label: "AWQ Venture",
        sub: "Investimentos",
        href: "/awq-venture",
        color: "bg-amber-600",
        icon: TrendingUp,
        status: "Em breve",
        statusColor: "badge-yellow",
        kpis: [
          { label: "Portfolio", value: "—" },
          { label: "AUM",       value: "—" },
          { label: "IRR",       value: "—" },
        ],
  },
  {
        id: "advisor",
        label: "Advisor",
        sub: "Consultoria",
        href: "https://contato22.github.io/advisor-bi/",
        color: "bg-violet-600",
        icon: Briefcase,
        status: "Ativa",
        statusColor: "badge-green",
        kpis: [
          { label: "Clientes", value: "—" },
          { label: "AUM",      value: "—" },
          { label: "Retorno",  value: "—" },
        ],
  },
];

const ACTIVITY = [
  { label: `JACQES atingiu margem de ${jMargin.toFixed(1)}% em Março`, time: "Hoje", type: "success" },
  { label: `${jCustomers.toLocaleString("pt-BR")} clientes ativos na base JACQES`, time: "Atualizado", type: "info" },
  { label: `Caza Vision — ${fmtBRL(cReceita)} receita YTD, margem ${cMargem.toFixed(1)}%`, time: "Atualizado", type: "success" },
  { label: "AWQ Venture — estruturação do fundo em andamento", time: "Planejado", type: "warn" },
];

export default function AwqGroupPage() {
    return (
          <>
                <Header title="AWQ Group" subtitle="Visão geral consolidada do grupo · Março 2026" />
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
                                              <div
                                                                    className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                                                                            item.type === "success"
                                                                                              ? "bg-emerald-500"
                                                                                              : item.type === "warn"
                                                                                              ? "bg-amber-500"
                                                                                              : "bg-brand-500"
                                                                    }`}
                                                                  />
                                              <div>
                                                                  <div className="text-xs text-gray-300">{item.label}</div>
                                                                  <div className="text-[10px] text-gray-600 mt-0.5">{item.time}</div>
                                              </div>
                            </div>
                          ))}
                                              </div>
                                  </div>
                        </div>

                  {/* Financial quick access */}
                        <Link
                                    href="/financial"
                                    className="card p-4 flex items-center gap-4 border border-gray-800 hover:border-brand-700 hover:bg-brand-900/20 transition-all group"
                                  >
                                  <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-700/40 flex items-center justify-center shrink-0">
                                              <LineChart size={18} className="text-brand-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                              <div className="text-sm font-bold text-white">Financial</div>
                                              <div className="text-xs text-gray-500 mt-0.5">Receita, margem e canais de aquisição</div>
                                  </div>
                                  <div className="hidden sm:flex items-center gap-6 mr-2">
                                    {[
                                    { label: "Receita Total", value: fmtUSD(jRevenue) },
                                    { label: "Lucro Total",   value: fmtUSD(jProfit) },
                                    { label: "Margem Média",  value: jMargin.toFixed(1) + "%" },
                                                ].map((s) => (
                                                                <div key={s.label} className="text-center">
                                                                                <div className="text-sm font-bold text-white">{s.value}</div>
                                                                                <div className="text-[10px] text-gray-600">{s.label}</div>
                                                                </div>
                                                              ))}
                                  </div>
                                  <ChevronRight size={16} className="text-brand-400 shrink-0" />
                        </Link>
                </div>
          </>
        );
}
