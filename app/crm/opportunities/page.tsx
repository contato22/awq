"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import Header from "@/components/Header";
import { AlertCircle, BarChart3, DollarSign, Target, TrendingUp, UserPlus, X } from "lucide-react";
import type { CrmClient, CrmOpportunity } from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";
import { crmCreate, crmRead, crmUpdate, crmWrite, IS_STATIC } from "@/lib/jacqes-crm-store";
import { moveCard, resolveBoardRows } from "@/lib/jacqes-pipeline-board";
import { formatBRL } from "@/lib/utils";

const PIPELINE_STAGES = [
  "Novo Lead",
  "Qualificação",
  "Diagnóstico",
  "Proposta",
  "Negociação",
  "Fechado Ganho",
  "Fechado Perdido",
] as const;

type Stage = (typeof PIPELINE_STAGES)[number];

const STAGE_CFG: Record<Stage, { header: string; ring: string }> = {
  "Novo Lead":       { header: "bg-slate-500",    ring: "ring-slate-300" },
  "Qualificação":    { header: "bg-blue-500",     ring: "ring-blue-300" },
  "Diagnóstico":     { header: "bg-violet-500",   ring: "ring-violet-300" },
  "Proposta":        { header: "bg-amber-500",    ring: "ring-amber-300" },
  "Negociação":      { header: "bg-orange-500",   ring: "ring-orange-300" },
  "Fechado Ganho":   { header: "bg-emerald-600",  ring: "ring-emerald-300" },
  "Fechado Perdido": { header: "bg-red-600",      ring: "ring-red-300" },
};

const FALLBACK_OPPORTUNITIES: CrmOpportunity[] = [
  {
    id: "demo-opp-leste",
    lead_id: null,
    cliente_id: null,
    nome_oportunidade: "Retainer mensal",
    empresa: "Oficina Leste",
    segmento: "Varejo",
    produto: "Social",
    ticket_estimado: 8000,
    valor_potencial: 96000,
    stage: "Novo Lead",
    probabilidade: 20,
    owner: "Miguel",
    data_abertura: "2026-10-08",
    proxima_acao: "Ligar para o decisor",
    data_proxima_acao: "2026-10-28",
    risco: "Médio",
    motivo_perda: "",
    data_fechamento_prevista: "2026-11-15",
    observacoes: "",
  },
  {
    id: "demo-opp-serra",
    lead_id: null,
    cliente_id: null,
    nome_oportunidade: "Campanha de lançamento",
    empresa: "Serra & Filhos",
    segmento: "Indústria",
    produto: "Mídia",
    ticket_estimado: 15000,
    valor_potencial: 180000,
    stage: "Diagnóstico",
    probabilidade: 45,
    owner: "Danilo",
    data_abertura: "2026-08-20",
    proxima_acao: "Enviar diagnóstico",
    data_proxima_acao: "2026-10-01",
    risco: "Alto",
    motivo_perda: "",
    data_fechamento_prevista: "2026-11-30",
    observacoes: "",
  },
  {
    id: "demo-opp-norte",
    lead_id: null,
    cliente_id: null,
    nome_oportunidade: "Contrato anual",
    empresa: "Ateliê Norte",
    segmento: "Serviços",
    produto: "Branding",
    ticket_estimado: 12000,
    valor_potencial: 144000,
    stage: "Fechado Ganho",
    probabilidade: 100,
    owner: "Miguel",
    data_abertura: "2026-09-01",
    proxima_acao: "Onboarding",
    data_proxima_acao: "2026-10-18",
    risco: "Baixo",
    motivo_perda: "",
    data_fechamento_prevista: "2026-10-15",
    observacoes: "",
  },
];

function isOpportunity(value: unknown): value is CrmOpportunity {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<CrmOpportunity>;
  return typeof row.id === "string"
    && typeof row.stage === "string"
    && typeof row.empresa === "string"
    && typeof row.nome_oportunidade === "string";
}

