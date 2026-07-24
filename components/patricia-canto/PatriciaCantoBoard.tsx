"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Channel, Lead, Stage } from "@/lib/patricia-canto/leads";
import type { CaseItem, CaseStage } from "@/lib/patricia-canto/cases";
import { createCaseFromLead } from "@/lib/patricia-canto/cases";
import type { Lancamento } from "@/lib/patricia-canto/financeiro";
import { createReceitaFromLead } from "@/lib/patricia-canto/financeiro";
import type { PcRole } from "@/lib/patricia-canto/auth";
import type { NewLeadInput } from "./AddLeadModal";
import type { NewLancamentoInput } from "./AddLancamentoModal";
import { pcApi } from "@/lib/patricia-canto/api-client";
import PatriciaCantoLogo from "./PatriciaCantoLogo";
import BiOverview from "./BiOverview";
import GtmView from "./GtmView";
import ComercialBoard from "./ComercialBoard";
import CsJuridicoBoard from "./CsJuridicoBoard";
import FinanceiroView from "./FinanceiroView";

type Tab = "bi" | "gtm" | "comercial" | "cs" | "financeiro";

const TABS: { id: Tab; label: string }[] = [
  { id: "bi", label: "BI · Visão Geral" },
  { id: "gtm", label: "GTM · Aquisição" },
  { id: "comercial", label: "Pipeline Comercial" },
  { id: "cs", label: "CS / Jurídico" },
  { id: "financeiro", label: "Financeiro" },
];

const ROLE_LABEL: Record<PcRole, string> = { admin: "Administrador", master: "Master" };

export default function PatriciaCantoBoard({ role }: { role: PcRole }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("bi");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [investment, setInvestment] = useState<Partial<Record<Channel, number>>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([pcApi.getLeads(), pcApi.getCases(), pcApi.getLancamentos(), pcApi.getInvestment()])
      .then(async ([l, c, f, inv]) => {
        if (cancelled) return;

        // Backfill: leads que já estavam "Fechado — Ganho" antes de CS/Jurídico
        // ou Financeiro existirem nunca passaram pelo evento de promoção
        // (moveLead/saveLead só dispara na transição de estágio). Reconcilia
        // na carga, comparando por leadId — idempotente, roda toda vez mas só
        // cria o que ainda falta.
        const ganhos = l.filter((lead) => lead.stage === "ganho");
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
  }, []);

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

  async function moveLead(id: string, stage: Stage) {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    const now = new Date().toISOString();
    const updated = { ...lead, stage, stageHistory: [...lead.stageHistory, { stage, enteredAt: now }] };
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
      stageHistory: [{ stage: "novo", enteredAt: now }],
    };
    setLeads((prev) => [...prev, lead]);
    try {
      await pcApi.createLead(lead);
    } catch (e) {
      reportSyncError(e);
    }
  }

  async function moveCase(id: string, stage: CaseStage) {
    const item = cases.find((c) => c.id === id);
    if (!item) return;
    const updated = { ...item, stage, dataUltimaAtualizacao: new Date().toISOString() };
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

  async function logout() {
    try {
      await pcApi.logout();
    } finally {
      router.replace("/patricia-canto/login");
      router.refresh();
    }
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
            <div className="flex items-center gap-3 text-xs text-canto-300">
              <span>
                Logado como <span className="font-semibold text-white">{ROLE_LABEL[role]}</span>
              </span>
              <button
                onClick={logout}
                className="rounded-lg border border-canto-700 px-3 py-1.5 font-semibold text-canto-200 transition hover:bg-canto-800 hover:text-white"
              >
                Sair
              </button>
            </div>
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-canto-400">
            CRM · Aquisição → Pipeline Comercial → CS/Jurídico → Financeiro
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

      {syncError && (
        <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
            <span>Não foi possível salvar no banco: {syncError}</span>
            <button onClick={() => setSyncError(null)} className="font-semibold hover:underline">
              Fechar
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
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
            {tab === "bi" && <BiOverview leads={leads} cases={cases} investment={investment} />}
            {tab === "gtm" && (
              <GtmView leads={leads} investment={investment} onInvestmentChange={setChannelInvestment} />
            )}
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
            {tab === "financeiro" && (
              <FinanceiroView
                lancamentos={lancamentos}
                onAdd={addLancamento}
                onSave={saveLancamento}
                onDelete={deleteLancamento}
              />
            )}
          </>
        )}
      </main>

      <footer className="mx-auto max-w-[1600px] px-4 pb-8 pt-2 text-center text-[11px] text-canto-500 sm:px-6 lg:px-8">
        Dados salvos no banco (Supabase) — sincronizados entre qualquer dispositivo. Leads marcados como
        &quot;Fechado — Ganho&quot; no Comercial criam automaticamente um card em CS/Jurídico.
      </footer>
    </div>
  );
}
