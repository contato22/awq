"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import {
  Plus,
  Building2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtR(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function scoreBadge(score: number | null | undefined) {
  const s = score ?? 0;
  if (s >= 70) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (s >= 50) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-red-500/20 text-red-300 border-red-500/30";
}

const DEAL_TYPE_LABELS: Record<string, string> = {
  m4e:              "M4E",
  equity_investment: "Equity",
  acquisition:      "Aquisição",
};

const DEAL_TYPE_COLORS: Record<string, string> = {
  m4e:              "bg-cyan-500/20 text-cyan-300",
  equity_investment: "bg-violet-500/20 text-violet-300",
  acquisition:      "bg-rose-500/20 text-rose-300",
};

// ─── Kanban Column Config ────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: "sourcing",      label: "Sourcing",      color: "border-gray-500",   badge: "bg-gray-500/20 text-gray-300"   },
  { key: "screening",     label: "Triagem",        color: "border-blue-500",   badge: "bg-blue-500/20 text-blue-300"   },
  { key: "due_diligence", label: "Due Diligence",  color: "border-amber-500",  badge: "bg-amber-500/20 text-amber-300" },
  { key: "structuring",   label: "Estruturação",   color: "border-orange-500", badge: "bg-orange-500/20 text-orange-300" },
  { key: "ic_review",     label: "Revisão IC",     color: "border-purple-500", badge: "bg-purple-500/20 text-purple-300" },
];

// ─── Deal Card ────────────────────────────────────────────────────────────────

function DealCard({ deal }: { deal: any }) {
  const score = deal.total_score ?? (
    (deal.market_score ?? 0) +
    (deal.team_score   ?? 0) +
    (deal.product_score ?? 0) +
    (deal.traction_score ?? 0)
  );

  return (
    <Link href={`/awq/ma/deals/${deal.deal_id}`}>
      <div className="rounded-lg bg-gray-800 border border-gray-700 p-3 hover:border-gray-500 hover:bg-gray-750 transition-all cursor-pointer space-y-2">
        {/* Company name + deal type */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 size={11} className="text-gray-500 shrink-0 mt-0.5" />
            <span className="text-xs font-semibold text-white truncate">
              {deal.company_name}
            </span>
          </div>
          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${DEAL_TYPE_COLORS[deal.deal_type] ?? "bg-gray-700 text-gray-300"}`}>
            {DEAL_TYPE_LABELS[deal.deal_type] ?? deal.deal_type?.toUpperCase()}
          </span>
        </div>

        {/* Deal name (if different) */}
        {deal.deal_name && deal.deal_name !== deal.company_name && (
          <p className="text-[10px] text-gray-500 truncate">{deal.deal_name}</p>
        )}

        {/* Score + amount */}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${scoreBadge(score)}`}>
            {score}/100
          </span>
          {deal.proposed_investment_amount ? (
            <span className="text-[10px] font-semibold text-gray-400">
              {fmtR(deal.proposed_investment_amount)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealPipelinePage() {
  const [deals, setDeals]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ma/deals")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDeals(json.data ?? []);
        else setError(json.error ?? "Erro ao carregar deals");
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const dealsByStage = (stage: string) =>
    deals.filter((d) => d.pipeline_stage === stage);

  const closedWon  = deals.filter((d) => d.pipeline_stage === "closed_won");
  const closedLost = deals.filter((d) => d.pipeline_stage === "closed_lost");

  return (
    <>
      <Header title="Pipeline de Deals" subtitle="M&A · AWQ Group" />
      <div className="px-6 lg:px-8 py-6 space-y-6">

        {/* ── Title row ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Pipeline Kanban</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {deals.filter((d) => !["closed_won","closed_lost"].includes(d.pipeline_stage)).length} deals ativos
            </p>
          </div>
          <Link
            href="/awq/ma/deals/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus size={13} />
            Novo Deal
          </Link>
        </div>

        {/* ── Loading / Error ────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
            <Loader2 size={16} className="animate-spin" />
            Carregando deals...
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── Kanban Board ─────────────────────────────────────────────────── */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
            {PIPELINE_STAGES.map((stage) => {
              const stageDeals = dealsByStage(stage.key);
              return (
                <div
                  key={stage.key}
                  className={`rounded-xl bg-gray-800/40 border-t-2 ${stage.color} border-l border-r border-b border-gray-700/60 p-3 space-y-2 min-h-[200px]`}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white">{stage.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.badge}`}>
                      {stageDeals.length}
                    </span>
                  </div>

                  {/* Deal cards */}
                  {stageDeals.length === 0 ? (
                    <p className="text-[10px] text-gray-600 text-center py-6">Nenhum deal</p>
                  ) : (
                    stageDeals.map((d) => (
                      <DealCard key={d.deal_id} deal={d} />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Closed Deals Summary ─────────────────────────────────────────── */}
        {!loading && (closedWon.length > 0 || closedLost.length > 0) && (
          <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-white">Deals Fechados</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Won */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 mb-2">
                  <CheckCircle2 size={13} />
                  <span className="text-xs font-semibold">Ganhos ({closedWon.length})</span>
                </div>
                {closedWon.map((d) => (
                  <Link key={d.deal_id} href={`/awq/ma/deals/${d.deal_id}`}>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors">
                      <span className="text-xs font-medium text-white">{d.company_name}</span>
                      <span className="text-[10px] text-emerald-400">{fmtR(d.proposed_investment_amount)}</span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Lost */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-red-400 mb-2">
                  <XCircle size={13} />
                  <span className="text-xs font-semibold">Perdidos ({closedLost.length})</span>
                </div>
                {closedLost.map((d) => (
                  <Link key={d.deal_id} href={`/awq/ma/deals/${d.deal_id}`}>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-colors">
                      <span className="text-xs font-medium text-white">{d.company_name}</span>
                      <span className="text-[10px] text-gray-500">{d.close_reason ?? "—"}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
