// ─── Live Shop — Resumo PÚBLICO por marca (whitelist) ─────────────────────────
//
// Alimenta a página pública /awq/live-shop/publico/[brand] (SEM login). REGRA DE
// OURO: só campos NÃO-sensíveis. NUNCA expor GMV, AOV, fees, take-rate, MC, ROIC,
// Net to AWQ, settlement ou qualquer número financeiro. A grade de conteúdo é
// operacional/editorial (horário/roteiro/resultado esperado), não financeira.

import { getLiveSessions } from "./db";
import { getBrand, BRAND_KIND_LABEL } from "./brands";
import { getContentGrid, type ContentBlock } from "./content";

export interface PublicBrand {
  id: string;
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

export interface PublicBrandPage {
  brand: PublicBrand;
  sessionCount: number;
  totalViews: number;
  peakCcv: number;
  events: PublicEvent[];
  contentGrid: ContentBlock[];
}

/** DTO público de UMA marca — apenas campos whitelisted (zero financeiro). */
export async function getPublicBrandPage(brandId: string): Promise<PublicBrandPage | null> {
  const brand = await getBrand(brandId);
  if (!brand) return null;

  const [sessions, contentGrid] = await Promise.all([getLiveSessions(), getContentGrid(brandId)]);
  // (quando ls_order/ls_live_session.brand_id estiver populado, filtrar por marca;
  //  no piloto todas as sessões são da marca-piloto)
  const events: PublicEvent[] = sessions
    .map((s) => ({
      id: s.id, startedAt: s.startedAt, durationMin: s.durationMin,
      views: s.views, peakCcv: s.peakCcv, avgWatchSec: s.avgWatchSec,
    }))
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));

  return {
    brand: { id: brand.id, name: brand.name, segment: brand.segment, kind: BRAND_KIND_LABEL[brand.kind] },
    sessionCount: sessions.length,
    totalViews: sessions.reduce((a, s) => a + s.views, 0),
    peakCcv: sessions.reduce((m, s) => Math.max(m, s.peakCcv), 0),
    events,
    contentGrid,
  };
}
