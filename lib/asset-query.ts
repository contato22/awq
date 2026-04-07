// ─── AWQ Asset Query — sole authorised query path for asset data ───────────────
//
// ARCHITECTURE RULE:
//   This is the ONLY module that may read from lib/asset-data.ts.
//   All pages (BU and holding) must import from here — never from asset-data.ts.
//
// HOLDING CONTRACT:
//   buildHoldingAssetConsolidated() → HoldingAssetConsolidated
//     - pulls BU snapshots from each subledger
//     - NEVER adds strategic_non_recognized to total_asset_net
//     - runs governance validation; blocked assets excluded from equity sums
//     - holding does NOT modify asset records — read-only consolidation only
//
//   buildBuAssetView(buId) → { snapshot, assets, governance_alerts }
//     - returns full BU subledger detail (for BU-owned pages only)
//     - holding pages must use buildHoldingAssetConsolidated() instead
//
// Q1 2026 snapshot data — registered in lib/snapshot-registry.ts

import type {
  BuId,
  AssetType,
  AssetClass,
  RecognitionType,
  AssetStatus,
  BuAssetSubledger,
  BuAssetSnapshot,
  HoldingAssetConsolidated,
  AssetRecord,
  GovernanceAlert,
} from "./asset-types";
import { ALL_BU_SUBLEDGERS } from "./asset-data";
import { validateBuSubledger } from "./asset-governance";

// ─── Format helpers ───────────────────────────────────────────────────────────

export function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

// ─── Label maps ───────────────────────────────────────────────────────────────

export const BU_LABELS: Record<BuId, string> = {
  jacqes:  "JACQES",
  caza:    "Caza Vision",
  advisor: "Advisor",
  venture: "AWQ Venture",
};

export const BU_COLORS: Record<BuId, string> = {
  jacqes:  "bg-brand-600",
  caza:    "bg-emerald-600",
  advisor: "bg-violet-600",
  venture: "bg-amber-600",
};

export const BU_ACCENT: Record<BuId, string> = {
  jacqes:  "text-brand-700 bg-brand-50 border-brand-200",
  caza:    "text-emerald-700 bg-emerald-50 border-emerald-200",
  advisor: "text-violet-700 bg-violet-50 border-violet-200",
  venture: "text-amber-700 bg-amber-50 border-amber-200",
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  tangible:                  "Tangível",
  intangible_recognized:     "Intangível Reconhecido",
  strategic_non_recognized:  "Estratégico Não Reconhecido",
};

export const RECOGNITION_LABELS: Record<RecognitionType, string> = {
  recognized:               "Reconhecido",
  under_validation:         "Em Validação",
  strategic_non_recognized: "Estratégico NR",
};

export const RECOGNITION_COLORS: Record<RecognitionType, string> = {
  recognized:               "text-emerald-700 bg-emerald-50 border-emerald-200",
  under_validation:         "text-amber-700 bg-amber-50 border-amber-200",
  strategic_non_recognized: "text-violet-700 bg-violet-50 border-violet-200",
};

export const ASSET_CLASS_LABELS: Record<string, string> = {
  equipment_computing:         "Equip. Computação",
  equipment_production:        "Equip. Produção",
  equipment_audio_visual:      "Equip. AV",
  equipment_mobile:            "Dispositivos Móveis",
  furniture_fixtures:          "Mobiliário",
  vehicle:                     "Veículo",
  infrastructure:              "Infraestrutura",
  other_tangible:              "Outro Tangível",
  software_license:            "Licença de Software",
  client_portfolio:            "Carteira de Clientes",
  contract_rights:             "Direitos Contratuais",
  intellectual_property:       "Propriedade Intelectual",
  trademark_domain:            "Marca / Domínio",
  goodwill:                    "Goodwill",
  other_intangible_recognized: "Outro Intangível Reconhecido",
  brand_equity:                "Brand Equity",
  talent_capital:              "Capital de Talentos",
  network_value:               "Capital Relacional",
  creative_methodology:        "Metodologia Criativa",
  strategic_position:          "Posição Estratégica",
  proprietary_model:           "Modelo Proprietário",
  other_strategic:             "Outro Estratégico",
};

