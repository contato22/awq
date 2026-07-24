"use client";

import { useEffect, useState } from "react";
import type { Lancamento, TipoLancamento, StatusLancamento } from "@/lib/patricia-canto/financeiro";
import { CATEGORIAS_RECEITA, CATEGORIAS_DESPESA } from "@/lib/patricia-canto/financeiro";

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}
function fromDateInput(value: string): string | null {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}

export default function LancamentoModal({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: Lancamento;
  onClose: () => void;
  onSave: (item: Lancamento) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Lancamento>(item);

  useEffect(() => setDraft(item), [item]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function field<K extends keyof Lancamento>(key: K, value: Lancamento[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const categorias = draft.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const contraparteLabel = draft.tipo === "receita" ? "Cliente" : "Fornecedor";
  const liquidacaoLabel = draft.tipo === "receita" ? "Data de recebimento" : "Data de pagamento";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canto-900/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <input
              value={draft.contraparte}
              onChange={(e) => field("contraparte", e.target.value)}
              className="w-full rounded-md border border-transparent px-1 -mx-1 font-canto-serif text-lg font-semibold text-canto-900 outline-none focus:border-canto-300 focus:bg-canto-50"
            />
            <input
              value={draft.descricao}
              onChange={(e) => field("descricao", e.target.value)}
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

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="text-xs text-canto-500">
            Tipo
            <select
              value={draft.tipo}
              onChange={(e) => {
                const tipo = e.target.value as TipoLancamento;
                const cats = tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
                setDraft((d) => ({ ...d, tipo, categoria: cats[0] }));
              }}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            >
              <option value="receita">Receita (a receber)</option>
              <option value="despesa">Despesa (a pagar)</option>
            </select>
          </label>

          <label className="text-xs text-canto-500">
            {contraparteLabel}
            <input
              value={draft.contraparte}
              onChange={(e) => field("contraparte", e.target.value)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Categoria
            <select
              value={draft.categoria}
              onChange={(e) => field("categoria", e.target.value)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-canto-500">
            Valor (R$)
            <input
              type="number"
              value={draft.valor}
              onChange={(e) => field("valor", Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Vencimento
            <input
              type="date"
              value={toDateInput(draft.dataVencimento)}
              onChange={(e) => field("dataVencimento", fromDateInput(e.target.value) ?? draft.dataVencimento)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="text-xs text-canto-500">
            Status
            <select
              value={draft.status}
              onChange={(e) => {
                const status = e.target.value as StatusLancamento;
                setDraft((d) => ({
                  ...d,
                  status,
                  dataLiquidacao: status === "liquidado" ? d.dataLiquidacao ?? new Date().toISOString() : null,
                }));
              }}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            >
              <option value="pendente">Pendente</option>
              <option value="liquidado">{draft.tipo === "receita" ? "Recebido" : "Pago"}</option>
            </select>
          </label>

          {draft.status === "liquidado" && (
            <label className="text-xs text-canto-500">
              {liquidacaoLabel}
              <input
                type="date"
                value={toDateInput(draft.dataLiquidacao)}
                onChange={(e) => field("dataLiquidacao", fromDateInput(e.target.value))}
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              />
            </label>
          )}

          <label className="col-span-2 text-xs text-canto-500">
            Observação
            <textarea
              value={draft.observacao ?? ""}
              onChange={(e) => field("observacao", e.target.value || null)}
              rows={2}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm(`Remover o lançamento "${draft.descricao}"?`)) onDelete(draft.id);
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
