"use client";

import { useEffect, useState } from "react";
import type { Channel } from "@/lib/patricia-canto/leads";
import { CHANNELS } from "@/lib/patricia-canto/leads";
import type { ComunicacaoItem, StatusComunicacao } from "@/lib/patricia-canto/gtm-extra";

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}
function fromDateInput(value: string): string {
  return new Date(`${value}T12:00:00`).toISOString();
}

export default function ComunicacaoModal({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: ComunicacaoItem;
  onClose: () => void;
  onSave: (item: ComunicacaoItem) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<ComunicacaoItem>(item);

  useEffect(() => setDraft(item), [item]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function field<K extends keyof ComunicacaoItem>(key: K, value: ComunicacaoItem[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canto-900/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <input
            value={draft.titulo}
            onChange={(e) => field("titulo", e.target.value)}
            className="w-full rounded-md border border-transparent px-1 -mx-1 font-canto-serif text-lg font-semibold text-canto-900 outline-none focus:border-canto-300 focus:bg-canto-50"
          />
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-canto-400 hover:bg-canto-100 hover:text-canto-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="text-xs text-canto-500">
            Tipo
            <input
              value={draft.tipo}
              onChange={(e) => field("tipo", e.target.value)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Canal
            <select
              value={draft.canal ?? ""}
              onChange={(e) => field("canal", (e.target.value || null) as Channel | null)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            >
              <option value="">—</option>
              {CHANNELS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-canto-500">
            Data planejada
            <input
              type="date"
              value={toDateInput(draft.dataPlanejada)}
              onChange={(e) => field("dataPlanejada", fromDateInput(e.target.value))}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Status
            <select
              value={draft.status}
              onChange={(e) => field("status", e.target.value as StatusComunicacao)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            >
              <option value="planejado">Planejado</option>
              <option value="publicado">Publicado</option>
              <option value="pausado">Pausado</option>
            </select>
          </label>

          <label className="col-span-2 text-xs text-canto-500">
            Notas
            <textarea
              value={draft.notas ?? ""}
              onChange={(e) => field("notas", e.target.value || null)}
              rows={3}
              placeholder="Copy, link, resultado da campanha..."
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm(`Remover "${draft.titulo}"?`)) onDelete(draft.id);
            }}
            className="text-xs font-medium text-rose-500 hover:text-rose-700"
          >
            Remover
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-canto-200 px-4 py-2 text-sm font-medium text-canto-600 hover:bg-canto-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(draft)}
              className="rounded-lg bg-canto-700 px-4 py-2 text-sm font-medium text-white hover:bg-canto-800"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
