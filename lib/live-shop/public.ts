// ─── Live Shop — Resumo PÚBLICO por marca (whitelist) ─────────────────────────
//
// Alimenta a página pública /awq/live-shop/publico/[brand] (SEM login). REGRA DE
// OURO: só campos NÃO-sensíveis. NUNCA expor GMV, AOV, fees, take-rate, MC, ROIC,
// Net to AWQ, settlement ou qualquer número financeiro. A grade de conteúdo é
// operacional/editorial (horário/roteiro/resultado esperado), não financeira.

import { getLiveSessions } from "./db";
import { getBrand, BRAND_KIND_LABEL } from "./brands";
import { getAgenda, type LivePlan } from "./agenda";

// Estruturalmente igual a CalendarEntry de components/LiveShopCalendar (evita
// acoplar a camada de dados ao componente de UI).
export interface CalendarEntry {
  id: string;
  startsAt: string;
  status: string;
}

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
  events: PublicEvent[]; // lives realizadas (audiência)
  agenda: LivePlan[]; // lives planejadas (peças/responsáveis/roteiro/metas/comissões)
  calendar: CalendarEntry[]; // realizadas + planejadas, para o calendário
}

/** DTO público de UMA marca — apenas campos whitelisted (zero financeiro). */
export async function getPublicBrandPage(brandId: string): Promise<PublicBrandPage | null> {
  const brand = await getBrand(brandId);
  if (!brand) return null;

  const [sessions, agenda] = await Promise.all([getLiveSessions(), getAgenda(brandId)]);
  // (quando ls_live_session.brand_id estiver populado, filtrar por marca;
  //  no piloto todas as sessões são da marca-piloto)
  const events: PublicEvent[] = sessions
    .map((s) => ({
      id: s.id, startedAt: s.startedAt, durationMin: s.durationMin,
      views: s.views, peakCcv: s.peakCcv, avgWatchSec: s.avgWatchSec,
    }))
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));

  const calendar: CalendarEntry[] = [
    ...events.map((e) => ({ id: e.id, startsAt: e.startedAt, status: "realizada" })),
    ...agenda.map((p) => ({ id: p.id, startsAt: p.startsAt, status: p.status })),
  ];

  return {
    brand: { id: brand.id, name: brand.name, segment: brand.segment, kind: BRAND_KIND_LABEL[brand.kind] },
    sessionCount: sessions.length,
    totalViews: sessions.reduce((a, s) => a + s.views, 0),
    peakCcv: sessions.reduce((m, s) => Math.max(m, s.peakCcv), 0),
    events,
    agenda,
    calendar,
  };
}
