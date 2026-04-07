// ─── AWQ Asset Governance — Rule Engine ───────────────────────────────────────
//
// ARCHITECTURE RULE: This module ONLY evaluates governance rules against existing
// asset records. It never reads from or writes to any other BU's data. It never
// originates financial values. It only produces GovernanceAlert[] from AssetRecord[].
//
// GOVERNANCE INVARIANTS:
//   1. Missing metadata on required fields → blocks_consolidation = true
//   2. Shared asset without allocation_rule → blocks_consolidation = true
//   3. last_review_date > 180 days → severity "high" (alert, does not block)
//   4. status === "idle" → severity "medium"
//   5. evidence_level === "low" on recognized asset → severity "medium"
//   6. valuation_confidence === "unverified" → severity "medium"
//   7. carrying_value <= 0 && !impairment_flag → severity "high"

import type {
  AssetRecord,
  BuAssetSubledger,
  GovernanceAlert,
  GovernanceAlertType,
  GovernanceAlertSeverity,
  AssetGovernanceResult,
  RecognitionType,
} from "./asset-types";

// ─── Rule catalogue ───────────────────────────────────────────────────────────

export interface GovernanceRule {
  rule_id: string;
  name: string;
  description: string;
  severity: GovernanceAlertSeverity;
  blocks_consolidation: boolean;
  reference: string;
}

