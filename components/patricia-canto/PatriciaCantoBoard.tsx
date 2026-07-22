"use client";

import { useEffect, useState } from "react";
import type { Channel, Lead, Stage } from "@/lib/patricia-canto/leads";
import type { CaseItem, CaseStage } from "@/lib/patricia-canto/cases";
import { createCaseFromLead } from "@/lib/patricia-canto/cases";
import type { NewLeadInput } from "./AddLeadModal";
import PatriciaCantoLogo from "./PatriciaCantoLogo";
import GtmView from "./GtmView";
import ComercialBoard from "./ComercialBoard";
import CsJuridicoBoard from "./CsJuridicoBoard";

const LEADS_KEY = "pc-crm-leads-v2";
const CASES_KEY = "pc-crm-cases-v1";
const INVESTMENT_KEY = "pc-crm-investment-v1";

type Tab = "gtm" | "comercial" | "cs";

const TABS: { id: Tab; label: string }[] = [
  { id: "gtm", label: "GTM · Aquisição" },
  { id: "comercial", label: "Pipeline Comercial" },
  { id: "cs", label: "CS / Jurídico" },
];

export default function PatriciaCantoBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [tab, setTab] = useState<Tab>("comercial");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [investment, setInvestment] = useState<Partial<Record<Channel, number>>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedLeads = localStorage.getItem(LEADS_KEY);
      if (savedLeads) setLeads(JSON.parse(savedLeads));
      const savedCases = localStorage.getItem(CASES_KEY);
      if (savedCases) setCases(JSON.parse(savedCases));
      const savedInvestment = localStorage.getItem(INVESTMENT_KEY);
      if (savedInvestment) setInvestment(JSON.parse(savedInvestment));
    } catch {
      // localStorage indisponível (modo privado etc.) — segue com dados padrão.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
    } catch {
      // ignora falha de gravação
    }
  }, [leads, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CASES_KEY, JSON.stringify(cases));
    } catch {
      // ignora falha de gravação
    }
  }, [cases, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(INVESTMENT_KEY, JSON.stringify(investment));
    } catch {
      // ignora falha de gravação
    }
  }, [investment, hydrated]);

  function promoteToCase(lead: Lead) {
    setCases((prev) => (prev.some((c) => c.leadId === lead.id) ? prev : [...prev, createCaseFromLead(lead)]));
  }

  function moveLead(id: string, stage: Stage) {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id || l.stage === stage) return l;
        const now = new Date().toISOString();
        const updated = { ...l, stage, stageHistory: [...l.stageHistory, { stage, enteredAt: now }] };
        if (stage === "ganho") promoteToCase(updated);
        return updated;
      }),
    );
  }

  function saveLead(updated: Lead) {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== updated.id) return l;
        if (l.stage === updated.stage) return updated;
        const now = new Date().toISOString();
        const next = { ...updated, stageHistory: [...l.stageHistory, { stage: updated.stage, enteredAt: now }] };
        if (updated.stage === "ganho") promoteToCase(next);
        return next;
      }),
    );
  }

  function deleteLead(id: string) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  function addLead(data: NewLeadInput) {
    const now = new Date().toISOString();
    const id = `pc-custom-${Date.now()}`;
    setLeads((prev) => [
      ...prev,
      { ...data, id, stage: "novo", dataEntrada: now, dataPrimeiroContato: null, stageHistory: [{ stage: "novo", enteredAt: now }] },
    ]);
  }

  function moveCase(id: string, stage: CaseStage) {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, stage, dataUltimaAtualizacao: new Date().toISOString() } : c)));
  }

  function saveCase(updated: CaseItem) {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function deleteCase(id: string) {
    setCases((prev) => prev.filter((c) => c.id !== id));
  }

  function setChannelInvestment(channel: Channel, value: number | null) {
    setInvestment((prev) => {
      const next = { ...prev };
      if (value == null) delete next[channel];
      else next[channel] = value;
      return next;
    });
  }

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
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-canto-400">
            CRM · Aquisição → Pipeline Comercial → CS/Jurídico
          </p>
        </div>

        <nav className="mx-auto flex max-w-[1600px] gap-1 px-4 sm:px-6 lg:px-8">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                tab === t.id ? "bg-canto-50 text-canto-900" : "text-canto-300 hover:bg-canto-800 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {tab === "gtm" && <GtmView leads={leads} investment={investment} onInvestmentChange={setChannelInvestment} />}
        {tab === "comercial" && (
          <ComercialBoard
            leads={leads}
            onMoveLead={moveLead}
            onSaveLead={saveLead}
            onDeleteLead={deleteLead}
            onAddLead={addLead}
          />
        )}
        {tab === "cs" && (
          <CsJuridicoBoard cases={cases} onMoveCase={moveCase} onSaveCase={saveCase} onDeleteCase={deleteCase} />
        )}
      </main>

      <footer className="mx-auto max-w-[1600px] px-4 pb-8 pt-2 text-center text-[11px] text-canto-500 sm:px-6 lg:px-8">
        Board local ao seu navegador — alterações ficam salvas neste dispositivo (localStorage), sem
        sincronizar com a planilha original. Leads marcados como &quot;Fechado — Ganho&quot; no Comercial criam
        automaticamente um card em CS/Jurídico.
      </footer>
    </div>
  );
}
