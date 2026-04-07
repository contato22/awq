// ─── AWQ Asset Layer — Type Definitions ───────────────────────────────────────
//
// ARCHITECTURE RULE: This module defines types only. No data, no functions.
// Import this from asset-data.ts, asset-query.ts, asset-governance.ts, and pages.
//
// LAYER HIERARCHY:
//   BU subledger (asset-data.ts)  ← authoritative detail
//       ↓  read-only pull
//   BU view (asset-query.ts::buildBuAssetView)  ← period snapshot per BU
//       ↓  read-only consolidation
//   Holding consolidated (asset-query.ts::buildHoldingAssetConsolidated) ← AWQ view
//
// GOVERNANCE INVARIANTS (enforced by asset-governance.ts):
//   1. No asset may be counted in holding without: bu_id, owner_entity,
//      recognition_type, documentation_status, valuation_confidence
//   2. strategic_non_recognized assets are NEVER added to total_asset_net
//   3. Shared assets (is_shared_with_holding | is_shared_with_other_bus) require allocation_rule
//   4. Last review > 180 days → GovernanceAlert severity "high"
//   5. status === "idle" > 60 days → GovernanceAlert severity "medium"

// ─── Domain enumerations ───────────────────────────────────────────────────────

/** Which BU owns/custodies this asset */
export type BuId = "jacqes" | "caza" | "advisor" | "venture";

/**
 * Top-level asset taxonomy — drives consolidation partitioning.
 * strategic_non_recognized NEVER enters total_asset_net.
 */
export type AssetType =
  | "tangible"
  | "intangible_recognized"
  | "strategic_non_recognized";

/** Tangible sub-classes */
export type TangibleClass =
  | "equipment_computing"
  | "equipment_production"
  | "equipment_audio_visual"
  | "equipment_mobile"
  | "furniture_fixtures"
  | "vehicle"
  | "infrastructure"
  | "other_tangible";

/** Intangible recognized sub-classes */
export type IntangibleRecognizedClass =
  | "software_license"
  | "client_portfolio"
  | "contract_rights"
  | "intellectual_property"
  | "trademark_domain"
  | "goodwill"
  | "other_intangible_recognized";

/** Strategic non-recognized sub-classes — governance layer only, not equity */
export type StrategicClass =
  | "brand_equity"
  | "talent_capital"
  | "network_value"
  | "creative_methodology"
  | "strategic_position"
  | "proprietary_model"
  | "other_strategic";

export type AssetClass =
  | TangibleClass
  | IntangibleRecognizedClass
  | StrategicClass;

/**
 * Recognition status — determines whether the asset enters equity consolidation.
 *   recognized            → included in total_asset_net
 *   under_validation      → not included; counted separately
 *   strategic_non_recognized → excluded from all equity sums; strategic layer only
 */
export type RecognitionType =
  | "recognized"
  | "under_validation"
  | "strategic_non_recognized";

/** Legal/economic ownership mode */
export type OwnershipType =
  | "owned"          // full ownership
  | "leased"         // operational lease (IFRS 16 if applicable)
  | "licensed"       // perpetual or subscription license
  | "contributed"    // contributed by shareholder / partner
  | "co_owned";      // shared ownership with defined split

/** Depreciation method for tangible assets */
export type DepreciationMethod =
  | "straight_line"
  | "declining_balance"
  | "units_of_production"
  | "not_applicable";   // intangibles or strategic

/** Amortization method for intangible recognized assets */
export type AmortizationMethod =
  | "straight_line"
  | "usage_based"
  | "not_applicable";   // tangibles or strategic

/** Operational status of the asset */
export type AssetStatus =
  | "active"
  | "idle"              // in possession but not in productive use
  | "under_maintenance"
  | "under_validation"  // physical or legal validation in progress
  | "disposed"          // sold, donated, written off
  | "retired";          // end-of-useful-life, kept for reference

/** Document completeness for this asset */
export type DocumentationStatus =
  | "complete"   // all purchase docs, contracts, deeds present
  | "partial"    // some documents missing
  | "missing";   // no documentation on file

