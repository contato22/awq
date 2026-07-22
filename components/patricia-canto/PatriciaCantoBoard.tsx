"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lead, Stage } from "@/lib/patricia-canto/leads";
import { STAGES } from "@/lib/patricia-canto/leads";
import LeadCard from "./LeadCard";
import LeadModal from "./LeadModal";
import AddLeadModal from "./AddLeadModal";
import PatriciaCantoLogo from "./PatriciaCantoLogo";

const STORAGE_KEY = "pc-crm-leads-v1";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PatriciaCantoBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Load persisted board state once, after the SSR-matching first paint.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLeads(JSON.parse(saved));
    } catch {
      // localStorage indisponível (modo privado etc.) — segue com dados padrão.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch {
      // ignora falha de gravação (quota, modo privado)
    }
  }, [leads, hydrated]);

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

  const byStage = useMemo(() => {
    const map = new Map<Stage, Lead[]>();
    for (const s of STAGES) map.set(s.id, []);
    for (const lead of filtered) map.get(lead.stage)?.push(lead);
    return map;
  }, [filtered]);

  function moveLead(id: string, stage: Stage) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
  }

  function saveLead(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setOpenLeadId(null);
  }

  function deleteLead(id: string) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setOpenLeadId(null);
  }

  function addLead(data: Omit<Lead, "id" | "stage">) {
    const id = `pc-custom-${Date.now()}`;
    setLeads((prev) => [...prev, { ...data, id, stage: "novo" }]);
  }

  const openLead = leads.find((l) => l.id === openLeadId) ?? null;

  const totalValorAcao = leads.reduce((sum, l) => sum + (l.valorAcao ?? 0), 0);
  const totalHonorarios = leads.reduce((sum, l) => sum + (l.honorarios ?? 0), 0);
  const ganhos = leads.filter((l) => l.stage === "ganho").length;

  return (
    <div className="min-h-screen bg-canto-50 text-canto-900">
      <header className="bg-canto-900">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <PatriciaCantoLogo className="h-12 w-12 shrink-0" shieldColor="#FFFFFF" markColor="#847455" />
              <div>
                <h1 className="font-canto-serif text-2xl font-semibold tracking-wide text-white">
                  Patrícia Canto
                </h1>
                <p className="-mt-0.5 text-[11px] font-medium tracking-[0.25em] text-canto-300">ADVOGADA</p>
              </div>
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="rounded-lg bg-canto-300 px-4 py-2.5 text-sm font-semibold text-canto-900 shadow-sm transition hover:bg-canto-200"
            >
              + Novo Lead
            </button>
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-canto-400">
            CRM · Pipeline de Casos Previdenciários e Cíveis
          </p>
        </div>
      </header>

      <div className="border-b border-canto-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Total de leads" value={leads.length.toString()} />
            <Stat label="Qualificados" value={byStage.get("qualificado")?.length.toString() ?? "0"} />
            <Stat label="Fechados (ganho)" value={ganhos.toString()} />
            <Stat label="Valor das ações" value={currency(totalValorAcao)} />
            <Stat label="Honorários em pipeline" value={currency(totalHonorarios)} accent />
          </div>

          <div className="mt-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, tipo de processo ou telefone..."
              className="w-full max-w-md rounded-lg border border-canto-200 bg-canto-50 px-3 py-2 font-sans text-sm text-canto-900 placeholder:text-canto-500 outline-none focus:border-canto-500 focus:bg-white sm:w-96"
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-4 overflow-x-auto pb-4">
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
                  if (draggingId) moveLead(draggingId, stage.id);
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
                      onMoveStage={moveLead}
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
      </main>

      {openLead && (
        <LeadModal lead={openLead} onClose={() => setOpenLeadId(null)} onSave={saveLead} onDelete={deleteLead} />
      )}
      {addOpen && <AddLeadModal onClose={() => setAddOpen(false)} onAdd={addLead} />}

      <footer className="mx-auto max-w-[1600px] px-4 pb-8 pt-2 text-center text-[11px] text-canto-500 sm:px-6 lg:px-8">
        Board local ao seu navegador — alterações ficam salvas neste dispositivo (localStorage), sem
        sincronizar com a planilha original.
      </footer>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-canto-200 bg-canto-50 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-canto-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${accent ? "text-canto-700" : "text-canto-900"}`}>{value}</p>
    </div>
  );
}
