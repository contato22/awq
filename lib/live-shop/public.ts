// ─── Live Shop — Resumo PÚBLICO (whitelist) ───────────────────────────────────
//
// Alimenta a página pública /awq/live-shop/publico (SEM login). REGRA DE OURO:
// esta camada só devolve campos explicitamente NÃO-sensíveis. NUNCA expor GMV,
// AOV, fees, take-rate, MC, ROIC, Net to AWQ, settlement ou qualquer número
// financeiro interno. Se um campo novo for sensível, ele NÃO entra aqui.
//
// Server-side. Lê via getLiveSessions()/getBrands() e projeta um DTO mínimo.

import { getLiveSessions } from "./db";
import { getBrands } from "./brands";
import { BRAND_KIND_LABEL } from "./brands";

export interface PublicBrand {
  name: string;
  segment: string;
  kind: string; // rótulo (Fabricante/…)
}

// Evento = uma live. Campos NÃO-financeiros (data, duração, alcance, engajamento).
export interface PublicEvent {
  id: string;
  startedAt: string;
  durationMin: number;
  views: number;
  peakCcv: number;
  avgWatchSec: number;
}

export interface PublicLiveShopSummary {
  sessionCount: number; // nº de lives realizadas (vanity, não-sensível)
  totalViews: number; // alcance agregado (vanity)
  peakCcv: number; // pico de espectadores simultâneos
  brands: PublicBrand[]; // marcas em destaque (nome/segmento — público)
  events: PublicEvent[]; // grade de eventos (lives), mais recentes primeiro
}

/** DTO público — apenas campos whitelisted. Nunca inclui dado financeiro. */
export async function getPublicSummary(): Promise<PublicLiveShopSummary> {
  const [sessions, brands] = await Promise.all([getLiveSessions(), getBrands()]);
  const events: PublicEvent[] = sessions
    .map((s) => ({
      id: s.id, startedAt: s.startedAt, durationMin: s.durationMin,
      views: s.views, peakCcv: s.peakCcv, avgWatchSec: s.avgWatchSec,
    }))
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  return {
    sessionCount: sessions.length,
    totalViews: sessions.reduce((a, s) => a + s.views, 0),
    peakCcv: sessions.reduce((m, s) => Math.max(m, s.peakCcv), 0),
    brands: brands
      .filter((b) => b.status === "piloto" || b.status === "ativo")
      .map((b) => ({ name: b.name, segment: b.segment, kind: BRAND_KIND_LABEL[b.kind] })),
    events,
  };
}
