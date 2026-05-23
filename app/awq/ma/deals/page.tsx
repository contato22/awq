"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import {
  Plus, Building2, TrendingUp, CheckCircle2, XCircle,
  Loader2, ChevronRight, BarChart3, GitMerge,
} from "lucide-react";
import { SEED_DEALS } from "@/lib/ma-seed-data";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtR(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(1) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

const DEAL_TYPE_LABELS: Record<string, string> = {
  m4e:               "M4E",
  equity_investment: "Equity",
  acquisition:       "Aquisição",
};

const DEAL_TYPE_COLORS: Record<string, string> = {
  m4e:               "bg-cyan-50 text-cyan-700 border-cyan-200",
  equity_investment: "bg-brand-50 text-brand-700 border-brand-200",
  acquisition:       "bg-rose-50 text-rose-700 border-rose-200",
};

// ─── Kanban Config ────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  {
    key:    "sourcing",
    label:  "Sourcing",
    dot:    "bg-gray-400",
    head:   "border-t-gray-300 bg-gray-50",
    count:  "bg-gray-100 text-gray-600",
    col:    "bg-gray-50/50 border-gray-200",
  },
  {
    key:    "screening",
    label:  "Triagem",
    dot:    "bg-blue-500",
    head:   "border-t-blue-400 bg-blue-50/60",
    count:  "bg-blue-100 text-blue-700",
    col:    "bg-blue-50/30 border-blue-100",
  },
  {
    key:    "due_diligence",
    label:  "Due Diligence",
    dot:    "bg-amber-500",
    head:   "border-t-amber-400 bg-amber-50/60",
    count:  "bg-amber-100 text-amber-700",
    col:    "bg-amber-50/30 border-amber-100",
  },
  {
    key:    "structuring",
    label:  "Estruturação",
    dot:    "bg-orange-500",
    head:   "border-t-orange-400 bg-orange-50/60",
    count:  "bg-orange-100 text-orange-700",
    col:    "bg-orange-50/30 border-orange-100",
  },
  {
    key:    "ic_review",
    label:  "Revisão IC",
    dot:    "bg-brand-500",
    head:   "border-t-brand-500 bg-brand-50/60",
    count:  "bg-brand-100 text-brand-700",
    col:    "bg-brand-50/30 border-brand-100",
  },
];

// ─── Deal Card ────────────────────────────────────────────────────────────────