/** Quality of supporting evidence for the valuation */
export type EvidenceLevel =
  | "high"    // NF, purchase invoice, third-party appraisal
  | "medium"  // internal estimation with partial docs
  | "low";    // estimation without documentary support

/** Trust level in the carrying value */
export type ValuationConfidence =
  | "confirmed"   // verified against purchase document + accounting record
  | "probable"    // reasonable estimation with medium evidence
  | "estimated"   // model-based; no external verification
  | "unverified"; // raw entry, not yet reviewed

// ─── Core asset record (BU subledger entry) ───────────────────────────────────

/**
 * AssetRecord — the atomic unit of the BU subledger.
 * Each BU maintains its own array of these.
 * The holding reads (never writes) these records via asset-query.ts.
 */
export interface AssetRecord {
  // ── Identity
  asset_id:           string;     // globally unique across holding
  holding_id:         "AWQ";      // always AWQ; enforces group membership
  bu_id:              BuId;       // owning BU — required for holding consolidation
  asset_name:         string;
  asset_type:         AssetType;
  asset_class:        AssetClass;
  asset_subclass:     string;     // free-text refinement (e.g. "MacBook Pro 14")

  // ── Recognition
  recognition_type:   RecognitionType;

  // ── Ownership & custody
  ownership_type:     OwnershipType;
  owner_entity:       string;     // e.g. "JACQES Agência Ltda" — required
  custodian_responsible: string;  // person responsible (name or role)

  // ── Dates
  acquisition_date:   string;     // YYYY-MM-DD
  activation_date:    string | null; // null = same as acquisition

  // ── Cost & value inputs
  acquisition_cost:   number;     // original purchase price (BRL)
  replacement_cost:   number | null; // estimated replacement cost; null = not assessed
  residual_value:     number;     // expected value at end of useful life (BRL)
  useful_life_months: number;     // total expected useful life in months (0 = perpetual)

  // ── Depreciation / amortization method
  depreciation_method:  DepreciationMethod;
  amortization_method:  AmortizationMethod;

  // ── Computed book values (period-end snapshot)
  monthly_depreciation:      number; // monthly charge (BRL)
  monthly_amortization:      number; // monthly charge (BRL)
  gross_book_value:          number; // acquisition_cost (before impairment)
  accumulated_depreciation:  number; // cumulative depreciation to snapshot date
  accumulated_amortization:  number; // cumulative amortization to snapshot date
  carrying_value:            number; // COMPUTED: gross - accum_depr - accum_amort - impairment

  // ── Impairment
  impairment_flag:    boolean;
  impairment_amount:  number;     // 0 if no impairment

  // ── Status & location
  status:   AssetStatus;
  location: string;               // physical or logical location

  // ── Sharing & allocation
  is_shared_with_holding:    boolean;
  is_shared_with_other_bus:  boolean;
  funding_source:            string;  // e.g. "Capital próprio JACQES", "Aporte AWQ Q1 2026"
  /**
   * REQUIRED when is_shared_with_holding || is_shared_with_other_bus.
   * Must describe allocation key (e.g. "50% JACQES / 50% AWQ Holding").
   * null on non-shared assets.
   */
  allocation_rule: string | null;

  // ── Governance & evidence
  documentation_status: DocumentationStatus;
  evidence_level:       EvidenceLevel;
  valuation_confidence: ValuationConfidence;
  review_owner:         string;       // name or role responsible for next review
  last_review_date:     string;       // YYYY-MM-DD
  next_review_date:     string;       // YYYY-MM-DD

  // ── Notes
  notes: string;
}

// ─── Asset movements ──────────────────────────────────────────────────────────

export type MovementType =
  | "acquisition"   // CAPEX — new asset
  | "disposal"      // sale or write-off
  | "impairment"    // impairment charge
  | "revaluation"   // upward revaluation (IFRS only)
  | "transfer"      // inter-BU or BU-to-holding transfer
  | "depreciation_charge" // periodic charge (if tracked separately)
  | "maintenance_capitalized"; // capitalized maintenance CAPEX

