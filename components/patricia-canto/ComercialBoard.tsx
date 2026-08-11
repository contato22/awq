"use client";

import { useMemo, useState } from "react";
import type { Lead, Stage } from "@/lib/patricia-canto/leads";
import { STAGES, missingGateFields } from "@/lib/patricia-canto/leads";
import type { NextActivity } from "@/lib/patricia-canto/activity";
import type { BusinessUnit } from "@/lib/patricia-canto/business-units";
import { computeComercialMetrics } from "@/lib/patricia-canto/metrics";
import LeadCard from "./LeadCard";
import LeadModal from "./LeadModal";
import AddLeadModal, { type NewLeadInput } from "./AddLeadModal";
import NextActivityModal from "./NextActivityModal";
import StatTile from "./StatTile";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Mês em que o lead foi fechado (ganho): usa a data de fechamento (campo de
// negócio, pode ser retroativa) e cai pro histórico de estágio só se ela não
// estiver preenchida. Sem nenhuma das duas, não dá pra saber o mês — nesse
// caso não arquiva (melhor mostrar do que sumir sem explicação).
function closingMonthKey(lead: Lead): string | null {
  if (lead.dataFechamento) return lead.dataFechamento.slice(0, 7);
  const ganhoEvent = [...lead.stageHistory].reverse().find((h) => h.stage === "ganho");
  return ganhoEvent ? ganhoEvent.enteredAt.slice(0, 7) : null;
}

export default function ComercialBoard({
  leads,
  onMoveLead,
  onSaveLead,
  onDeleteLead,
  onAddLead,
  businessUnits,
}: {
  leads: Lead[];
  onMoveLead: (id: string, stage: Stage, activity: NextActivity) => void;
  onSaveLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onAddLead: (data: NewLeadInput) => void;
  businessUnits: BusinessUnit[];
}) {
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ id: string; stage: Stage } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.nomeCliente.toLowerCase().includes(q) ||
        l.tipoProcesso.toLowerCase().includes(q) ||
        l.telefone.includes(q),
    );
  }, [leads, search]);

  const currentMonth = new Date().toISOString().slice(0, 7);

  // Fechados (ganho) de meses anteriores saem do quadro Comercial pra liberar
  // espaço pros novos leads do mês — continuam rastreados normalmente em
  // CS/Jurídico (caso) e Financeiro (lançamento), que nunca filtram por mês.
  const byStage = useMemo(() => {
    const map = new Map<Stage, Lead[]>();
    for (const s of STAGES) map.set(s.id, []);
    for (const lead of filtered) {
      if (lead.stage === "ganho") {
        const month = closingMonthKey(lead);
        if (month !== null && month !== currentMonth) continue;
      }
      map.get(lead.stage)?.push(lead);
    }
    return map;
  }, [filtered, currentMonth]);

  const arquivadosGanho = useMemo(
    () =>
      leads.filter((l) => {
        if (l.stage !== "ganho") return false;
        const month = closingMonthKey(l);
        return month !== null && month !== currentMonth;
      }).length,
    [leads, currentMonth],
  );

  const openLead = leads.find((l) => l.id === openLeadId) ?? null;

  const metrics = useMemo(() => computeComercialMetrics(leads), [leads]);
  const ganhosDoMes = byStage.get("ganho")?.length ?? 0;

  function handleMoveStage(id: string, stage: Stage) {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    const missing = missingGateFields({ ...lead, stage }, stage);
    if (missing.length > 0) {
      const ok = confirm(
        `Faltam campos obrigatórios para o gate de "${STAGES.find((s) => s.id === stage)?.label}": ${missing.join(", ")}.\n\nMover mesmo assim?`,
      );
      if (!ok) return;
    }
    setPendingMove({ id, stage });
  }

  const pendingLead = pendingMove ? leads.find((l) => l.id === pendingMove.id) : null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Total de leads" value={metrics.totalLeads.toString()} />
        <StatTile label="Qualificados" value={metrics.qualificados.toString()} />
        <StatTile label="Fechados no mês" value={ganhosDoMes.toString()} />
        <StatTile label="Valor das ações" value={currency(metrics.valorAcaoTotal)} />
        <StatTile label="Honorários em pipeline" value={currency(metrics.honorariosPipeline)} variant="accent" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, tipo de processo ou telefone..."
          className="w-full max-w-md rounded-lg border border-canto-200 bg-canto-50 px-3 py-2 text-sm text-canto-900 placeholder:text-canto-500 outline-none focus:border-canto-500 focus:bg-white sm:w-96"
        />
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-canto-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-canto-800"
        >
          + Novo Lead
        </button>
      </div>

      <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const items = byStage.get(stage.id) ?? [];
          const stageHonorarios = items.reduce((sum, l) => sum + (l.honorarios ?? 0), 0);
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
                if (draggingId) handleMoveStage(draggingId, stage.id);
                setDraggingId(null);
                setDragOverStage(null);
              }}
              className={`flex w-72 shrink-0 flex-col rounded-xl border bg-canto-100/70 p-2.5 transition ${
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
              <p className="mb-2 px-1 text-[11px] font-semibold text-canto-700">
                Honorários: {currency(stageHonorarios)}
              </p>
              {stage.id === "ganho" && arquivadosGanho > 0 && (
                <p className="mb-2 px-1 text-[10px] text-canto-400">
                  +{arquivadosGanho} de meses anteriores — em CS/Jurídico e Financeiro
                </p>
              )}

              <div className="flex min-h-[80px] flex-1 flex-col gap-2">
                {items.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    dragging={draggingId === lead.id}
                    onDragStart={setDraggingId}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverStage(null);
                    }}
                    onOpen={setOpenLeadId}
                    onMoveStage={handleMoveStage}
                  />
                ))}
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-canto-300 py-6 text-center text-xs text-canto-500">
                    Nenhum card
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-canto-200 bg-white p-4">
        <h3 className="font-canto-serif text-base font-semibold text-canto-900">Métricas do funil comercial</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-canto-500">Conversão por estágio</p>
            <ul className="mt-2 space-y-1 text-sm text-canto-700">
              {metrics.conversion.map((c) => (
                <li key={c.stage} className="flex items-center justify-between">
                  <span>{c.stage}</span>
                  <span className="font-semibold">
                    {c.rate == null ? "—" : `${c.rate.toFixed(0)}%`}{" "}
                    <span className="font-normal text-canto-400">({c.entered} entraram)</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-canto-500">
                Tempo médio de ciclo (lead → fechado)
              </p>
              <p className="mt-1 text-sm font-semibold text-canto-900">
                {metrics.avgCycleDays == null
                  ? "— (nenhum fechamento com data ainda)"
                  : `${metrics.avgCycleDays.toFixed(1)} dias`}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-canto-500">Perdas e motivo predominante</p>
              <p className="mt-1 text-sm font-semibold text-canto-900">
                {metrics.perdidos} perdido(s)
                {metrics.motivoPredominante ? ` — principal motivo: "${metrics.motivoPredominante[0]}" (${metrics.motivoPredominante[1]}x)` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {openLead && (
        <LeadModal
          lead={openLead}
          businessUnits={businessUnits}
          onClose={() => setOpenLeadId(null)}
          onSave={(lead) => {
            onSaveLead(lead);
            setOpenLeadId(null);
          }}
          onDelete={(id) => {
            onDeleteLead(id);
            setOpenLeadId(null);
          }}
        />
      )}
      {addOpen && <AddLeadModal businessUnits={businessUnits} onClose={() => setAddOpen(false)} onAdd={onAddLead} />}
      {pendingMove && pendingLead && (
        <NextActivityModal
          clientName={pendingLead.nomeCliente || "Lead"}
          stageLabel={STAGES.find((s) => s.id === pendingMove.stage)?.label ?? pendingMove.stage}
          onConfirm={(activity) => {
            onMoveLead(pendingMove.id, pendingMove.stage, activity);
            setPendingMove(null);
          }}
          onCancel={() => setPendingMove(null)}
        />
      )}
    </div>
  );
}
