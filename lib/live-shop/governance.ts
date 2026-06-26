// ─── Live Shop — Governança, gates e kill (Hatab) — §9 ────────────────────────
// A BU nasce em `pilot`. Modelagem de equity/cap-table/vesting fica TRAVADA
// enquanto stage != 'validated'. Construir bem ≠ ter validado.

import type { BUStage } from "./types";

/** Erro de domínio explícito para tentativa bloqueada pelo gate de estágio. */
export class StageGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StageGateError";
  }
}

// Entidades cuja modelagem exige stage 'validated' (§9.1).
const EQUITY_ENTITIES = new Set(["cap_table", "equity", "vesting", "share_class", "option_grant"]);

/**
 * Guard de criação de entidade de equity. Lança StageGateError se a BU ainda
 * não está validada. Chamar ANTES de qualquer create de cap-table/vesting.
 */
export function assertEquityModelingAllowed(stage: BUStage, entity: string): void {
  if (EQUITY_ENTITIES.has(entity) && stage !== "validated" && stage !== "formalized") {
    throw new StageGateError(
      `Modelagem de '${entity}' bloqueada: a BU Live Shop está em stage='${stage}'. ` +
      `O gate exige stage='validated' (≥30 peças de produto próprio + MC%≥35% em ≥4 sessões + ` +
      `CTOR≥3% + cliente #2 em 90d). Construir bem ≠ ter validado (§9).`,
    );
  }
}

// ── Gate pilot → validated (falsificável; TODOS obrigatórios §9.2) ────────────
export interface GateInputs {
  ownProductUnitsSold: number; // peças de produto próprio vendidas em live
  mcPctBpsBySession: number[]; // MC% (bps) das sessões, em ordem cronológica
  ctorBps: number; // CTOR atual
  client2Signed: boolean;
  daysSinceFirstLive: number;
}

export interface GateCriterion {
  key: string;
  label: string;
  pass: boolean;
  detail: string;
}

export interface GateEvaluation {
  criteria: GateCriterion[];
  passed: boolean; // todos verdadeiros
}

const MC_THRESHOLD_BPS = 3500; // 35%
const CTOR_THRESHOLD_BPS = 300; // 3,0%
const OWN_PRODUCT_TARGET = 30;
const CONSECUTIVE_SESSIONS = 4;
const CLIENT2_WINDOW_DAYS = 90;

/** Maior sequência consecutiva com MC% ≥ threshold. */
function maxConsecutiveMcOk(bps: number[]): number {
  let best = 0, run = 0;
  for (const v of bps) {
    if (v >= MC_THRESHOLD_BPS) { run++; best = Math.max(best, run); }
    else run = 0;
  }
  return best;
}

export function evaluateGate(g: GateInputs): GateEvaluation {
  const consecutive = maxConsecutiveMcOk(g.mcPctBpsBySession);
  const criteria: GateCriterion[] = [
    {
      key: "own_product",
      label: "≥ 30 peças de produto próprio vendidas em live",
      pass: g.ownProductUnitsSold >= OWN_PRODUCT_TARGET,
      detail: `${g.ownProductUnitsSold}/${OWN_PRODUCT_TARGET}`,
    },
    {
      key: "mc_sustained",
      label: "MC% ≥ 35% em ≥ 4 sessões consecutivas",
      pass: consecutive >= CONSECUTIVE_SESSIONS,
      detail: `${consecutive}/${CONSECUTIVE_SESSIONS} sessões consecutivas`,
    },
    {
      key: "ctor",
      label: "CTOR ≥ 3,0% (frete/checkout resolvido)",
      pass: g.ctorBps >= CTOR_THRESHOLD_BPS,
      detail: `${(g.ctorBps / 100).toFixed(2)}% / 3,00%`,
    },
    {
      key: "client2",
      label: "Cliente #2 assinado em ≤ 90 dias da 1ª live",
      pass: g.client2Signed && g.daysSinceFirstLive <= CLIENT2_WINDOW_DAYS,
      detail: g.client2Signed
        ? `assinado (dia ${g.daysSinceFirstLive})`
        : `não assinado (dia ${g.daysSinceFirstLive}/${CLIENT2_WINDOW_DAYS})`,
    },
  ];
  return { criteria, passed: criteria.every((c) => c.pass) };
}

// ── Kill criteria (§9.3) ──────────────────────────────────────────────────────
export interface KillInputs {
  client2Signed: boolean;
  daysSinceFirstLive: number;
  postFlipMcBps: number | null; // MC% pós-15/07 com produto próprio (null = sem dado)
  inventoryTurnoverViable: boolean; // giro de estoque viabiliza capital empatado?
}

export interface KillReason { key: string; reason: string; }

export function evaluateKill(k: KillInputs): KillReason[] {
  const reasons: KillReason[] = [];
  if (!k.client2Signed && k.daysSinceFirstLive > CLIENT2_WINDOW_DAYS) {
    reasons.push({ key: "no_client2", reason: "Sem cliente #2 em 90 dias → 'hobby caro', arquivar." });
  }
  if (k.postFlipMcBps !== null && k.postFlipMcBps < MC_THRESHOLD_BPS) {
    reasons.push({ key: "mc_post_flip", reason: "MC% pós-15/07 não recupera ≥35% mesmo com produto próprio." });
  }
  if (!k.inventoryTurnoverViable) {
    reasons.push({ key: "inventory", reason: "Giro de estoque inviabiliza capital empatado." });
  }
  return reasons;
}
