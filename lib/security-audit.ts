// ─── AWQ Security v1 — Audit Log ─────────────────────────────────────────────
//
// ESCOPO: Ring buffer in-memory para eventos de auditoria.
//
// LIMITES (honestos):
//   - Sem persistência em disco ou banco de dados em v1
//   - Static export (GitHub Pages): sem servidor, zero eventos capturados
//   - SSR (Vercel): eventos acumulam por instância de servidor — reset no cold start
//   - Máximo de 100 eventos retidos (eventos mais antigos são descartados)
//
// REGRAS DE SEGURANÇA (não negociáveis):
//   - JAMAIS registrar senha, token, secret, cookie ou payload sensível
//   - user_id = email do usuário ou "anonymous" — NUNCA credential
//   - reason = texto legível sem dados sensíveis
//
// PRÓXIMAS VERSÕES:
//   v2 → persistir em tabela Neon (awq_security_audit_log)
//   v3 → exportar para SIEM externo

import type { AuditEvent, SecurityAction, AuditResult } from "./security-types";

const MAX_EVENTS = 100;

// Ring buffer — global por instância de servidor
const _auditLog: AuditEvent[] = [];

// Gerador de ID simples — não usa crypto para compatibilidade com Edge Runtime
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Registra um evento de auditoria no ring buffer in-memory.
 *
 * IMPORTANTE: Não passar senha, token, secret ou qualquer dado sensível
 * nos parâmetros. O user_id deve ser email ou "anonymous".
 */
export function logAuditEvent(
  user_id: string,       // email ou "anonymous" — NUNCA senha/token
  role: string,          // nome do role ou "unknown"
  path: string,          // rota ou API path
  action: SecurityAction,
  resource: string,      // descrição legível do recurso
  result: AuditResult,
  reason: string         // motivo legível — sem dados sensíveis
): AuditEvent {
  const event: AuditEvent = {
    id:        generateEventId(),
    timestamp: new Date().toISOString(),
    user_id:   user_id || "anonymous",
    role:      role    || "unknown",
    path,
    action,
    resource,
    result,
    reason,
  };

  _auditLog.push(event);

  // Ring buffer: descarta evento mais antigo quando excede MAX_EVENTS
  if (_auditLog.length > MAX_EVENTS) {
    _auditLog.shift();
  }

  return event;
}

/**
 * Retorna os eventos mais recentes do audit log.
 * @param limit número máximo de eventos (padrão: 20, max: 100)
 */
export function getRecentAuditEvents(limit = 20): AuditEvent[] {
  const n = Math.min(limit, MAX_EVENTS);
  return [..._auditLog].reverse().slice(0, n);
}

/**
 * Retorna contagens agregadas do audit log atual.
 */
export function getAuditStats(): {
  total: number;
  allowed: number;
  blocked: number;
  byRole: Record<string, number>;
  byLayer: Record<string, number>;
} {
  const byRole: Record<string, number>  = {};
  const byLayer: Record<string, number> = {};

  for (const e of _auditLog) {
    byRole[e.role] = (byRole[e.role] || 0) + 1;
  }

  return {
    total:   _auditLog.length,
    allowed: _auditLog.filter((e) => e.result === "allowed").length,
    blocked: _auditLog.filter((e) => e.result === "blocked").length,
    byRole,
    byLayer,
  };
}

/**
 * Limpa o audit log (uso restrito: apenas para testes).
 * NÃO usar em produção.
 */
export function _clearAuditLog_TESTING_ONLY(): void {
  _auditLog.length = 0;
}
