"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import {
  Target, DollarSign, TrendingUp, Clock,
  UserPlus, X,
} from "lucide-react";
import type { CrmOpportunity, CrmClient } from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";
import { crmUpdate, crmCreate } from "@/lib/jacqes-crm-store";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  "Novo Lead", "Qualificação", "Diagnóstico", "Proposta",
  "Negociação", "Fechado Ganho", "Fechado Perdido",
] as const;

type Stage = (typeof PIPELINE_STAGES)[number];

const STAGE_CFG: Record<string, {
  text: string; colBg: string; border: string;
  headerBg: string; countCls: string; emptyBorder: string; emptyText: string;
}> = {
  "Novo Lead":       { text: "text-gray-700",    colBg: "bg-gray-50",       border: "border-gray-200",    headerBg: "bg-white",        countCls: "bg-gray-100 text-gray-600",       emptyBorder: "border-gray-300",   emptyText: "text-gray-400"   },
  "Qualificação":    { text: "text-blue-700",     colBg: "bg-blue-50",       border: "border-blue-200",    headerBg: "bg-blue-50",      countCls: "bg-blue-100 text-blue-700",       emptyBorder: "border-blue-300",   emptyText: "text-blue-400"   },
  "Diagnóstico":     { text: "text-violet-700",   colBg: "bg-violet-50",     border: "border-violet-200",  headerBg: "bg-violet-50",    countCls: "bg-violet-100 text-violet-700",   emptyBorder: "border-violet-300", emptyText: "text-violet-400" },
  "Proposta":        { text: "text-amber-700",    colBg: "bg-amber-50",      border: "border-amber-200",   headerBg: "bg-amber-50",     countCls: "bg-amber-100 text-amber-700",     emptyBorder: "border-amber-300",  emptyText: "text-amber-400"  },
  "Negociação":      { text: "text-orange-700",   colBg: "bg-orange-50",     border: "border-orange-200",  headerBg: "bg-orange-50",    countCls: "bg-orange-100 text-orange-700",   emptyBorder: "border-orange-300", emptyText: "text-orange-400" },
  "Fechado Ganho":   { text: "text-emerald-700",  colBg: "bg-emerald-50",    border: "border-emerald-200", headerBg: "bg-emerald-50",   countCls: "bg-emerald-100 text-emerald-700", emptyBorder: "border-emerald-300",emptyText: "text-emerald-400"},
  "Fechado Perdido": { text: "text-red-700",      colBg: "bg-red-50",        border: "border-red-200",     headerBg: "bg-red-50",       countCls: "bg-red-100 text-red-700",         emptyBorder: "border-red-300",    emptyText: "text-red-400"    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

const TODAY = new Date().toISOString().slice(0, 10);

function ProbBar({ pct }: { pct: number }) {
  const color =
    pct >= 75 ? "bg-emerald-400" :
    pct >= 50 ? "bg-amber-400" :
    pct >= 25 ? "bg-orange-400" :
    "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-gray-400">{pct}%</span>
    </div>
  );
}

function AgingPill({ dataAbertura }: { dataAbertura: string }) {
  const days = Math.floor((Date.now() - new Date(dataAbertura).getTime()) / 86_400_000);
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
      days > 30 ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500"
    }`}>
      {days}d
    </span>
  );
}

function RiskDot({ risco }: { risco: string }) {
  const color =
    risco === "Alto"  ? "bg-red-400" :
    risco === "Médio" ? "bg-amber-400" :
    "bg-emerald-400";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} title={`Risco ${risco}`} />;
}

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SumCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  iconColor: string;
  valueColor: string;
}

function SumCard({ label, value, icon: Icon, iconColor, valueColor }: SumCardProps) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <Icon size={17} className={`shrink-0 ${iconColor}`} />
      <div className="min-w-0">
        <div className={`text-xl font-bold leading-tight ${valueColor}`}>{value}</div>
        <div className="text-[11px] text-gray-400 mt-0.5 truncate">{label}</div>
      </div>
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

interface KanbanCardProps {
  opp: CrmOpportunity;
  onClientClick: () => void;
}

function KanbanCard({ opp, onClientClick }: KanbanCardProps) {
  const actionPast = opp.data_proxima_acao && opp.data_proxima_acao < TODAY;

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData("oppId", opp.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm
                 hover:border-gray-300 hover:shadow-md transition-all
                 cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95 group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-2">
            {opp.empresa}
          </div>
          <div className="text-[9px] text-gray-400 truncate mt-0.5">
            {opp.nome_oportunidade}
          </div>
        </div>
        <AgingPill dataAbertura={opp.data_abertura} />
      </div>

      {/* Value */}
      <div className="text-[13px] font-bold text-amber-600 mb-2">
        {fmtCurrency(opp.valor_potencial)}
      </div>

      {/* Probability */}
      <ProbBar pct={opp.probabilidade} />

      {/* Next action */}
      {opp.proxima_acao && (
        <div className={`mt-1.5 text-[9px] truncate ${actionPast ? "text-red-500" : "text-gray-400"}`}>
          {opp.proxima_acao}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <RiskDot risco={opp.risco} />
          <span className="text-[9px] text-gray-500 truncate max-w-[90px]">{opp.owner}</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          {opp.stage === "Fechado Ganho" && (
            <button
              onClick={e => { e.stopPropagation(); onClientClick(); }}
              title="Converter em Cliente"
              className="p-1 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
            >
              <UserPlus size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: Stage;
  opps: CrmOpportunity[];
  onDrop: (oppId: string, stage: Stage) => void;
  onClientClick: (opp: CrmOpportunity) => void;
}

function KanbanColumn({ stage, opps, onDrop, onClientClick }: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false);
  const cfg = STAGE_CFG[stage];
  const stageTotal = opps.reduce((s, o) => s + o.valor_potencial, 0);

  return (
    <div
      className={`flex-shrink-0 w-[210px] flex flex-col rounded-xl border ${cfg.border} ${cfg.colBg} transition-all duration-150
                  ${dragOver ? "ring-2 ring-brand-400/60 scale-[1.01]" : ""}`}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        const id = e.dataTransfer.getData("oppId");
        if (id) onDrop(id, stage);
      }}
    >
      {/* Column header */}
      <div className={`px-3 py-2.5 rounded-t-xl ${cfg.headerBg} border-b ${cfg.border} shrink-0`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] font-bold ${cfg.text} truncate`}>{stage}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.countCls} shrink-0`}>
            {opps.length}
          </span>
        </div>
        <div className={`text-[10px] mt-0.5 font-medium ${cfg.text} opacity-70`}>
          {stageTotal > 0 ? fmtCurrency(stageTotal) : "—"}
        </div>
      </div>

      {/* Cards list */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)", minHeight: 80 }}>
        {opps.map(opp => (
          <KanbanCard
            key={opp.id}
            opp={opp}
            onClientClick={() => onClientClick(opp)}
          />
        ))}
        {dragOver && (
          <div className={`h-14 rounded-lg border-2 border-dashed ${cfg.emptyBorder} flex items-center justify-center`}>
            <span className={`text-[10px] ${cfg.emptyText}`}>Soltar aqui</span>
          </div>
        )}
        {!dragOver && opps.length === 0 && (
          <div className={`rounded-lg border border-dashed ${cfg.emptyBorder} px-3 py-4 flex items-center justify-center`}>
            <span className={`text-[10px] ${cfg.emptyText}`}>Sem oportunidades</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JacqesCrmPipelinePage() {
  const [opps, setOpps] = useState<CrmOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientModal, setClientModal] = useState<CrmOpportunity | null>(null);
  const [clientForm, setClientForm] = useState({
    nome: "", razao_social: "", segmento: "",
    produto_ativo: "", ticket_mensal: "", owner: "", observacoes: "",
  });
  const [savingClient, setSavingClient] = useState(false);

  useEffect(() => {
    fetchCRM<CrmOpportunity>("opportunities")
      .then(d => { setOpps(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Summary metrics
  const openOpps      = opps.filter(o => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido");
  const pipelineAberto = openOpps.reduce((s, o) => s + o.valor_potencial, 0);
  const valorGanho    = opps.filter(o => o.stage === "Fechado Ganho").reduce((s, o) => s + o.valor_potencial, 0);
  const vencidas      = openOpps.filter(o => o.data_proxima_acao && o.data_proxima_acao < TODAY).length;

  function handleDrop(oppId: string, newStage: Stage) {
    const opp = opps.find(o => o.id === oppId);
    if (!opp || opp.stage === newStage) return;
    crmUpdate<CrmOpportunity>("opportunities", oppId, { stage: newStage });
    setOpps(prev => prev.map(o => o.id === oppId ? { ...o, stage: newStage } : o));
  }

  function openClientModal(opp: CrmOpportunity) {
    setClientModal(opp);
    setClientForm({
      nome:          opp.empresa,
      razao_social:  opp.empresa,
      segmento:      opp.segmento || "",
      produto_ativo: opp.produto  || "",
      ticket_mensal: String(opp.ticket_estimado || ""),
      owner:         opp.owner,
      observacoes:   `Convertido de oportunidade: ${opp.nome_oportunidade}`,
    });
  }

  function saveClient() {
    if (!clientForm.nome.trim()) return;
    setSavingClient(true);
    const payload: Omit<CrmClient, "id"> = {
      nome:               clientForm.nome.trim(),
      razao_social:       clientForm.razao_social.trim() || clientForm.nome.trim(),
      cnpj:               "",
      segmento:           clientForm.segmento.trim(),
      produto_ativo:      clientForm.produto_ativo.trim(),
      ticket_mensal:      parseFloat(clientForm.ticket_mensal) || 0,
      inicio_relacao:     new Date().toISOString().slice(0, 10),
      owner:              clientForm.owner.trim(),
      status_conta:       "Ativo",
      health_score:       80,
      churn_risk:         "Baixo",
      potencial_expansao: 0,
      observacoes:        clientForm.observacoes.trim(),
    };
    crmCreate<CrmClient>("clients", payload, "cli");
    setSavingClient(false);
    setClientModal(null);
    alert("Cliente criado! Acesse Clientes para ver e editar.");
  }

  if (loading) {
    return (
      <>
        <Header title="Pipeline — JACQES CRM" subtitle="Carregando…" />
        <div className="page-container">
          <div className="card p-8 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-200 border-t-brand-400 rounded-full animate-spin" />
              <span className="text-sm">Carregando pipeline…</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Pipeline — JACQES CRM" subtitle="Arraste os cards para mover entre etapas" />

      <div className="page-container">

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SumCard label="Pipeline Aberto"    value={fmtCurrency(pipelineAberto)}
            icon={DollarSign}  iconColor="text-brand-500"   valueColor="text-brand-600"   />
          <SumCard label="Oportunidades"      value={openOpps.length}
            icon={Target}      iconColor="text-brand-500"   valueColor="text-brand-600"   />
          <SumCard label="Valor Ganho"        value={fmtCurrency(valorGanho)}
            icon={TrendingUp}  iconColor="text-emerald-500" valueColor="text-emerald-600" />
          <SumCard label="Ações Vencidas"     value={vencidas}
            icon={Clock}       iconColor="text-red-400"     valueColor="text-red-500"     />
        </div>

        {/* ── Kanban Board ─────────────────────────────────────────────────── */}
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-3 min-w-max">
            {PIPELINE_STAGES.map(stage => (
              <KanbanColumn
                key={stage}
                stage={stage}
                opps={opps.filter(o => o.stage === stage)}
                onDrop={handleDrop}
                onClientClick={openClientModal}
              />
            ))}
          </div>
        </div>

      </div>

      {/* ── Converter em Cliente Modal ────────────────────────────────────────── */}
      {clientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Converter em Cliente</h3>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[260px]">
                  {clientModal.nome_oportunidade}
                </p>
              </div>
              <button onClick={() => setClientModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Nome do Cliente *</label>
                <input type="text" value={clientForm.nome}
                  onChange={e => setClientForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Segmento</label>
                  <input type="text" value={clientForm.segmento}
                    onChange={e => setClientForm(f => ({ ...f, segmento: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Produto Ativo</label>
                  <input type="text" value={clientForm.produto_ativo}
                    onChange={e => setClientForm(f => ({ ...f, produto_ativo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Ticket Mensal (R$)</label>
                  <input type="number" min="0" value={clientForm.ticket_mensal}
                    onChange={e => setClientForm(f => ({ ...f, ticket_mensal: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Owner</label>
                  <input type="text" value={clientForm.owner}
                    onChange={e => setClientForm(f => ({ ...f, owner: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Observações</label>
                <textarea rows={2} value={clientForm.observacoes}
                  onChange={e => setClientForm(f => ({ ...f, observacoes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setClientModal(null)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={saveClient} disabled={savingClient || !clientForm.nome.trim()}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
                  {savingClient ? "Criando…" : "Criar Cliente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
