"use client";

import { useState } from "react";
import type { Lancamento, TipoLancamento } from "@/lib/patricia-canto/financeiro";
import { CATEGORIAS_RECEITA, CATEGORIAS_DESPESA } from "@/lib/patricia-canto/financeiro";

export type NewLancamentoInput = Omit<Lancamento, "id" | "leadId" | "dataCriacao">;

export default function AddLancamentoModal({
  defaultTipo,
  onClose,
  onAdd,
}: {
  defaultTipo: TipoLancamento;
  onClose: () => void;
  onAdd: (item: NewLancamentoInput) => void;
}) {
  const [tipo, setTipo] = useState<TipoLancamento>(defaultTipo);
  const categorias = tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const [contraparte, setContraparte] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<string>(categorias[0]);
  const [valor, setValor] = useState("");
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().slice(0, 10));

  function submit() {
    if (!contraparte.trim() || !descricao.trim() || !valor) return;
    onAdd({
      tipo,
      contraparte: contraparte.trim(),
      descricao: descricao.trim(),
      categoria,
      valor: Number(valor),
      dataVencimento: new Date(`${dataVencimento}T12:00:00`).toISOString(),
      dataLiquidacao: null,
      status: "pendente",
      observacao: null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canto-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-canto-serif text-lg font-semibold text-canto-900">Novo lançamento</h3>
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-canto-500">
            Tipo
            <select
              value={tipo}
              onChange={(e) => {
                const t = e.target.value as TipoLancamento;
                setTipo(t);
                setCategoria(t === "receita" ? CATEGORIAS_RECEITA[0] : CATEGORIAS_DESPESA[0]);
              }}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            >
              <option value="receita">Receita (a receber)</option>
              <option value="despesa">Despesa (a pagar)</option>
            </select>
          </label>

          <label className="block text-xs text-canto-500">
            {tipo === "receita" ? "Cliente" : "Fornecedor"}
            <input
              autoFocus
              value={contraparte}
              onChange={(e) => setContraparte(e.target.value)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <label className="block text-xs text-canto-500">
            Descrição
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={tipo === "receita" ? "Ex: Honorários — Aposentadoria" : "Ex: Aluguel do escritório"}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-canto-500">
              Categoria
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-canto-500">
              Valor (R$)
              <input
                type="number"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              />
            </label>
          </div>

          <label className="block text-xs text-canto-500">
            Vencimento
            <input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
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
            disabled={!contraparte.trim() || !descricao.trim() || !valor}
            className="rounded-lg bg-canto-700 px-4 py-2 text-sm font-medium text-white hover:bg-canto-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
