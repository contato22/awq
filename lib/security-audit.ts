// ─── AWQ Security — Audit Log (v2: DB persistence + in-memory fallback) ──────
//
// PERSISTÊNCIA:
//   logAuditEvent()        → síncrono (in-memory) + fire-and-forget (DB)
//   getRecentAuditEvents() → async: lê DB quando disponível, fallback in-memory
//   getAuditStats()        → async: agrega do DB quando disponível
//
// FALLBACK: se DATABASE_URL ausente, tudo fica in-memory (100 eventos, reset no cold start).
//
// REGRAS (não negociáveis):
//   - JAMAIS registrar senha, token, secret, cookie ou payload sensível
//   - user_id = email ou "anonymous" — NUNCA credential
//   - reason = texto legível sem dados sensíveis

import { sql } from "./db";
import { SECURITY_ENFORCEMENT_MODE } from "./security-access";
import type { AuditEvent, SecurityAction, AuditResult } from "./security-types";

const MAX_EVENTS = 100;
const _auditLog: AuditEvent[] = [];
let _dbReady = false;

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Schema bootstrap (idempotente) ────────────────────────────────────────────

async function ensureAuditTable(): Promise<boolean> {
  if (!sql) return false;
  if (_dbReady) return true;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS awq_security_audit_log (
        id                TEXT PRIMARY KEY,
        timestamp         TEXT NOT NULL,
        user_id           TEXT NOT NULL,
        role              TEXT NOT NULL,
        path              TEXT NOT NULL,
        action            TEXT NOT NULL,
        resource          TEXT NOT NULL,
        result            TEXT NOT NULL,
        reason            TEXT NOT NULL,
        enforcement_mode  TEXT NOT NULL,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_log_ts ON awq_security_audit_log(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_log_result ON awq_security_audit_log(result)`;
    _dbReady = true;
    return true;
  } catch {
    return false;
  }
}

async function persistToDB(event: AuditEvent): Promise<void> {
  const ready = await ensureAuditTable();
  if (!ready) return;
  await sql!`
    INSERT INTO awq_security_audit_log
      (id, timestamp, user_id, role, path, action, resource, result, reason, enforcement_mode)
    VALUES
      (${event.id}, ${event.timestamp}, ${event.user_id}, ${event.role},
       ${event.path}, ${event.action}, ${event.resource}, ${event.result},
       ${event.reason}, ${SECURITY_ENFORCEMENT_MODE})
  `;
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Registra evento de auditoria.
 * Síncrono para in-memory; fire-and-forget para DB.
 * JAMAIS passar senha, token, secret ou payload nos parâmetros.
 */
export function logAuditEvent(
  user_id: string,
  role: string,
  path: string,
  action: SecurityAction,
  resource: string,
  result: AuditResult,
  reason: string
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
  if (_auditLog.length > MAX_EVENTS) _auditLog.shift();

  // DB fire-and-forget (não bloqueia guard flow)
  persistToDB(event).catch(() => { /* DB indisponível — in-memory é o único registro */ });

  return event;
}

/**
 * Retorna eventos recentes. DB primeiro; fallback in-memory.
 */
export async function getRecentAuditEvents(limit = 20): Promise<AuditEvent[]> {
  const n = Math.min(Math.max(limit, 1), 500);

  const dbReady = await ensureAuditTable();
  if (dbReady) {
    try {
      const rows = await sql!`
        SELECT id, timestamp, user_id, role, path, action, resource, result, reason
        FROM awq_security_audit_log ORDER BY timestamp DESC LIMIT ${n}
      `;
      if (rows.length > 0) {
        return rows.map((r: Record<string, unknown>) => ({
          id:        r.id as string,
          timestamp: r.timestamp as string,
          user_id:   r.user_id as string,
          role:      r.role as string,
          path:      r.path as string,
          action:    r.action as SecurityAction,
          resource:  r.resource as string,
          result:    r.result as AuditResult,
          reason:    r.reason as string,
        }));
      }
    } catch { /* fall through to in-memory */ }
  }

  return [..._auditLog].reverse().slice(0, n);
}

/**
 * Contagens agregadas. DB primeiro; fallback in-memory.
 */
export async function getAuditStats(): Promise<{
  total: number;
  allowed: number;
  blocked: number;
  persistent: boolean;
  byRole: Record<string, number>;
}> {
  const dbReady = await ensureAuditTable();
  if (dbReady) {
    try {
      const [c] = await sql!`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE result='allowed')::int AS allowed,
               COUNT(*) FILTER (WHERE result='blocked')::int AS blocked
        FROM awq_security_audit_log
      `;
      const roleRows = await sql!`
        SELECT role, COUNT(*)::int AS cnt FROM awq_security_audit_log GROUP BY role
      `;
      const byRole: Record<string, number> = {};
      for (const r of roleRows) byRole[r.role as string] = r.cnt as number;
      return {
        total: (c.total as number) || 0,
        allowed: (c.allowed as number) || 0,
        blocked: (c.blocked as number) || 0,
        persistent: true,
        byRole,
      };
    } catch { /* fall through */ }
  }

  const byRole: Record<string, number> = {};
  for (const e of _auditLog) byRole[e.role] = (byRole[e.role] || 0) + 1;
  return {
    total:   _auditLog.length,
    allowed: _auditLog.filter((e) => e.result === "allowed").length,
    blocked: _auditLog.filter((e) => e.result === "blocked").length,
    persistent: false,
    byRole,
  };
}

/**
 * Limpa in-memory (testes). NÃO limpa DB.
 */
export function _clearAuditLog_TESTING_ONLY(): void {
  _auditLog.length = 0;
}
