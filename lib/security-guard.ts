// ─── AWQ Security v1 — Guard ──────────────────────────────────────────────────
//
// Ponto central de verificação de acesso.
// Combina RBAC (hasPermission) com auditoria (logAuditEvent) numa única chamada.
//
// ENFORCEMENT_ACTIVE = false → sempre retorna "allowed", mas loga o que
// TERIA acontecido se enforcement estivesse ativo (permissive by design — MVP).
//
// ENFORCEMENT_ACTIVE = true  → bloqueia roles sem permissão e loga o bloqueio (v2).
//
// USO:
//   import { guard } from "@/lib/security-guard";
//   const { result } = guard(email, role, path, "financeiro", "view", "DRE consolidado");
//   if (result === "blocked") return redirect("/login");  // só quando ENFORCEMENT_ACTIVE=true

import { ENFORCEMENT_ACTIVE, hasPermission } from "./security-access";
import { logAuditEvent }                      from "./security-audit";
import type { SecurityRole, SecurityLayer, SecurityAction, AuditResult } from "./security-types";

export interface GuardResult {
  /** Se o acesso foi (ou teria sido) permitido ou bloqueado */
  result: AuditResult;
  /** Motivo legível — sem dados sensíveis */
  reason: string;
  /** true quando ENFORCEMENT_ACTIVE=false e o acesso teria sido bloqueado */
  wouldBeBlocked: boolean;
}

// ── Conjunto de roles conhecidos (derivado de security-types.ts) ──────────────
const KNOWN_ROLES = new Set<SecurityRole>(["owner", "admin", "analyst", "cs-ops"]);

function isKnownRole(role: string): role is SecurityRole {
  return KNOWN_ROLES.has(role as SecurityRole);
}

/**
 * Verifica acesso e registra evento de auditoria.
 *
 * Em v1 (ENFORCEMENT_ACTIVE=false): sempre retorna "allowed", mas loga
 * o que o enforcement retornaria se ativado. Inspecionar wouldBeBlocked
 * para antecipar bloqueios antes da ativação.
 *
 * Em v2 (ENFORCEMENT_ACTIVE=true): bloqueia e loga.
 *
 * IMPORTANTE: Não passar senha, token, secret ou qualquer dado sensível
 * nos parâmetros. user_id deve ser email ou "anonymous".
 *
 * @param user_id   email do usuário ou "anonymous" — JAMAIS senha/token
 * @param role      role do usuário ou "unknown"
 * @param path      rota ou API path acessado
 * @param layer     camada de segurança do recurso
 * @param action    ação tentada
 * @param resource  descrição legível do recurso
 */
export function guard(
  user_id: string,
  role: string,
  path: string,
  layer: SecurityLayer,
  action: SecurityAction,
  resource: string
): GuardResult {
  // Determina se o role tem permissão conforme a matriz
  const knownRole  = isKnownRole(role);
  const permitted  = knownRole ? hasPermission(role, layer, action) : false;

  const effectiveResult: AuditResult = permitted ? "allowed" : "blocked";
  const effectiveReason = permitted
    ? `Role '${role}' tem permissão para '${action}' em '${layer}'`
    : knownRole
      ? `Role '${role}' não tem permissão para '${action}' em '${layer}'`
      : `Role '${role}' não reconhecido na matriz de acesso`;

  if (ENFORCEMENT_ACTIVE) {
    // ── Enforcement real ──────────────────────────────────────────────────────
    logAuditEvent(user_id, role, path, action, resource, effectiveResult, effectiveReason);
    return {
      result:        effectiveResult,
      reason:        effectiveReason,
      wouldBeBlocked: false,
    };
  } else {
    // ── Permissive mode (v1) ──────────────────────────────────────────────────
    // Sempre permite, mas loga o que teria acontecido para preparar o v2.
    const wouldBeBlocked = effectiveResult === "blocked";
    const permissiveReason = wouldBeBlocked
      ? `[PERMISSIVE] TERIA bloqueado: ${effectiveReason}`
      : `[PERMISSIVE] Permitido: ${effectiveReason}`;

    logAuditEvent(user_id, role, path, action, resource, "allowed", permissiveReason);

    return {
      result:        "allowed",
      reason:        permissiveReason,
      wouldBeBlocked,
    };
  }
}
