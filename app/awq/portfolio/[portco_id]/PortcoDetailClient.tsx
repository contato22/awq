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
  AlertCircle,
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
    active:     { cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", label: "Ativo"    },
    exited:     { cls: "bg-violet-500/20 text-violet-300 border-violet-500/30",   label: "Exitado"  },
    monitoring: { cls: "bg-amber-500/20 text-amber-300 border-amber-500/30",      label: "Monitoria"},
    inactive:   { cls: "bg-gray-500/20 text-gray-400 border-gray-500/30",         label: "Inativo"  },
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
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            {error ?? "Empresa não encontrada"}
          </div>
          <Link href="/awq/portfolio" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 mt-4 transition-colors">
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
      label: "% Participação AWQ",
      value: fmtPct(portco.awq_ownership_pct),
      icon:  TrendingUp,
      color: "text-blue-400",
      bg:    "bg-blue-500/10",
    },
    {
      label: "Valuation Atual",
      value: fmtR(portco.current_valuation ?? portco.entry_valuation),
      icon:  DollarSign,
      color: "text-emerald-400",
      bg:    "bg-emerald-500/10",
    },
    {
      label: "Mídia Entregue %",
      value: mediaPct != null ? fmtPct(mediaPct) : "N/A",
      icon:  Tv2,
      color: "text-cyan-400",
      bg:    "bg-cyan-500/10",
    },
    {
      label: "MRR Mais Recente",
      value: fmtR(latestMrr),
      icon:  BarChart3,
      color: "text-amber-400",
      bg:    "bg-amber-500/10",
    },
  ];

  return (
    <>
      <Header
        title={portco.company_name ?? portco.legal_name ?? "Empresa"}
        subtitle={`${portco.portco_code ?? ""} · Portfolio Companies`}
      />
      <div className="px-6 lg:px-8 py-6 space-y-6">

        {/* ── Back + Title ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Link
            href="/awq/portfolio"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft size={12} />
            Portfólio
          </Link>
          <ChevronRight size={10} className="text-gray-700" />
          <span className="text-xs text-gray-400">{portco.company_name ?? portco.legal_name}</span>
          <StatusBadge status={portco.status ?? "active"} />
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-lg bg-gray-800/50 border border-gray-700 p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{card.value}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Tab Nav ───────────────────────────────────────────────────────── */}
        <div className="flex gap-1 border-b border-gray-700 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === key
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company info */}
            <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white mb-3">Informações da Empresa</h3>
              {[
                { label: "Data de Entrada",     value: fmtDate(portco.investment_date) },
                { label: "Valuation de Entrada", value: fmtR(portco.entry_valuation)   },
                { label: "Valuation Atual",      value: fmtR(portco.current_valuation)  },
                { label: "Runway (meses)",       value: portco.runway_months != null ? portco.runway_months + " m" : "—" },
                { label: "Burn Rate Mensal",     value: fmtR(portco.monthly_burn_rate)  },
                { label: "Headcount",            value: portco.headcount != null ? portco.headcount + " pessoas" : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-700/50 last:border-0">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>

            {/* Media commitment */}
            <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white mb-3">Compromisso de Mídia</h3>
              {[
                { label: "Comprometimento Total",   value: fmtR(portco.media_commitment_value)  },
                { label: "Entregue",                value: fmtR(portco.media_delivered_value)   },
                { label: "Restante",                value: fmtR((portco.media_commitment_value ?? 0) - (portco.media_delivered_value ?? 0)) },
                { label: "Prazo (meses)",           value: portco.media_delivery_period_months != null ? portco.media_delivery_period_months + " m" : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-700/50 last:border-0">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs font-semibold text-white">{value}</span>
                </div>
              ))}

              {mediaPct != null && (
                <div className="pt-2 space-y-1.5">
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Progresso de Entrega</span>
                    <span className="text-cyan-400 font-semibold">{fmtPct(mediaPct)}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
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
          <div className="rounded-lg bg-gray-800/50 border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white">KPIs Mensais</h3>
            </div>
            {kpis.length === 0 ? (
              <div className="text-center py-10 text-gray-600 text-sm">Nenhum KPI registrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-500">
                      {["Data","MRR","ARR","Burn","Runway","Crescim. MoM","Headcount","Notas"].map((h) => (
                        <th key={h} className={`py-2.5 px-3 font-semibold ${h === "Notas" || h === "Data" ? "text-left" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {[...kpis]
                      .sort((a, b) => (b.kpi_date ?? "").localeCompare(a.kpi_date ?? ""))
                      .map((k, i) => (
                        <tr key={k.kpi_id ?? i} className="hover:bg-gray-700/20">
                          <td className="py-2 px-3 text-gray-400">{fmtDate(k.kpi_date)}</td>
                          <td className="py-2 px-3 text-right font-semibold text-white">{fmtR(k.mrr)}</td>
                          <td className="py-2 px-3 text-right text-gray-300">{fmtR(k.arr)}</td>
                          <td className="py-2 px-3 text-right text-red-400">{fmtR(k.burn_rate)}</td>
                          <td className={`py-2 px-3 text-right font-semibold ${(k.runway_months ?? 99) < 6 ? "text-red-400" : "text-emerald-400"}`}>
                            {k.runway_months != null ? k.runway_months + " m" : "—"}
                          </td>
                          <td className={`py-2 px-3 text-right font-semibold ${(k.mom_growth_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {k.mom_growth_pct != null ? (k.mom_growth_pct >= 0 ? "+" : "") + k.mom_growth_pct.toFixed(1) + "%" : "—"}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-300">{k.headcount ?? "—"}</td>
                          <td className="py-2 px-3 text-gray-500 max-w-[200px] truncate">{k.notes ?? ""}</td>
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
          <div className="rounded-lg bg-gray-800/50 border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white">Estrutura de Capital</h3>
            </div>
            {capTable.length === 0 ? (
              <div className="text-center py-10 text-gray-600 text-sm">Nenhum sócio registrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-500">
                      {["Nome","Tipo","Ações","% Participação","Vesting","Data Início","Cliff","Notas"].map((h) => (
                        <th key={h} className={`py-2.5 px-3 font-semibold ${["Ações","% Participação"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {capTable.map((s: any, i: number) => (
                      <tr key={s.cap_id ?? i} className="hover:bg-gray-700/20">
                        <td className="py-2 px-3 font-semibold text-white">{s.shareholder_name ?? "—"}</td>
                        <td className="py-2 px-3 text-gray-400">{s.shareholder_type ?? "—"}</td>
                        <td className="py-2 px-3 text-right text-gray-300">{s.shares?.toLocaleString("pt-BR") ?? "—"}</td>
                        <td className="py-2 px-3 text-right font-bold text-blue-400">{fmtPct(s.ownership_pct)}</td>
                        <td className="py-2 px-3 text-gray-400">{s.vesting_schedule ?? "—"}</td>
                        <td className="py-2 px-3 text-gray-400">{fmtDate(s.vesting_start_date)}</td>
                        <td className="py-2 px-3 text-gray-400">{s.cliff_months != null ? s.cliff_months + " m" : "—"}</td>
                        <td className="py-2 px-3 text-gray-500">{s.notes ?? ""}</td>
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
              <div className="text-center py-10 text-gray-600 text-sm rounded-lg bg-gray-800/50 border border-gray-700">
                Nenhuma reunião de conselho registrada.
              </div>
            ) : (
              boardMeetings.map((b: any, i: number) => (
                <div key={b.board_id ?? i} className="rounded-lg bg-gray-800/50 border border-gray-700 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={13} className="text-gray-500" />
                      <span className="text-sm font-semibold text-white">{fmtDate(b.meeting_date)}</span>
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">
                        {b.meeting_type ?? "Reunião"}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      b.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : b.status === "scheduled"
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                        : "bg-gray-500/20 text-gray-400 border-gray-500/30"
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
                    <p className="text-xs text-gray-600">
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
          <div className="rounded-lg bg-gray-800/50 border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white">Entregáveis de Mídia</h3>
            </div>
            {mediaDelivs.length === 0 ? (
              <div className="text-center py-10 text-gray-600 text-sm">Nenhum entregável de mídia.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-500">
                      {["Tipo","Descrição","Valor","BU Executora","Data Prevista","Status","Aprovado"].map((h) => (
                        <th key={h} className={`py-2.5 px-3 font-semibold ${h === "Valor" ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {mediaDelivs.map((m: any, i: number) => (
                      <tr key={m.deliverable_id ?? i} className="hover:bg-gray-700/20">
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                            {m.media_type ?? "—"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-300 max-w-[200px] truncate">{m.description ?? "—"}</td>
                        <td className="py-2 px-3 text-right font-semibold text-white">{fmtR(m.value)}</td>
                        <td className="py-2 px-3 text-gray-400">{m.executing_bu ?? "—"}</td>
                        <td className="py-2 px-3 text-gray-400">{fmtDate(m.scheduled_date)}</td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] font-semibold ${
                            m.status === "delivered"  ? "text-emerald-400" :
                            m.status === "in_progress"? "text-blue-400"    :
                            m.status === "pending"    ? "text-amber-400"   :
                            "text-gray-500"
                          }`}>
                            {m.status === "delivered"   ? "Entregue"    :
                             m.status === "in_progress" ? "Em Andamento" :
                             m.status === "pending"     ? "Pendente"    :
                             m.status ?? "—"}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {m.approved ? (
                            <CheckCircle2 size={13} className="text-emerald-400" />
                          ) : (
                            <Clock size={13} className="text-gray-600" />
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
          <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-8 text-center">
            <Shield size={24} className="text-gray-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Due Diligence</h3>
            <p className="text-xs text-gray-600 mb-4">
              Documentos e achados de DD estão disponíveis no pipeline do deal associado.
            </p>
            <Link
              href="/awq/ma/deals"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Ver pipeline do deal <ExternalLink size={11} />
            </Link>
          </div>
        )}

      </div>
    </>
  );
}
