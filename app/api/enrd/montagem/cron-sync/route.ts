// GET /api/enrd/montagem/cron-sync
//
// Vercel Cron — sincroniza automaticamente o portal gestão.enerdy → banco AWQ
// (enrd_montagem_*). Agendado em vercel.json. Liberado no matcher do middleware.
//
// Autenticação:
//   Vercel injeta Authorization: Bearer <CRON_SECRET>. Configure CRON_SECRET
//   nas Vercel Environment Variables. Sem CRON_SECRET: bloqueado em produção, livre só em dev local.

import { requireCronSecret } from "@/lib/cron-auth";
import { NextRequest, NextResponse } from "next/server";
import { readEnerdyPortal, isEnerdyPortalConfigured } from "@/lib/enerdy-portal";
import { persistSnapshot, writeSyncLog } from "@/lib/enrd-montagem-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Auth: Vercel Cron envia Authorization: Bearer <CRON_SECRET>; falha fechada em produção.
  const denied = requireCronSecret(req);
  if (denied) return denied;

  if (!isEnerdyPortalConfigured()) {
    return NextResponse.json(
      { skipped: true, reason: "Portal não configurado (ENERDY_USER/ENERDY_PASS)." },
      { status: 200 }
    );
  }

  const now = new Date().toISOString();
  try {
    const snapshot = await readEnerdyPortal();
    const result = await persistSnapshot(snapshot);
    await writeSyncLog({ ran_by: "cron", ...result, ok: true });
    console.log(
      `[enrd-montagem cron] ${now} — ${result.installations} instalações, ${result.clientes} clientes`
    );
    return NextResponse.json({ ok: true, synced: result, executedAt: now });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[enrd-montagem cron] erro:", detail);
    try {
      await writeSyncLog({ ran_by: "cron", installations: 0, clientes: 0, ok: false, detail });
    } catch {
      /* best-effort */
    }
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }
}
