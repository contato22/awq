"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Target, CheckCircle2, Clock, Lock, Archive,
  AlertTriangle, GitBranch, FileText, TrendingUp, ArrowLeft,
} from "lucide-react";
import type { BudgetVersion, ApprovalEvent } from "@/lib/epm-db";

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

const SEED_VERSIONS: BudgetVersion[] = [
  { id: "1", version_name: "FY2026-Bear", fiscal_year: 2026, scenario: "BEAR", status: "DRAFT",    notes: "Cenário conservador: crescimento orgânico apenas, sem novos contratos enterprise.", budget_revenue: 3_600_000, budget_ebitda: 180_000, budget_net_income:   90_000, growth_vs_ly: 12.5, ebitda_margin:  5.0 },
  { id: "2", version_name: "FY2026-Base", fiscal_year: 2026, scenario: "BASE", status: "APPROVED", submitted_by: "CFO", submitted_at: "2025-12-15T10:30:00Z", approved_by: "CEO", approved_at: "2025-12-20T14:15:00Z", notes: "Cenário base aprovado pelo board. Inclui 2 novos contratos JACQES e expansão CAZA.", budget_revenue: 5_040_000, budget_ebitda: 756_000, budget_net_income: 453_600, growth_vs_ly: 57.5, ebitda_margin: 15.0 },
  { id: "3", version_name: "FY2026-Bull", fiscal_year: 2026, scenario: "BULL", status: "DRAFT",    notes: "Cenário otimista: pipeline enterprise convertido + lançamento produto ADVISOR.", budget_revenue: 7_200_000, budget_ebitda: 1_440_000, budget_net_income: 1_008_000, growth_vs_ly: 125.0, ebitda_margin: 20.0 },
];

const SEED_LOG: ApprovalEvent[] = [
  { id: "1", version_name: "FY2026-Base", action: "SUBMITTED",          by: "CFO", at: "2025-12-15", comment: "Submetido para aprovação do board. Premissas alinhadas com pipeline CRM." },
  { id: "2", version_name: "FY2026-Base", action: "REVISION_REQUESTED", by: "CEO", at: "2025-12-18", comment: "Ajustar margem EBITDA target de 12% para 15% e rever custo de pessoal Q3." },
  { id: "3", version_name: "FY2026-Base", action: "RESUBMITTED",        by: "CFO", at: "2025-12-19", comment: "Revisão incorporada. EBITDA target ajustado. Folha Q3 com contratação gradual." },
  { id: "4", version_name: "FY2026-Base", action: "APPROVED",           by: "CEO", at: "2025-12-20", comment: "Aprovado. Budget FY2026-Base é o orçamento operacional do exercício." },
];

type BudgetStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "LOCKED" | "ARCHIVED";

const STATUS_CFG: Record<BudgetStatus, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  DRAFT:     { label: "Rascunho",  color: "text-gray-600",    bg: "bg-gray-100",    Icon: FileText     },
  SUBMITTED: { label: "Submetido", color: "text-amber-700",   bg: "bg-amber-100",   Icon: Clock        },
  APPROVED:  { label: "Aprovado",  color: "text-emerald-700", bg: "bg-emerald-100", Icon: CheckCircle2 },
  LOCKED:    { label: "Bloqueado", color: "text-brand-700",   bg: "bg-brand-100",   Icon: Lock         },
  ARCHIVED:  { label: "Arquivado", color: "text-gray-500",    bg: "bg-gray-100",    Icon: Archive      },
};

const SCENARIO_CFG = {
  BEAR: { color: "text-red-700",     bg: "bg-red-50",   label: "Bear" },
  BASE: { color: "text-brand-700",   bg: "bg-brand-50", label: "Base" },
  BULL: { color: "text-emerald-700", bg: "bg-emerald-50", label: "Bull" },
};

const ACTION_CFG: Record<string, { color: string; Icon: React.ElementType }> = {
  SUBMITTED:          { color: "text-amber-600",   Icon: Clock         },
  REVISION_REQUESTED: { color: "text-red-600",     Icon: AlertTriangle },
  RESUBMITTED:        { color: "text-amber-600",   Icon: Clock         },
  APPROVED:           { color: "text-emerald-600", Icon: CheckCircle2  },
  LOCKED:             { color: "text-brand-600",   Icon: Lock          },
};

