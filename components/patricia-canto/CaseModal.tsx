"use client";

import { useEffect, useState } from "react";
import type { CaseItem, CaseStage, Resultado } from "@/lib/patricia-canto/cases";
import { CASE_STAGES, STATUS_INSS, STATUS_JUDICIAL } from "@/lib/patricia-canto/cases";

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}
function fromDateInput(value: string): string | null {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}

export default function CaseModal({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: CaseItem;
  onClose: () => void;
  onSave: (item: CaseItem) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<CaseItem>(item);

  useEffect(() => setDraft(item), [item]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function field<K extends keyof CaseItem>(key: K, value: CaseItem[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function save() {
    onSave({ ...draft, dataUltimaAtualizacao: new Date().toISOString() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canto-900/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-canto-serif text-lg font-semibold text-canto-900">{draft.nomeCliente}</p>
            <p className="mt-1 text-sm font-medium text-canto-600">{draft.tipoProcesso}</p>
          </div>
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
            Telefone
            <input
              value={draft.telefone}
              onChange={(e) => field("telefone", e.target.value)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Etapa
            <select
              value={draft.stage}
              onChange={(e) => field("stage", e.target.value as CaseStage)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            >
              {CASE_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-2 text-xs text-canto-500">
            Documentos pendentes
            <textarea
              value={draft.documentosPendentes ?? ""}
              onChange={(e) => field("documentosPendentes", e.target.value || null)}
              rows={2}
              placeholder="Ex: RG, comprovante de residência, CNIS..."
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Data de abertura do processo
            <input
              type="date"
              value={toDateInput(draft.dataAberturaProcesso)}
              onChange={(e) => field("dataAberturaProcesso", fromDateInput(e.target.value))}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Nº protocolo (INSS)
            <input
              value={draft.numeroProtocolo ?? ""}
              onChange={(e) => field("numeroProtocolo", e.target.value || null)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Status INSS
            <select
              value={draft.statusInss ?? ""}
              onChange={(e) => field("statusInss", (e.target.value || null) as CaseItem["statusInss"])}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            >
              <option value="">—</option>
              {STATUS_INSS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-canto-500">
            Nº processo judicial
            <input
              value={draft.numeroProcessoJudicial ?? ""}
              onChange={(e) => field("numeroProcessoJudicial", e.target.value || null)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Vara
            <input
              value={draft.vara ?? ""}
              onChange={(e) => field("vara", e.target.value || null)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Status judicial
            <select
              value={draft.statusJudicial ?? ""}
              onChange={(e) => field("statusJudicial", (e.target.value || null) as CaseItem["statusJudicial"])}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            >
              <option value="">—</option>
              {STATUS_JUDICIAL.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-canto-500">
            Resultado
            <select
              value={draft.resultado ?? ""}
              onChange={(e) => field("resultado", (e.target.value || null) as Resultado | null)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            >
              <option value="">—</option>
              <option value="Deferido">Deferido</option>
              <option value="Indeferido">Indeferido</option>
            </select>
          </label>

          {draft.resultado === "Indeferido" && (
            <label className="text-xs text-canto-500">
              Recurso necessário?
              <select
                value={draft.recursoNecessario == null ? "" : draft.recursoNecessario ? "sim" : "nao"}
                onChange={(e) => field("recursoNecessario", e.target.value === "" ? null : e.target.value === "sim")}
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              >
                <option value="">—</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </label>
          )}

          <label className="text-xs text-canto-500">
            Data da decisão
            <input
              type="date"
              value={toDateInput(draft.dataDecisao)}
              onChange={(e) => field("dataDecisao", fromDateInput(e.target.value))}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="col-span-2 flex items-center gap-2 text-xs text-canto-600">
            <input
              type="checkbox"
              checked={draft.honorarioExitoRecebido}
              onChange={(e) => field("honorarioExitoRecebido", e.target.checked)}
              className="h-4 w-4 rounded border-canto-300"
            />
            Honorário de êxito recebido
          </label>
          <label className="col-span-2 flex items-center gap-2 text-xs text-canto-600">
            <input
              type="checkbox"
              checked={draft.pedidoIndicacaoEnviado}
              onChange={(e) => field("pedidoIndicacaoEnviado", e.target.checked)}
              className="h-4 w-4 rounded border-canto-300"
            />
            Pedido de indicação enviado
          </label>
          <label className="col-span-2 flex items-center gap-2 text-xs text-canto-600">
            <input
              type="checkbox"
              checked={draft.depoimentoColetado}
              onChange={(e) => field("depoimentoColetado", e.target.checked)}
              className="h-4 w-4 rounded border-canto-300"
            />
            Depoimento/avaliação coletado
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm(`Remover o caso de ${draft.nomeCliente}?`)) onDelete(draft.id);
            }}
            className="text-xs font-medium text-rose-500 hover:text-rose-700"
          >
            Remover caso
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-canto-200 px-4 py-2 text-sm font-medium text-canto-600 hover:bg-canto-50"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              className="rounded-lg bg-canto-700 px-4 py-2 text-sm font-medium text-white hover:bg-canto-800"
            >
              Salvar (marca como atualizado hoje)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
