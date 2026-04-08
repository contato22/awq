// ─── /awq-venture/deals — Índice de Deals ────────────────────────────────────
// Lista consolidada de todas as propostas de aquisição da AWQ Venture.
// Cada linha linka para o Deal Workspace único (/awq-venture/deals/:id).
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { dealWorkspaces } from "@/lib/deal-data";
import type { CustomDeal } from "./novo/page";
import { loadCustomDeals } from "./novo/page";
import {
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
  Plus,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

const stageColor: Record<string, string> = {
  "Triagem":        "text-gray-500 bg-gray-100",
  "Prospecção":     "text-amber-700 bg-amber-50",
  "Due Diligence":  "text-blue-700 bg-blue-50",
  "Term Sheet":     "text-violet-700 bg-violet-50",
  "Negociação":     "text-orange-700 bg-orange-50",
  "Fechado":        "text-emerald-700 bg-emerald-50",
  "Cancelado":      "text-red-600 bg-red-50",
};

const stageIcon: Record<string, React.ElementType> = {
  "Triagem":       Search,
  "Prospecção":    TrendingUp,
  "Due Diligence": FileText,
  "Term Sheet":    CheckCircle2,
  "Negociação":    Clock,
};

const sendStatusColor: Record<string, string> = {
  "Rascunho":         "text-gray-400",
  "Pronto para Envio":"text-amber-600 font-semibold",
  "Enviado":          "text-blue-600 font-semibold",
  "Em Negociação":    "text-violet-600 font-semibold",
  "Aprovado":         "text-emerald-600 font-semibold",
  "Rejeitado":        "text-red-500",
};

const riskColor: Record<string, string> = {
  "Baixo":   "text-emerald-700 bg-emerald-50",
  "Médio":   "text-amber-700 bg-amber-50",
  "Alto":    "text-red-700 bg-red-50",
  "Crítico": "text-red-900 bg-red-100",
};

const priorityBadge: Record<string, string> = {
  "Alta":  "badge badge-red",
  "Média": "badge badge-yellow",
  "Baixa": "badge",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealsIndexPage() {
  const router = useRouter();
  const [customDeals, setCustomDeals] = useState<CustomDeal[]>([]);

  useEffect(() => {
    setCustomDeals(loadCustomDeals());
  }, []);

  const deals = dealWorkspaces;

  const totalTicket   = deals.reduce((s, d) => s + d.proposedValue, 0) + customDeals.reduce((s, d) => s + d.ticket, 0);
  const activeDeals   = deals.filter((d) => d.stage !== "Cancelado" && d.stage !== "Fechado");
  const advancedDeals = deals.filter((d) => d.stage === "Due Diligence" || d.stage === "Term Sheet" || d.stage === "Negociação");
  const readyToSend   = deals.filter((d) => d.sendStatus === "Pronto para Envio" || d.sendStatus === "Enviado" || d.sendStatus === "Em Negociação");

  return (
    <>
      <Header
        title="Deals — AWQ Venture"
        subtitle={`${deals.length + customDeals.length} propostas de aquisição · ${fmtR(totalTicket)} em valor potencial`}
      />

      {/* ── Summary KPIs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Deals Ativos",     value: activeDeals.length + customDeals.filter(d => d.stage !== "Cancelado" && d.stage !== "Fechado").length,   icon: TrendingUp,  color: "text-brand-600", bg: "bg-brand-50"   },
          { label: "Ticket Total",     value: fmtR(totalTicket),    icon: DollarSign,  color: "text-amber-700", bg: "bg-amber-50"   },
          { label: "Em Avaliação Avançada", value: advancedDeals.length, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Propostas Ativas", value: readyToSend.length,   icon: ShieldCheck, color: "text-emerald-700", bg: "bg-emerald-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <Icon size={16} className={s.color} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{s.value}</div>
                <div className="text-[11px] text-gray-500">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Deal Table ───────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Todas as Propostas</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">Clique em uma linha para abrir o workspace</span>
            <Link
              href="/awq-venture/deals/novo"
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={12} /> Novo Deal
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Empresa</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Setor</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                <th className="text-right py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Ticket</th>
                <th className="text-right py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Risco</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Prioridade</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status Envio</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Responsável</th>
                <th className="py-2.5 px-4 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deals.map((d) => {
                const StageIcon = stageIcon[d.stage] ?? Clock;
                return (
                  <tr
                    key={d.id}
                    onClick={() => router.push(`/awq-venture/deals/${d.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900 text-sm">{d.companyName}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{d.id} · {d.operationType}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{d.identification.sector}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full ${stageColor[d.stage] ?? "text-gray-500 bg-gray-100"}`}>
                        <StageIcon size={10} />
                        {d.stage}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-600 text-sm tabular-nums">
                      {fmtR(d.proposedValue)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm font-bold tabular-nums ${d.dealScore >= 8 ? "text-emerald-600" : d.dealScore >= 7 ? "text-amber-600" : "text-gray-500"}`}>
                        {d.dealScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${riskColor[d.riskLevel] ?? "text-gray-500"}`}>
                        {d.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={priorityBadge[d.priority] ?? "badge"}>{d.priority}</span>
                    </td>
                    <td className={`py-3 px-4 text-[12px] ${sendStatusColor[d.sendStatus] ?? "text-gray-500"}`}>
                      {d.sendStatus}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{d.assignee}</td>
                    <td className="py-3 px-4">
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </td>
                  </tr>
                );
              })}

              {/* Custom deals from localStorage */}
              {customDeals.map((d) => {
                const StageIcon = stageIcon[d.stage] ?? Clock;
                return (
                  <tr
                    key={d.id}
                    onClick={() => router.push(`/awq-venture/deals/novo?id=${d.id}`)}
                    className="hover:bg-amber-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-900 text-sm">{d.companyName || "Sem nome"}</div>
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Novo</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{d.id} · {d.dealType}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{d.sector || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full ${stageColor[d.stage] ?? "text-gray-500 bg-gray-100"}`}>
                        <StageIcon size={10} />
                        {d.stage}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-600 text-sm tabular-nums">
                      {d.ticket > 0 ? fmtR(d.ticket) : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-gray-400">—</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${riskColor[d.riskLevel] ?? "text-gray-500"}`}>
                        {d.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={priorityBadge[d.priority] ?? "badge"}>{d.priority}</span>
                    </td>
                    <td className={`py-3 px-4 text-[12px] ${sendStatusColor[d.sendStatus] ?? "text-gray-500"}`}>
                      {d.sendStatus}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{d.assignee || "—"}</td>
                    <td className="py-3 px-4">
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {customDeals.length === 0 && deals.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">
              Nenhum deal cadastrado ainda.{" "}
              <Link href="/awq-venture/deals/novo" className="text-amber-600 hover:underline">Criar primeiro deal</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Risk banner ─────────────────────────────────────────────────── */}
      {advancedDeals.some((d) => d.riskDiligence.blockers.length > 0) && (
        <div className="card p-4 border-l-4 border-red-400 bg-red-50">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700">
              Há deals avançados com <strong>blockers ativos</strong>. Revise antes de avançar para proposta.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
