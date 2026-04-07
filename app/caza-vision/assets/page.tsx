// ─── /caza-vision/assets — Caza Vision BU Asset Subledger ────────────────────
//
// DATA SOURCE: lib/asset-data.ts (Caza Vision subledger) via lib/asset-query.ts
// SCOPE: All assets owned/custodied by Caza Vision Produtora. Q1 2026 snapshot.
// OWNERSHIP: This data is originated and maintained by Caza Vision.
//            The AWQ Holding receives a read-only consolidated snapshot.
//            This page is the Caza Vision-level detailed view.

import Header from "@/components/Header";
import Link from "next/link";
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Building2,
  ShieldAlert,
} from "lucide-react";
import {
  buildBuAssetView,
  fmtBRL,
  RECOGNITION_LABELS,
  RECOGNITION_COLORS,
  ASSET_CLASS_LABELS,
} from "@/lib/asset-query";
import type { AssetRecord, RecognitionType } from "@/lib/asset-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RecognitionBadge({ type }: { type: RecognitionType }) {
  return (
    <span className={`inline-flex text-[10px] font-semibold border rounded px-1.5 py-0.5 ${RECOGNITION_COLORS[type]}`}>
      {RECOGNITION_LABELS[type]}
    </span>
  );
}

function EvidenceBadge({ level }: { level: AssetRecord["evidence_level"] }) {
  const map: Record<AssetRecord["evidence_level"], string> = {
    high:   "text-emerald-700 bg-emerald-50 border-emerald-200",
    medium: "text-amber-700 bg-amber-50 border-amber-200",
    low:    "text-red-700 bg-red-50 border-red-200",
  };
  const labels: Record<AssetRecord["evidence_level"], string> = {
    high:   "Alta",
    medium: "Média",
    low:    "Baixa",
  };
  return (
    <span className={`inline-flex text-[10px] font-semibold border rounded px-1.5 py-0.5 ${map[level]}`}>
      {labels[level]}
    </span>
  );
}

function ConfidenceBadge({ level }: { level: AssetRecord["valuation_confidence"] }) {
  const map: Record<AssetRecord["valuation_confidence"], string> = {
    confirmed:  "text-emerald-700 bg-emerald-50 border-emerald-200",
    probable:   "text-brand-700 bg-brand-50 border-brand-200",
    estimated:  "text-amber-700 bg-amber-50 border-amber-200",
    unverified: "text-gray-500 bg-gray-100 border-gray-200",
  };
  const labels: Record<AssetRecord["valuation_confidence"], string> = {
    confirmed:  "Confirmado",
    probable:   "Provável",
    estimated:  "Estimado",
    unverified: "Não verificado",
  };
  return (
    <span className={`inline-flex text-[10px] font-semibold border rounded px-1.5 py-0.5 ${map[level]}`}>
      {labels[level]}
    </span>
  );
}

// ─── Snapshot Banner ──────────────────────────────────────────────────────────