export interface AssetMovement {
  movement_id:  string;
  asset_id:     string;
  bu_id:        BuId;
  movement_type: MovementType;
  movement_date: string;          // YYYY-MM-DD
  amount:        number;          // BRL — always positive; sign derived from movement_type
  description:   string;
  approved_by:   string;
  evidence_ref:  string | null;   // NF number, contract reference, etc.
}

// ─── Asset utilization record ─────────────────────────────────────────────────

export type UtilizationStatus =
  | "productive"    // generating direct revenue or operational output
  | "support"       // indirect support function
  | "idle"          // owned but not in use
  | "under_repair";

export interface AssetUtilization {
  record_id:          string;
  asset_id:           string;
  bu_id:              BuId;
  period:             string;             // "YYYY-MM" or "YYYY-QQ"
  utilization_status: UtilizationStatus;
  utilization_pct:    number;             // 0-1 — fraction of period in productive use
  idle_days:          number;             // calendar days idle this period
  notes:              string;
}

// ─── Asset links (relationships) ─────────────────────────────────────────────

export type AssetLinkType =
  | "parent_child"        // sub-component relationship
  | "replacement"         // this asset replaces another
  | "collateral"          // pledged as loan collateral
  | "revenue_driver"      // directly drives a revenue stream
  | "shared_with_holding" // formally shared with AWQ Holding
  | "shared_with_bu";     // formally shared with another BU

export interface AssetLink {
  link_id:    string;
  asset_id_a: string;
  asset_id_b: string;
  link_type:  AssetLinkType;
  notes:      string;
}

// ─── Valuation reviews ────────────────────────────────────────────────────────

export type ReviewOutcome =
  | "confirmed"         // carrying value confirmed as-is
  | "adjusted_up"       // upward revaluation
  | "adjusted_down"     // impairment or write-down
  | "method_changed"    // depreciation method changed
  | "reclassified"      // moved to different asset_type
  | "marked_for_disposal";

export interface AssetValuationReview {
  review_id:          string;
  asset_id:           string;
  bu_id:              BuId;
  review_date:        string;     // YYYY-MM-DD
  reviewer:           string;
  outcome:            ReviewOutcome;
  previous_carrying_value: number;
  new_carrying_value:      number;
  adjustment_amount:       number;  // positive = up, negative = down
  rationale:          string;
  next_review_date:   string;
}

// ─── BU subledger (full detail available to BU only) ─────────────────────────

export interface BuAssetSubledger {
  bu_id:          BuId;
  bu_name:        string;
  snapshot_date:  string; // ISO date when snapshot was frozen
  period:         string; // e.g. "2026-Q1"
  assets:         AssetRecord[];
  movements:      AssetMovement[];
  utilization:    AssetUtilization[];
  links:          AssetLink[];
  reviews:        AssetValuationReview[];
}

// ─── BU period snapshot (what the holding pulls from each BU) ────────────────
//
// This is the ONLY view the holding receives from a BU for consolidation.
// It contains aggregated metrics — NOT individual asset records.
// The holding cannot see or modify individual asset details.

export interface BuAssetSnapshot {
  bu_id:         BuId;
  bu_name:       string;
  period:        string;        // "2026-Q1"
  snapshot_date: string;        // YYYY-MM-DD

  // ── Tangible block
  tangible_gross_value:          number;
  tangible_accumulated_depr:     number;
  tangible_net_value:            number; // gross - accum_depr - impairment (tangible)

  // ── Intangible recognized block
  intangible_recognized_gross:              number;
  intangible_recognized_accumulated_amort:  number;
  intangible_recognized_net:               number; // gross - accum_amort - impairment (intangible)

  // ── Total recognized net (tangible + intangible_recognized)
  // strategic_non_recognized is EXCLUDED from this sum
  recognized_net_total: number;

