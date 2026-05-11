"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  DollarSign,
  Tv2,
  BarChart3,
  Loader2,
  Users,
  CalendarDays,
  FileText,
  Shield,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { SEED_PORTCOS, SEED_CAP_TABLE, SEED_KPIS, SEED_BOARD_MEETINGS, SEED_MEDIA_DELIVERABLES } from "@/lib/ma-seed-data";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtR(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtPct(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(1) + "%";
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    active:     { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Ativo"    },
    exited:     { cls: "bg-violet-50 text-violet-700 border-violet-200",   label: "Exitado"  },
    monitoring: { cls: "bg-amber-50 text-amber-700 border-amber-200",      label: "Monitoria"},
    inactive:   { cls: "bg-gray-100 text-gray-500 border-gray-200",        label: "Inativo"  },
  };
  const c = cfg[status] ?? cfg.inactive;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.cls}`}>
      {c.label}
    </span>
  );
}

// ─── Tab Nav ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: "overview",  label: "Visão Geral", icon: Building2  },
  { key: "kpis",      label: "KPIs",        icon: BarChart3  },
  { key: "captable",  label: "Cap Table",   icon: FileText   },
  { key: "board",     label: "Conselho",    icon: Users      },
  { key: "media",     label: "Mídia",       icon: Tv2        },
  { key: "dd",        label: "DD",          icon: Shield     },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortcoDetailClient({ params }: { params: { portco_id: string } }) {
  const portcoId = params.portco_id;

  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState("overview");

  useEffect(() => {
    if (!portcoId) return;
    if (IS_STATIC) {
      const portco = SEED_PORTCOS.find(p => p.portco_id === portcoId);
      if (portco) {
        setData({
          portco,
          cap_table: SEED_CAP_TABLE.filter(c => c.portco_id === portcoId),
          recent_kpis: SEED_KPIS.filter(k => k.portco_id === portcoId),
          board_meetings: SEED_BOARD_MEETINGS.filter(m => m.portco_id === portcoId),
          media_deliverables: SEED_MEDIA_DELIVERABLES.filter(m => m.portco_id === portcoId),
        });
      } else {
        setError("Empresa não encontrada");
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch("/api/ma/portfolio", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "get_one", portco_id: portcoId }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error ?? "Empresa não encontrada");
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [portcoId]);

  if (loading) {
    return (
      <>
        <Header title="Carregando..." subtitle="Portfolio Companies" />
        <div className="flex items-center gap-2 justify-center py-20 text-gray-400 text-sm">
          <Loader2 size={16} className="animate-spin" />
          Carregando empresa...
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Header title="Erro" subtitle="Portfolio Companies" />
        <div className="px-6 lg:px-8 py-6">
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {error ?? "Empresa não encontrada"}
          </div>
          <Link href="/awq/portfolio" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mt-4 transition-colors">
            <ArrowLeft size={12} /> Voltar ao Portfólio
          </Link>
        </div>
      </>
    );
  }

  const portco          = data.portco          ?? {};
  const kpis            = data.recent_kpis     ?? [];
  const capTable        = data.cap_table        ?? [];
  const boardMeetings   = data.board_meetings   ?? [];
  const mediaDelivs     = data.media_deliverables ?? [];

  const mediaPct =
    portco.media_commitment_value && portco.media_commitment_value > 0
      ? ((portco.media_delivered_value ?? 0) / portco.media_commitment_value) * 100
      : null;

  const latestMrr = kpis.length > 0 ? kpis[0]?.mrr : null;

  const kpiCards = [
    {
      label:  "% Participação AWQ",
      value:  fmtPct(portco.awq_ownership_pct),
      icon:   TrendingUp,
      color:  "text-blue-600",
      bg:     "bg-blue-50",
      border: "border-l-blue-500",
    },
    {
      label:  "Valuation Atual",
      value:  fmtR(portco.current_valuation ?? portco.entry_valuation),
      icon:   DollarSign,
      color:  "text-emerald-600",
      bg:     "bg-emerald-50",
      border: "border-l-emerald-500",
    },
    {
      label:  "Mídia Entregue %",
      value:  mediaPct != null ? fmtPct(mediaPct) : "N/A",
      icon:   Tv2,
      color:  "text-cyan-600",
      bg:     "bg-cyan-50",
      border: "border-l-cyan-500",
    },
    {
      label:  "MRR Mais Recente",
      value:  fmtR(latestMrr),
      icon:   BarChart3,
      color:  "text-amber-600",
      bg:     "bg-amber-50",
      border: "border-l-amber-500",
    },
  ];

  return (
    <>
      <Header
        title={portco.company_name ?? portco.legal_name ?? "Empresa"}
        subtitle={`${portco.portco_code ?? ""} · Portfolio Companies`}
      />
      <div className="px-6 lg:px-8 py-6 space-y-6">

        {/* ── Back + Breadcrumb ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <Link
            href="/awq/portfolio"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={12} />
            Portfólio
          </Link>
          <ChevronRight size={10} className="text-gray-400" />
          <span className="text-xs text-gray-700 font-medium">{portco.company_name ?? portco.legal_name}</span>
          <StatusBadge status={portco.status ?? "active"} />
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-xl bg-white border border-gray-200 border-l-4 ${card.border} p-4 flex items-center gap-3 shadow-sm`}>
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{card.value}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Tab Nav ───────────────────────────────────────────────────────── */}
        <div className="flex gap-0.5 border-b border-gray-200 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ──────────────────────────────────────────────────── */}

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Company info */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                <Building2 size={13} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-800">Informações da Empresa</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { label: "Data de Entrada",      value: fmtDate(portco.investment_date) },
                  { label: "Valuation de Entrada",  value: fmtR(portco.entry_valuation)   },
                  { label: "Valuation Atual",        value: fmtR(portco.current_valuation)  },
                  { label: "Runway (meses)",         value: portco.runway_months != null ? portco.runway_months + " m" : "—" },
                  { label: "Burn Rate Mensal",       value: fmtR(portco.monthly_burn_rate)  },
                  { label: "Headcount",              value: portco.headcount != null ? portco.headcount + " pessoas" : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center px-5 py-2.5">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Media commitment */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                <Tv2 size={13} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-800">Compromisso de Mídia</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { label: "Comprometimento Total",   value: fmtR(portco.media_commitment_value)  },
                  { label: "Entregue",                 value: fmtR(portco.media_delivered_value)   },
                  { label: "Restante",                 value: fmtR((portco.media_commitment_value ?? 0) - (portco.media_delivered_value ?? 0)) },
                  { label: "Prazo (meses)",            value: portco.media_delivery_period_months != null ? portco.media_delivery_period_months + " m" : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center px-5 py-2.5">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>

              {mediaPct != null && (
                <div className="px-5 py-4 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500">Progresso de Entrega</span>
                    <span className="text-cyan-600 font-bold">{fmtPct(mediaPct)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all"
                      style={{ width: `${Math.min(mediaPct, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KPIs */}
        {tab === "kpis" && (
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <BarChart3 size={13} className="text-gray-400" />
              <h3 className="text-sm font-bold text-gray-800">KPIs Mensais</h3>
            </div>
            {kpis.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">Nenhum KPI registrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Data","MRR","ARR","Burn","Runway","Crescim. MoM","Headcount","Notas"].map((h) => (
                        <th key={h} className={`py-2.5 px-3 font-semibold text-gray-500 ${h === "Notas" || h === "Data" ? "text-left" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...kpis]
                      .sort((a, b) => (b.kpi_date ?? "").localeCompare(a.kpi_date ?? ""))
                      .map((k, i) => (
                        <tr key={k.kpi_id ?? i} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-2.5 px-3 text-gray-500">{fmtDate(k.kpi_date)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">{fmtR(k.mrr)}</td>
                          <td className="py-2.5 px-3 text-right text-gray-700">{fmtR(k.arr)}</td>
                          <td className="py-2.5 px-3 text-right text-red-500">{fmtR(k.burn_rate)}</td>
                          <td className={`py-2.5 px-3 text-right font-semibold ${(k.runway_months ?? 99) < 6 ? "text-red-500" : "text-emerald-600"}`}>
                            {k.runway_months != null ? k.runway_months + " m" : "—"}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-semibold ${(k.mom_growth_pct ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {k.mom_growth_pct != null ? (k.mom_growth_pct >= 0 ? "+" : "") + k.mom_growth_pct.toFixed(1) + "%" : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-700">{k.headcount ?? "—"}</td>
                          <td className="py-2.5 px-3 text-gray-400 max-w-[200px] truncate">{k.notes ?? ""}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CAP TABLE */}
        {tab === "captable" && (
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <FileText size={13} className="text-gray-400" />
              <h3 className="text-sm font-bold text-gray-800">Estrutura de Capital</h3>
            </div>
            {capTable.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">Nenhum sócio registrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Nome","Tipo","Ações","% Participação","Vesting","Data Início","Cliff","Notas"].map((h) => (
                        <th key={h} className={`py-2.5 px-3 font-semibold text-gray-500 ${["Ações","% Participação"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {capTable.map((s: any, i: number) => (
                      <tr key={s.cap_id ?? i} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{s.shareholder_name ?? "—"}</td>
                        <td className="py-2.5 px-3 text-gray-500">{s.shareholder_type ?? "—"}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{s.shares?.toLocaleString("pt-BR") ?? "—"}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-blue-600">{fmtPct(s.ownership_pct)}</td>
                        <td className="py-2.5 px-3 text-gray-500">{s.vesting_schedule ?? "—"}</td>
                        <td className="py-2.5 px-3 text-gray-500">{fmtDate(s.vesting_start_date)}</td>
                        <td className="py-2.5 px-3 text-gray-500">{s.cliff_months != null ? s.cliff_months + " m" : "—"}</td>
                        <td className="py-2.5 px-3 text-gray-400">{s.notes ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* BOARD */}
        {tab === "board" && (
          <div className="space-y-3">
            {boardMeetings.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm rounded-xl bg-white border border-gray-200">
                Nenhuma reunião de conselho registrada.
              </div>
            ) : (
              boardMeetings.map((b: any, i: number) => (
                <div key={b.board_id ?? i} className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={13} className="text-gray-400" />
                      <span className="text-sm font-bold text-gray-900">{fmtDate(b.meeting_date)}</span>
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {b.meeting_type ?? "Reunião"}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      b.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : b.status === "scheduled"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}>
                      {b.status === "completed" ? "Realizada" : b.status === "scheduled" ? "Agendada" : b.status ?? "—"}
                    </span>
                  </div>

                  {b.attendees && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                      <Users size={11} />
                      {b.attendees}
                    </p>
                  )}
                  {b.action_items_count != null && (
                    <p className="text-xs text-gray-400">
                      {b.action_items_count} itens de ação
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* MEDIA */}
        {tab === "media" && (
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <Tv2 size={13} className="text-gray-400" />
              <h3 className="text-sm font-bold text-gray-800">Entregáveis de Mídia</h3>
            </div>
            {mediaDelivs.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">Nenhum entregável de mídia.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Tipo","Descrição","Valor","BU Executora","Data Prevista","Status","Aprovado"].map((h) => (
                        <th key={h} className={`py-2.5 px-3 font-semibold text-gray-500 ${h === "Valor" ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mediaDelivs.map((m: any, i: number) => (
                      <tr key={m.deliverable_id ?? i} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
                            {m.media_type ?? "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-700 max-w-[200px] truncate">{m.description ?? "—"}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">{fmtR(m.value)}</td>
                        <td className="py-2.5 px-3 text-gray-500">{m.executing_bu ?? "—"}</td>
                        <td className="py-2.5 px-3 text-gray-500">{fmtDate(m.scheduled_date)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            m.status === "delivered"   ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            m.status === "in_progress" ? "bg-blue-50 text-blue-700 border-blue-200"         :
                            m.status === "pending"     ? "bg-amber-50 text-amber-700 border-amber-200"      :
                            "bg-gray-100 text-gray-500 border-gray-200"
                          }`}>
                            {m.status === "delivered"   ? "Entregue"     :
                             m.status === "in_progress" ? "Em Andamento"  :
                             m.status === "pending"     ? "Pendente"      :
                             m.status ?? "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {m.approved ? (
                            <CheckCircle2 size={13} className="text-emerald-500" />
                          ) : (
                            <Clock size={13} className="text-gray-300" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* DD (placeholder) */}
        {tab === "dd" && (
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Shield size={20} className="text-gray-400" />
            </div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">Due Diligence</h3>
            <p className="text-xs text-gray-400 mb-5 max-w-xs mx-auto">
              Documentos e achados de DD estão disponíveis no pipeline do deal associado.
            </p>
            <Link
              href="/awq/ma/deals"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Ver pipeline do deal <ExternalLink size={11} />
            </Link>
          </div>
        )}

      </div>
    </>
  );
}
