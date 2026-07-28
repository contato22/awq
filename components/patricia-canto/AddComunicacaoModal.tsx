"use client";

import { useState } from "react";
import type { Channel } from "@/lib/patricia-canto/leads";
import { CHANNELS } from "@/lib/patricia-canto/leads";
import type { ComunicacaoFormato, NewComunicacaoInput, Plataforma } from "@/lib/patricia-canto/gtm-extra";
import { COMUNICACAO_FORMATO_LABEL, PLATAFORMAS } from "@/lib/patricia-canto/gtm-extra";

export default function AddComunicacaoModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (item: NewComunicacaoInput) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [formato, setFormato] = useState<ComunicacaoFormato>("outro");
  const [plataforma, setPlataforma] = useState<Plataforma | "">("");
  const [responsavel, setResponsavel] = useState("Ana");
  const [canal, setCanal] = useState<Channel | "">("");
  const [dataPlanejada, setDataPlanejada] = useState(new Date().toISOString().slice(0, 10));

  function submit() {
    if (!titulo.trim()) return;
    onAdd({
      titulo: titulo.trim(),
      tipo: tipo.trim() || COMUNICACAO_FORMATO_LABEL[formato],
      formato,
      plataforma: plataforma || null,
      responsavel: responsavel.trim() || null,
      canal: canal || null,
      dataPlanejada: new Date(`${dataPlanejada}T12:00:00`).toISOString(),
      status: "planejado",
      notas: null,
      resultados: null,
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
              Formato
              <select
                value={formato}
                onChange={(e) => setFormato(e.target.value as ComunicacaoFormato)}
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              >
                {(Object.keys(COMUNICACAO_FORMATO_LABEL) as ComunicacaoFormato[]).map((f) => (
                  <option key={f} value={f}>
                    {COMUNICACAO_FORMATO_LABEL[f]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-canto-500">
              Plataforma
              <select
                value={plataforma}
                onChange={(e) => setPlataforma(e.target.value as Plataforma | "")}
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              >
                <option value="">—</option>
                {PLATAFORMAS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-canto-500">
              Tipo (detalhe livre)
              <input
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                placeholder="Reels, Carrossel, E-mail..."
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              />
            </label>
            <label className="block text-xs text-canto-500">
              Responsável
              <input
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              />
            </label>
          </div>

          <label className="block text-xs text-canto-500">
            Canal de aquisição associado (opcional)
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