function DealCard({ deal }: { deal: any }) {
  const score = deal.total_score ?? (
    (deal.market_score   ?? 0) +
    (deal.team_score     ?? 0) +
    (deal.product_score  ?? 0) +
    (deal.traction_score ?? 0)
  );
  const scorePct   = Math.min((score / 100) * 100, 100);
  const scoreBar   = score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-red-400";
  const scoreText  = score >= 70 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-500";
  const scoreBg    = score >= 70 ? "bg-emerald-50"    : score >= 50 ? "bg-amber-50"    : "bg-red-50";

  return (
    <Link href={`/awq/ma/deals/${deal.deal_id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer space-y-2.5 group">
        {/* Header */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Building2 size={11} className="text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                {deal.company_name}
              </p>
              {deal.deal_name && deal.deal_name !== deal.company_name && (
                <p className="text-xs text-gray-400 truncate leading-tight">{deal.deal_name}</p>
              )}
            </div>
          </div>
          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${DEAL_TYPE_COLORS[deal.deal_type] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
            {DEAL_TYPE_LABELS[deal.deal_type] ?? deal.deal_type?.toUpperCase()}
          </span>
        </div>

        {/* Score + value row */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${scoreBg}`}>
            <BarChart3 size={8} className={scoreText} />
            <span className={`text-[9px] font-bold tabular-nums ${scoreText}`}>{score}</span>
          </div>
          {deal.proposed_investment_amount && (
            <span className="text-xs text-gray-400 font-medium ml-auto">{fmtR(deal.proposed_investment_amount)}</span>
          )}
          {deal.media_commitment_value && !deal.proposed_investment_amount && (
            <span className="text-xs text-cyan-600 font-semibold ml-auto">{fmtR(deal.media_commitment_value)} mídia</span>
          )}
        </div>

        {/* Score bar */}
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${scoreBar} rounded-full transition-all`} style={{ width: `${scorePct}%` }} />
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
    if (IS_STATIC) {
      setDeals(SEED_DEALS);
      setLoading(false);
      return;
    }
    fetch("/api/ma/deals")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDeals(json.data ?? []);
        else setError(json.error ?? "Erro ao carregar deals");
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const activeDeals  = deals.filter((d) => !["closed_won", "closed_lost"].includes(d.pipeline_stage));
  const closedWon    = deals.filter((d) => d.pipeline_stage === "closed_won");
  const closedLost   = deals.filter((d) => d.pipeline_stage === "closed_lost");
  const dealsByStage = (stage: string) => deals.filter((d) => d.pipeline_stage === stage);

  return (
    <>
      <Header title="Pipeline de Deals" subtitle="M&A · AWQ Group" />
      <div className="px-6 lg:px-8 py-5 space-y-5">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <GitMerge size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Kanban Pipeline</h2>
              <p className="text-xs text-gray-500">
                {loading ? "—" : activeDeals.length} deal{activeDeals.length !== 1 ? "s" : ""} ativos ·{" "}
                {closedWon.length} won · {closedLost.length} lost
              </p>
            </div>
          </div>
          <Link
            href="/awq/ma/deals/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            <Plus size={13} />
            Novo Deal
          </Link>
        </div>

        {/* ── Loading / Error ──────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-12 justify-center">
            <Loader2 size={16} className="animate-spin" />
            Carregando pipeline...
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ── Kanban Board ─────────────────────────────────────────────────── */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 items-start">
            {PIPELINE_STAGES.map((stage) => {
              const stageDeals = dealsByStage(stage.key);
              const totalVal   = stageDeals.reduce((s, d) => s + (d.proposed_investment_amount ?? d.media_commitment_value ?? 0), 0);
              return (
                <div
                  key={stage.key}
                  className={`rounded-xl border ${stage.col} overflow-hidden`}
                >
                  {/* Column header */}
                  <div className={`border-t-2 ${stage.head} px-3 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${stage.dot} shrink-0`} />
                      <div>
                        <p className="text-xs font-bold text-gray-800">{stage.label}</p>
                        {totalVal > 0 && (
                          <p className="text-[9px] text-gray-500 font-medium mt-0.5">{fmtR(totalVal)}</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${stage.count}`}>
                      {stageDeals.length}
                    </span>
                  </div>

                  {/* Deal cards */}
                  <div className="p-2 space-y-2 min-h-[140px]">
                    {stageDeals.length === 0 ? (
                      <Link href="/awq/ma/deals/new">
                        <div className="flex flex-col items-center justify-center py-8 rounded-lg border border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center mb-1.5">
                            <Plus size={12} className="text-gray-400" />
                          </div>
                          <p className="text-xs text-gray-400 font-medium">Adicionar deal</p>
                        </div>
                      </Link>
                    ) : (
                      stageDeals.map((d) => (
                        <DealCard key={d.deal_id} deal={d} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Closed Deals ─────────────────────────────────────────────────── */}
        {!loading && (closedWon.length > 0 || closedLost.length > 0) && (
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp size={13} className="text-gray-400" />
              <h3 className="text-sm font-bold text-gray-800">Deals Fechados</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">

              {/* Won */}
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-600 mb-3">
                  <CheckCircle2 size={13} />
                  <span className="text-xs font-bold">Ganhos ({closedWon.length})</span>
                </div>
                {closedWon.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum deal ganho ainda.</p>
                ) : closedWon.map((d) => (
                  <Link key={d.deal_id} href={`/awq/ma/deals/${d.deal_id}`}>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/60 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center">
                          <Building2 size={9} className="text-emerald-600" />
                        </div>
                        <span className="text-xs font-semibold text-gray-800">{d.company_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {d.proposed_investment_amount && (
                          <span className="text-xs font-bold text-emerald-600">{fmtR(d.proposed_investment_amount)}</span>
                        )}
                        <ChevronRight size={11} className="text-gray-300" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Lost */}
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-red-500 mb-3">
                  <XCircle size={13} />
                  <span className="text-xs font-bold">Perdidos ({closedLost.length})</span>
                </div>
                {closedLost.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum deal perdido.</p>
                ) : closedLost.map((d) => (
                  <Link key={d.deal_id} href={`/awq/ma/deals/${d.deal_id}`}>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100/60 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-red-100 flex items-center justify-center">
                          <Building2 size={9} className="text-red-500" />
                        </div>
                        <span className="text-xs font-semibold text-gray-800">{d.company_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 max-w-[100px] truncate">{d.close_reason ?? "—"}</span>
                        <ChevronRight size={11} className="text-gray-300" />
                      </div>
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
