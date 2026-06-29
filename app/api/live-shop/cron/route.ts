// GET /api/live-shop/cron
//
// Vercel Cron (§11): (a) polling incremental de Orders, (b) Finance/Settlement
// diário, (c) token refresh proativo, (d) recompute de KPI/unit-econ snapshots,
// (e) reconciliação fee computado×real, (f) flip 15/07. Autenticado por
// CRON_SECRET (Vercel injeta Authorization: Bearer <CRON_SECRET>).
//
// Esta rota é o ESQUELETO orquestrador: as chamadas à TikTok API só rodam
// quando o app estiver provisionado por Miguel (TIKTOK_APP_KEY/SECRET +
// conexão OAuth). Sem credenciais, executa apenas o recompute local idempotente.

import { NextRequest, NextResponse } from "next/server";
import { isTikTokConfigured } from "@/lib/live-shop/tiktok-client";
import { LIVE_DB_AVAILABLE, getLiveSessions } from "@/lib/live-shop/db";
import { aggregateFunnel, unitEconKpis } from "@/lib/live-shop/kpis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
  }

  const steps: Record<string, unknown> = {};

  // (a/b/c) Sync TikTok — só com credenciais provisionadas (§14.2).
  steps.tiktokConfigured = isTikTokConfigured();
  if (!isTikTokConfigured()) {
    steps.sync = { skipped: true, reason: "app TikTok não provisionado (TIKTOK_APP_KEY/SECRET)" };
  } else {
    // TODO(provisionamento): polling Orders + Finance/Settlement + token refresh.
    // Implementação ativada quando a conexão OAuth (ls_tiktok_connection) existir.
    steps.sync = { skipped: true, reason: "conexão OAuth pendente (Miguel registra o app)" };
  }

  // (d) Recompute local (idempotente) — funciona offline com o seed.
  try {
    const sessions = await getLiveSessions();
    const f = aggregateFunnel(sessions);
    const ue = unitEconKpis(sessions);
    steps.recompute = {
      ok: true, sessions: sessions.length, gmv: ue.gmv, aov: ue.aov,
      ctrBps: f.ctrBps, ctorBps: f.ctorBps, persisted: LIVE_DB_AVAILABLE,
    };
  } catch (err) {
    steps.recompute = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json({ ok: true, executedAt: new Date().toISOString(), steps });
}
