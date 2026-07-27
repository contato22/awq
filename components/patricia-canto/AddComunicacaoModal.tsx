"use client";

import { useState } from "react";
import type { Channel } from "@/lib/patricia-canto/leads";
import { CHANNELS } from "@/lib/patricia-canto/leads";
import type { NewComunicacaoInput } from "@/lib/patricia-canto/gtm-extra";

export default function AddComunicacaoModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (item: NewComunicacaoInput) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [canal, setCanal] = useState<Channel | "">("");
  const [dataPlanejada, setDataPlanejada] = useState(new Date().toISOString().slice(0, 10));

  function submit() {
    if (!titulo.trim()) return;
    onAdd({
      titulo: titulo.trim(),
      tipo: tipo.trim() || "Outro",
      canal: canal || null,
      dataPlanejada: new Date(`${dataPlanejada}T12:00:00`).toISOString(),
      status: "planejado",
      notas: null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canto-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-canto-serif text-lg font-semibold text-canto-900">Nova ação de comunicação</h3>
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-canto-500">
            Título
            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Post sobre BPC LOAS no Instagram"
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-canto-500">
              Tipo
              <input
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                placeholder="Post, Anúncio, E-mail..."
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              />
            </label>
            <label className="block text-xs text-canto-500">
              Canal
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value as Channel | "")}
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
          </div>

          <label className="block text-xs text-canto-500">
            Data planejada
            <input
              type="date"
              value={dataPlanejada}
              onChange={(e) => setDataPlanejada(e.target.value)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-canto-200 px-4 py-2 text-sm font-medium text-canto-600 hover:bg-canto-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!titulo.trim()}
            className="rounded-lg bg-canto-700 px-4 py-2 text-sm font-medium text-white hover:bg-canto-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
