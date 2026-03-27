import Header from "@/components/Header";
import { propertyListings } from "@/lib/caza-data";
import { MapPin, Home, Briefcase, TreePine, CheckCircle2, Clock } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const typeIcon: Record<string, React.ElementType> = {
  Residencial: Home,
  Comercial: Briefcase,
  Terreno: TreePine,
};

const typeColor: Record<string, string> = {
  Residencial: "text-emerald-400",
  Comercial: "text-brand-400",
  Terreno: "text-amber-400",
};

const statusConfig: Record<string, { className: string; Icon: React.ElementType }> = {
  "Disponível":    { className: "badge badge-green", Icon: CheckCircle2 },
  "Em Negociação": { className: "badge badge-yellow", Icon: Clock },
  "Vendido":       { className: "badge badge-blue", Icon: CheckCircle2 },
  "Alugado":       { className: "bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full", Icon: Home },
};

// ─── Summary counts ───────────────────────────────────────────────────────────

const counts = {
  total:        propertyListings.length,
  disponivel:   propertyListings.filter((p) => p.status === "Disponível").length,
  negociacao:   propertyListings.filter((p) => p.status === "Em Negociação").length,
  fechados:     propertyListings.filter((p) => p.status === "Vendido" || p.status === "Alugado").length,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImoveisPage() {
  return (
    <>
      <Header title="Imóveis" subtitle="Carteira de imóveis ativos — Caza Vision" />
      <div className="px-8 py-6 space-y-6">

        {/* ── Summary strip ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total na Carteira", value: counts.total, color: "text-white" },
            { label: "Disponíveis", value: counts.disponivel, color: "text-emerald-400" },
            { label: "Em Negociação", value: counts.negociacao, color: "text-amber-400" },
            { label: "Fechados", value: counts.fechados, color: "text-brand-400" },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Listings table ──────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Todos os Imóveis</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Ref.</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Endereço</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Área</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Agente</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {propertyListings.map((p) => {
                  const TypeIcon = typeIcon[p.type] ?? Home;
                  const sc = statusConfig[p.status];
                  const StatusIcon = sc?.Icon ?? CheckCircle2;
                  return (
                    <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-gray-600 text-[11px] font-mono">{p.id}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-gray-300 font-medium text-xs">{p.address}</div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-600 mt-0.5">
                          <MapPin size={9} />
                          {p.neighborhood}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className={`flex items-center gap-1.5 text-xs ${typeColor[p.type] ?? "text-gray-400"}`}>
                          <TypeIcon size={12} />
                          {p.type}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-white font-semibold text-xs">{fmtR(p.price)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-400 text-xs">{p.area} m²</td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">{p.agent}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 ${sc?.className ?? ""}`}>
                          <StatusIcon size={9} />
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-gray-600">{p.listedAt}</td>
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
