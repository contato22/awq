import Header from "@/components/Header";
import { projetos } from "@/lib/caza-data";
import { Film, CheckCircle2, Clock, Clapperboard } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { className: string; Icon: React.ElementType }> = {
  "Em Produção":         { className: "badge badge-blue",   Icon: Film        },
  "Em Edição":           { className: "badge badge-yellow", Icon: Clock       },
  "Entregue":            { className: "badge badge-green",  Icon: CheckCircle2},
  "Aguardando Aprovação":{ className: "bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full", Icon: Clock },
};

// ─── Summary counts ───────────────────────────────────────────────────────────

const counts = {
  total:      projetos.length,
  producao:   projetos.filter((p) => p.status === "Em Produção" || p.status === "Em Edição").length,
  aprovacao:  projetos.filter((p) => p.status === "Aguardando Aprovação").length,
  entregues:  projetos.filter((p) => p.status === "Entregue").length,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjetosPage() {
  return (
    <>
      <Header title="Projetos" subtitle="Carteira de projetos ativos — Caza Vision" />
      <div className="px-8 py-6 space-y-6">

        {/* ── Summary strip ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total de Projetos",  value: counts.total,     color: "text-white"        },
            { label: "Em Produção/Edição", value: counts.producao,  color: "text-brand-400"    },
            { label: "Aguard. Aprovação",  value: counts.aprovacao, color: "text-amber-400"    },
            { label: "Entregues",          value: counts.entregues, color: "text-emerald-400"  },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Projects table ──────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Todos os Projetos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Ref.</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Projeto</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Diretor</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Prazo</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {projetos.map((p) => {
                  const sc = statusConfig[p.status];
                  const StatusIcon = sc?.Icon ?? CheckCircle2;
                  return (
                    <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-gray-600 text-[11px] font-mono">{p.id}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-gray-300 font-medium text-xs">{p.titulo}</div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-600 mt-0.5">
                          <Clapperboard size={9} />
                          {p.cliente}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <Film size={12} />
                          {p.tipo}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-white font-semibold text-xs">{fmtR(p.valor)}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">{p.diretor}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">{p.prazo}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 ${sc?.className ?? ""}`}>
                          <StatusIcon size={9} />
                          {p.status}
                        </span>
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
