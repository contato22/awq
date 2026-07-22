"use client";

import { useEffect, useState } from "react";
import type { Channel, Lead, Priority, Stage } from "@/lib/patricia-canto/leads";
import { CHANNELS, STAGES, missingGateFields } from "@/lib/patricia-canto/leads";

const PRIORITIES: Priority[] = ["Alta", "Média", "Baixa"];

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function fromDateInput(value: string): string | null {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}

export default function LeadModal({
  lead,
  onClose,
  onSave,
  onDelete,
}: {
  lead: Lead;
  onClose: () => void;
  onSave: (lead: Lead) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Lead>(lead);

  useEffect(() => setDraft(lead), [lead]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function field<K extends keyof Lead>(key: K, value: Lead[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const missing = missingGateFields(draft, draft.stage);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canto-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <input
              value={draft.nomeCliente}
              onChange={(e) => field("nomeCliente", e.target.value)}
              className="w-full rounded-md border border-transparent px-1 -mx-1 font-canto-serif text-lg font-semibold text-canto-900 outline-none focus:border-canto-300 focus:bg-canto-50"
            />
            <input
              value={draft.tipoProcesso}
              onChange={(e) => field("tipoProcesso", e.target.value)}
              className="mt-1 w-full rounded-md border border-transparent px-1 -mx-1 text-sm font-medium text-canto-600 outline-none focus:border-canto-300 focus:bg-canto-50"
            />
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-canto-400 hover:bg-canto-100 hover:text-canto-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {missing.length > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
            Faltam para o gate de <strong>{STAGES.find((s) => s.id === draft.stage)?.label}</strong>:{" "}
            {missing.join(", ")}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="text-xs text-canto-500">
            Telefone
            <input
              value={draft.telefone}
              onChange={(e) => field("telefone", e.target.value)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Escritório
            <input
              value={draft.escritorio ?? ""}
              onChange={(e) => field("escritorio", e.target.value || null)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Etapa
            <select
              value={draft.stage}
              onChange={(e) => field("stage", e.target.value as Stage)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-canto-500">
            Prioridade
            <select
              value={draft.prioridade ?? ""}
              onChange={(e) => field("prioridade", (e.target.value || null) as Priority | null)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            >
              <option value="">—</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-canto-500">
            Valor da ação (R$)
            <input
              type="number"
              value={draft.valorAcao ?? ""}
              onChange={(e) => field("valorAcao", e.target.value === "" ? null : Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Honorários (R$)
            <input
              type="number"
              value={draft.honorarios ?? ""}
              onChange={(e) => field("honorarios", e.target.value === "" ? null : Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            % Chances
            <input
              type="number"
              min={0}
              max={100}
              value={draft.percChances != null ? Math.round(draft.percChances * 100) : ""}
              onChange={(e) =>
                field("percChances", e.target.value === "" ? null : Number(e.target.value) / 100)
              }
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Status
            <input
              value={draft.status ?? ""}
              onChange={(e) => field("status", e.target.value || null)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Origem
            <select
              value={draft.origem ?? ""}
              onChange={(e) => field("origem", (e.target.value || null) as Channel | null)}
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

          {draft.origem === "Indicação" && (
            <label className="text-xs text-canto-500">
              Indicado por
              <input
                value={draft.indicadoPor ?? ""}
                onChange={(e) => field("indicadoPor", e.target.value || null)}
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              />
            </label>
          )}

          <label className="text-xs text-canto-500">
            Data do 1º contato
            <input
              type="date"
              value={toDateInput(draft.dataPrimeiroContato)}
              onChange={(e) => field("dataPrimeiroContato", fromDateInput(e.target.value))}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Data de fechamento
            <input
              type="date"
              value={toDateInput(draft.dataFechamento)}
              onChange={(e) => field("dataFechamento", fromDateInput(e.target.value))}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="col-span-2 text-xs text-canto-500">
            Motivo da perda
            <input
              value={draft.motivoPerda ?? ""}
              onChange={(e) => field("motivoPerda", e.target.value || null)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="col-span-2 text-xs text-canto-500">
            Descrição / notas
            <textarea
              value={draft.descricao ?? ""}
              onChange={(e) => field("descricao", e.target.value || null)}
              rows={3}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm(`Remover o card de ${draft.nomeCliente}?`)) onDelete(draft.id);
            }}
            className="text-xs font-medium text-rose-500 hover:text-rose-700"
          >
            Remover card
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
