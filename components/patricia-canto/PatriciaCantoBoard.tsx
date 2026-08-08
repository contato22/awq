"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Channel, Lead, Stage } from "@/lib/patricia-canto/leads";
import type { CaseItem, CaseStage } from "@/lib/patricia-canto/cases";
import { createCaseFromLead } from "@/lib/patricia-canto/cases";
import type { Lancamento } from "@/lib/patricia-canto/financeiro";
import { createReceitaFromLead } from "@/lib/patricia-canto/financeiro";
import type { ComunicacaoItem, MarketSizing, NewComunicacaoInput } from "@/lib/patricia-canto/gtm-extra";
import type { NextActivity } from "@/lib/patricia-canto/activity";
import { EMPTY_MARKET_SIZING } from "@/lib/patricia-canto/gtm-extra";
import type { SalesGoals } from "@/lib/patricia-canto/goals";
import { DEFAULT_SALES_GOALS } from "@/lib/patricia-canto/goals";
import type { PcRole, Tab } from "@/lib/patricia-canto/auth";
import { ROLE_TABS } from "@/lib/patricia-canto/auth";
import type { ActivityLogEntry } from "@/lib/patricia-canto/activity-log";
import type { BusinessUnit, NewBusinessUnitInput } from "@/lib/patricia-canto/business-units";
import type { NewLeadInput } from "./AddLeadModal";
import type { NewLancamentoInput } from "./AddLancamentoModal";
import { pcApi } from "@/lib/patricia-canto/api-client";
import PatriciaCantoSidebar from "./PatriciaCantoSidebar";
import BiOverview from "./BiOverview";
import GtmView from "./GtmView";
import ComercialBoard from "./ComercialBoard";
import CsJuridicoBoard from "./CsJuridicoBoard";
import FinanceiroView from "./FinanceiroView";
import EquipeView from "./EquipeView";
import BusinessUnitsView from "./BusinessUnitsView";

const TAB_LABEL: Record<Tab, string> = {
  bi: "BI · Visão Geral",
  gtm: "GTM · Aquisição",
  comercial: "Pipeline Comercial",
  cs: "CS / Jurídico",
  financeiro: "Financeiro",
  equipe: "Equipe",
  unidades: "Unidades de Negócio",
};

const UNIT_FILTERED_TABS: Tab[] = ["bi", "gtm", "comercial", "cs", "financeiro"];

