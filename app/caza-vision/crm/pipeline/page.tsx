"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { fetchCazaCRM } from "@/lib/caza-crm-query";
import type { CazaCrmOpportunity } from "@/lib/caza-crm-db";
import { CAZA_PIPELINE_STAGES } from "@/lib/caza-crm-db";
import {
  Target, DollarSign, TrendingUp, Clock,
  Database, CloudOff, ArrowRight, AlertTriangle,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const TODAY = new Date().toISOString().slice(0, 10);

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGE_CFG: Record<string, { text: string; bg: string; border: string }> = {
  "Lead Captado":    { text: "text-gray-600",    bg: "bg-gray-100",    border: "border-gray-200"   },
  "Qualificação":    { text: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200"   },
  "Briefing Inicial":{ text: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200" },
  "Proposta Enviada":{ text: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200"  },
  "Negociação":      { text: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200" },
  "Fechado Ganho":   { text: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200"},
  "Fechado Perdido": { text: "text-red-700",     bg: "bg-red-50",      border: "border-red-200"    },
};

function StageBadge({ stage }: { stage: string }) {
  const cfg = STAGE_CFG[stage] ?? STAGE_CFG["Lead Captado"];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.text} ${cfg.bg} ${cfg.border}`}>
      {stage}
    </span>
  );
}

function RiskBadge({ risco }: { risco: string }) {
  if (risco === "Alto")  return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200"><AlertTriangle size={9} />Alto</span>;
  if (risco === "Médio") return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">Médio</span>;
  return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">Baixo</span>;
}

function ProbBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : pct >= 25 ? "bg-orange-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-500 font-medium tabular-nums">{pct}%</span>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

type StageFilter = (typeof CAZA_PIPELINE_STAGES)[number] | "Todas";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaCrmPipeline() {
  const [opps,    setOpps]   = useState<CazaCrmOpportunity[]>([]);
  const [source,  setSource] = useState<"loading" | "internal" | "static" | "empty">("loading");
  const [stage,   setStage]  = useState<StageFilter>("Todas");

  useEffect(() => {
    fetchCazaCRM<CazaCrmOpportunity>("oportunidades").then((data) => {
      setOpps(data);
      setSource(data.length > 0 ? (IS_STATIC ? "static" : "internal") : "empty");
    });
  }, []);

  const visible = stage === "Todas" ? opps : opps.filter((o) => o.stage === stage);
  const activeOpps  = opps.filter((o) => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido");
  const valorTotal  = activeOpps.reduce((s, o) => s + o.valor_estimado, 0);
  const ganhas      = opps.filter((o) => o.stage === "Fechado Ganho");
  const valorGanho  = ganhas.reduce((s, o) => s + o.valor_estimado, 0);
  const vencendo    = visible.filter((o) => o.prazo_estimado && o.prazo_estimado < TODAY && o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido");

  return (
    <>
      <Header title="Pipeline Comercial" subtitle="Funil de Oportunidades · Caza Vision" />
      <div className="page-container">

        {/* Source badge */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {source === "loading" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500">
                <Database size={11} /> Carregando…
              </span>
            )}
            {source === "internal" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600">
                <Database size={11} /> Base interna AWQ
              </span>
            )}
            {source === "static" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600">
                <Database size={11} /> Snapshot estático
              </span>
            )}
            {source === "empty" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <CloudOff size={11} /> Pipeline vazio — abra oportunidades em Leads
              </span>
            )}
          </div>
          <Link href="/caza-vision/crm/oportunidades"
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs">
            Nova Oportunidade <ArrowRight size={12} />
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Pipeline Aberto",   value: fmtR(valorTotal),         icon: DollarSign,  color: "text-brand-600"   },
            { label: "Oportunidades",     value: activeOpps.length,         icon: Target,      color: "text-violet-600"  },
            { label: "Valor Ganho",       value: fmtR(valorGanho),          icon: TrendingUp,  color: "text-emerald-600" },
            { label: "Vencendo / Vencido",value: vencendo.length,           icon: Clock,       color: "text-red-500"     },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="card p-4 flex items-center gap-3">
                <Icon size={16} className={`${k.color} shrink-0`} />
                <div>
                  <div className={`text-xl font-bold ${k.color} tabular-nums`}>{k.value}</div>
                  <div className="text-[11px] text-gray-400 font-medium">{k.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stage filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["Todas", ...CAZA_PIPELINE_STAGES] as const).map((s) => {
            const count = s === "Todas" ? opps.length : opps.filter((o) => o.stage === s).length;
            const cfg   = s !== "Todas" ? (STAGE_CFG[s] ?? STAGE_CFG["Lead Captado"]) : null;
            return (
              <button
                key={s}
                onClick={() => setStage(s)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                  stage === s
                    ? (cfg ? `${cfg.text} ${cfg.bg} ${cfg.border}` : "bg-brand-600 text-gray-900 border-brand-600")
                    : "text-gray-500 bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                {s} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Opportunities table */}
        <div className="card p-5">
          <SectionHeader icon={<Target size={15} className="text-violet-500" />} title={`Oportunidades${stage !== "Todas" ? ` — ${stage}` : ""}`} />
          {source === "loading" ? (
            <div className="py-12 text-center text-sm text-gray-400">Carregando…</div>
          ) : visible.length === 0 ? (
            <EmptyState compact title="Sem oportunidades" description={stage !== "Todas" ? `Nenhuma oportunidade na etapa "${stage}".` : "Abra oportunidades a partir dos leads cadastrados."} />
          ) : (
            <div className="table-scroll mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Oportunidade</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Empresa</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Serviço</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Valor Est.</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Prob.</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Etapa</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Prazo</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Risco</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((o) => {
                    const isOverdue = o.prazo_estimado && o.prazo_estimado < TODAY
                      && o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido";
                    return (
                      <tr key={o.id} className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${isOverdue ? "bg-red-50/30" : ""}`}>
                        <td className="py-2.5 px-3">
                          <div className="text-xs font-medium text-gray-800">{o.nome_oportunidade}</div>
                          <div className="text-[10px] text-gray-400">{o.id}</div>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-600">{o.empresa || "—"}</td>
                        <td className="py-2.5 px-3 text-xs text-gray-500">{o.tipo_servico || "—"}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">
                          {o.valor_estimado > 0 ? fmtR(o.valor_estimado) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3"><ProbBar pct={o.probabilidade} /></td>
                        <td className="py-2.5 px-3"><StageBadge stage={o.stage} /></td>
                        <td className={`py-2.5 px-3 text-[11px] ${isOverdue ? "text-red-600 font-semibold" : "text-gray-400"}`}>
                          {fmtDate(o.prazo_estimado)}
                        </td>
                        <td className="py-2.5 px-3"><RiskBadge risco={o.risco} /></td>
                        <td className="py-2.5 px-3 text-xs text-gray-500">{o.owner || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
