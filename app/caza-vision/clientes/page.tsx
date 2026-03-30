import Header from "@/components/Header";
import { cazaClients } from "@/lib/caza-data";
import { Tag, TrendingUp, Users, Building2 } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const typeIcon: Record<string, React.ElementType> = {
  Marca:   Tag,
  Agência: Building2,
  Empresa: Building2,
  Startup: TrendingUp,
};

const typeColor: Record<string, string> = {
  Marca:   "text-brand-400",
  Agência: "text-emerald-400",
  Empresa: "text-amber-400",
  Startup: "text-violet-400",
};

const statusConfig: Record<string, string> = {
  "Ativo":        "badge badge-green",
  "Em Proposta":  "badge badge-yellow",
  "Convertido":   "badge badge-blue",
  "Perdido":      "bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full",
};

// ─── Summary counts ───────────────────────────────────────────────────────────

const counts = {
  total:       cazaClients.length,
  ativos:      cazaClients.filter((c) => c.status === "Ativo" || c.status === "Em Proposta").length,
  convertidos: cazaClients.filter((c) => c.status === "Convertido").length,
  perdidos:    cazaClients.filter((c) => c.status === "Perdido").length,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  return (
    <>
      <Header title="Clientes" subtitle="Marcas, agências e empresas — Caza Vision" />
      <div className="px-8 py-6 space-y-6">

        {/* ── Summary strip ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total de Clientes", value: counts.total,       color: "text-white"       },
            { label: "Ativos / Em Proposta", value: counts.ativos,   color: "text-emerald-400" },
            { label: "Convertidos",       value: counts.convertidos, color: "text-brand-400"   },
            { label: "Perdidos",          value: counts.perdidos,    color: "text-red-400"     },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Clients table ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Todos os Clientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Cliente</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Perfil</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget Anual</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Segmento</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Desde</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {cazaClients.map((c) => {
                  const TypeIcon = typeIcon[c.type] ?? Users;
                  return (
                    <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="text-gray-300 font-medium text-xs">{c.name}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">{c.email}</div>
                        <div className="text-[10px] text-gray-600">{c.phone}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className={`flex items-center gap-1.5 text-xs ${typeColor[c.type] ?? "text-gray-400"}`}>
                          <TypeIcon size={12} />
                          {c.type}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-white font-semibold text-xs">
                        {c.budget_anual > 0 ? fmtR(c.budget_anual) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">{c.segmento}</td>
                      <td className="py-2.5 px-3 text-[11px] text-gray-600">{c.since}</td>
                      <td className="py-2.5 px-3">
                        <span className={statusConfig[c.status] ?? ""}>{c.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
