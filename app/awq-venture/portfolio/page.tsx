import Header from "@/components/Header";
import {
  TrendingUp,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtMult(x: number) {
  return x.toFixed(2) + "×";
}

function roic(returned: number, invested: number) {
  if (invested === 0) return 0;
  return ((returned - invested) / invested) * 100;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const portfolio = [
  {
    id: "AV001",
    company:     "TechFlow Soluções",
    sector:      "B2B SaaS",
    stage:       "Series A",
    invested:    8_000_000,
    currentVal:  22_400_000,
    returned:    0,
    entryDate:   "Mar 2022",
    status:      "Ativo",
    ownership:   18.5,
    irr:         38.4,
    description: "Plataforma de automação de processos para PMEs. Crescimento de ARR acelerado pós Series A.",
    founders:    "João Silva & Maria Souza",
    location:    "São Paulo, SP",
  },
  {
    id: "AV002",
    company:     "Verde Energia",
    sector:      "CleanTech",
    stage:       "Series B",
    invested:    12_000_000,
    currentVal:  31_200_000,
    returned:    0,
    entryDate:   "Jul 2021",
    status:      "Ativo",
    ownership:   12.0,
    irr:         28.6,
    description: "Soluções de energia solar e armazenamento para indústria. Líder no segmento industrial renovável.",
    founders:    "Carlos Mendes & Ana Lima",
    location:    "Belo Horizonte, MG",
  },
  {
    id: "AV003",
    company:     "Saúde Digital",
    sector:      "HealthTech",
    stage:       "Exit",
    invested:    5_000_000,
    currentVal:  0,
    returned:    18_500_000,
    entryDate:   "Mai 2020",
    status:      "Exitado",
    ownership:   0,
    irr:         52.1,
    description: "Plataforma de telemedicina adquirida por grupo hospitalar nacional em 2025. Exit 3.7×.",
    founders:    "Dr. Lucas Faria",
    location:    "Rio de Janeiro, RJ",
  },
  {
    id: "AV004",
    company:     "AgriSmart",
    sector:      "AgTech",
    stage:       "Seed",
    invested:    2_000_000,
    currentVal:  4_600_000,
    returned:    0,
    entryDate:   "Set 2023",
    status:      "Ativo",
    ownership:   22.0,
    irr:         31.2,
    description: "IoT e analytics para agricultura de precisão. Operando em 4 estados com 120+ clientes.",
    founders:    "Roberto Costa & Fernanda Alves",
    location:    "Ribeirão Preto, SP",
  },
  {
    id: "AV005",
    company:     "FinBridge",
    sector:      "Fintech",
    stage:       "Series A",
    invested:    6_500_000,
    currentVal:  5_200_000,
    returned:    0,
    entryDate:   "Jan 2023",
    status:      "Em monitoramento",
    ownership:   15.0,
    irr:         -6.2,
    description: "Infraestrutura de pagamentos B2B. Crescimento desacelerado — plano de reestruturação em curso.",
    founders:    "Thiago Ramos",
    location:    "São Paulo, SP",
  },
  {
    id: "AV006",
    company:     "Logística Plus",
    sector:      "LogTech",
    stage:       "Series A",
    invested:    7_000_000,
    currentVal:  14_700_000,
    returned:    0,
    entryDate:   "Nov 2022",
    status:      "Ativo",
    ownership:   20.0,
    irr:         24.8,
    description: "Gestão de última milha e roteirização inteligente. Expansão para 12 cidades em 2026.",
    founders:    "Patricia Gomes & André Nunes",
    location:    "Curitiba, PR",
  },
];

const statusIcon: Record<string, React.ElementType> = {
  "Ativo":            CheckCircle2,
  "Exitado":          Zap,
  "Em monitoramento": AlertTriangle,
};

const statusBadge: Record<string, string> = {
  "Ativo":            "badge badge-green",
  "Exitado":          "badge badge-blue",
  "Em monitoramento": "badge badge-yellow",
};

const stageColors: Record<string, string> = {
  "Seed":     "bg-amber-50 text-amber-700",
  "Series A": "bg-brand-50 text-brand-600",
  "Series B": "bg-emerald-50 text-emerald-600",
  "Exit":     "bg-violet-50 text-violet-700",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqVenturePortfolioPage() {
  const ativos   = portfolio.filter((p) => p.status === "Ativo");
  const exitados = portfolio.filter((p) => p.status === "Exitado");
  const monitor  = portfolio.filter((p) => p.status === "Em monitoramento");

  return (
    <>
      <Header
        title="Portfólio — AWQ Venture"
        subtitle={`${portfolio.length} empresas · ${ativos.length} ativas · ${exitados.length} exits · ${monitor.length} em monitoramento`}
      />
      <div className="px-8 py-6 space-y-4">

        {/* ── Summary strip ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Investimentos Ativos",  value: ativos.length,   icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Exits Concluídos",       value: exitados.length, icon: Zap,          color: "text-violet-400",  bg: "bg-violet-500/10"  },
            { label: "Em Monitoramento",       value: monitor.length,  icon: AlertTriangle, color: "text-amber-700", bg: "bg-amber-50"  },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card p-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={s.color} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Company cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {portfolio.map((p) => {
            const val   = p.status === "Exitado" ? p.returned : p.currentVal;
            const moic  = val / p.invested;
            const r     = roic(val, p.invested);
            const Icon  = statusIcon[p.status] ?? Clock;

            return (
              <div key={p.id} className="card p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <TrendingUp size={16} className="text-amber-700" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{p.company}</div>
                      <div className="text-[10px] text-gray-500">{p.founders} · {p.location}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${stageColors[p.stage] ?? "bg-gray-100 text-gray-500"}`}>
                      {p.stage}
                    </span>
                    <span className={`inline-flex items-center gap-1 ${statusBadge[p.status] ?? "badge"}`}>
                      <Icon size={9} />
                      {p.status}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-400 leading-relaxed">{p.description}</p>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-gray-200">
                  <div>
                    <div className="text-[10px] text-gray-500 mb-0.5">Investido</div>
                    <div className="text-xs font-bold text-gray-900">{fmtR(p.invested)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-0.5">{p.status === "Exitado" ? "Retornado" : "Valor Atual"}</div>
                    <div className={`text-xs font-bold ${p.status === "Exitado" ? "text-violet-700" : "text-gray-900"}`}>{fmtR(val)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-0.5">MOIC</div>
                    <div className={`text-xs font-bold ${moic >= 2 ? "text-emerald-600" : moic >= 1 ? "text-amber-700" : "text-red-600"}`}>
                      {fmtMult(moic)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-0.5">IRR</div>
                    <div className={`text-xs font-bold ${p.irr >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {p.irr >= 0 ? "+" : ""}{p.irr.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    {r >= 0
                      ? <ArrowUpRight size={12} className="text-emerald-600" />
                      : <ArrowDownRight size={12} className="text-red-600" />}
                    <span className={`text-[10px] font-semibold ${r >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      ROIC {r >= 0 ? "+" : ""}{r.toFixed(0)}%
                    </span>
                    {p.ownership > 0 && (
                      <span className="text-[10px] text-gray-600 ml-2">· {p.ownership}% participação</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-600">desde {p.entryDate}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </>
  );
}