export const STRATEGIC_CLASS_LABELS: Record<string, string> = {
  brand_equity:        "Brand Equity",
  talent_capital:      "Capital de Talentos",
  network_value:       "Capital Relacional",
  creative_methodology:"Metodologia Criativa",
  strategic_position:  "Posição Estratégica",
  proprietary_model:   "Modelo Proprietário",
  other_strategic:     "Outro Estratégico",
};

export const STATUS_LABELS: Record<AssetStatus, string> = {
  active:             "Ativo",
  idle:               "Ocioso",
  under_maintenance:  "Em Manutenção",
  under_validation:   "Em Validação",
  disposed:           "Alienado",
  retired:            "Baixado",
};

// ─── BU revenue / EBITDA reference (from awq-group-data.ts Q1 2026 snapshot) ──
// These are used to compute revenue_per_asset and ebitda_per_asset.
// Source: lib/awq-group-data.ts buData[] — kept in sync during snapshot phase.

const BU_REVENUE: Record<BuId, number> = {
  jacqes:  4_820_000,
  caza:    2_418_000,
  advisor: 1_570_000,
  venture: 0,
};

const BU_EBITDA: Record<BuId, number> = {
  jacqes:  867_000,
  caza:    653_000,
  advisor: 320_000,
  venture: 0,
};

// ─── Per-asset computed values ────────────────────────────────────────────────

function computeValuationConfidenceScore(assets: AssetRecord[]): number {
  if (assets.length === 0) return 0;
  const scoreMap: Record<string, number> = {
    confirmed:  1.0,
    probable:   0.7,
    estimated:  0.4,
    unverified: 0.1,
  };
  const total = assets.reduce(
    (s, a) => s + (scoreMap[a.valuation_confidence] ?? 0),
    0
  );
  return total / assets.length;
}

function computeEvidenceHighPct(assets: AssetRecord[]): number {
  if (assets.length === 0) return 0;
  return assets.filter((a) => a.evidence_level === "high").length / assets.length;
}

function computeEvidenceLowPct(assets: AssetRecord[]): number {
  if (assets.length === 0) return 0;
  return assets.filter((a) => a.evidence_level === "low").length / assets.length;
}

function computeUtilizationScore(assets: AssetRecord[]): number {
  const recognized = assets.filter((a) => a.recognition_type === "recognized");
  if (recognized.length === 0) return 0;
  const active = recognized.filter(
    (a) => a.status === "active" || a.status === "under_maintenance"
  ).length;
  return active / recognized.length;
}

function computeCriticalRiskScore(
  assets: AssetRecord[],
  alertCount: number
): number {
  const recognized = assets.filter((a) => a.recognition_type === "recognized");
  if (recognized.length === 0) return 0;
  const idleScore  = assets.filter((a) => a.status === "idle").length / (recognized.length || 1);
  const alertScore = Math.min(alertCount / (recognized.length * 2), 1);
  const lowEvidence = computeEvidenceLowPct(recognized);
  return Math.min((idleScore * 0.4 + alertScore * 0.4 + lowEvidence * 0.2), 1);
}

// ─── BU snapshot builder ──────────────────────────────────────────────────────