function coerceList(value: unknown): CrmOpportunity[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isOpportunity).map((row) => ({
    ...row,
    valor_potencial: Number(row.valor_potencial) || 0,
    probabilidade: Number(row.probabilidade) || 0,
    ticket_estimado: Number(row.ticket_estimado) || 0,
    risco: row.risco || "Baixo",
    proxima_acao: row.proxima_acao || "",
    data_abertura: row.data_abertura || "",
    owner: row.owner || "",
  }));
}

function agingDays(iso: string): number {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadBoard(): Promise<{ rows: CrmOpportunity[]; source: "api" | "local" | "json" | "demo" }> {
  const local = coerceList(crmRead<CrmOpportunity>("opportunities"));

  if (IS_STATIC && local.length > 0) {
    return resolveBoardRows({ fromApi: null, local, fromJson: [], fallback: FALLBACK_OPPORTUNITIES });
  }

  let fromApi: CrmOpportunity[] | null = null;
  if (!IS_STATIC) {
    try {
      const res = await fetch("/api/jacqes/crm/oportunidades");
      if (res.ok) {
        const data: unknown = await res.json();
        const rows = coerceList(data);
        if (rows.length > 0) fromApi = rows;
      }
    } catch {
      // Banco pausado ou rede indisponível — segue para localStorage / JSON.
    }
  }

  let fromJson: CrmOpportunity[] = [];
  if (!fromApi && local.length === 0) {
    fromJson = coerceList(await fetchCRM<CrmOpportunity>("opportunities"));
  }

  return resolveBoardRows({
    fromApi,
    local: local.length ? local : null,
    fromJson,
    fallback: FALLBACK_OPPORTUNITIES,
  });
}

function persistStage(next: CrmOpportunity[], id: string, stage: Stage) {
  const existing = coerceList(crmRead<CrmOpportunity>("opportunities"));
  if (existing.some((row) => row.id === id)) {
    crmUpdate<CrmOpportunity>("opportunities", id, { stage });
    return;
  }
  crmWrite("opportunities", next);
}

function ProbBar({ pct }: { pct: number }) {
  const width = Math.max(0, Math.min(100, pct));
  const color = width >= 75 ? "bg-emerald-500" : width >= 50 ? "bg-amber-500" : width >= 25 ? "bg-orange-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5" title={`Probabilidade ${width}%`}>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-gray-500 tabular-nums">{width}%</span>
    </div>
  );
}

