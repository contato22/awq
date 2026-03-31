import Header from "@/components/Header";
import {
  DollarSign,
  TrendingUp,
  Users,
  Film,
  ArrowUpRight,
  ArrowDownRight,
  Clapperboard,
} from "lucide-react";
import { projectTypeRevenue } from "@/lib/caza-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const unitCards = [
  {
    label: "CAC",
    value: fmtR(12_400),
    sub: "Custo médio por cliente novo",
    delta: "-8.2%",
    up: true,
    icon: Users,
    color: "text-brand-600",
    bg: "bg-brand-50",
  },
  {
    label: "LTV Médio por Cliente",
    value: fmtR(1_890_000),
    sub: "Baseado em clientes ativos",
    delta: "+22.4%",
    up: true,
    icon: TrendingUp,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Receita por Projeto",
    value: fmtR(71_118),
    sub: "Ticket médio",
    delta: "+2.1%",
    up: true,
    icon: Clapperboard,
    color: "text-violet-700",
    bg: "bg-violet-50",
  },
  {
    label: "Margem Bruta por Projeto",
    value: "56.8%",
    sub: "Descontando alim. + gasolina",
    delta: "+1.4pp",
    up: true,
    icon: DollarSign,
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
];

const directorEconomics = [
  { name: "Ana Ferreira",  projetos: 12, receita: 980_000,   despesas: 185_000, lucro: 795_000,  ticketMedio: 81_667  },
  { name: "Rafael Souza",  projetos: 10, receita: 800_000,   despesas: 162_000, lucro: 638_000,  ticketMedio: 80_000  },
  { name: "Carlos Lima",   projetos:  7, receita: 485_000,   despesas: 108_000, lucro: 377_000,  ticketMedio: 69_286  },
  { name: "Mariana Costa", projetos:  5, receita: 209_000,   despesas:  53_000, lucro: 156_000,  ticketMedio: 41_800  },
];

const clientEconomics = [
  { name: "Ambev",          projetos: 3, receitaTotal: 480_000,  ltvEstimado: 2_880_000, ticketMedio: 160_000, margin: 58 },
  { name: "Samsung Brasil", projetos: 4, receitaTotal: 630_000,  ltvEstimado: 3_150_000, ticketMedio: 157_500, margin: 62 },
  { name: "Natura",         projetos: 3, receitaTotal: 530_000,  ltvEstimado: 3_500_000, ticketMedio: 176_667, margin: 60 },
  { name: "Nike Brasil",    projetos: 2, receitaTotal: 180_000,  ltvEstimado: 2_340_000, ticketMedio:  90_000, margin: 67 },
  { name: "iFood",          projetos: 2, receitaTotal:  95_000,  ltvEstimado:   800_000, ticketMedio:  47_500, margin: 49 },
  { name: "Banco XP",       projetos: 1, receitaTotal: 320_000,  ltvEstimado: 1_380_000, ticketMedio: 320_000, margin: 54 },
  { name: "Arezzo",         projetos: 1, receitaTotal:  64_000,  ltvEstimado:   392_000, ticketMedio:  64_000, margin: 52 },
  { name: "Nubank",         projetos: 1, receitaTotal: 145_000,  ltvEstimado:   700_000, ticketMedio: 145_000, margin: 55 },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaUnitEconomicsPage() {
  const totalProjetos = projectTypeRevenue.reduce((s, t) => s + t.projetos, 0);
  const totalReceita  = projectTypeRevenue.reduce((s, t) => s + t.receita, 0);
  const avgTicket     = Math.round(totalReceita / totalProjetos);

  return (
    <>
      <Header
        title="Unit Economics — Caza Vision"
        subtitle="CAC · LTV · Margem por projeto e cliente · Rendimento por diretor"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Unit Metric Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {unitCards.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={m.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-900">{m.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{m.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {m.up
                      ? <ArrowUpRight size={11} className="text-emerald-600" />
                      : <ArrowDownRight size={11} className="text-red-600" />}
                    <span className={`text-[10px] font-semibold ${m.up ? "text-emerald-600" : "text-red-600"}`}>{m.delta}</span>
                    <span className="text-[10px] text-gray-400">{m.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Revenue by Project Type ───────────────────────────────────────── */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Receita por Tipo de Projeto</h2>
            <div className="space-y-4">
              {projectTypeRevenue.map((t) => {
                const pct = ((t.receita / totalReceita) * 100);
                return (
                  <div key={t.type}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Film size={11} className="text-gray-500" />
                        <span className="text-xs text-gray-400">{t.type}</span>
                        <span className="text-[10px] text-gray-400">{t.projetos}p</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-gray-500">ticket: {fmtR(t.avgValue)}</span>
                        <span className="text-gray-900 font-semibold">{fmtR(t.receita)}</span>
                        <span className="text-gray-500">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">{totalProjetos} projetos · ticket médio</span>
              <span className="text-xs font-bold text-gray-900">{fmtR(avgTicket)}</span>
            </div>
          </div>

          {/* ── Director Economics ───────────────────────────────────────────── */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Produção por Diretor</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Diretor</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Projetos</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {directorEconomics.map((d) => {
                    const margin = ((d.lucro / d.receita) * 100).toFixed(0);
                    return (
                      <tr key={d.name} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                        <td className="py-2.5 px-3 text-xs font-medium text-gray-400">{d.name}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-400">{d.projetos}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(d.receita)}</td>
                        <td className="py-2.5 px-3 text-right text-xs">
                          <span className="text-emerald-600 font-semibold">{fmtR(d.lucro)}</span>
                          <span className="text-[10px] text-gray-400 ml-1">{margin}%</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-400">{fmtR(d.ticketMedio)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2.5 px-3 text-xs font-bold text-gray-400">TOTAL</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-400 font-bold">
                      {directorEconomics.reduce((s, d) => s + d.projetos, 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">
                      {fmtR(directorEconomics.reduce((s, d) => s + d.receita, 0))}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">
                      {fmtR(directorEconomics.reduce((s, d) => s + d.lucro, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* ── Client Economics ──────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Economia por Cliente — Receita · LTV Estimado · Margem
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Cliente</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Projetos</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita Total</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Ticket Médio</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">LTV Estimado</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Margem</th>
                </tr>
              </thead>
              <tbody>
                {clientEconomics.map((c) => (
                  <tr key={c.name} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                    <td className="py-2.5 px-3 text-xs font-medium text-gray-400">{c.name}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-400">{c.projetos}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(c.receitaTotal)}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-400">{fmtR(c.ticketMedio)}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-semibold text-emerald-600">{fmtR(c.ltvEstimado)}</td>
                    <td className="py-2.5 px-3 text-right text-xs">
                      <span className={`font-semibold ${c.margin >= 55 ? "text-emerald-600" : c.margin >= 50 ? "text-amber-700" : "text-red-600"}`}>
                        {c.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300">
                  <td className="py-2.5 px-3 text-xs font-bold text-gray-400">TOTAL</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-400">
                    {clientEconomics.reduce((s, c) => s + c.projetos, 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">
                    {fmtR(clientEconomics.reduce((s, c) => s + c.receitaTotal, 0))}
                  </td>
                  <td />
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">
                    {fmtR(clientEconomics.reduce((s, c) => s + c.ltvEstimado, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
