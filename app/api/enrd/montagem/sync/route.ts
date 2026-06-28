// ─── /api/enrd/montagem/sync ─────────────────────────────────────────────────
// POST: lê o portal gestão.enerdy (installations + clientes) e grava o espelho
//       no banco da AWQ (enrd_montagem_*). Idempotente (upsert por id).
// GET : status — última sync + contagens atuais no espelho.
//
// Credenciais do portal: ENERDY_USER / ENERDY_PASS (Vercel env). Nunca no git.

import { NextRequest, NextResponse } from "next/server";
import { readEnerdyPortal, isEnerdyPortalConfigured } from "@/lib/enerdy-portal";
import {
  persistSnapshot,
  writeSyncLog,
  getInstallations,
  getMontagemClientes,
  getLastSync,
  buildMontagemKpis,
} from "@/lib/enrd-montagem-db";
import { getLiveMontagem } from "@/lib/enrd-montagem-live";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userEmail = req.headers.get("x-user-email") ?? null;

  if (!isEnerdyPortalConfigured()) {
    return NextResponse.json(
      { error: "Portal não configurado: defina ENERDY_USER e ENERDY_PASS nas env vars." },
      { status: 503 }
    );
  }

  try {
    const snapshot = await readEnerdyPortal();
    const result = await persistSnapshot(snapshot);
    await writeSyncLog({ ran_by: userEmail, ...result, ok: true });
    return NextResponse.json({
      ok: true,
      synced: result,
      read: { installations: snapshot.installations.length, clientes: snapshot.clientes.length },
      at: new Date().toISOString(),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    try {
      await writeSyncLog({ ran_by: userEmail, installations: 0, clientes: 0, ok: false, detail });
    } catch {
      /* log best-effort */
    }
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    // Tempo real: tenta o gestão ao vivo; cai para o espelho se não configurado.
    const live = await getLiveMontagem().catch(() => null);
    let installations: Awaited<ReturnType<typeof getInstallations>>;
    let clientes: Awaited<ReturnType<typeof getMontagemClientes>>;
    let lastSync: Awaited<ReturnType<typeof getLastSync>> = null;
    if (live) {
      installations = live.installations;
      clientes = live.clientes;
    } else {
      [installations, clientes, lastSync] = await Promise.all([
        getInstallations(),
        getMontagemClientes(),
        getLastSync(),
      ]);
    }
    const kpis = buildMontagemKpis(installations);
    return NextResponse.json({
      ok: true,
      configured: isEnerdyPortalConfigured(),
      live: Boolean(live),
      counts: { installations: installations.length, clientes: clientes.length },
      kpis: {
        total: kpis.total,
        concluido: kpis.concluido,
        emExecucao: kpis.emExecucao,
        atencao: kpis.atencao,
        placasTotais: kpis.placasTotais,
        geracaoEsperadaKwhAno: kpis.geracaoEsperadaKwhAno,
      },
      lastSync,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
