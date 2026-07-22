"use client";

import { useState } from "react";
import type { Channel, Lead, Priority } from "@/lib/patricia-canto/leads";
import { CHANNELS } from "@/lib/patricia-canto/leads";

export type NewLeadInput = Omit<
  Lead,
  "id" | "stage" | "dataEntrada" | "dataPrimeiroContato" | "stageHistory"
>;

export default function AddLeadModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (lead: NewLeadInput) => void;
}) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState<Channel | "">("");
  const [indicadoPor, setIndicadoPor] = useState("");
  const [prioridade, setPrioridade] = useState<Priority | "">("");
  const [valorAcao, setValorAcao] = useState("");
  const [honorarios, setHonorarios] = useState("");

  function submit() {
    if (!nome.trim() || !tipo.trim()) return;
    onAdd({
      nomeCliente: nome.trim(),
      tipoProcesso: tipo.trim(),
      telefone: telefone.trim(),
      escritorio: null,
      valorAcao: valorAcao === "" ? null : Number(valorAcao),
      honorarios: honorarios === "" ? null : Number(honorarios),
      dataFechamento: null,
      percChances: null,
      status: "Aberto",
      motivoPerda: null,
      prioridade: prioridade || null,
      origem: origem || null,
      indicadoPor: origem === "Indicação" ? indicadoPor.trim() || null : null,
      descricao: null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canto-900/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-canto-serif text-lg font-semibold text-canto-900">Novo lead</h3>
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-canto-500">
            Nome do cliente
            <input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>
          <label className="block text-xs text-canto-500">
            Tipo de processo
            <input
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="Ex: APOSENTADORIA POR IDADE"
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>
          <label className="block text-xs text-canto-500">
            Telefone
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="21 90000-0000"
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-canto-500">
              Valor da ação (R$)
              <input
                type="number"
                value={valorAcao}
                onChange={(e) => setValorAcao(e.target.value)}
                placeholder="0,00"
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              />
            </label>
            <label className="block text-xs text-canto-500">
              Honorários (R$)
              <input
                type="number"
                value={honorarios}
                onChange={(e) => setHonorarios(e.target.value)}
                placeholder="0,00"
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-canto-500">
              Origem <span className="text-rose-500">*</span>
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value as Channel | "")}
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
              Prioridade
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as Priority | "")}
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              >
                <option value="">—</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
            </label>
          </div>
          {origem === "Indicação" && (
            <label className="block text-xs text-canto-500">
              Indicado por
              <input
                value={indicadoPor}
                onChange={(e) => setIndicadoPor(e.target.value)}
                placeholder="Nome de quem indicou"
                className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
              />
            </label>
          )}
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
            disabled={!nome.trim() || !tipo.trim()}
            className="rounded-lg bg-canto-700 px-4 py-2 text-sm font-medium text-white hover:bg-canto-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
