// ─── AWQ Security v1 — Matriz de Acesso (RBAC) ───────────────────────────────
//
// ESTADO: ENFORCEMENT_ACTIVE = false (permissive by design — MVP)
//
// Esta matriz DEFINE o que deveria ser a política de acesso.
// O enforcement está desligado para não quebrar fluxos existentes.
// Para ativar: mudar ENFORCEMENT_ACTIVE para true e integrar ao middleware.
//
// ROLES reaproveitados de lib/auth-users.ts:
//   owner   → dono/fundador — acesso irrestrito
//   admin   → gestor — acesso pleno exceto manage_security
//   analyst → analista financeiro — leitura e exportação
//   cs-ops  → customer success — operação CRM JACQES

import type { SecurityRole, SecurityLayer, SecurityAction } from "./security-types";

// ── Flag global de enforcement ────────────────────────────────────────────────
//
// false = permissive mode (v1 — guard loga mas nunca bloqueia)
// true  = enforcement ativo (v2 — guard bloqueia roles sem permissão)
//
// MUDANÇA DE ESTADO:
//   Não mudar sem:
//   1. Validar que todos os usuários existentes têm as permissões corretas
//   2. Testar UI em todos os roles
//   3. Documentar em security-audit o evento de ativação
export const ENFORCEMENT_ACTIVE = false;

// ── Matriz de permissões ──────────────────────────────────────────────────────
//
// Estrutura: role → layer → actions[]
// Uma action não presente = acesso negado (quando enforcement ativo)
export const PERMISSION_MATRIX: Record<SecurityRole, Partial<Record<SecurityLayer, SecurityAction[]>>> = {

  // owner: acesso total a todas as camadas e ações
  owner: {
    holding:     ["view","create","update","delete","export","import","approve","manage_security"],
    jacqes:      ["view","create","update","delete","export","import","approve","manage_security"],
    caza_vision: ["view","create","update","delete","export","import","approve","manage_security"],
    awq_venture: ["view","create","update","delete","export","import","approve","manage_security"],
    advisor:     ["view","create","update","delete","export","import","approve","manage_security"],
    financeiro:  ["view","create","update","delete","export","import","approve","manage_security"],
    juridico:    ["view","create","update","delete","export","import","approve","manage_security"],
    dados_infra: ["view","create","update","delete","export","import","approve","manage_security"],
    security:    ["view","create","update","delete","export","import","approve","manage_security"],
    system:      ["view","create","update","delete","export","import","approve","manage_security"],
    ai:          ["view","create","update","delete","export","import","approve","manage_security"],
  },

  // admin: gestão plena das BUs e dados, sem manage_security
  admin: {
    holding:     ["view","create","update","export","approve"],
    jacqes:      ["view","create","update","delete","export","import","approve"],
    caza_vision: ["view","create","update","delete","export","import","approve"],
    awq_venture: ["view","create","update","delete","export","import","approve"],
    advisor:     ["view","create","update","export","approve"],
    financeiro:  ["view","create","update","export","approve"],
    juridico:    ["view"],
    dados_infra: ["view","create","update","import","export"],
    security:    ["view"],
    system:      ["view"],
    ai:          ["view","create"],
  },

  // analyst: leitura e exportação de dados financeiros e BUs — sem escrita
  analyst: {
    holding:     ["view","export"],
    jacqes:      ["view","export"],
    caza_vision: ["view","export"],
    awq_venture: ["view","export"],
    advisor:     ["view"],
    financeiro:  ["view","export"],
    juridico:    [],
    dados_infra: ["view"],
    security:    [],
    system:      [],
    ai:          ["view"],
  },

  // cs-ops: operação de CRM JACQES — sem acesso a dados financeiros ou segurança
  "cs-ops": {
    holding:     [],
    jacqes:      ["view","create","update"],
    caza_vision: [],
    awq_venture: [],
    advisor:     [],
    financeiro:  [],
    juridico:    [],
    dados_infra: [],
    security:    [],
    system:      [],
    ai:          [],
  },
};

// ── Função de verificação de acesso ──────────────────────────────────────────

/**
 * Verifica se um role tem permissão para uma ação em uma camada.
 * Retorna false para roles ou camadas não registrados.
 */
export function hasPermission(
  role: SecurityRole,
  layer: SecurityLayer,
  action: SecurityAction
): boolean {
  const layerPerms = PERMISSION_MATRIX[role]?.[layer];
  if (!layerPerms || layerPerms.length === 0) return false;
  return layerPerms.includes(action);
}

/**
 * Retorna todas as ações permitidas para um role em uma camada.
 */
export function getAllowedActions(
  role: SecurityRole,
  layer: SecurityLayer
): SecurityAction[] {
  return PERMISSION_MATRIX[role]?.[layer] ?? [];
}