function AgingPill({ dataAbertura }: { dataAbertura: string }) {
  const days = agingDays(dataAbertura);
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
      days > 30 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
    }`}>
      {days}d
    </span>
  );
}

function RiskDot({ risco }: { risco: string }) {
  const color = risco === "Alto" ? "bg-red-500" : risco === "Médio" ? "bg-amber-400" : "bg-emerald-500";
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
      {risco || "Baixo"}
    </span>
  );
}

function KanbanCard({
  opp,
  onConvert,
}: {
  opp: CrmOpportunity;
  onConvert: (opp: CrmOpportunity) => void;
}) {
  const actionPast = Boolean(opp.data_proxima_acao && opp.data_proxima_acao < todayIso());

  return (
    <div
      draggable
      data-testid="kanban-card"
      data-opp-id={opp.id}
      data-stage={opp.stage}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", opp.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:border-brand-300 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <div className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">{opp.empresa}</div>
          <div className="text-[10px] text-gray-500 truncate mt-0.5">{opp.nome_oportunidade}</div>
        </div>
        <AgingPill dataAbertura={opp.data_abertura} />
      </div>

      <div className="text-sm font-bold text-gray-900 mb-2">{formatBRL(opp.valor_potencial)}</div>
      <ProbBar pct={opp.probabilidade} />

      {opp.proxima_acao && (
        <div className={`mt-1.5 text-[10px] truncate ${actionPast ? "text-red-600" : "text-gray-500"}`}>
          {opp.proxima_acao}
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <RiskDot risco={opp.risco} />
        <span className="text-[10px] text-gray-500 truncate max-w-[90px]">{opp.owner}</span>
      </div>

      {opp.stage === "Fechado Ganho" && (
        <button
          type="button"
          data-testid="convert-client"
          onClick={(event) => { event.stopPropagation(); onConvert(opp); }}
          className="mt-2 flex items-center justify-center gap-1 w-full text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-1 hover:bg-emerald-100 transition-colors"
        >
          <UserPlus size={11} /> Converter em Cliente
        </button>
      )}
    </div>
  );
}

function KanbanColumn({
  stage,
  opps,
  onDrop,
  onConvert,
}: {
  stage: Stage;
  opps: CrmOpportunity[];
  onDrop: (id: string, stage: Stage) => void;
  onConvert: (opp: CrmOpportunity) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const cfg = STAGE_CFG[stage];
  const total = opps.reduce((sum, opp) => sum + (Number(opp.valor_potencial) || 0), 0);

  function readId(event: DragEvent<HTMLDivElement>): string {
    return event.dataTransfer.getData("text/plain");
  }

  return (
    <div
      data-testid="kanban-column"
      data-stage={stage}
      className={`flex flex-col min-w-[240px] w-[240px] rounded-xl border-2 bg-gray-50/70 transition-colors ${
        dragOver ? `border-brand-400 ring-2 ${cfg.ring}` : "border-gray-200"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        onDrop(readId(event), stage);
      }}
    >
      <div className={`px-3 py-2.5 rounded-t-[10px] ${cfg.header} text-white`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold truncate">{stage}</span>
          <span className="text-[10px] font-bold bg-white/20 rounded-full px-1.5 py-0.5">{opps.length}</span>
        </div>
        <div className="text-[10px] text-white/80 mt-0.5">{total > 0 ? formatBRL(total) : "—"}</div>
      </div>

      <div className="flex-1 p-2 space-y-2 min-h-[140px]">
        {opps.map((opp) => (
          <KanbanCard key={opp.id} opp={opp} onConvert={onConvert} />
        ))}
        {opps.length === 0 && (
          <div className="flex items-center justify-center h-20 text-[11px] text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            {dragOver ? "Soltar aqui" : "Sem cards"}
          </div>
        )}
      </div>
    </div>
  );
}

type ClientForm = {
  nome: string;
  segmento: string;
  produto_ativo: string;
  ticket_mensal: string;
  owner: string;
  observacoes: string;
};

const EMPTY_CLIENT: ClientForm = {
  nome: "", segmento: "", produto_ativo: "", ticket_mensal: "", owner: "", observacoes: "",
};