function buildBuSnapshot(
  subledger: BuAssetSubledger,
  alerts: GovernanceAlert[]
): BuAssetSnapshot {
  const { bu_id, bu_name, period, snapshot_date, assets } = subledger;

  // Partition by recognition type — strategic_non_recognized excluded from equity
  const tangible   = assets.filter(
    (a) => a.asset_type === "tangible" && a.recognition_type !== "strategic_non_recognized"
  );
  const intangible = assets.filter(
    (a) => a.asset_type === "intangible_recognized" && a.recognition_type !== "strategic_non_recognized"
  );
  const recognized = assets.filter((a) => a.recognition_type === "recognized");
  const underValidation = assets.filter((a) => a.recognition_type === "under_validation");
  const strategic  = assets.filter((a) => a.recognition_type === "strategic_non_recognized");
  const shared     = assets.filter(
    (a) => a.is_shared_with_holding || a.is_shared_with_other_bus
  );
  const idle       = assets.filter((a) => a.status === "idle");

  // Tangible block — use recognized only (excludes under_validation from equity)
  const tangibleRecognized = tangible.filter((a) => a.recognition_type === "recognized");
  const tang_gross   = tangibleRecognized.reduce((s, a) => s + a.gross_book_value, 0);
  const tang_depr    = tangibleRecognized.reduce((s, a) => s + a.accumulated_depreciation, 0);
  const tang_imp     = tangibleRecognized.reduce((s, a) => s + a.impairment_amount, 0);
  const tang_net     = tang_gross - tang_depr - tang_imp;

  // Intangible recognized block
  const intangRecognized = intangible.filter((a) => a.recognition_type === "recognized");
  const int_gross    = intangRecognized.reduce((s, a) => s + a.gross_book_value, 0);
  const int_amort    = intangRecognized.reduce((s, a) => s + a.accumulated_amortization, 0);
  const int_imp      = intangRecognized.reduce((s, a) => s + a.impairment_amount, 0);
  const int_net      = int_gross - int_amort - int_imp;

  // Productivity (only for recognized assets)
  const revenue = BU_REVENUE[bu_id as BuId] ?? 0;
  const ebitda  = BU_EBITDA[bu_id as BuId] ?? 0;
  const recCount = recognized.length || 1;
  const alertCount = alerts.filter((a) => a.bu_id === bu_id).length;

  return {
    bu_id: bu_id as BuId,
    bu_name,
    period,
    snapshot_date,

    tangible_gross_value:         tang_gross,
    tangible_accumulated_depr:    tang_depr,
    tangible_net_value:           tang_net,

    intangible_recognized_gross:             int_gross,
    intangible_recognized_accumulated_amort: int_amort,
    intangible_recognized_net:              int_net,

    recognized_net_total: tang_net + int_net,

    recognized_asset_count:       recognized.length,
    under_validation_asset_count: underValidation.length,
    strategic_asset_count:        strategic.length,
    shared_asset_count:           shared.length,
    idle_asset_count:             idle.length,

    capex_month:     0,  // no movement data in Q1 2026 snapshot
    disposals_month: 0,
    impairment_month: 0,

    evidence_high_pct:          computeEvidenceHighPct(recognized),
    evidence_low_pct:           computeEvidenceLowPct(recognized),
    valuation_confidence_score: computeValuationConfidenceScore(recognized),
    asset_utilization_score:    computeUtilizationScore(assets),

    revenue_per_asset: revenue / recCount,
    ebitda_per_asset:  ebitda / recCount,

    critical_asset_risk_score: computeCriticalRiskScore(assets, alertCount),
  };
}

// ─── BU asset view (BU-level pages) ──────────────────────────────────────────

export interface BuAssetView {
  subledger:         BuAssetSubledger;
  snapshot:          BuAssetSnapshot;
  assets:            AssetRecord[];
  governance_alerts: GovernanceAlert[];
}

export function buildBuAssetView(buId: BuId): BuAssetView {
  const subledger = ALL_BU_SUBLEDGERS.find((s) => s.bu_id === buId);
  if (!subledger) {
    throw new Error(`No subledger found for BU: ${buId}`);
  }
  const gov = validateBuSubledger(subledger);
  const snapshot = buildBuSnapshot(subledger, gov.all_alerts);
  return {
    subledger,
    snapshot,
    assets: subledger.assets,
    governance_alerts: gov.all_alerts,
  };
}

// ─── Strategic view (holding strategic page) ──────────────────────────────────

export interface StrategicBuView {
  bu_id:        BuId;
  bu_name:      string;
  total_count:  number;
  /** Uses `class` (not `asset_class`) to match BuStrategicView in the strategic page */
  by_class:     Array<{ class: string; count: number; estimated_value: number | null }>;
}

