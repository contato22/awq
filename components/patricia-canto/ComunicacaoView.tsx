"use client";

import { useMemo, useState } from "react";
import type { ComunicacaoItem, NewComunicacaoInput } from "@/lib/patricia-canto/gtm-extra";
import { STATUS_COMUNICACAO_LABEL } from "@/lib/patricia-canto/gtm-extra";
import AddComunicacaoModal from "./AddComunicacaoModal";
import ComunicacaoModal from "./ComunicacaoModal";
import StatTile from "./StatTile";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const STATUS_STYLE: Record<string, string> = {
  planejado: "bg-canto-100 text-canto-600",
  publicado: "bg-emerald-50 text-emerald-700",
  pausado: "bg-amber-50 text-amber-700",
};

export default function ComunicacaoView({
  items,
  onAdd,
  onSave,
  onDelete,
}: {
  items: ComunicacaoItem[];
  onAdd: (item: NewComunicacaoInput) => void;
  onSave: (item: ComunicacaoItem) => void;
  onDelete: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.dataPlanejada.localeCompare(a.dataPlanejada)),
    [items],
  );
  const counts = useMemo(
    () => ({
      planejado: items.filter((i) => i.status === "planejado").length,
      publicado: items.filter((i) => i.status === "publicado").length,
      pausado: items.filter((i) => i.status === "pausado").length,
    }),
    [items],
  );

  const open = items.find((i) => i.id === openId) ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Planejadas" value={counts.planejado.toString()} />
          <StatTile label="Publicadas" value={counts.publicado.toString()} variant="accent" />
          <StatTile label="Pausadas" value={counts.pausado.toString()} variant={counts.pausado > 0 ? "warn" : "default"} />
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-canto-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-canto-800"
        >
          + Nova ação
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-canto-200 bg-white">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-canto-200 text-left text-xs uppercase tracking-wide text-canto-500">
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Canal</th>
              <th className="px-3 py-2">Data planejada</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr
                key={item.id}
                onClick={() => setOpenId(item.id)}
                className="cursor-pointer border-b border-canto-100 last:border-0 hover:bg-canto-50"
              >
                <td className="px-3 py-2 font-medium text-canto-900">{item.titulo}</td>
                <td className="px-3 py-2 text-canto-600">{item.tipo}</td>
                <td className="px-3 py-2 text-canto-500">{item.canal ?? "—"}</td>
                <td className="px-3 py-2 text-canto-500">{formatDate(item.dataPlanejada)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[item.status]}`}>
                    {STATUS_COMUNICACAO_LABEL[item.status]}
                  </span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-xs text-canto-500">
                  Nenhuma ação de comunicação ainda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <ComunicacaoModal
          item={open}
          onClose={() => setOpenId(null)}
          onSave={(item) => {
            onSave(item);
            setOpenId(null);
          }}
          onDelete={(id) => {
            onDelete(id);
            setOpenId(null);
          }}
        />
      )}
      {addOpen && <AddComunicacaoModal onClose={() => setAddOpen(false)} onAdd={onAdd} />}
    </div>
  );
}