export default function PipelinePage() {
  const [opps, setOpps] = useState<CrmOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [clientModal, setClientModal] = useState<CrmOpportunity | null>(null);
  const [clientForm, setClientForm] = useState<ClientForm>(EMPTY_CLIENT);
  const [savingClient, setSavingClient] = useState(false);
  const draggingId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadBoard()
      .then(({ rows, source }) => {
        if (cancelled) return;
        setOpps(rows);
        setDemo(source === "demo");
      })
      .catch(() => {
        if (cancelled) return;
        setOpps(FALLBACK_OPPORTUNITIES);
        setDemo(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleDrop(id: string, stage: Stage) {
    const dragged = id || draggingId.current || "";
    draggingId.current = null;
    const next = moveCard(opps, dragged, stage);
    if (!next) return;
    setOpps(next);
    persistStage(next, dragged, stage);
    setToast(`Movido para ${stage}`);
  }

  function openClientModal(opp: CrmOpportunity) {
    setClientModal(opp);
    setClientForm({
      nome: opp.empresa,
      segmento: opp.segmento || "",
      produto_ativo: opp.produto || "",
      ticket_mensal: String(opp.ticket_estimado || ""),
      owner: opp.owner,
      observacoes: `Convertido de oportunidade: ${opp.nome_oportunidade}`,
    });
  }

  function saveClient(event: FormEvent) {
    event.preventDefault();
    if (!clientForm.nome.trim()) return;
    setSavingClient(true);
    const payload: Omit<CrmClient, "id"> = {
      nome: clientForm.nome.trim(),
      razao_social: clientForm.nome.trim(),
      cnpj: "",
      segmento: clientForm.segmento.trim(),
      produto_ativo: clientForm.produto_ativo.trim(),
      ticket_mensal: Number(clientForm.ticket_mensal) || 0,
      inicio_relacao: todayIso(),
      owner: clientForm.owner.trim(),
      status_conta: "Ativo",
      health_score: 80,
      churn_risk: "Baixo",
      potencial_expansao: 0,
      observacoes: clientForm.observacoes.trim(),
    };
    crmCreate<CrmClient>("clients", payload, "cli");
    setSavingClient(false);
    setClientModal(null);
    setToast("Cliente salvo neste navegador");
  }

  const pipelineTotal = opps.reduce((sum, opp) => sum + (Number(opp.valor_potencial) || 0), 0);
  const weighted = opps.reduce((sum, opp) => sum + (Number(opp.valor_potencial) || 0) * (Number(opp.probabilidade) || 0) / 100, 0);
  const ticket = opps.length > 0 ? pipelineTotal / opps.length : 0;

  if (loading) {
    return (
      <>
        <Header title="Pipeline — CRM AWQ" subtitle="Visão kanban do funil de vendas" />
        <div className="page-container">
          <div className="card p-8 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
              <span className="text-sm">Carregando pipeline…</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Pipeline — CRM AWQ" subtitle="Arraste os cards para mover entre etapas" />
      <div
        className="page-container"
        onDragStart={(event) => {
          const card = (event.target as HTMLElement).closest("[data-opp-id]");
          draggingId.current = card?.getAttribute("data-opp-id") ?? null;
        }}
      >
        {toast && (
          <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg bg-emerald-600 text-white">
            {toast}
          </div>
        )}

        {demo && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <AlertCircle size={14} className="text-amber-500 shrink-0" />
            <span>Sem dados no banco. O quadro mostra oportunidades de demonstração e guarda a etapa só neste navegador.</span>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total de Oportunidades", value: String(opps.length), icon: Target, color: "text-violet-600", bg: "bg-violet-50" },
            { label: "Pipeline Total", value: formatBRL(pipelineTotal), icon: BarChart3, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Receita Ponderada", value: formatBRL(weighted), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Ticket Médio", value: formatBRL(ticket), icon: TrendingUp, color: "text-brand-600", bg: "bg-brand-50" },
          ].map((kpi) => (
            <div key={kpi.label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                <kpi.icon size={16} className={kpi.color} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{kpi.value}</div>
                <div className="text-xs text-gray-500">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {PIPELINE_STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                opps={opps.filter((opp) => opp.stage === stage)}
                onDrop={handleDrop}
                onConvert={openClientModal}
              />
            ))}
          </div>
        </div>
      </div>

      {clientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <form onSubmit={saveClient} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Converter em Cliente</h3>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[260px]">{clientModal.nome_oportunidade}</p>
              </div>
              <button type="button" onClick={() => setClientModal(null)} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Nome do Cliente</span>
                <input
                  required
                  value={clientForm.nome}
                  onChange={(event) => setClientForm((form) => ({ ...form, nome: event.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Segmento</span>
                  <input
                    value={clientForm.segmento}
                    onChange={(event) => setClientForm((form) => ({ ...form, segmento: event.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Produto Ativo</span>
                  <input
                    value={clientForm.produto_ativo}
                    onChange={(event) => setClientForm((form) => ({ ...form, produto_ativo: event.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Ticket Mensal (R$)</span>
                  <input
                    type="number"
                    min="0"
                    value={clientForm.ticket_mensal}
                    onChange={(event) => setClientForm((form) => ({ ...form, ticket_mensal: event.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Owner</span>
                  <input
                    value={clientForm.owner}
                    onChange={(event) => setClientForm((form) => ({ ...form, owner: event.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Observações</span>
                <textarea
                  rows={2}
                  value={clientForm.observacoes}
                  onChange={(event) => setClientForm((form) => ({ ...form, observacoes: event.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setClientModal(null)} className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={savingClient || !clientForm.nome.trim()} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
                  {savingClient ? "Criando…" : "Criar Cliente"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
