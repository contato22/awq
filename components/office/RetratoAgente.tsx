import { aparenciaDe } from "@/lib/office-aparencia";

/** Retrato do agente selecionado, no topo da gaveta, sobre um degradê da paleta terrosa. */
export function RetratoAgente({ semente, nome, papel }: { semente: string; nome: string; papel: string }) {
  const a = aparenciaDe(semente);
  return (
    <div className="shrink-0 px-3 pt-3 pr-12">
      <div
        className="flex items-center gap-3 rounded-2xl px-3 py-2.5 shadow-sm"
        style={{ background: `linear-gradient(135deg, ${a.jaqueta ?? a.corpo} 0%, #e7d3b0 46%, #1f4f8a 100%)` }}
      >
        <div className="relative h-14 w-14 shrink-0" aria-hidden>
          <div className="absolute inset-x-1 bottom-0 h-6 rounded-t-2xl" style={{ background: a.jaqueta ?? a.corpo }} />
          <div className="absolute left-1/2 top-0.5 h-9 w-9 -translate-x-1/2 rounded-full border border-white/40" style={{ background: a.pele }} />
          <div className="absolute left-1/2 top-0.5 h-4 w-9 -translate-x-1/2 rounded-t-full" style={{ background: a.cabelo }} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white drop-shadow-sm">{nome}</div>
          <div className="text-[11px] text-white/90">{papel}{a.jaqueta ? " · jaqueta" : " · sem jaqueta"}</div>
        </div>
      </div>
    </div>
  );
}
