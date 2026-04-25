// ─── AWQ Security — Matriz de Acesso RBAC (v1 → v2) ─────────────────────────
//
// ESTADO: SECURITY_ENFORCEMENT_MODE = "api_guarded"
//   APIs sensíveis bloqueiam chamadas sem permissão.
//   UI (rotas de página) permanece permissiva via middleware (modo full = futuro).
//
// ROLES CANÔNICOS:
//   owner    → acesso irrestrito
//   admin    → gestão plena; pode usar supervisor (approve em system)
//   finance  → analista financeiro — view/export/import financeiro
//   operator → operações/CRM — sem acesso financeiro ou infra
//   viewer   → leitura mínima, sem financeiro ou infra
//
// ROLES LEGADOS (alias via normalizeRole — não quebra JWTs existentes):
//   analyst → normalizado para "finance"
//   cs-ops  → normalizado para "operator"
//
// PARA EVOLUIR O MODO:
//   api_guarded → full: somente após validar todos os roles via /awq/security
//   Documentar o evento de ativação no audit log antes de mudar.

import type { SecurityRole, SecurityLayer, SecurityAction, EnforcementMode } from "./security-types";

// ── Modo de enforcement ───────────────────────────────────────────────────────
//
// audit_only  → nunca bloqueia, apenas loga (era ENFORCEMENT_ACTIVE=false)
// api_guarded → bloqueia em APIs; UI continua permissiva (MODO ATUAL)
// full        → bloqueia API e UI via middleware (futuro)
export const SECURITY_ENFORCEMENT_MODE: EnforcementMode = "api_guarded";

// ── Mapeamento de roles legados → canônicos ───────────────────────────────────
const ROLE_ALIAS_MAP: Partial<Record<string, SecurityRole>> = {
  analyst:  "finance",   // Priya Nair — analista financeiro
  "cs-ops": "operator",  // Danilo — CS Ops
};

/**
 * Normaliza um role raw (JWT) para o role canônico v2.
 * Roles legados → canônicos. Roles desconhecidos → "viewer" (fallback seguro).
 */
export function normalizeRole(rawRole: string): SecurityRole {
  const alias = ROLE_ALIAS_MAP[rawRole];
  if (alias) return alias;
  const canonical: SecurityRole[] = ["owner", "admin", "finance", "operator", "viewer"];
  if (canonical.includes(rawRole as SecurityRole)) return rawRole as SecurityRole;
  return "viewer"; // fallback seguro para roles desconhecidos
}

// ── Matriz de permissões ──────────────────────────────────────────────────────
// Estrutura: role → layer → actions[]
// Ação ausente = acesso negado quando enforcement ativo.
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

  // admin: gestão plena; approve em system para acesso ao supervisor; sem manage_security
  admin: {
    holding:     ["view","create","update","export","approve"],
    jacqes:      ["view","create","update","delete","export","import","approve"],
    caza_vision: ["view","create","update","delete","export","import","approve"],
    awq_venture: ["view","create","update","delete","export","import","approve"],
    advisor:     ["view","create","update","export","approve"],
    financeiro:  ["view","create","update","export","import","approve"],
    juridico:    ["view"],
    dados_infra: ["view","create","update","import","export"],
    security:    ["view"],
    system:      ["view","approve"],  // approve = acesso ao supervisor
    ai:          ["view","create"],
  },

  // finance: analista financeiro — ex-analyst. Leitura, exportação, importação.
  finance: {
    holding:     ["view","export"],
    jacqes:      ["view","export"],
    caza_vision: ["view","export"],
    awq_venture: ["view","export"],
    advisor:     ["view"],
    financeiro:  ["view","export","import"],
    juridico:    [],
    dados_infra: ["view","import"],  // pode importar extratos financeiros
    security:    [],
    system:      [],
    ai:          ["view"],           // pode usar chat/agents para análise
  },

  // operator: operações/CRM — ex-cs-ops. Sem acesso financeiro, infra ou security.
  operator: {
    holding:     [],
    jacqes:      ["view","create","update"],
    caza_vision: ["view","create","update","delete"],
    awq_venture: [],
    advisor:     [],
    financeiro:  [],
    juridico:    [],
    dados_infra: [],
    security:    [],
    system:      [],
    ai:          ["view"],           // pode usar chat para ajuda no CRM
  },

  // viewer: leitura mínima — sem acesso a dados financeiros, infra ou security
  viewer: {
    holding:     ["view"],
    jacqes:      ["view"],
    caza_vision: ["view"],
    awq_venture: ["view"],
    advisor:     ["view"],
    financeiro:  [],
    juridico:    [],
    dados_infra: [],
    security:    [],
    system:      [],
    ai:          [],
  },

  // ── Aliases legados — entradas vazias por tipo; runtime normaliza antes da lookup
  analyst:  {}, // → normaliza para "finance" em normalizeRole()
  "cs-ops": {}, // → normaliza para "operator" em normalizeRole()
};

// ── Funções públicas ──────────────────────────────────────────────────────────

/**
 * Verifica se um role tem permissão para uma ação em uma camada.
 * Roles legados (analyst, cs-ops) são normalizados para canônicos antes da lookup.
 * Roles desconhecidos retornam false (bloqueado).
 */
export function hasPermission(
  role: SecurityRole | string,
  layer: SecurityLayer,
  action: SecurityAction
): boolean {
  // "anonymous" = sem JWT — bloqueado em qualquer API sensível
  if (role === "anonymous") return false;
  const canonical = normalizeRole(String(role));
  const layerPerms = PERMISSION_MATRIX[canonical]?.[layer];
  if (!layerPerms || layerPerms.length === 0) return false;
  return layerPerms.includes(action);
}

/**
 * Retorna todas as ações permitidas para um role em uma camada.
 * Roles legados são normalizados antes da lookup.
 */
export function getAllowedActions(
  role: SecurityRole | string,
  layer: SecurityLayer
): SecurityAction[] {
  const canonical = normalizeRole(String(role));
  return PERMISSION_MATRIX[canonical]?.[layer] ?? [];
}
