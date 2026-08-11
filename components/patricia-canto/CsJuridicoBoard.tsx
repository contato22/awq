"use client";

import { useMemo, useState } from "react";
import type { CaseItem, CaseStage } from "@/lib/patricia-canto/cases";
import { CASE_STAGES } from "@/lib/patricia-canto/cases";
import type { Lead } from "@/lib/patricia-canto/leads";
import type { NextActivity } from "@/lib/patricia-canto/activity";
import { computeCsMetrics } from "@/lib/patricia-canto/metrics";
import CaseCard from "./CaseCard";
import CaseModal from "./CaseModal";
import NextActivityModal from "./NextActivityModal";
import StatTile from "./StatTile";
import RfmMatrixView from "./RfmMatrixView";

type SubTab = "casos" | "rfm";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "casos", label: "Casos" },
  { id: "rfm", label: "Matriz RFM" },
];

export default function CsJuridicoBoard({
  cases,
  leads,
  onMoveCase,
  onSaveCase,
  onDeleteCase,
}: {
  cases: CaseItem[];
  leads: Lead[];
  onMoveCase: (id: string, stage: CaseStage, activity: NextActivity) => void;
  onSaveCase: (item: CaseItem) => void;
  onDeleteCase: (id: string) => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>("casos");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CaseStage | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ id: string; stage: CaseStage } | null>(null);

  const byStage = useMemo(() => {
    const map = new Map<CaseStage, CaseItem[]>();
    for (const s of CASE_STAGES) map.set(s.id, []);
    for (const item of cases) map.get(item.stage)?.push(item);
    return map;
  }, [cases]);

  const open = cases.find((c) => c.id === openId) ?? null;

  const metrics = useMemo(() => computeCsMetrics(cases), [cases]);

  function handleMove(id: string, stage: CaseStage) {
    const item = cases.find((c) => c.id === id);
    if (!item || item.stage === stage) return;
    setPendingMove({ id, stage });
  }

  const pendingCase = pendingMove ? cases.find((c) => c.id === pendingMove.id) : null;

  return (
    <div>
      <div className="flex gap-1 rounded-lg bg-canto-100 p-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              subTab === t.id ? "bg-white text-canto-900 shadow-sm" : "text-canto-600 hover:text-canto-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "rfm" && (
        <div className="mt-4">
          <RfmMatrixView leads={leads} />
        </div>
      )}

      {subTab === "casos" && (
        <>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Taxa de sucesso" value={metrics.taxaSucesso == null ? "—" : `${metrics.taxaSucesso.toFixed(0)}%`} />
        <StatTile
          label="Tempo médio até decisão"
          value={metrics.tempoMedioDecisao == null ? "—" : `${metrics.tempoMedioDecisao.toFixed(0)} dias`}
        />
        <StatTile
          label="Taxa de indicação pós-caso"
          value={metrics.taxaIndicacao == null ? "—" : `${metrics.taxaIndicacao.toFixed(0)}%`}
        />
        <StatTile
          label="Casos com comunicação atrasada"
          value={`${metrics.atrasadosCount} (${metrics.pctAtrasados.toFixed(0)}%)`}
          variant={metrics.atrasadosCount > 0 ? "warn" : "default"}
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
        </>
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
      {pendingMove && pendingCase && (
        <NextActivityModal
          clientName={pendingCase.nomeCliente}
          stageLabel={CASE_STAGES.find((s) => s.id === pendingMove.stage)?.label ?? pendingMove.stage}
          onConfirm={(activity) => {
            onMoveCase(pendingMove.id, pendingMove.stage, activity);
            setPendingMove(null);
          }}
          onCancel={() => setPendingMove(null)}
        />
      )}
    </div>
  );
}
