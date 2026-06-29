// ─── Live Shop — Grade de conteúdo (apresentacional) ──────────────────────────
// Render compartilhado entre a seção interna da marca (tema claro) e a página
// pública (tema escuro). Server component puro — sem estado, sem dado financeiro.

import { CONTENT_STATUS_LABEL, type ContentBlock } from "@/lib/live-shop/content";

const STATUS_LIGHT: Record<string, string> = {
  planejado: "bg-blue-100 text-blue-700",
  confirmado: "bg-amber-100 text-amber-700",
  feito: "bg-emerald-100 text-emerald-700",
};
const STATUS_DARK: Record<string, string> = {
  planejado: "bg-blue-500/20 text-blue-300",
  confirmado: "bg-amber-500/20 text-amber-300",
  feito: "bg-emerald-500/20 text-emerald-300",
};

export default function LiveShopContentGrid({
  blocks,
  dark = false,
}: {
  blocks: ContentBlock[];
  dark?: boolean;
}) {
  if (blocks.length === 0) {
    return (
      <p className={`text-sm ${dark ? "text-white/40" : "text-gray-400"}`}>
        Nenhum bloco de conteúdo cadastrado ainda.
      </p>
    );
  }

  const card = dark
    ? "border-white/10 bg-white/[0.04]"
    : "border-gray-200/80 bg-white";
  const muted = dark ? "text-white/40" : "text-gray-400";
  const strong = dark ? "text-white" : "text-gray-900";
  const body = dark ? "text-white/70" : "text-gray-600";
  const statusStyle = dark ? STATUS_DARK : STATUS_LIGHT;

  return (
    <div className="space-y-2">
      {blocks.map((b) => (
        <div key={b.id} className={`rounded-2xl border ${card} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[11px] uppercase tracking-wide ${muted}`}>{b.slot}</p>
              <p className={`font-semibold ${strong}`}>{b.title}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle[b.status] ?? statusStyle.planejado}`}>
              {CONTENT_STATUS_LABEL[b.status]}
            </span>
          </div>
          <dl className={`mt-3 grid gap-2 text-xs sm:grid-cols-2 ${body}`}>
            <div>
              <dt className={`mb-0.5 text-[10px] uppercase tracking-wide ${muted}`}>Roteiro</dt>
              <dd>{b.script}</dd>
            </div>
            <div>
              <dt className={`mb-0.5 text-[10px] uppercase tracking-wide ${muted}`}>Resultado esperado</dt>
              <dd>{b.expected}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}
