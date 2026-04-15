// ─── /awq/integrations — Registry de Integrações e Roteamento de Fontes ───────
//
// Origem e roteador oficial dos dados que alimentam os indicadores AWQ.
// Cada KPI deve ter uma integração rastreável registrada aqui.
//
// REGRA: Nenhum KPI pode ser exibido sem fonte registrada com source_type,
// confidence_status e contamination_risk declarados.
//
// FONTE: lib/integration-registry.ts (sem mock, sem snapshot não rotulado)

import Header from "@/components/Header";
import Link from "next/link";
import {
  INTEGRATIONS,
  KPI_SOURCE_MAP,
  countByStatus,
  type Integration,
  type KPISourceEntry,
} from "@/lib/integration-registry";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Database,
  FileText,
  Link2,
  Cpu,
  BookOpen,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";

// ─── Sub-components ───────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  banco:    "Banco",
  crm:      "CRM",
  notion:   "Notion",
  manual:   "Manual / Snapshot",
  internal: "Pipeline Interno",
};

const TYPE_ICON: Record<string, React.ElementType> = {
  banco:    Database,
  crm:      BookOpen,
  notion:   FileText,
  manual:   FileText,
  internal: Cpu,
};

const STATUS_CONFIG = {
  ativo:    { label: "Ativo",    color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", icon: CheckCircle2 },
  parcial:  { label: "Parcial",  color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   icon: AlertCircle  },
  pendente: { label: "Pendente", color: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200",  icon: Clock        },
  bloqueado:{ label: "Bloqueado",color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200",     icon: XCircle      },
};

const CONFIDENCE_CONFIG = {
  confirmed:   { label: "Confirmado",   color: "text-emerald-700", bg: "bg-emerald-50"  },
  probable:    { label: "Provável",     color: "text-amber-700",   bg: "bg-amber-50"    },
  low:         { label: "Baixa",        color: "text-orange-700",  bg: "bg-orange-50"   },
  unavailable: { label: "Indisponível", color: "text-gray-500",    bg: "bg-gray-50"     },
};

const RISK_CONFIG = {
  none:   { label: "Nenhum", color: "text-emerald-700", bg: "bg-emerald-50" },
  low:    { label: "Baixo",  color: "text-amber-600",   bg: "bg-amber-50"   },
  medium: { label: "Médio",  color: "text-orange-700",  bg: "bg-orange-50"  },
  high:   { label: "Alto",   color: "text-red-700",     bg: "bg-red-50"     },
};

const SOURCE_TYPE_CONFIG = {
  real:     { label: "Real",     color: "text-emerald-700", bg: "bg-emerald-100" },
  snapshot: { label: "Snapshot", color: "text-amber-700",   bg: "bg-amber-100"   },
  empty:    { label: "Sem dado", color: "text-gray-500",    bg: "bg-gray-100"    },
};

function StatusBadge({ status }: { status: Integration["status"] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function ConfidenceBadge({ c }: { c: Integration["confidence_status"] }) {
  const cfg = CONFIDENCE_CONFIG[c];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function RiskBadge({ r }: { r: Integration["contamination_risk"] }) {
  const cfg = RISK_CONFIG[r];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const Icon = TYPE_ICON[integration.type] ?? Database;
  const statusCfg = STATUS_CONFIG[integration.status];
  const kpis = KPI_SOURCE_MAP.filter((k) => k.integration_id === integration.integration_id);

  return (
    <div className={`card p-5 border-l-4 ${
      integration.status === "ativo"     ? "border-l-emerald-400" :
      integration.status === "parcial"   ? "border-l-amber-400"   :
      integration.status === "pendente"  ? "border-l-violet-400"  :
                                           "border-l-red-400"
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`mt-0.5 shrink-0 p-1.5 rounded-lg ${statusCfg.bg}`}>
            <Icon size={14} className={statusCfg.color} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-900">{integration.name}</span>
              <StatusBadge status={integration.status} />
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{integration.integration_id}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold bg-gray-100 text-gray-500`}>
            {TYPE_LABELS[integration.type]}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">{integration.description}</p>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-3 text-[11px]">
        <div>
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Owner</div>
          <div className="text-gray-700">{integration.owner}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Entidade</div>
          <div className="text-gray-700 font-mono text-[10px]">{integration.entity}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Confiança</div>
          <ConfidenceBadge c={integration.confidence_status} />
        </div>
        <div>
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Último Sync</div>
          <div className="text-gray-700">{integration.last_sync ?? "—"}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Atualizado em</div>
          <div className="text-gray-700">{integration.updated_at ?? "—"}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Risco Contaminação</div>
          <RiskBadge r={integration.contamination_risk} />
        </div>
      </div>

      {/* Source of truth */}
      <div className="mb-2">
        <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Fonte Canônica</div>
        <code className="text-[10px] bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-100 block break-all">
          {integration.source_of_truth}
        </code>
      </div>

      {/* Feeds targets */}
      {integration.feeds.length > 0 && (
        <div className="mb-3">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Alimenta</div>
          <div className="flex flex-wrap gap-1">
            {integration.feeds.map((f) => (
              <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-semibold border border-brand-100">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contamination note */}
      {integration.contamination_note && (
        <div className="flex items-start gap-1.5 text-[10px] text-orange-700 bg-orange-50 border border-orange-100 rounded px-2 py-1.5 mb-2">
          <AlertCircle size={11} className="shrink-0 mt-0.5" />
          {integration.contamination_note}
        </div>
      )}

      {/* Required action */}
      {integration.required_action && (
        <div className="flex items-start gap-1.5 text-[10px] text-violet-700 bg-violet-50 border border-violet-100 rounded px-2 py-1.5 mb-2">
          <Clock size={11} className="shrink-0 mt-0.5" />
          <span><span className="font-semibold">Ação:</span> {integration.required_action}</span>
        </div>
      )}

      {/* Dependent KPIs */}
      {kpis.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            KPIs dependentes ({kpis.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {kpis.map((k) => (
              <span key={k.kpi_id} className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                SOURCE_TYPE_CONFIG[k.source_type].bg
              } ${SOURCE_TYPE_CONFIG[k.source_type].color}`}>
                {k.kpi_id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const statusCounts = countByStatus();
  const totalIntegrations = INTEGRATIONS.length;
  const realKPIs      = KPI_SOURCE_MAP.filter((k) => k.source_type === "real").length;
  const snapshotKPIs  = KPI_SOURCE_MAP.filter((k) => k.source_type === "snapshot").length;
  const blockedSources= INTEGRATIONS.filter((i) => i.contamination_risk === "high").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Integrações & Roteamento de Fontes"
        subtitle="Origem oficial dos dados que alimentam KPIs, DFC, DRE, Budget e BU Scoreboard"
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-16 space-y-6">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">AWQ · Dados & Infra</span>
            <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
              source: lib/integration-registry.ts
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Registry de Integrações</h1>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Cada KPI exibido na plataforma deve ter origem rastreável registrada aqui.
            Integrações pendentes ou bloqueadas não podem alimentar indicadores como
            "reais" — são marcadas como snapshot ou sem dado.
          </p>
        </div>

        {/* ── Core rule banner ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={14} className="text-brand-600 shrink-0 mt-0.5" />
            <p className="text-xs text-brand-800">
              <span className="font-semibold">Fluxo canônico:</span>{" "}
              Integração → Fonte Canônica → Normalização / Conciliação → DFC / DRE / CRM / Budget → Indicadores.
              Indicadores não puxam dados diretamente de snapshots ou BUs sem passar por fonte registrada.
            </p>
          </div>
        </div>

        {/* ── Summary counters ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Total",          value: totalIntegrations,     color: "text-gray-900",   bg: "bg-white"       },
            { label: "Ativas",         value: statusCounts.ativo,    color: "text-emerald-700",bg: "bg-emerald-50"  },
            { label: "Parciais",       value: statusCounts.parcial,  color: "text-amber-700",  bg: "bg-amber-50"    },
            { label: "Pendentes",      value: statusCounts.pendente, color: "text-violet-700", bg: "bg-violet-50"   },
            { label: "Bloqueadas",     value: statusCounts.bloqueado,color: "text-red-700",    bg: "bg-red-50"      },
            { label: "KPIs reais",     value: realKPIs,              color: "text-brand-700",  bg: "bg-brand-50"    },
            { label: "KPIs snapshot",  value: snapshotKPIs,          color: "text-amber-700",  bg: "bg-amber-50"    },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-gray-100 rounded-xl px-3 py-3 text-center`}>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── High contamination risk warning ───────────────────────────────── */}
        {blockedSources > 0 && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <ShieldAlert size={14} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">
              <span className="font-semibold">{blockedSources} fonte(s) com risco de contaminação alto.</span>{" "}
              Dados dessas integrações não devem ser exibidos como reais.
              Revise as ações necessárias abaixo.
            </p>
          </div>
        )}

        {/* ── Integration cards ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Link2 size={14} className="text-brand-500" />
            Integrações Registradas
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {INTEGRATIONS.map((integration) => (
              <IntegrationCard key={integration.integration_id} integration={integration} />
            ))}
          </div>
        </section>

        {/* ── KPI → Source map ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Zap size={14} className="text-brand-500" />
            Mapa: Indicador → Integração → Camada → Destino
          </h2>
          <p className="text-[11px] text-gray-400 mb-3">
            Rastreabilidade completa de cada KPI até a fonte. KPIs marcados como
            <span className="mx-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-700">real</span>
            provêm de extratos bancários conciliados.
            <span className="mx-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700">snapshot</span>
            são dados de planejamento — não bancários.
          </p>
          <div className="card p-0 overflow-hidden">
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-gray-500 whitespace-nowrap">KPI</th>
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-gray-500 whitespace-nowrap">Tipo</th>
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-gray-500 whitespace-nowrap">Integração</th>
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-gray-500">Camada Intermediária</th>
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-gray-500 whitespace-nowrap">Páginas</th>
                  </tr>
                </thead>
                <tbody>
                  {KPI_SOURCE_MAP.map((entry) => {
                    const st = SOURCE_TYPE_CONFIG[entry.source_type];
                    return (
                      <tr key={entry.kpi_id} className="border-b border-gray-100 hover:bg-gray-50/80">
                        <td className="py-2 px-3 align-top">
                          <div className="font-semibold text-gray-900">{entry.kpi_label}</div>
                          <div className="text-[9px] text-gray-400 font-mono mt-0.5">{entry.kpi_id}</div>
                        </td>
                        <td className="py-2 px-3 align-top whitespace-nowrap">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${st.bg} ${st.color}`}>
                            {st.label}
                          </span>
                          {entry.warning && (
                            <div className="flex items-start gap-1 mt-1 text-[9px] text-amber-600">
                              <AlertCircle size={9} className="shrink-0 mt-0.5" />
                              <span>{entry.warning}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 align-top">
                          <div className="text-gray-700 text-[10px] font-medium">{entry.integration_name}</div>
                          <div className="text-[9px] text-gray-400 font-mono mt-0.5">{entry.integration_id}</div>
                        </td>
                        <td className="py-2 px-3 align-top">
                          <code className="text-[9px] text-gray-500 break-all leading-relaxed">
                            {entry.intermediate_layer}
                          </code>
                        </td>
                        <td className="py-2 px-3 align-top whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            {entry.destination_pages.map((p) => (
                              <Link
                                key={p}
                                href={p}
                                className="text-[9px] text-brand-600 hover:underline flex items-center gap-0.5"
                              >
                                <ArrowRight size={8} />
                                {p}
                              </Link>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Architecture note ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-4 border-l-4 border-l-brand-400">
            <div className="text-xs font-semibold text-gray-900 mb-2">Fluxo Canônico — Dados Bancários</div>
            <div className="space-y-1 text-[11px] text-gray-600">
              {[
                "PDF Extrato Bancário",
                "POST /api/ingest/upload + /process",
                "lib/financial-db.ts (getAllTransactions)",
                "lib/financial-query.ts (buildFinancialQuery)",
                "lib/financial-metric-query.ts (getAWQGroupKPIs)",
                "/awq/kpis · /awq/cashflow · /awq/reconciliation",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[9px] w-4 h-4 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <code className="text-[10px] text-gray-600">{step}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4 border-l-4 border-l-amber-400">
            <div className="text-xs font-semibold text-gray-900 mb-2">Fluxo Snapshot — Planejamento</div>
            <div className="space-y-1 text-[11px] text-gray-600">
              {[
                "lib/awq-group-data.ts (dados Q1 2026)",
                "lib/awq-derived-metrics.ts (derivações)",
                "lib/financial-metric-query.ts (snapshotMetric wrapper)",
                "/awq/kpis (badge 'snapshot' obrigatório)",
                "⚠ Nunca elevar a 'real' sem extrato bancário",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-[9px] w-4 h-4 rounded-full font-bold flex items-center justify-center shrink-0 ${
                    i === 4 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {i === 4 ? "!" : i + 1}
                  </span>
                  <code className="text-[10px] text-gray-600">{step}</code>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Source note ───────────────────────────────────────────────────── */}
        <div className="card p-4 border-l-4 border-gray-300 bg-white">
          <p className="text-[10px] text-gray-400">
            <span className="font-semibold text-gray-600">Fonte de dados:</span>{" "}
            <code className="bg-gray-100 px-1 rounded">lib/integration-registry.ts</code> —
            registry estático sem mocks. Novas integrações devem ser registradas
            neste arquivo com status honesto antes de alimentar qualquer KPI.
            Acesso à ingestão:{" "}
            <Link href="/awq/ingest" className="underline text-brand-600">/awq/ingest</Link>.
            Conciliação:{" "}
            <Link href="/awq/reconciliation" className="underline text-brand-600">/awq/reconciliation</Link>.
          </p>
        </div>

      </main>
    </div>
  );
}