export default function BudgetApprovalPage() {
  const [versions, setVersions]     = useState<BudgetVersion[]>(SEED_VERSIONS);
  const [approvalLog, setApprovalLog] = useState<ApprovalEvent[]>(SEED_LOG);
  const [isSeed, setIsSeed]         = useState(true);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    fetch("/api/awq/epm/budget-versions")
      .then(r => r.json())
      .then(j => {
        if (j.success && j.versions.length > 0) {
          setVersions(j.versions);
          setApprovalLog(j.approvalLog);
          setIsSeed(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const approved = versions.find(v => v.status === "APPROVED");

  if (loading) return <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/epm/budget" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <Target size={20} className="text-gray-400" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Budget Approval Workflow</h1>
            <p className="text-xs text-gray-500">EPM · Budget · FY2026 · Cenários Bear / Base / Bull</p>
          </div>
          {isSeed && (
            <span className="ml-auto text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-semibold">
              dados de exemplo
            </span>
          )}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* Active budget banner */}
        {approved && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
            <CheckCircle2 size={14} className="shrink-0" />
            <div>
              <strong>Budget operacional ativo:</strong> {approved.version_name} — aprovado por{" "}
              {approved.approved_by} em {approved.approved_at?.slice(0, 10)}.
              Receita target: <strong>{fmtBRL(approved.budget_revenue)}</strong> ·
              EBITDA target: <strong>{fmtBRL(approved.budget_ebitda)}</strong>
            </div>
          </div>
        )}

        {/* Version cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {versions.map(v => {
            const statusCfg   = STATUS_CFG[v.status as BudgetStatus];
            const scenarioCfg = SCENARIO_CFG[v.scenario];
            const { Icon: StatusIcon } = statusCfg;
            return (
              <div key={v.version_name} className={`bg-white rounded-xl border border-gray-200 p-5 ${v.status === "APPROVED" ? "ring-2 ring-emerald-300" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${scenarioCfg.bg} ${scenarioCfg.color}`}>
                        {scenarioCfg.label}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${statusCfg.bg} ${statusCfg.color}`}>
                        <StatusIcon size={9} /> {statusCfg.label}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-gray-900">{v.version_name}</div>
                  </div>
                  <GitBranch size={16} className={scenarioCfg.color} />
                </div>

                <div className="space-y-2 mb-3">
                  {[
                    { label: "Receita Target",  value: fmtBRL(v.budget_revenue)   },
                    { label: "EBITDA Target",   value: fmtBRL(v.budget_ebitda)    },
                    { label: "Resultado Líq.",  value: fmtBRL(v.budget_net_income) },
                    { label: "Cresc. vs LY",    value: "+" + v.growth_vs_ly.toFixed(1) + "%" },
                    { label: "Margem EBITDA",   value: v.ebitda_margin.toFixed(1) + "%" },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{row.label}</span>
                      <span className="font-semibold text-gray-900 tabular-nums">{row.value}</span>
                    </div>
                  ))}
                </div>

                {v.notes && <p className="text-[11px] text-gray-400 italic border-t border-gray-100 pt-3">{v.notes}</p>}

                {v.approved_by && (
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                    <CheckCircle2 size={10} /> Aprovado por {v.approved_by} · {v.approved_at?.slice(0, 10)}
                  </div>
                )}

                {v.status === "DRAFT" && (
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 transition-colors">Submeter</button>
                    <button className="flex-1 text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors">Editar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Scenario comparison table */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-violet-600" />
            <span className="text-sm font-semibold text-gray-900">Comparativo de Cenários</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="py-2.5 px-3 text-gray-500 font-semibold">Métrica</th>
                {versions.map(v => (
                  <th key={v.version_name} className="py-2.5 px-3 text-gray-500 font-semibold text-right">{v.scenario}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Receita",        key: "budget_revenue"    as keyof BudgetVersion, fmt: fmtBRL },
                { label: "EBITDA",         key: "budget_ebitda"     as keyof BudgetVersion, fmt: fmtBRL },
                { label: "Resultado Líq.", key: "budget_net_income" as keyof BudgetVersion, fmt: fmtBRL },
                { label: "Cresc. vs LY",   key: "growth_vs_ly"     as keyof BudgetVersion, fmt: (n: number) => "+" + n.toFixed(1) + "%" },
                { label: "Margem EBITDA",  key: "ebitda_margin"    as keyof BudgetVersion, fmt: (n: number) => n.toFixed(1) + "%" },
              ].map(row => (
                <tr key={row.label} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-600 font-medium">{row.label}</td>
                  {versions.map(v => {
                    const val        = v[row.key] as number;
                    const isApproved = v.status === "APPROVED";
                    return (
                      <td key={v.version_name} className={`py-2 px-3 text-right tabular-nums font-semibold ${isApproved ? "text-brand-700" : "text-gray-700"}`}>
                        {row.fmt(val)}{isApproved && <span className="ml-1 text-emerald-500">✓</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Approval log */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={14} className="text-gray-600" />
            <span className="text-sm font-semibold text-gray-900">Histórico de Aprovação — Audit Trail</span>
          </div>
          <div className="relative pl-5">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200" />
            <div className="space-y-4">
              {approvalLog.map((evt, i) => {
                const cfg     = ACTION_CFG[evt.action] ?? { color: "text-gray-600", Icon: FileText };
                const { Icon: EvtIcon } = cfg;
                return (
                  <div key={i} className="relative">
                    <div className={`absolute -left-3.5 w-3 h-3 rounded-full bg-white border-2 ${evt.action === "APPROVED" ? "border-emerald-500" : "border-gray-300"}`} />
                    <div className="pl-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <EvtIcon size={11} className={cfg.color} />
                        <span className={`text-[11px] font-bold uppercase tracking-wide ${cfg.color}`}>
                          {evt.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-gray-400">{evt.version_name}</span>
                        <span className="ml-auto text-[10px] text-gray-400">{evt.at}</span>
                        <span className="text-[10px] text-gray-500 font-semibold">{evt.by}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{evt.comment}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm/budget" className="text-brand-600 hover:underline">← Budget vs Actual</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm" className="text-brand-600 hover:underline">EPM Overview →</Link>
        </div>
      </div>
    </div>
  );
}
