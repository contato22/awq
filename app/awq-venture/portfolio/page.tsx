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
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(1) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMult(x: number) {
  return x.toFixed(2) + "×";
}

function roic(returned: number, invested: number) {
  if (invested === 0) return 0;
  return ((returned - invested) / invested) * 100;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

// Apenas empresas reais do portfólio. Dados fictícios removidos.
const portfolio = [
  {
    id:          "AV007",
    company:     "Grupo Energdy",
    sector:      "Energia / Utilities",
    stage:       "Advisory",
    invested:    0,
    currentVal:  72_000,
    returned:    0,
    entryDate:   "2025",
    status:      "Ativo",
    ownership:   0,
    irr:         0,
    description: "Cliente de advisory e incubação estratégica. Fee mensal de R$2K por 36 meses (R$72K contrato). Único contrato operacional confirmado da AWQ Venture.",
    founders:    "—",
    location:    "Brasil",
    contractFee: 2_000,
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
  "Seed":     "bg-amber-500/10 text-amber-400",
  "Series A": "bg-brand-500/10 text-brand-400",
  "Series B": "bg-emerald-500/10 text-emerald-400",
  "Exit":     "bg-violet-500/10 text-violet-400",
  "Advisory": "bg-orange-500/10 text-orange-400",
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
            { label: "Investimentos Ativos",  value: ativos.length,   icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Exits Concluídos",       value: exitados.length, icon: Zap,          color: "text-violet-400",  bg: "bg-violet-500/10"  },
            { label: "Em Monitoramento",       value: monitor.length,  icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10"  },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card p-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={s.color} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{s.value}</div>
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
                      <TrendingUp size={16} className="text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{p.company}</div>
                      <div className="text-[10px] text-gray-500">{p.founders} · {p.location}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${stageColors[p.stage] ?? "bg-gray-800 text-gray-400"}`}>
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
                {p.stage === "Advisory" ? (
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-800">
                    <div>
                      <div className="text-[10px] text-gray-600 mb-0.5">Fee Mensal</div>
                      <div className="text-xs font-bold text-amber-400">{fmtR((p as typeof p & { contractFee?: number }).contractFee ?? 0)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-600 mb-0.5">ARR Advisory</div>
                      <div className="text-xs font-bold text-emerald-400">{fmtR(((p as typeof p & { contractFee?: number }).contractFee ?? 0) * 12)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-600 mb-0.5">Contrato Total</div>
                      <div className="text-xs font-bold text-white">{fmtR(p.currentVal)}</div>
                    </div>
                  </div>
                ) : (
                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-gray-800">
                  <div>
                    <div className="text-[10px] text-gray-600 mb-0.5">Investido</div>
                    <div className="text-xs font-bold text-white">{fmtR(p.invested)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-600 mb-0.5">{p.status === "Exitado" ? "Retornado" : "Valor Atual"}</div>
                    <div className={`text-xs font-bold ${p.status === "Exitado" ? "text-violet-400" : "text-white"}`}>{fmtR(val)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-600 mb-0.5">MOIC</div>
                    <div className={`text-xs font-bold ${moic >= 2 ? "text-emerald-400" : moic >= 1 ? "text-amber-400" : "text-red-400"}`}>
                      {fmtMult(moic)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-600 mb-0.5">IRR</div>
                    <div className={`text-xs font-bold ${p.irr >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {p.irr >= 0 ? "+" : ""}{p.irr.toFixed(1)}%
                    </div>
                  </div>
                </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    {p.stage !== "Advisory" && (r >= 0
                      ? <ArrowUpRight size={12} className="text-emerald-400" />
                      : <ArrowDownRight size={12} className="text-red-400" />)}
                    {p.stage !== "Advisory" && (
                    <span className={`text-[10px] font-semibold ${r >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      ROIC {r >= 0 ? "+" : ""}{r.toFixed(0)}%
                    </span>
                    )}
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
