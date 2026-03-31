import Header from "@/components/Header";
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const portfolio = [
  {
    id: "AV001",
    company:     "TechFlow Soluções",
    sector:      "B2B SaaS",
    stage:       "Series A",
    invested:    8_000_000,
    currentVal:  22_400_000,
    returned:    0,
    entryDate:   "2022-03",
    status:      "Ativo",
    ownership:   18.5,
    irr:         38.4,
  },
  {
    id: "AV002",
    company:     "Verde Energia",
    sector:      "CleanTech",
    stage:       "Series B",
    invested:    12_000_000,
    currentVal:  31_200_000,
    returned:    0,
    entryDate:   "2021-07",
    status:      "Ativo",
    ownership:   12.0,
    irr:         28.6,
  },
  {
    id: "AV003",
    company:     "Saúde Digital",
    sector:      "HealthTech",
    stage:       "Exit",
    invested:    5_000_000,
    currentVal:  0,
    returned:    18_500_000,
    entryDate:   "2020-05",
    status:      "Exitado",
    ownership:   0,
    irr:         52.1,
  },
  {
    id: "AV004",
    company:     "AgriSmart",
    sector:      "AgTech",
    stage:       "Seed",
    invested:    2_000_000,
    currentVal:  4_600_000,
    returned:    0,
    entryDate:   "2023-09",
    status:      "Ativo",
    ownership:   22.0,
    irr:         31.2,
  },
  {
    id: "AV005",
    company:     "FinBridge",
    sector:      "Fintech",
    stage:       "Series A",
    invested:    6_500_000,
    currentVal:  5_200_000,
    returned:    0,
    entryDate:   "2023-01",
    status:      "Em monitoramento",
    ownership:   15.0,
    irr:         -6.2,
  },
  {
    id: "AV006",
    company:     "Logística Plus",
    sector:      "LogTech",
    stage:       "Series A",
    invested:    7_000_000,
    currentVal:  14_700_000,
    returned:    0,
    entryDate:   "2022-11",
    status:      "Ativo",
    ownership:   20.0,
    irr:         24.8,
  },
];

const statusConfig: Record<string, string> = {
  "Ativo":            "badge badge-green",
  "Exitado":          "badge badge-blue",
  "Em monitoramento": "badge badge-yellow",
};

const statusIcon: Record<string, React.ElementType> = {
  "Ativo":            CheckCircle2,
  "Exitado":          Zap,
  "Em monitoramento": AlertTriangle,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqVentureFinancialPage() {
  const totalInvested   = portfolio.reduce((s, p) => s + p.invested, 0);
  const totalCurrentVal = portfolio.reduce((s, p) => s + p.currentVal, 0);
  const totalReturned   = portfolio.reduce((s, p) => s + p.returned, 0);
  const totalValue      = totalCurrentVal + totalReturned;
  const moic            = totalValue / totalInvested;
  const avgIrr          = (portfolio.reduce((s, p) => s + p.irr, 0) / portfolio.length).toFixed(1);

  const ativos          = portfolio.filter((p) => p.status === "Ativo").length;
  const exitados        = portfolio.filter((p) => p.status === "Exitado").length;

  return (
    <>
      <Header
        title="Financial — AWQ Venture"
        subtitle="Portfólio · ROIC por Investimento · Performance · 2020–2026"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: "Capital Investido",
              value: fmtR(totalInvested),
              sub: `${portfolio.length} investimentos`,
              delta: "+R$15M em 2026",
              up: true,
              icon: DollarSign,
              color: "text-amber-700",
              bg: "bg-amber-50",
            },
            {
              label: "Valor do Portfólio",
              value: fmtR(totalValue),
              sub: "atual + retornado",
              delta: `MOIC ${fmtMult(moic)}`,
              up: true,
              icon: BarChart3,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "ROIC Total",
              value: `+${roic(totalValue, totalInvested).toFixed(1)}%`,
              sub: `IRR médio: ${avgIrr}% a.a.`,
              delta: `${fmtMult(moic)} MOIC`,
              up: true,
              icon: TrendingUp,
              color: "text-brand-600",
              bg: "bg-brand-50",
            },
            {
              label: "Capital Retornado",
              value: fmtR(totalReturned),
              sub: `${exitados} exits · ${ativos} ativos`,
              delta: "Saúde Digital exit",
              up: true,
              icon: Zap,
              color: "text-violet-700",
              bg: "bg-violet-50",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {card.up
                      ? <ArrowUpRight size={11} className="text-emerald-600" />
                      : <ArrowDownRight size={11} className="text-red-600" />}
                    <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-600" : "text-red-600"}`}>{card.delta}</span>
                    <span className="text-[10px] text-gray-400">{card.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Portfolio Table ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Portfólio de Investimentos — ROIC por Empresa
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Empresa</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Setor</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Stage</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Investido</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor Atual</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">MOIC</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">ROIC</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">IRR</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Participação</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((p) => {
                  const currentOrReturned = p.status === "Exitado" ? p.returned : p.currentVal;
                  const moicP    = currentOrReturned / p.invested;
                  const roicP    = roic(currentOrReturned, p.invested);
                  const irrPositive = p.irr > 0;
                  const Icon = statusIcon[p.status] ?? Clock;

                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="text-xs font-medium text-gray-400">{p.company}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">desde {p.entryDate}</div>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">{p.sector}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-400 font-medium">{p.stage}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(p.invested)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold">
                        {p.status === "Exitado"
                          ? <span className="text-violet-700">{fmtR(p.returned)} <span className="text-[10px] text-gray-400">(exit)</span></span>
                          : <span className="text-gray-900">{fmtR(p.currentVal)}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold">
                        <span className={moicP >= 2 ? "text-emerald-600" : moicP >= 1 ? "text-amber-700" : "text-red-600"}>
                          {fmtMult(moicP)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold">
                        <span className={roicP >= 50 ? "text-emerald-600" : roicP >= 0 ? "text-amber-700" : "text-red-600"}>
                          {roicP >= 0 ? "+" : ""}{roicP.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold">
                        <span className={irrPositive ? "text-emerald-600" : "text-red-600"}>
                          {irrPositive ? "+" : ""}{p.irr.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-400">
                        {p.ownership > 0 ? `${p.ownership}%` : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 ${statusConfig[p.status] ?? "badge"}`}>
                          <Icon size={9} />
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300">
                  <td className="py-2.5 px-3 text-xs font-bold text-gray-400">TOTAL</td>
                  <td colSpan={2} />
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(totalInvested)}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(totalValue)}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{fmtMult(moic)}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">
                    +{roic(totalValue, totalInvested).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">+{avgIrr}%</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── ROIC Visual ───────────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">ROIC por Empresa — Retorno sobre Capital Investido</h2>
          <div className="space-y-3">
            {portfolio.map((p) => {
              const currentOrReturned = p.status === "Exitado" ? p.returned : p.currentVal;
              const r = roic(currentOrReturned, p.invested);
              const maxRoic = 400;
              const barPct  = Math.max(0, Math.min((Math.abs(r) / maxRoic) * 100, 100));
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-32 shrink-0 truncate">{p.company}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full ${r >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-16 text-right shrink-0 ${r >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {r >= 0 ? "+" : ""}{r.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-gray-400 w-12 text-right shrink-0">{fmtMult(currentOrReturned / p.invested)}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </>
  );
}