export const GOVERNANCE_RULES: GovernanceRule[] = [
  {
    rule_id: "GOV-001",
    name: "Metadados obrigatórios ausentes",
    description:
      "Nenhum ativo pode subir para a holding sem bu_id, owner_entity, " +
      "recognition_type, documentation_status e valuation_confidence preenchidos.",
    severity: "critical",
    blocks_consolidation: true,
    reference: "asset-types.ts AssetRecord — campos obrigatórios",
  },
  {
    rule_id: "GOV-002",
    name: "Ativo compartilhado sem regra de alocação",
    description:
      "Ativos marcados como is_shared_with_holding ou is_shared_with_other_bus " +
      "exigem allocation_rule definida. Sem ela o ativo não pode ser consolidado.",
    severity: "critical",
    blocks_consolidation: true,
    reference: "AssetRecord.allocation_rule",
  },
  {
    rule_id: "GOV-003",
    name: "Revisão patrimonial vencida (> 180 dias)",
    description:
      "Ativos sem revisão há mais de 180 dias entram em alerta. A holding " +
      "sinaliza risco mas não bloqueia a consolidação.",
    severity: "high",
    blocks_consolidation: false,
    reference: "AssetRecord.last_review_date",
  },
  {
    rule_id: "GOV-004",
    name: "Ativo ocioso (status = idle)",
    description:
      "Ativos com status idle entram em fila de decisão: reativação, " +
      "alienação ou impairment. A holding compara produtividade mas não edita o registro.",
    severity: "medium",
    blocks_consolidation: false,
    reference: "AssetRecord.status",
  },
  {
    rule_id: "GOV-005",
    name: "Evidência baixa em ativo reconhecido",
    description:
      "Ativos reconhecidos com evidence_level 'low' são sinalizados para " +
      "coleta de documentação de suporte.",
    severity: "medium",
    blocks_consolidation: false,
    reference: "AssetRecord.evidence_level",
  },
  {
    rule_id: "GOV-006",
    name: "Valuation não verificada",
    description:
      "Ativos com valuation_confidence 'unverified' exigem revisão antes " +
      "do próximo ciclo de reporte.",
    severity: "medium",
    blocks_consolidation: false,
    reference: "AssetRecord.valuation_confidence",
  },
  {
    rule_id: "GOV-007",
    name: "Impairment pendente (valor contábil não positivo)",
    description:
      "Ativo com carrying_value <= 0 sem impairment_flag ativo. " +
      "Indica depreciação total não formalizada.",
    severity: "high",
    blocks_consolidation: false,
    reference: "AssetRecord.impairment_flag + carrying_value",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAlertId(assetId: string, alertType: string): string {
  // Deterministic ID from asset + alert type (avoids random IDs in snapshot data)
  const key = `${assetId}:${alertType}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return "ALT" + hash.toString(16).padStart(8, "0");
}

const REQUIRED_FIELDS: (keyof AssetRecord)[] = [
  "bu_id",
  "owner_entity",
  "recognition_type",
  "documentation_status",
  "valuation_confidence",
];

const REVIEW_THRESHOLD_DAYS = 180;
const MS_PER_DAY = 86_400_000;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / MS_PER_DAY);
}

// ─── Per-asset validator ──────────────────────────────────────────────────────

export function validateAssetForHolding(asset: AssetRecord): GovernanceAlert[] {
  const alerts: GovernanceAlert[] = [];
  const now = new Date().toISOString();

  function push(
    alertType: GovernanceAlertType,
    severity: GovernanceAlertSeverity,
    message: string,
    blocks: boolean
  ) {
    alerts.push({
      alert_id:             makeAlertId(asset.asset_id, alertType),
      asset_id:             asset.asset_id,
      bu_id:                asset.bu_id,
      asset_name:           asset.asset_name,
      alert_type:           alertType,
      severity,
      message,
      detected_at:          now,
      blocks_consolidation: blocks,
    });
  }

  // GOV-001 — required metadata
  const missingFields = REQUIRED_FIELDS.filter((f) => {
    const val = asset[f];
    return val === null || val === undefined || val === "";
  });
  if (missingFields.length > 0) {
    push(
      "missing_metadata",
      "critical",
      `Campo(s) obrigatório(s) ausente(s): ${missingFields.join(", ")}. ` +
        "Ativo bloqueado da consolidação holding.",
      true
    );
  }

  // GOV-002 — shared without allocation rule
  if (
    (asset.is_shared_with_holding || asset.is_shared_with_other_bus) &&
    !asset.allocation_rule
  ) {
    push(
      "shared_without_allocation",
      "critical",
      "Ativo compartilhado sem allocation_rule definida. " +
        "Bloqueado da consolidação até que regra seja formalizada.",
      true
    );
  }

  // GOV-003 — overdue review
  if (asset.last_review_date && daysSince(asset.last_review_date) > REVIEW_THRESHOLD_DAYS) {
    push(
      "overdue_review",
      "high",
      `Última revisão há ${daysSince(asset.last_review_date)} dias ` +
        `(limite: ${REVIEW_THRESHOLD_DAYS}). Responsável: ${asset.review_owner}.`,
      false
    );
  }

  // GOV-004 — idle asset
  if (asset.status === "idle") {
    push(
      "idle_asset",
      "medium",
      `Ativo ocioso (status: idle). Decisão pendente: reativação, alienação ou impairment.`,
      false
    );
  }

  // GOV-005 — low evidence on recognized asset
  if (
    asset.recognition_type === "recognized" &&
    asset.evidence_level === "low"
  ) {
    push(
      "low_evidence",
      "medium",
      "Ativo reconhecido com nível de evidência baixo. " +
        "Documentação de suporte (NF, contrato) deve ser providenciada.",
      false
    );
  }

  // GOV-006 — unverified valuation
  if (asset.valuation_confidence === "unverified") {
    push(
      "unverified_valuation",
      "medium",
      "Valuation não verificada. Revisão obrigatória antes do próximo ciclo de reporte.",
      false
    );
  }

  // GOV-007 — impairment pending
  if (asset.carrying_value <= 0 && !asset.impairment_flag) {
    push(
      "impairment_pending",
      "high",
      `Carrying value não positivo (${asset.carrying_value.toFixed(2)}) sem impairment formalizado.`,
      false
    );
  }

  return alerts;
}

// ─── Subledger-level validator ────────────────────────────────────────────────

export function validateBuSubledger(
  subledger: BuAssetSubledger
): AssetGovernanceResult {
  const allAlerts: GovernanceAlert[] = [];

  for (const asset of subledger.assets) {
    const assetAlerts = validateAssetForHolding(asset);
    allAlerts.push(...assetAlerts);
  }

  const blockingAlerts = allAlerts.filter((a) => a.blocks_consolidation);
  const blockedAssetIds = new Set(blockingAlerts.map((a) => a.asset_id));

  const clearedAssets = subledger.assets.filter(
    (a) => !blockedAssetIds.has(a.asset_id)
  );
  const blockedAssets = subledger.assets.filter((a) =>
    blockedAssetIds.has(a.asset_id)
  );

  return {
    cleared_assets:   clearedAssets,
    blocked_assets:   blockedAssets,
    all_alerts:       allAlerts,
    blocking_alerts:  blockingAlerts,
    total_assets:     subledger.assets.length,
    cleared_count:    clearedAssets.length,
    blocked_count:    blockedAssets.length,
    alert_count:      allAlerts.length,
  };
}

// ─── Helper exports ───────────────────────────────────────────────────────────

export function getBlockingAlerts(alerts: GovernanceAlert[]): GovernanceAlert[] {
  return alerts.filter((a) => a.blocks_consolidation);
}