  // ── Asset counts
  recognized_asset_count:       number;  // recognition_type === "recognized"
  under_validation_asset_count: number;  // recognition_type === "under_validation"
  strategic_asset_count:        number;  // recognition_type === "strategic_non_recognized"
  shared_asset_count:           number;  // is_shared_with_holding || is_shared_with_other_bus
  idle_asset_count:             number;  // status === "idle"

  // ── Period movements
  capex_month:      number;   // acquisitions this period
  disposals_month:  number;   // disposals this period
  impairment_month: number;   // impairment charges this period

  // ── Evidence & quality
  evidence_high_pct:         number; // 0-1 — share of assets with evidence_level "high"
  evidence_low_pct:          number; // 0-1 — share with "low"
  valuation_confidence_score: number; // 0-1 — weighted score across assets
  asset_utilization_score:   number; // 0-1 — weighted productive utilization

  // ── Productivity (requires financial data from BU)
  revenue_per_asset: number; // total_bu_revenue / recognized_asset_count
  ebitda_per_asset:  number; // total_bu_ebitda / recognized_asset_count

  // ── Risk
  critical_asset_risk_score: number; // 0-1 — composite: idle + overdue review + low evidence
}

// ─── Holding consolidated view ────────────────────────────────────────────────

export interface HoldingAssetConsolidated {
  period:             string;   // "2026-Q1"
  consolidation_date: string;   // ISO datetime of last consolidation run

  /** Per-BU snapshots (read-only, produced by each BU's subledger) */
  bu_snapshots: BuAssetSnapshot[];

  // ── Consolidated recognized patrimony (strategic_non_recognized excluded)
  total_tangible_net:              number;
  total_intangible_recognized_net: number;
  total_asset_net:                 number; // = tangible_net + intangible_recognized_net

  // ── Period movements consolidated
  total_capex_month:      number;
  total_impairment_month: number;

  // ── Consolidated counts
  total_idle_assets:              number;
  total_shared_assets:            number;
  total_under_validation_assets:  number;
  total_strategic_assets:         number; // non-recognized; for reference only

  // ── Group quality scores
  group_asset_utilization_score: number; // weighted avg across BUs
  group_revenue_per_asset:       number; // weighted sum
  group_ebitda_per_asset:        number;
  group_asset_risk_score:        number; // weighted avg
  group_evidence_score:          number; // weighted avg evidence_high_pct

  /** Governance alerts generated by asset-governance.ts */
  governance_alerts: GovernanceAlert[];
}

// ─── Governance alert ─────────────────────────────────────────────────────────

export type GovernanceAlertType =
  | "missing_metadata"         // required field blank (blocks holding consolidation)
  | "shared_without_allocation"// shared asset without allocation_rule
  | "overdue_review"           // last_review_date > 180 days ago
  | "idle_asset"               // status === "idle" for > 60 days
  | "low_evidence"             // evidence_level === "low" on recognized asset
  | "unverified_valuation"     // valuation_confidence === "unverified"
  | "under_validation_aged"    // under_validation for > 90 days
  | "impairment_pending";      // carrying_value < 0 without impairment_flag

export type GovernanceAlertSeverity = "critical" | "high" | "medium" | "low";

export interface GovernanceAlert {
  alert_id:    string;
  asset_id:    string;
  bu_id:       BuId;
  asset_name:  string;
  alert_type:  GovernanceAlertType;
  severity:    GovernanceAlertSeverity;
  message:     string;
  detected_at: string; // ISO datetime
  /** Whether this alert blocks the asset from appearing in holding consolidation */
  blocks_consolidation: boolean;
}

// ─── Governance validation result ─────────────────────────────────────────────

export interface AssetGovernanceResult {
  /** Assets cleared for holding consolidation */
  cleared_assets: AssetRecord[];
  /** Assets blocked from holding consolidation */
  blocked_assets: AssetRecord[];
  /** All alerts across the full subledger */
  all_alerts: GovernanceAlert[];
  /** Alerts that block consolidation specifically */
  blocking_alerts: GovernanceAlert[];
  /** Summary */
  total_assets:    number;
  cleared_count:   number;
  blocked_count:   number;
  alert_count:     number;
}