export default function PatriciaCantoBoard({ role }: { role: PcRole }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(ROLE_TABS[role][0]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [comunicacoes, setComunicacoes] = useState<ComunicacaoItem[]>([]);
  const [marketSizing, setMarketSizing] = useState<MarketSizing>(EMPTY_MARKET_SIZING);
  const [investment, setInvestment] = useState<Partial<Record<Channel, number>>>({});
  const [salesGoals, setSalesGoalsState] = useState<SalesGoals>(DEFAULT_SALES_GOALS);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Ana (mkt) só enxerga GTM — a API bloqueia cases/lançamentos pra essa
    // role, então nem pede (evitaria 403) nem roda o backfill de CS/Financeiro.
    const fullAccess = ROLE_TABS[role].length > 1;

    const load = fullAccess
      ? Promise.all([
          pcApi.getLeads(),
          pcApi.getCases(),
          pcApi.getLancamentos(),
          pcApi.getInvestment(),
          pcApi.getComunicacoes(),
          pcApi.getMarketSizing(),
          pcApi.getGoals(),
        ])
      : Promise.all([pcApi.getLeads(), pcApi.getInvestment(), pcApi.getComunicacoes(), pcApi.getMarketSizing()]).then(
          ([l, inv, com, market]) =>
            [l, [] as CaseItem[], [] as Lancamento[], inv, com, market, DEFAULT_SALES_GOALS] as const,
        );

    load
      .then(async ([l, c, f, inv, com, market, goals]) => {
        if (cancelled) return;

        // Backfill: leads que já estavam "Fechado — Ganho" antes de CS/Jurídico
        // ou Financeiro existirem nunca passaram pelo evento de promoção
        // (moveLead/saveLead só dispara na transição de estágio). Reconcilia
        // na carga, comparando por leadId — idempotente, roda toda vez mas só
        // cria o que ainda falta.
        const ganhos = fullAccess ? l.filter((lead) => lead.stage === "ganho") : [];
        const missingCases = ganhos.filter((lead) => !c.some((item) => item.leadId === lead.id)).map(createCaseFromLead);
        const missingReceitas = ganhos
          .filter((lead) => !f.some((item) => item.leadId === lead.id))
          .map(createReceitaFromLead);

        if (missingCases.length > 0 || missingReceitas.length > 0) {
          try {
            await Promise.all([
              ...missingCases.map((item) => pcApi.createCase(item)),
              ...missingReceitas.map((item) => pcApi.createLancamento(item)),
            ]);
          } catch (e) {
            reportSyncError(e);
          }
        }

        if (cancelled) return;
        setLeads(l);
        setCases([...c, ...missingCases]);
        setLancamentos([...f, ...missingReceitas]);
        setInvestment(inv);
        setComunicacoes(com);
        setMarketSizing(market);
        setSalesGoalsState(goals);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e.message || "Falha ao carregar dados");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    if (role !== "master") return;
    let cancelled = false;
    pcApi
      .getActivityLog()
      .then((log) => {
        if (!cancelled) setActivityLog(log);
      })
      .catch((e) => {
        if (!cancelled) reportSyncError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    pcApi
      .getBusinessUnits()
      .then((units) => {
        if (!cancelled) setBusinessUnits(units);
      })
      .catch((e) => {
        if (!cancelled) reportSyncError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  function reportSyncError(e: unknown) {
    setSyncError(e instanceof Error ? e.message : "Falha ao salvar — tente novamente");
  }

  async function promoteToCase(lead: Lead) {
    if (cases.some((c) => c.leadId === lead.id)) return;
    const newCase = createCaseFromLead(lead);
    setCases((prev) => [...prev, newCase]);
    try {
      await pcApi.createCase(newCase);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function promoteToReceita(lead: Lead) {
    if (lancamentos.some((l) => l.leadId === lead.id)) return;
    const receita = createReceitaFromLead(lead);
    setLancamentos((prev) => [...prev, receita]);
    try {
      await pcApi.createLancamento(receita);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function moveLead(id: string, stage: Stage, activity: NextActivity) {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    const now = new Date().toISOString();
    const updated = {
      ...lead,
      stage,
      proximaAtividade: activity,
      stageHistory: [...lead.stageHistory, { stage, enteredAt: now }],
    };
    setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    try {
      await pcApi.updateLead(updated);
    } catch (e) {
      reportSyncError(e);
    }
    if (stage === "ganho") {
      await promoteToCase(updated);
      await promoteToReceita(updated);
    }
  }

  async function saveLead(updated: Lead) {
    const original = leads.find((l) => l.id === updated.id);
    const next =
      original && original.stage !== updated.stage
        ? { ...updated, stageHistory: [...original.stageHistory, { stage: updated.stage, enteredAt: new Date().toISOString() }] }
        : updated;
    setLeads((prev) => prev.map((l) => (l.id === next.id ? next : l)));
    try {
      await pcApi.updateLead(next);
    } catch (e) {
      reportSyncError(e);
    }
    if (next.stage === "ganho") {
      await promoteToCase(next);
      await promoteToReceita(next);
    }
  }

  async function deleteLead(id: string) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    try {
      await pcApi.deleteLead(id);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function addLead(data: NewLeadInput) {
    const now = new Date().toISOString();
    const id = `pc-custom-${Date.now()}`;
    const lead: Lead = {
      ...data,
      id,
      stage: "novo",
      dataEntrada: now,
      dataPrimeiroContato: null,
      proximaAtividade: null,
      stageHistory: [{ stage: "novo", enteredAt: now }],
    };
    setLeads((prev) => [...prev, lead]);
    try {
      await pcApi.createLead(lead);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function moveCase(id: string, stage: CaseStage, activity: NextActivity) {
    const item = cases.find((c) => c.id === id);
    if (!item) return;
    const updated = { ...item, stage, proximaAtividade: activity, dataUltimaAtualizacao: new Date().toISOString() };
    setCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
    try {
      await pcApi.updateCase(updated);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function saveCase(updated: CaseItem) {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    try {
      await pcApi.updateCase(updated);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function deleteCase(id: string) {
    setCases((prev) => prev.filter((c) => c.id !== id));
    try {
      await pcApi.deleteCase(id);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function addLancamento(data: NewLancamentoInput) {
    const now = new Date().toISOString();
    const item: Lancamento = { ...data, id: `lanc-custom-${Date.now()}`, leadId: null, dataCriacao: now };
    setLancamentos((prev) => [...prev, item]);
    try {
      await pcApi.createLancamento(item);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function saveLancamento(updated: Lancamento) {
    setLancamentos((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    try {
      await pcApi.updateLancamento(updated);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function deleteLancamento(id: string) {
    setLancamentos((prev) => prev.filter((l) => l.id !== id));
    try {
      await pcApi.deleteLancamento(id);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function setChannelInvestment(channel: Channel, value: number | null) {
    const next = { ...investment };
    if (value == null) delete next[channel];
    else next[channel] = value;
    setInvestment(next);
    try {
      await pcApi.setInvestment(next);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function saveSalesGoals(goals: SalesGoals) {
    setSalesGoalsState(goals);
    try {
      await pcApi.setGoals(goals);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function addComunicacao(data: NewComunicacaoInput) {
    const item: ComunicacaoItem = { ...data, id: `com-${Date.now()}` };
    const next = [...comunicacoes, item];
    setComunicacoes(next);
    try {
      await pcApi.setComunicacoes(next);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function saveComunicacao(updated: ComunicacaoItem) {
    const next = comunicacoes.map((c) => (c.id === updated.id ? updated : c));
    setComunicacoes(next);
    try {
      await pcApi.setComunicacoes(next);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function deleteComunicacao(id: string) {
    const next = comunicacoes.filter((c) => c.id !== id);
    setComunicacoes(next);
    try {
      await pcApi.setComunicacoes(next);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function saveMarketSizing(market: MarketSizing) {
    setMarketSizing(market);
    try {
      await pcApi.setMarketSizing(market);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function addBusinessUnit(data: NewBusinessUnitInput) {
    const unit: BusinessUnit = { ...data, id: `unit-${Date.now()}`, ativo: true, dataCriacao: new Date().toISOString() };
    setBusinessUnits((prev) => [...prev, unit]);
    try {
      await pcApi.createBusinessUnit(unit);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function saveBusinessUnit(updated: BusinessUnit) {
    setBusinessUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    try {
      await pcApi.updateBusinessUnit(updated);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function deleteBusinessUnit(id: string) {
    setBusinessUnits((prev) => prev.filter((u) => u.id !== id));
    if (selectedUnit === id) setSelectedUnit("all");
    try {
      await pcApi.deleteBusinessUnit(id);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function logout() {
    try {
      await pcApi.logout();
    } finally {
      router.replace("/patricia-canto/login");
      router.refresh();
    }
  }

  // Filtro por unidade de negócio — aplicado antes de passar os dados pras
  // telas existentes (BI/Comercial/CS/Financeiro/GTM), que não precisam
  // saber que o filtro existe. Leads/casos/lançamentos/comunicações sem
  // unidadeId (null) pertencem à prática principal da Patrícia Canto — o
  // seletor usa "" pra representar esse caso, já que <select> não tem null.
  function matchesUnit(unidadeId: string | null): boolean {
    if (selectedUnit === "all") return true;
    if (selectedUnit === "") return unidadeId === null;
    return unidadeId === selectedUnit;
  }
  const filteredLeads = useMemo(() => leads.filter((l) => matchesUnit(l.unidadeId)), [leads, selectedUnit]);
  const filteredCases = useMemo(() => cases.filter((c) => matchesUnit(c.unidadeId)), [cases, selectedUnit]);
  const filteredLancamentos = useMemo(
    () => lancamentos.filter((l) => matchesUnit(l.unidadeId)),
    [lancamentos, selectedUnit],
  );
  const filteredComunicacoes = useMemo(
    () => comunicacoes.filter((c) => matchesUnit(c.unidadeId)),
    [comunicacoes, selectedUnit],
  );

  return (
    <div className="min-h-screen bg-canto-cream text-canto-900 lg:p-5">
      <div className="flex min-h-screen lg:min-h-0 lg:h-[calc(100vh-2.5rem)] lg:gap-5">
        <PatriciaCantoSidebar
          tab={tab}
          onSelect={setTab}
          role={role}
          onLogout={logout}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col border border-canto-line bg-white lg:overflow-y-auto lg:rounded-2xl">
          <div className="flex items-center justify-between border-b border-canto-line bg-white px-4 py-3 lg:hidden">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg p-1.5 text-canto-500 hover:bg-canto-50 hover:text-canto-900"
              aria-label="Abrir menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-canto-900">{TAB_LABEL[tab]}</span>
            <div className="w-8" />
          </div>

          {syncError && (
            <div className="px-4 pt-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
                <span>Não foi possível salvar no banco: {syncError}</span>
                <button onClick={() => setSyncError(null)} className="font-semibold hover:underline">
                  Fechar
                </button>
              </div>
            </div>
          )}

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-6 hidden items-center justify-between gap-4 lg:flex">
              <h1 className="font-canto-serif text-2xl font-semibold text-canto-900">{TAB_LABEL[tab]}</h1>
              {UNIT_FILTERED_TABS.includes(tab) && businessUnits.length > 0 && (
                <label className="flex items-center gap-2 text-xs text-canto-500">
                  Unidade
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="rounded-md border border-canto-200 bg-white px-2 py-1.5 text-sm text-canto-900 outline-none focus:border-canto-500"
                  >
                    <option value="all">Todas as unidades</option>
                    <option value="">Patrícia Canto (principal)</option>
                    {businessUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {loading ? (
              <p className="py-16 text-center text-sm text-canto-500">Carregando dados do banco...</p>
            ) : loadError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <p className="font-semibold">Não foi possível carregar os dados.</p>
                <p className="mt-1">{loadError}</p>
                <p className="mt-2 text-xs text-rose-600">
                  Se as tabelas ainda não existem, rode a migração em{" "}
                  <code className="rounded bg-rose-100 px-1">/api/patricia-canto/setup/migrate</code> no Supabase SQL
                  Editor.
                </p>
              </div>
            ) : (
              <>
                {tab === "bi" && (
                  <BiOverview
                    leads={filteredLeads}
                    cases={filteredCases}
                    investment={investment}
                    comunicacoes={filteredComunicacoes}
                    lancamentos={filteredLancamentos}
                    salesGoals={salesGoals}
                    onSaveSalesGoals={saveSalesGoals}
                    onNavigate={setTab}
                  />
                )}
                {tab === "gtm" && (
                  <GtmView
                    leads={filteredLeads}
                    investment={investment}
                    onInvestmentChange={setChannelInvestment}
                    comunicacoes={filteredComunicacoes}
                    onAddComunicacao={addComunicacao}
                    onSaveComunicacao={saveComunicacao}
                    onDeleteComunicacao={deleteComunicacao}
                    marketSizing={marketSizing}
                    onSaveMarketSizing={saveMarketSizing}
                    businessUnits={businessUnits}
                  />
                )}
                {tab === "comercial" && (
                  <ComercialBoard
                    leads={filteredLeads}
                    onMoveLead={moveLead}
                    onSaveLead={saveLead}
                    onDeleteLead={deleteLead}
                    onAddLead={addLead}
                    businessUnits={businessUnits}
                  />
                )}
                {tab === "cs" && (
                  <CsJuridicoBoard
                    cases={filteredCases}
                    onMoveCase={moveCase}
                    onSaveCase={saveCase}
                    onDeleteCase={deleteCase}
                  />
                )}
                {tab === "financeiro" && (
                  <FinanceiroView
                    lancamentos={filteredLancamentos}
                    onAdd={addLancamento}
                    onSave={saveLancamento}
                    onDelete={deleteLancamento}
                    salesGoals={salesGoals}
                    businessUnits={businessUnits}
                  />
                )}
                {tab === "equipe" && <EquipeView activityLog={activityLog} comunicacoes={comunicacoes} />}
                {tab === "unidades" && (
                  <BusinessUnitsView
                    businessUnits={businessUnits}
                    leads={leads}
                    onAdd={addBusinessUnit}
                    onSave={saveBusinessUnit}
                    onDelete={deleteBusinessUnit}
                  />
                )}
              </>
            )}
          </main>

          <footer className="px-4 pb-8 pt-2 text-center text-[11px] text-canto-500 sm:px-6 lg:px-8">
            Dados salvos no banco (Supabase) — sincronizados entre qualquer dispositivo. Leads marcados como
            &quot;Fechado — Ganho&quot; no Comercial criam automaticamente um card em CS/Jurídico e uma receita em
            Financeiro.
          </footer>
        </div>
      </div>
    </div>
  );
}
