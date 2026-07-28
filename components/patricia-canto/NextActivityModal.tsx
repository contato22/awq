"use client";

import { useState } from "react";
import type { NextActivity } from "@/lib/patricia-canto/activity";

function tomorrow(): string {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

export default function NextActivityModal({
  clientName,
  stageLabel,
  onConfirm,
  onCancel,
}: {
  clientName: string;
  stageLabel: string;
  onConfirm: (activity: NextActivity) => void;
  onCancel: () => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(tomorrow());

  function submit() {
    if (!descricao.trim()) return;
    onConfirm({ descricao: descricao.trim(), data });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canto-900/50 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-canto-serif text-base font-semibold text-canto-900">Próxima atividade</h3>
        <p className="mt-1 text-xs text-canto-500">
          <strong className="text-canto-700">{clientName}</strong> foi movido para <strong>{stageLabel}</strong>.
          Defina o próximo passo antes de continuar.
        </p>

        <label className="mt-4 block text-xs font-semibold text-canto-700">
          Atividade
          <input
            autoFocus
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ex.: Ligar para confirmar documentos"
            className="mt-1 w-full rounded-lg border border-canto-200 bg-canto-50 px-3 py-2 text-sm text-canto-900 outline-none focus:border-canto-500 focus:bg-white"
          />
        </label>

        <label className="mt-3 block text-xs font-semibold text-canto-700">
          Data
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="mt-1 w-full rounded-lg border border-canto-200 bg-canto-50 px-3 py-2 text-sm text-canto-900 outline-none focus:border-canto-500 focus:bg-white"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-canto-200 px-3 py-1.5 text-xs font-semibold text-canto-600 hover:bg-canto-50"
          >
            Cancelar movimentação
          </button>
          <button
            onClick={submit}
            disabled={!descricao.trim()}
            className="rounded-lg bg-canto-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-canto-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
