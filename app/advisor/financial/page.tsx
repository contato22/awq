import Header from "@/components/Header";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function pct(n: number, d: number) {
  if (d === 0) return "0.0%";
  return ((n / d) * 100).toFixed(1) + "%";
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const summaryCards = [
  {
    label: "AUM Total",
    value: "—",
    sub: "Assets Under Management",
    delta: "—",
    up: true,
    icon: Briefcase,
    color: "text-violet-700",
    bg: "bg-violet-50",
  },
  {
    label: "Receita de Taxas YTD",
    value: "—",
    sub: "Jan–Mar 2026",
    delta: "—",
    up: true,
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Lucro Operacional YTD",
    value: "—",
    sub: "Margem —",
    delta: "—",
    up: true,
    icon: TrendingUp,
    color: "text-brand-600",
    bg: "bg-brand-50",
  },
  {
    label: "Retorno Médio Carteiras",
    value: "—",
    sub: "vs Ibovespa",
    delta: "—",
    up: true,
    icon: BarChart3,
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
];

const feeIncome: { month: string; taxaGestao: number; taxaPerformance: number; taxaConsultoria: number; total: number }[] = [];

const dreAdvisor: { label: string; value: number; indent: number; bold: boolean }[] = [];

const aumByStrategy: { strategy: string; aum: number; clientes: number; retorno: number; fee: number }[] = [];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdvisorFinancialPage() {
  const totalFee = feeIncome.reduce((s, r) => s + r.total, 0);

  return (
    <>
      <Header
        title="Financial — Advisor"
        subtitle="AUM · Receita de Taxas · DRE · Jan–Mar 2026"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map((card) => {
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── DRE ──────────────────────────────────────────────────────────── */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">DRE Simplificado · YTD 2026</h2>
            <div className="space-y-0.5">
              {dreAdvisor.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Sem dados disponíveis</p>
              )}
              {dreAdvisor.map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-2 px-2 rounded-lg ${row.bold ? "bg-gray-100" : ""}`}
                  style={{ paddingLeft: `${(row.indent * 12) + 8}px` }}
                >
                  <span className={`text-xs ${row.bold ? "font-bold text-gray-800" : "text-gray-400"}`}>
                    {row.label}
                  </span>
                  <span className={`text-xs font-semibold ${
                    row.bold
                      ? "text-gray-900"
                      : row.value < 0
                        ? "text-red-600"
                        : "text-emerald-600"
                  }`}>
                    {fmtR(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Fee Income Table ──────────────────────────────────────────────── */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Receita de Taxas por Mês</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left  py-1.5 px-2 text-xs font-semibold text-gray-500">Mês</th>
                    <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-500">Gestão</th>
                    <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-500">Perf.</th>
                    <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-500">Consul.</th>
                    <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {feeIncome.map((row) => (
                    <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                      <td className="py-2 px-2 text-xs text-gray-400 font-medium">{row.month}</td>
                      <td className="py-2 px-2 text-right text-xs text-gray-400">{fmtR(row.taxaGestao)}</td>
                      <td className="py-2 px-2 text-right text-xs text-violet-700">{fmtR(row.taxaPerformance)}</td>
                      <td className="py-2 px-2 text-right text-xs text-gray-400">{fmtR(row.taxaConsultoria)}</td>
                      <td className="py-2 px-2 text-right text-xs font-bold text-gray-900">{fmtR(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2 px-2 text-xs font-bold text-gray-400">YTD</td>
                    <td className="py-2 px-2 text-right text-xs font-bold text-gray-400">
                      {fmtR(feeIncome.reduce((s, r) => s + r.taxaGestao, 0))}
                    </td>
                    <td className="py-2 px-2 text-right text-xs font-bold text-violet-700">
                      {fmtR(feeIncome.reduce((s, r) => s + r.taxaPerformance, 0))}
                    </td>
                    <td className="py-2 px-2 text-right text-xs font-bold text-gray-400">
                      {fmtR(feeIncome.reduce((s, r) => s + r.taxaConsultoria, 0))}
                    </td>
                    <td className="py-2 px-2 text-right text-xs font-bold text-gray-900">{fmtR(totalFee)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── AUM by Strategy ───────────────────────────────────────────────── */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">AUM por Estratégia</h2>
            <div className="space-y-4">
              {aumByStrategy.map((s) => {
                const totalAum = aumByStrategy.reduce((t, a) => t + a.aum, 0);
                const barPct   = (s.aum / totalAum) * 100;
                return (
                  <div key={s.strategy}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{s.strategy}</span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-gray-500">{s.clientes} clientes</span>
                        <span className="text-emerald-600 font-semibold">+{s.retorno}%</span>
                        <span className="text-gray-900 font-bold">{fmtR(s.aum)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${barPct}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-gray-400">Taxa: {s.fee}% a.a.</span>
                      <span className="text-[10px] text-gray-400">{barPct.toFixed(0)}% do AUM</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">AUM Total</span>
                <span className="text-base font-bold text-violet-700">
                  {fmtR(aumByStrategy.reduce((s, a) => s + a.aum, 0))}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">Retorno Médio Ponderado</span>
                <span className="text-xs font-bold text-emerald-600">+14.8% a.a.</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
