// ─── AWQ Security — Guard (v1 → v2) ──────────────────────────────────────────
//
// Ponto central de verificação de acesso.
// Combina RBAC (hasPermission + normalizeRole) com auditoria (logAuditEvent).
//
// MODOS (SECURITY_ENFORCEMENT_MODE em security-access.ts):
//   audit_only  → sempre retorna "allowed"; loga o que TERIA acontecido
//   api_guarded → retorna resultado real (bloqueia APIs sem permissão) ← MODO ATUAL
//   full        → futuro — enforcement em API e UI
//
// IMPORTANTE: não passar senha, token, secret ou payload nos parâmetros.
// user_id deve ser email ou "anonymous".

import { SECURITY_ENFORCEMENT_MODE, hasPermission, normalizeRole } from "./security-access";
import { logAuditEvent } from "./security-audit";
import type { SecurityLayer, SecurityAction, AuditResult } from "./security-types";

export interface GuardResult {
  /** Resultado efetivo no modo atual */
  result: AuditResult;
  /** Motivo legível — sem dados sensíveis */
  reason: string;
  /** true quando audit_only e o acesso teria sido bloqueado */
  wouldBeBlocked: boolean;
}

/**
 * Verifica acesso e registra evento de auditoria.
 *
 * audit_only:  sempre retorna "allowed", loga o que teria acontecido.
 * api_guarded: retorna resultado real; bloqueia quando sem permissão.
 * full:        igual a api_guarded (futuro).
 *
 * @param user_id   email do usuário ou "anonymous" — JAMAIS senha/token
 * @param rawRole   role raw do JWT ou "anonymous"
 * @param path      rota ou API path acessado
 * @param layer     camada de segurança do recurso
 * @param action    ação tentada
 * @param resource  descrição legível do recurso
 */
export function guard(
  user_id: string,
  rawRole: string,
  path: string,
  layer: SecurityLayer,
  action: SecurityAction,
  resource: string
): GuardResult {
  // hasPermission normaliza o role internamente (analyst→finance, cs-ops→operator)
  const permitted  = hasPermission(rawRole, layer, action);
  const canonical  = normalizeRole(rawRole);

  const effectiveResult: AuditResult = permitted ? "allowed" : "blocked";
  const effectiveReason = permitted
    ? `Role '${rawRole}'${rawRole !== canonical ? ` (→${canonical})` : ""} tem permissão para '${action}' em '${layer}'`
    : `Role '${rawRole}'${rawRole !== canonical ? ` (→${canonical})` : ""} não tem permissão para '${action}' em '${layer}'`;

  if (SECURITY_ENFORCEMENT_MODE === "audit_only") {
    // Nunca bloqueia — loga o que TERIA acontecido
    const wouldBeBlocked = effectiveResult === "blocked";
    const reason = wouldBeBlocked
      ? `[AUDIT_ONLY] TERIA bloqueado: ${effectiveReason}`
      : `[AUDIT_ONLY] Permitido: ${effectiveReason}`;
    logAuditEvent(user_id, rawRole, path, action, resource, "allowed", reason);
    return { result: "allowed", reason, wouldBeBlocked };
  }

  // api_guarded e full: enforcement real
  logAuditEvent(user_id, rawRole, path, action, resource, effectiveResult, effectiveReason);
  return { result: effectiveResult, reason: effectiveReason, wouldBeBlocked: false };
}
