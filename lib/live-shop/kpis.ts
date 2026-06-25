// ─── Live Shop — KPIs (definições exatas §7) ──────────────────────────────────
// Funil por sessão, unit economics e ROIC vs hurdle. Tudo derivado dos agregados
// de sessão (Money centavos / Bps). Pure module.

import type { LiveSession } from "./types";
import { ratioBps, type Bps, type Money } from "./money";

// Hurdle (build-up Damodaran §7.3) e Selic — parâmetros de negócio (§2).
// Selic em bps inteiros: 14,25% = 1425. Hurdle ~25% = 2500.
export const SELIC_BPS: Bps = 1425;
export const HURDLE_BPS: Bps = 2500;
// AOV modelado (R$ 120–150). Baseline do gap usa o piso da faixa.
export const AOV_MODELED_LOW: Money = 12_000; // R$ 120,00 em centavos
export const AOV_MODELED_HIGH: Money = 15_000; // R$ 150,00

// ── 7.1 Funil ─────────────────────────────────────────────────────────────────
export interface FunnelKpis {
  views: number;
  clicks: number;
  orders: number;
  ctrBps: Bps; // clicks / views
  ctorBps: Bps; // orders / clicks
  conversionBps: Bps; // paid / views
  returnRateBps: Bps; // returned / paid
}

function rateBps(part: number, whole: number): Bps {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 10_000);
}

export function funnelKpis(s: {
  views: number; clicks: number; funnelOrders: number; paidOrders: number; returns: number;
}): FunnelKpis {
  return {
    views: s.views,
    clicks: s.clicks,
    orders: s.funnelOrders,
    ctrBps: rateBps(s.clicks, s.views),
    ctorBps: rateBps(s.funnelOrders, s.clicks),
    conversionBps: rateBps(s.paidOrders, s.views),
    returnRateBps: rateBps(s.returns, s.paidOrders),
  };
}

/** Funil agregado de várias sessões (Σ views/clicks/orders). */
export function aggregateFunnel(sessions: LiveSession[]): FunnelKpis {
  const acc = sessions.reduce(
    (a, s) => ({
      views: a.views + s.views,
      clicks: a.clicks + s.clicks,
      funnelOrders: a.funnelOrders + s.funnelOrders,
      paidOrders: a.paidOrders + s.paidOrders,
      returns: a.returns + s.returns,
    }),
    { views: 0, clicks: 0, funnelOrders: 0, paidOrders: 0, returns: 0 },
  );
  return funnelKpis(acc);
}

// ── 7.2 Unit economics ────────────────────────────────────────────────────────
export interface UnitEconKpis {
  gmv: Money;
  paidOrders: number;
  aov: Money; // GMV / pedidos pagos
  aovGapBps: Bps; // AOV realizado / AOV modelado
  itemsPerOrderMilli: number; // itens/pedido ×1000 (1,10 = 1100) — evita float
}

export function unitEconKpis(sessions: LiveSession[], aovModeled: Money = AOV_MODELED_LOW): UnitEconKpis {
  const gmv = sessions.reduce((a, s) => a + s.gmv, 0);
  const paidOrders = sessions.reduce((a, s) => a + s.paidOrders, 0);
  const items = sessions.reduce((a, s) => a + s.items, 0);
  const aov = paidOrders === 0 ? 0 : Math.round(gmv / paidOrders);
  return {
    gmv,
    paidOrders,
    aov,
    aovGapBps: ratioBps(aov, aovModeled),
    itemsPerOrderMilli: paidOrders === 0 ? 0 : Math.round((items / paidOrders) * 1000),
  };
}

/** Concentração dos N maiores GMV / GMV total (default top-2 → L1+L2). */
export function gmvConcentrationBps(sessions: LiveSession[], topN = 2): Bps {
  const total = sessions.reduce((a, s) => a + s.gmv, 0);
  if (total === 0) return 0;
  const top = [...sessions].sort((a, b) => b.gmv - a.gmv).slice(0, topN)
    .reduce((a, s) => a + s.gmv, 0);
  return ratioBps(top, total);
}

// ── 7.3 ROIC vs hurdle ────────────────────────────────────────────────────────
export interface RoicKpis {
  roicBps: Bps;
  hurdleBps: Bps;
  selicBps: Bps;
  riskPremiumBps: Bps; // ROIC − Selic
  hurdleGapBps: Bps; // ROIC − hurdle
  belowHurdle: boolean; // gap < 0 → vermelho
}

/**
 * ROIC é figura do business case (§2) — não se estima de 5 sessões. Recebe o
 * ROIC anualizado em bps e DERIVA prêmio de risco e gap vs hurdle.
 */
export function roicKpis(roicBps: Bps, hurdleBps: Bps = HURDLE_BPS, selicBps: Bps = SELIC_BPS): RoicKpis {
  return {
    roicBps,
    hurdleBps,
    selicBps,
    riskPremiumBps: roicBps - selicBps,
    hurdleGapBps: roicBps - hurdleBps,
    belowHurdle: roicBps - hurdleBps < 0,
  };
}
