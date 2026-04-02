import Header from "@/components/Header";
import {
  Users,
  DollarSign,
  TrendingUp,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const clients = [
  { id: "AC001", name: "Família Rodrigues",  type: "Family Office",     aum: 32_400_000, retorno: 18.4, risco: "Moderado",    status: "Ativo",        since: "2021-03", nps: 94, fee: 1.8 },
  { id: "AC002", name: "Dr. Maurício Lima",  type: "PF High Net Worth", aum: 18_600_000, retorno: 14.8, risco: "Moderado",    status: "Ativo",        since: "2022-07", nps: 88, fee: 1.5 },
  { id: "AC003", name: "Fundo ABC Capital",  type: "Institucional",     aum: 28_000_000, retorno: 12.1, risco: "Conservador", status: "Ativo",        since: "2020-11", nps: 79, fee: 0.9 },
  { id: "AC004", name: "Oliveira & Filhos",  type: "Family Office",     aum: 15_200_000, retorno: 16.3, risco: "Arrojado",    status: "Ativo",        since: "2023-01", nps: 91, fee: 2.0 },
  { id: "AC005", name: "Maria Clara Sousa",  type: "PF High Net Worth", aum:  8_900_000, retorno: 11.6, risco: "Conservador", status: "Ativo",        since: "2022-04", nps: 82, fee: 1.2 },
  { id: "AC006", name: "Corporação Delta",   type: "Empresarial",       aum: 22_400_000, retorno: 10.2, risco: "Conservador", status: "Ativo",        since: "2021-09", nps: 76, fee: 0.8 },
  { id: "AC007", name: "André Teixeira",     type: "PF High Net Worth", aum:  6_200_000, retorno: 19.8, risco: "Arrojado",    status: "Em revisão",   since: "2024-02", nps: 68, fee: 1.8 },
  { id: "AC008", name: "Holding Ferreira",   type: "Family Office",     aum: 11_100_000, retorno: 15.4, risco: "Moderado",    status: "Ativo",        since: "2023-06", nps: 87, fee: 1.6 },
];

const typeConfig: Record<string, { color: string; bg: string }> = {
  "Family Office":     { color: "text-violet-700", bg: "bg-violet-50"  },
  "PF High Net Worth": { color: "text-brand-600",  bg: "bg-brand-50"   },
  "Institucional":     { color: "text-emerald-600", bg: "bg-emerald-50" },
  "Empresarial":       { color: "text-amber-700",  bg: "bg-amber-50"   },
};

const riscoConfig: Record<string, string> = {
  "Conservador": "text-emerald-600",
  "Moderado":    "text-amber-700",
  "Arrojado":    "text-red-600",
};

const statusConfig: Record<string, string> = {
  "Ativo":      "badge badge-green",
  "Em revisão": "badge badge-yellow",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdvisorCustomersPage() {
  const ativos    = clients.filter((c) => c.status === "Ativo").length;
  const totalAum  = clients.reduce((s, c) => s + c.aum, 0);
  const avgReturn = (clients.reduce((s, c) => s + c.retorno, 0) / clients.length).toFixed(1);
  const avgNps    = Math.round(clients.reduce((s, c) => s + c.nps, 0) / clients.length);

  return (
    <>
      <Header
        title="Customers — Advisor"
        subtitle="Carteira de clientes · AUM · Performance · Perfil"
      />
      <div className="page-content">

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "AUM Total",       value: fmtR(totalAum),  sub: `${ativos} clientes ativos`,  icon: Briefcase, color: "text-violet-700", bg: "bg-violet-50", delta: "+18.3%", up: true  },
            { label: "AUM Médio",        value: fmtR(Math.round(totalAum / clients.length)), sub: "por cliente",    icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", delta: "+14.1%", up: true  },
            { label: "Retorno Médio",    value: `+${avgReturn}%`, sub: "vs Ibov +9.2%",           icon: TrendingUp, color: "text-brand-600", bg: "bg-brand-50", delta: "+5.6pp vs bench", up: true  },
            { label: "NPS Médio",        value: String(avgNps),  sub: `${clients.length} clientes`, icon: Users, color: "text-amber-700", bg: "bg-amber-50", delta: "+6pts vs 2025", up: true  },
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Client Table ─────────────────────────────────────────────────── */}
          <div className="xl:col-span-2 card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Carteira de Clientes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Cliente</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Perfil</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">AUM</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Risco</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Retorno</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Taxa</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">NPS</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => {
                    const tc = typeConfig[c.type] ?? { color: "text-gray-400", bg: "bg-gray-100" };
                    return (
                      <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="text-xs font-medium text-gray-400">{c.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">desde {c.since}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${tc.bg} ${tc.color}`}>
                            {c.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(c.aum)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs font-semibold ${riscoConfig[c.risco]}`}>{c.risco}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">+{c.retorno}%</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-400">{c.fee}% a.a.</td>
                        <td className="py-2.5 px-3 text-right text-xs">
                          <span className={`font-bold ${c.nps >= 80 ? "text-emerald-600" : c.nps >= 70 ? "text-amber-700" : "text-red-600"}`}>
                            {c.nps}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={statusConfig[c.status] ?? "badge"}>{c.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2.5 px-3 text-xs font-bold text-gray-400">TOTAL</td>
                    <td />
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(totalAum)}</td>
                    <td colSpan={5} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Breakdown ─────────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">AUM por Tipo de Cliente</h2>
              {Object.entries(typeConfig).map(([type, cfg]) => {
                const aumType = clients.filter((c) => c.type === type).reduce((s, c) => s + c.aum, 0);
                if (aumType === 0) return null;
                const barPct = (aumType / totalAum) * 100;
                return (
                  <div key={type} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${cfg.color}`}>{type}</span>
                      <span className="text-xs font-bold text-gray-900">{fmtR(aumType)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-violet-500`} style={{ width: `${barPct}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{barPct.toFixed(0)}% do total</div>
                  </div>
                );
              })}
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Perfil de Risco</h2>
              {["Conservador", "Moderado", "Arrojado"].map((risco) => {
                const count  = clients.filter((c) => c.risco === risco).length;
                const aumR   = clients.filter((c) => c.risco === risco).reduce((s, c) => s + c.aum, 0);
                return (
                  <div key={risco} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      {risco === "Conservador" ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Clock size={12} className="text-amber-700" />}
                      <span className={`text-xs font-medium ${riscoConfig[risco]}`}>{risco}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-900">{fmtR(aumR)}</div>
                      <div className="text-[10px] text-gray-400">{count} clientes</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
