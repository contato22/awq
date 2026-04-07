// ─── /awq/assets/governance — Asset Governance Alerts Dashboard ───────────────
//
// DATA SOURCE: lib/asset-data.ts via lib/asset-query.ts + lib/asset-governance.ts
// SCOPE: All governance alerts across the AWQ Group BU subledgers. Q1 2026 snapshot.
// AWQ Holding reads/consolidates only — never originates or edits asset records.

import Header from "@/components/Header";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Info,
  ChevronRight,
} from "lucide-react";
import {
  buildHoldingAssetConsolidated,
  BU_LABELS,
} from "@/lib/asset-query";
import { GOVERNANCE_RULES } from "@/lib/asset-governance";
import type {
  GovernanceAlert,
  GovernanceAlertSeverity,
} from "@/lib/asset-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityBadge(severity: GovernanceAlertSeverity) {
  const map: Record<GovernanceAlertSeverity, string> = {
    critical: "text-red-700 bg-red-50 border-red-200",
    high:     "text-orange-700 bg-orange-50 border-orange-200",
    medium:   "text-amber-700 bg-amber-50 border-amber-200",
    low:      "text-gray-600 bg-gray-100 border-gray-200",
  };
  const labels: Record<GovernanceAlertSeverity, string> = {
    critical: "Crítico",
    high:     "Alto",
    medium:   "Médio",
    low:      "Baixo",
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-bold border rounded px-1.5 py-0.5 ${map[severity]}`}>
      {labels[severity]}
    </span>
  );
}

function blocksBadge(blocks: boolean) {
  if (blocks) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
        <XCircle size={9} /> Bloqueia
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
      <CheckCircle2 size={9} /> Não bloqueia
    </span>
  );
}

// ─── Snapshot Banner ──────────────────────────────────────────────────────────

function SnapshotBanner() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
      <span>
        <strong>Snapshot Patrimonial Q1 2026</strong> — alertas de governança gerados pelo motor
        lib/asset-governance.ts a partir dos subledgers de cada BU (lib/asset-data.ts).
        Alertas com <strong>Bloqueia = true</strong> impedem que o ativo entre na consolidação do holding.
        A AWQ Holding lê esses dados — não os origina.
      </span>
    </div>
  );
}

// ─── Severity Summary ─────────────────────────────────────────────────────────

function SeveritySummary({ alerts }: { alerts: GovernanceAlert[] }) {
  const counts: Record<GovernanceAlertSeverity, number> = {
    critical: 0,
    high:     0,
    medium:   0,
    low:      0,
  };
  for (const a of alerts) {
    counts[a.severity] = (counts[a.severity] ?? 0) + 1;
  }

  const items = [
    { key: "critical" as const, label: "Crítico",  color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200"   },
    { key: "high"     as const, label: "Alto",     color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
    { key: "medium"   as const, label: "Médio",    color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200" },
    { key: "low"      as const, label: "Baixo",    color: "text-gray-500",   bg: "bg-gray-50",   border: "border-gray-200"  },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.key} className={`card p-4 flex flex-col items-center gap-1 border ${item.border} ${item.bg}`}>
          <div className={`text-3xl font-bold tabular-nums ${item.color}`}>
            {counts[item.key]}
          </div>
          <div className="text-xs font-semibold text-gray-700">{item.label}</div>
          <div className="text-[10px] text-gray-400">
            {counts[item.key] === 1 ? "alerta" : "alertas"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Governance Rules Panel ───────────────────────────────────────────────────

function GovernanceRulesPanel() {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Info size={15} className="text-brand-500" />
        Regras de Governança Ativas
      </h2>
      <div className="space-y-2">
        {GOVERNANCE_RULES.map((rule) => (
          <div key={rule.rule_id} className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
            <div className="shrink-0 mt-0.5">
              {rule.blocks_consolidation ? (
                <XCircle size={13} className="text-red-500" />
              ) : (
                <CheckCircle2 size={13} className="text-emerald-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-800">{rule.name}</span>
                {severityBadge(rule.severity)}
                {rule.blocks_consolidation && (
                  <span className="text-[10px] text-red-600 font-semibold">bloqueia consolidação</span>
                )}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">{rule.description}</div>
            </div>
            <div className="shrink-0 text-[10px] text-gray-400 font-mono">{rule.rule_id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alert Table ──────────────────────────────────────────────────────────────

function AlertTable({
  alerts,
  title,
  emptyMessage,
}: {
  alerts: GovernanceAlert[];
  title: string;
  emptyMessage: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <ShieldAlert size={15} className="text-amber-500" />
          {title}
        </h2>
        <span className="text-[10px] text-gray-400">{alerts.length} alerta(s)</span>
      </div>
      {alerts.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">{emptyMessage}</p>
      ) : (
        <div className="table-scroll">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">BU</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Ativo</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Tipo de Alerta</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Severidade</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Mensagem</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Bloqueio</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr
                  key={alert.alert_id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    alert.blocks_consolidation ? "bg-red-50/40" : ""
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-gray-800">
                      {BU_LABELS[alert.bu_id] ?? alert.bu_id}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">{alert.bu_id}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-gray-800 max-w-[160px] truncate" title={alert.asset_name}>
                      {alert.asset_name}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">{alert.asset_id}</div>
                  </td>
                  <td className="py-2.5 px-3 hidden md:table-cell">
                    <code className="text-[10px] font-mono text-gray-600 bg-gray-100 px-1 rounded">
                      {alert.alert_type}
                    </code>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {severityBadge(alert.severity)}
                  </td>
                  <td className="py-2.5 px-3 text-gray-600 hidden lg:table-cell max-w-[240px]">
                    <span className="truncate block" title={alert.message}>
                      {alert.message}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {blocksBadge(alert.blocks_consolidation)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Blocking Assets Section ──────────────────────────────────────────────────

function BlockingAlertsSection({ alerts }: { alerts: GovernanceAlert[] }) {
  const blocking = alerts.filter((a) => a.blocks_consolidation);

  if (blocking.length === 0) {
    return (
      <div className="card p-5 border-l-4 border-emerald-400">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Nenhum ativo bloqueado da consolidação
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Todos os ativos elegíveis estão desbloqueados para entrada no patrimônio consolidado AWQ.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Group blocking alerts by asset_id for summary display
  const byAsset = new Map<string, GovernanceAlert[]>();
  for (const a of blocking) {
    const existing = byAsset.get(a.asset_id) ?? [];
    existing.push(a);
    byAsset.set(a.asset_id, existing);
  }

  return (
    <div className="card p-5 border-l-4 border-red-400">
      <div className="flex items-center gap-2 mb-4">
        <XCircle size={16} className="text-red-500 shrink-0" />
        <h2 className="text-sm font-semibold text-gray-900">
          Ativos Bloqueados da Consolidação ({byAsset.size} ativo(s) · {blocking.length} alerta(s))
        </h2>
      </div>
      <p className="text-xs text-red-700 mb-4 bg-red-50 border border-red-100 rounded p-3">
        Os ativos abaixo possuem alertas que impedem sua inclusão no patrimônio líquido consolidado AWQ.
        O BU responsável deve corrigir cada item e resubmeter o subledger.
        A AWQ Holding não pode editar esses registros diretamente.
      </p>
      <div className="space-y-3">
        {Array.from(byAsset.entries()).map(([assetId, assetAlerts]) => {
          const first = assetAlerts[0];
          return (
            <div key={assetId} className="rounded-lg border border-red-100 bg-red-50/60 p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="text-xs font-semibold text-gray-800">{first.asset_name}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{assetId} · {BU_LABELS[first.bu_id] ?? first.bu_id}</div>
                </div>
                <span className="text-[10px] font-bold text-red-600 bg-red-100 border border-red-200 rounded px-1.5 py-0.5 shrink-0">
                  {assetAlerts.length} alerta(s)
                </span>
              </div>
              <div className="space-y-1">
                {assetAlerts.map((a) => (
                  <div key={a.alert_id} className="flex items-start gap-2 text-[11px] text-red-700">
                    <XCircle size={10} className="shrink-0 mt-0.5 text-red-500" />
                    <span>
                      <code className="font-mono bg-red-100 px-1 rounded text-[10px]">{a.alert_type}</code>
                      {" — "}{a.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqAssetsGovernancePage() {
  const consolidated = await buildHoldingAssetConsolidated();
  const alerts = consolidated.governance_alerts;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const blockingCount = alerts.filter((a) => a.blocks_consolidation).length;

  return (
    <>
      <Header
        title="Governança de Ativos — AWQ Group"
        subtitle={`Alertas patrimoniais · ${consolidated.period} · snapshot ${consolidated.consolidation_date.slice(0, 10)}`}
      />
      <div className="page-container">

        <SnapshotBanner />

        {/* ── Back link ────────────────────────────────────────────────────── */}
        <div>
          <Link
            href="/awq/assets"
            className="flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
          >
            <ChevronRight size={11} className="rotate-180" /> Voltar ao Consolidado Patrimonial
          </Link>
        </div>

        {/* ── Critical alert banner ─────────────────────────────────────────── */}
        {criticalCount > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-300 text-sm text-red-800">
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-red-600" />
            <span>
              <strong>{criticalCount} alerta(s) crítico(s)</strong> detectados.{" "}
              {blockingCount > 0 && (
                <span>
                  {blockingCount} ativo(s) <strong>bloqueados</strong> da consolidação do holding.
                </span>
              )}{" "}
              Ação imediata necessária pelos BUs responsáveis.
            </span>
          </div>
        )}

        {/* ── Severity summary ──────────────────────────────────────────────── */}
        <SeveritySummary alerts={alerts} />

        {/* ── Blocking assets ───────────────────────────────────────────────── */}
        <BlockingAlertsSection alerts={alerts} />

        {/* ── All alerts table ──────────────────────────────────────────────── */}
        <AlertTable
          alerts={alerts}
          title="Todos os Alertas de Governança"
          emptyMessage="Nenhum alerta de governança. Todos os ativos passaram nas validações."
        />

        {/* ── Governance rules ──────────────────────────────────────────────── */}
        <GovernanceRulesPanel />

        {/* ── Methodology note ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-700">Governança Patrimonial AWQ</span> —
            Os alertas acima são gerados automaticamente por{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[10px]">lib/asset-governance.ts</code>{" "}
            ao processar os subledgers de cada BU. Alertas com{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[10px]">blocks_consolidation: true</code>{" "}
            excluem o ativo do{" "}
            <code className="font-mono bg-gray-100 px-1 rounded text-[10px]">total_asset_net</code>{" "}
            até que o BU corrija o problema. A AWQ Holding tem visão de leitura apenas — correções
            devem ser aplicadas no subledger do BU responsável.
          </p>
        </div>

      </div>
    </>
  );
}
