"use client";

import { useMemo, useState } from "react";
import type { CaseItem, CaseStage } from "@/lib/patricia-canto/cases";
import { CASE_STAGES, isCommunicationLate } from "@/lib/patricia-canto/cases";
import CaseCard from "./CaseCard";
import CaseModal from "./CaseModal";

export default function CsJuridicoBoard({
  cases,
  onMoveCase,
  onSaveCase,
  onDeleteCase,
}: {
  cases: CaseItem[];
  onMoveCase: (id: string, stage: CaseStage) => void;
  onSaveCase: (item: CaseItem) => void;
  onDeleteCase: (id: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CaseStage | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const byStage = useMemo(() => {
    const map = new Map<CaseStage, CaseItem[]>();
    for (const s of CASE_STAGES) map.set(s.id, []);
    for (const item of cases) map.get(item.stage)?.push(item);
    return map;
  }, [cases]);

  const open = cases.find((c) => c.id === openId) ?? null;

  const metrics = useMemo(() => {
    const decididos = cases.filter((c) => c.resultado != null);
    const deferidos = decididos.filter((c) => c.resultado === "Deferido");
    const porTipo = new Map<string, { total: number; deferidos: number }>();
    for (const c of decididos) {
      const cur = porTipo.get(c.tipoProcesso) ?? { total: 0, deferidos: 0 };
      cur.total += 1;
      if (c.resultado === "Deferido") cur.deferidos += 1;
      porTipo.set(c.tipoProcesso, cur);
    }

    const temposDecisao = cases
      .filter((c) => c.dataDecisao && c.dataAberturaProcesso)
      .map((c) => (new Date(c.dataDecisao!).getTime() - new Date(c.dataAberturaProcesso!).getTime()) / 86_400_000)
      .filter((d) => d >= 0);
    const tempoMedioDecisao = temposDecisao.length > 0 ? temposDecisao.reduce((a, b) => a + b, 0) / temposDecisao.length : null;

    const fechados = cases.filter((c) => c.stage === "pos_caso");
    const indicaram = fechados.filter((c) => c.pedidoIndicacaoEnviado);
    const atrasados = cases.filter((c) => isCommunicationLate(c));

    return {
      taxaSucesso: decididos.length > 0 ? (deferidos.length / decididos.length) * 100 : null,
      porTipo: [...porTipo.entries()],
      tempoMedioDecisao,
      taxaIndicacao: fechados.length > 0 ? (indicaram.length / fechados.length) * 100 : null,
      pctAtrasados: cases.length > 0 ? (atrasados.length / cases.length) * 100 : 0,
      atrasadosCount: atrasados.length,
    };
  }, [cases]);

  function handleMove(id: string, stage: CaseStage) {
    onMoveCase(id, stage);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Taxa de sucesso" value={metrics.taxaSucesso == null ? "—" : `${metrics.taxaSucesso.toFixed(0)}%`} />
        <Stat
          label="Tempo médio até decisão"
          value={metrics.tempoMedioDecisao == null ? "—" : `${metrics.tempoMedioDecisao.toFixed(0)} dias`}
        />
        <Stat label="Taxa de indicação pós-caso" value={metrics.taxaIndicacao == null ? "—" : `${metrics.taxaIndicacao.toFixed(0)}%`} />
        <Stat
          label="Casos com comunicação atrasada"
          value={`${metrics.atrasadosCount} (${metrics.pctAtrasados.toFixed(0)}%)`}
          warn={metrics.atrasadosCount > 0}
        />
      </div>

      {metrics.porTipo.length > 0 && (
        <div className="mt-4 rounded-xl border border-canto-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-canto-900">Taxa de sucesso por tipo de processo</h3>
          <ul className="mt-2 space-y-1 text-sm text-canto-700">
            {metrics.porTipo.map(([tipo, v]) => (
              <li key={tipo} className="flex items-center justify-between">
                <span>{tipo}</span>
                <span className="font-semibold">
                  {((v.deferidos / v.total) * 100).toFixed(0)}%{" "}
                  <span className="font-normal text-canto-400">
                    ({v.deferidos}/{v.total})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
        {CASE_STAGES.map((stage) => {
          const items = byStage.get(stage.id) ?? [];
          const isOver = dragOverStage === stage.id;
          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage.id);
              }}
              onDragLeave={() => setDragOverStage((s) => (s === stage.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingId) handleMove(draggingId, stage.id);
                setDraggingId(null);
                setDragOverStage(null);
              }}
              className={`flex w-80 shrink-0 flex-col rounded-xl border bg-canto-100/70 p-2.5 transition ${
                isOver ? "border-canto-500 bg-canto-100" : "border-canto-200"
              }`}
            >
              <div className="mb-1 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-canto-900">{stage.label}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-canto-600 ring-1 ring-canto-200">
                  {items.length}
                </span>
              </div>
              <p className="px-1 text-[11px] text-canto-500">{stage.hint}</p>
              <p className="mb-2 px-1 text-[11px] text-canto-400">{stage.canal}</p>

              <div className="flex min-h-[80px] flex-1 flex-col gap-2">
                {items.map((item) => (
                  <CaseCard
                    key={item.id}
                    item={item}
                    dragging={draggingId === item.id}
                    onDragStart={setDraggingId}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverStage(null);
                    }}
                    onOpen={setOpenId}
                    onMoveStage={handleMove}
                  />
                ))}
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-canto-300 py-6 text-center text-xs text-canto-500">
                    Nenhum caso
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {cases.length === 0 && (
        <p className="mt-2 text-center text-sm text-canto-500">
          Nenhum caso ainda — casos são criados automaticamente quando um lead do Comercial é marcado como{" "}
          <strong>Fechado — Ganho</strong>.
        </p>
      )}

      {open && (
        <CaseModal
          item={open}
          onClose={() => setOpenId(null)}
          onSave={(item) => {
            onSaveCase(item);
            setOpenId(null);
          }}
          onDelete={(id) => {
            onDeleteCase(id);
            setOpenId(null);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${warn ? "border-amber-300 bg-amber-50" : "border-canto-200 bg-canto-50"}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-canto-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${warn ? "text-amber-700" : "text-canto-900"}`}>{value}</p>
    </div>
  );
}
