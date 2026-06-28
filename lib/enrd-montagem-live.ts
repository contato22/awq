// ─── ENRD · Montagem AO VIVO (lê o gestão direto, sem depender do espelho) ───
// Para "tempo real": loga no portal e busca installations/clientes/cleaning a
// cada render (force-dynamic). Não precisa das tabelas espelho (migração 006)
// — só das credenciais ENERDY_USER/ENERDY_PASS no ambiente.
//
// Cache curtíssimo (dedupe) para não relogar em recargas rápidas/concorrentes.
// O sync para o espelho (cron/botão) continua existindo como backup/histórico.

import { readEnerdyPortal, isEnerdyPortalConfigured } from "@/lib/enerdy-portal";
import {
  mapInstallation,
  mapCliente,
  mapCleaningReport,
  type MontagemInstallation,
  type MontagemCliente,
  type MontagemCleaningReport,
} from "@/lib/enrd-montagem-db";

export type LiveMontagem = {
  installations: MontagemInstallation[];
  clientes: MontagemCliente[];
  cleaningReports: MontagemCleaningReport[];
  fetchedAt: string;
};

const TTL_MS = 10_000; // dedupe de 10s — efetivamente "ao vivo"
let cache: { data: LiveMontagem; ts: number } | null = null;
let inflight: Promise<LiveMontagem> | null = null;

export function isLiveConfigured(): boolean {
  return isEnerdyPortalConfigured();
}

export function liveAgeSeconds(): number | null {
  return cache ? Math.round((Date.now() - cache.ts) / 1000) : null;
}

async function fetchLive(): Promise<LiveMontagem> {
  const snap = await readEnerdyPortal();
  return {
    installations: snap.installations.map(mapInstallation),
    clientes: snap.clientes.map(mapCliente),
    cleaningReports: (snap.cleaningReports ?? []).map(mapCleaningReport),
    fetchedAt: new Date().toISOString(),
  };
}

// Lê ao vivo do gestão. Retorna null se não configurado. Em falha de rede,
// devolve o último cache (se houver) em vez de quebrar.
export async function getLiveMontagem(opts?: { force?: boolean }): Promise<LiveMontagem | null> {
  if (!isEnerdyPortalConfigured()) return null;

  const force = opts?.force ?? false;
  if (!force && cache && Date.now() - cache.ts < TTL_MS) return cache.data;
  if (!force && inflight) return inflight;

  inflight = fetchLive()
    .then((data) => {
      cache = { data, ts: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  try {
    return await inflight;
  } catch (e) {
    if (cache) return cache.data; // degrada para o último snapshot
    throw e;
  }
}

// Próximas limpezas (agenda de reativação) a partir do snapshot ao vivo.
export function proximasLimpezas(snap: LiveMontagem): MontagemCleaningReport[] {
  return snap.cleaningReports
    .filter((r) => r.proxima_limpeza)
    .sort((a, b) => (a.proxima_limpeza! < b.proxima_limpeza! ? -1 : 1));
}