function SnapshotBanner() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
      <span>
        <strong>Snapshot Patrimonial Q1 2026 — Caza Vision</strong> — dados do subledger de ativos da
        Caza Vision Produtora (lib/asset-data.ts). Este é o registro originado pelo BU.
        A AWQ Holding não edita nem origina estes dados — recebe apenas a visão consolidada.
      </span>
    </div>
  );
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiCards({ view }: { view: Awaited<ReturnType<typeof buildBuAssetView>> }) {
  const cards = [
    {
      label: "Total Reconhecido Líq.",
      value: fmtBRL(view.snapshot.recognized_net_total),
      sub:   "tangível + intangível rec.",
      icon: Package,
      color: "text-emerald-600",
      bg:    "bg-emerald-50",
    },
    {
      label: "Tangível Líq.",
      value: fmtBRL(view.snapshot.tangible_net_value),
      sub:   "após depreciação acumulada",
      icon: Building2,
      color: "text-emerald-700",
      bg:    "bg-emerald-50",
    },
    {
      label: "Intangível Rec. Líq.",
      value: fmtBRL(view.snapshot.intangible_recognized_net),
      sub:   "após amortização acumulada",
      icon: CheckCircle2,
      color: "text-violet-600",
      bg:    "bg-violet-50",
    },
    {
      label: "Qtd. Ativos Reconhecidos",
      value: String(view.snapshot.recognized_asset_count),
      sub:   `${view.snapshot.idle_asset_count} ocioso(s)`,
      icon: ShieldAlert,
      color: view.snapshot.idle_asset_count > 0 ? "text-amber-600" : "text-gray-500",
      bg:    view.snapshot.idle_asset_count > 0 ? "bg-amber-50" : "bg-gray-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="card p-5 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
              <Icon size={18} className={card.color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</div>
              <div className="text-xs font-medium text-gray-500 mt-0.5">{card.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{card.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Asset Table ──────────────────────────────────────────────────────────────

function AssetTable({ assets }: { assets: AssetRecord[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Package size={15} className="text-emerald-500" />
          Subledger de Ativos — Caza Vision
        </h2>
        <span className="text-[10px] text-gray-400">{assets.length} ativo(s)</span>
      </div>
      {assets.length === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center">
          Nenhum ativo registrado no subledger Caza Vision para este período.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Ativo</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Classe</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Reconhecimento</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor Contábil</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Status</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Evidência</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Confiança</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 hidden xl:table-cell">Próx. Revisão</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr
                  key={asset.asset_id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    asset.recognition_type === "strategic_non_recognized"
                      ? "bg-amber-50/30"
                      : ""
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-gray-900 max-w-[180px] truncate" title={asset.asset_name}>
                      {asset.asset_name}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">{asset.asset_id}</div>
                  </td>
                  <td className="py-2.5 px-3 hidden md:table-cell text-gray-600">
                    {ASSET_CLASS_LABELS[asset.asset_class] ?? asset.asset_class}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <RecognitionBadge type={asset.recognition_type} />
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                    {asset.recognition_type === "strategic_non_recognized" ? (
                      <span className="text-gray-400 text-[10px]">não reconhecido</span>
                    ) : (
                      <span className="text-gray-800">{fmtBRL(asset.carrying_value)}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center hidden sm:table-cell">
                    <span className={`text-[10px] font-semibold ${
                      asset.status === "active"             ? "text-emerald-600" :
                      asset.status === "idle"               ? "text-amber-600"   :
                      asset.status === "under_maintenance"  ? "text-blue-600"    :
                      asset.status === "under_validation"   ? "text-violet-600"  :
                      asset.status === "disposed"           ? "text-red-500"     :
                      "text-gray-400"
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center hidden lg:table-cell">
                    <EvidenceBadge level={asset.evidence_level} />
                  </td>
                  <td className="py-2.5 px-3 text-center hidden lg:table-cell">
                    <ConfidenceBadge level={asset.valuation_confidence} />
                  </td>
                  <td className="py-2.5 px-3 text-center hidden xl:table-cell text-gray-500">
                    {asset.next_review_date}
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

// ─── Governance Alerts Section ────────────────────────────────────────────────

function GovernanceAlertsSection({
  view,
}: {
  view: Awaited<ReturnType<typeof buildBuAssetView>>;
}) {
  const alerts = view.governance_alerts;
  if (alerts.length === 0) {
    return (
      <div className="card p-4 border-l-4 border-emerald-400 flex items-center gap-3">
        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
        <div className="text-sm text-gray-700">
          <span className="font-semibold">Nenhum alerta de governança</span> para Caza Vision neste período.
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 border-l-4 border-amber-400">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <ShieldAlert size={15} className="text-amber-500" />
          Alertas de Governança — Caza Vision ({alerts.length})
        </h2>
        <Link
          href="/awq/assets/governance"
          className="flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
        >
          Ver todos no holding <ChevronRight size={11} />
        </Link>
      </div>
      <div className="space-y-2">
        {alerts.slice(0, 5).map((alert) => (
          <div key={alert.alert_id} className={`flex items-start gap-2 p-2.5 rounded-lg border ${
            alert.severity === "critical" ? "bg-red-50 border-red-200" :
            alert.severity === "high"     ? "bg-orange-50 border-orange-200" :
            "bg-amber-50 border-amber-200"
          }`}>
            <AlertTriangle size={12} className={`shrink-0 mt-0.5 ${
              alert.severity === "critical" ? "text-red-500" :
              alert.severity === "high"     ? "text-orange-500" :
              "text-amber-500"
            }`} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-gray-800 truncate">
                {alert.asset_name}
              </div>
              <div className="text-[10px] text-gray-600 mt-0.5">{alert.message}</div>
            </div>
            <span className={`shrink-0 text-[10px] font-bold border rounded px-1.5 py-0.5 ${
              alert.severity === "critical" ? "text-red-700 bg-red-50 border-red-200" :
              alert.severity === "high"     ? "text-orange-700 bg-orange-50 border-orange-200" :
              "text-amber-700 bg-amber-50 border-amber-200"
            }`}>
              {alert.severity}
            </span>
          </div>
        ))}
        {alerts.length > 5 && (
          <p className="text-[10px] text-gray-400 text-center pt-1">
            + {alerts.length - 5} alerta(s) adicionais — ver no painel de governança do holding
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CazaVisionAssetsPage() {
  const view = await buildBuAssetView("caza");

  return (
    <>
      <Header
        title="Ativos — Caza Vision"
        subtitle={`Subledger Patrimonial · ${view.snapshot.period} · Caza Vision Produtora`}
      />
      <div className="page-container">

        <SnapshotBanner />

        {/* ── Ownership notice ──────────────────────────────────────────────── */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
          <Building2 size={13} className="shrink-0 mt-0.5" />
          <span>
            <strong>Dados originados pela Caza Vision.</strong> Este subledger é de propriedade e responsabilidade
            do BU Caza Vision Produtora. A AWQ Holding recebe uma visão consolidada de leitura — não pode
            editar estes registros diretamente.
          </span>
        </div>

        {/* ── KPI cards ─────────────────────────────────────────────────────── */}
        <KpiCards view={view} />

        {/* ── Governance alerts ─────────────────────────────────────────────── */}
        <GovernanceAlertsSection view={view} />

        {/* ── Asset table ───────────────────────────────────────────────────── */}
        <AssetTable assets={view.assets} />

        {/* ── Link to holding view ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600">
            Ver visão consolidada do holding (todos os BUs):
          </div>
          <Link
            href="/awq/assets"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Consolidado AWQ <ChevronRight size={12} />
          </Link>
        </div>

      </div>
    </>
  );
}