export function buildBuStrategicView(): StrategicBuView[] {
  return ALL_BU_SUBLEDGERS.map((sub) => {
    const strategic = sub.assets.filter(
      (a) => a.recognition_type === "strategic_non_recognized"
    );
    const classMap = new Map<string, { count: number; estimated_value: number }>();
    for (const a of strategic) {
      const prev = classMap.get(a.asset_class) ?? { count: 0, estimated_value: 0 };
      classMap.set(a.asset_class, {
        count: prev.count + 1,
        estimated_value: prev.estimated_value + a.acquisition_cost,
      });
    }
    return {
      bu_id:       sub.bu_id as BuId,
      bu_name:     sub.bu_name,
      total_count: strategic.length,
      by_class:    Array.from(classMap.entries()).map(([cls, v]) => ({
        class: cls,
        count: v.count,
        estimated_value: v.estimated_value || null,
      })),
    };
  });
}

// ─── Holding consolidated view ────────────────────────────────────────────────

export function buildHoldingAssetConsolidated(): HoldingAssetConsolidated {
  const buSnapshots: BuAssetSnapshot[] = [];
  const allAlerts: GovernanceAlert[]   = [];

  // Build snapshots for all BUs
  for (const sub of ALL_BU_SUBLEDGERS) {
    const gov     = validateBuSubledger(sub);
    const snapshot = buildBuSnapshot(sub, gov.all_alerts);
    buSnapshots.push(snapshot);
    allAlerts.push(...gov.all_alerts);
  }

  // Aggregate recognized equity (strategic_non_recognized EXCLUDED)
  const total_tangible_net  = buSnapshots.reduce((s, b) => s + b.tangible_net_value, 0);
  const total_intangible_net = buSnapshots.reduce((s, b) => s + b.intangible_recognized_net, 0);

  // Weighted group scores
  const totalRec = buSnapshots.reduce((s, b) => s + b.recognized_asset_count, 0) || 1;
  const group_utilization = buSnapshots.reduce(
    (s, b) => s + b.asset_utilization_score * b.recognized_asset_count,
    0
  ) / totalRec;
  const group_evidence = buSnapshots.reduce(
    (s, b) => s + b.evidence_high_pct * b.recognized_asset_count,
    0
  ) / totalRec;
  const group_risk = buSnapshots.reduce(
    (s, b) => s + b.critical_asset_risk_score * b.recognized_asset_count,
    0
  ) / totalRec;

  // Total revenues for group productivity
  const totalRevenue = buSnapshots.reduce((s, b) => s + b.revenue_per_asset * b.recognized_asset_count, 0);
  const totalEbitda  = buSnapshots.reduce((s, b) => s + b.ebitda_per_asset  * b.recognized_asset_count, 0);

  return {
    period:             "2026-Q1",
    consolidation_date: new Date().toISOString(),
    bu_snapshots:       buSnapshots,

    // ── Consolidated recognized equity
    total_tangible_net:              total_tangible_net,
    total_intangible_recognized_net: total_intangible_net,
    total_asset_net:                 total_tangible_net + total_intangible_net,

    // ── Period movements (snapshot — no movement data)
    total_capex_month:     0,
    total_impairment_month: 0,

    // ── Counts
    total_idle_assets:             buSnapshots.reduce((s, b) => s + b.idle_asset_count, 0),
    total_shared_assets:           buSnapshots.reduce((s, b) => s + b.shared_asset_count, 0),
    total_under_validation_assets: buSnapshots.reduce((s, b) => s + b.under_validation_asset_count, 0),
    total_strategic_assets:        buSnapshots.reduce((s, b) => s + b.strategic_asset_count, 0),

    // ── Group quality scores
    group_asset_utilization_score: group_utilization,
    group_revenue_per_asset:       totalRevenue / totalRec,
    group_ebitda_per_asset:        totalEbitda  / totalRec,
    group_asset_risk_score:        group_risk,
    group_evidence_score:          group_evidence,

    governance_alerts: allAlerts,
  };
}
