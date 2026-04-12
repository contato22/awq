// ─── GET /api/security/audit — consulta audit log ─────────────────────────────
//
// Protegido: view em security — apenas owner/admin.
// Retorna eventos recentes + contagens agregadas.
// JAMAIS retorna senha, token, secret ou payload sensível.

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { getRecentAuditEvents, getAuditStats } from "@/lib/security-audit";
import { SECURITY_ENFORCEMENT_MODE } from "@/lib/security-access";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // RBAC guard: view em security — somente owner/admin
  const denied = await apiGuard(req, "view", "security", "Audit log de segurança");
  if (denied) return denied;

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);

  const [events, stats] = await Promise.all([
    getRecentAuditEvents(limit),
    getAuditStats(),
  ]);

  return NextResponse.json({
    enforcement_mode: SECURITY_ENFORCEMENT_MODE,
    stats,
    events,
    meta: {
      limit,
      returned: events.length,
      persistent: stats.persistent,
      note: stats.persistent
        ? "Eventos persistidos em awq_security_audit_log (Neon)"
        : "Fallback in-memory: máximo 100 eventos, reset no cold start",
    },
  });
}
