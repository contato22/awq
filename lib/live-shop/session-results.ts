// ─── Live Shop — Histórico de resultados por live (§7.4 cohort/tendência) ─────
//
// Deriva, POR SESSÃO, os resultados a partir do que já temos (Anexo B /
// ls_live_session) + fee engine. Tudo determinístico. Money/Bps.
//   • diretos do seed: GMV, pedidos, itens, views, CTR, CTOR, AOV
//   • take-rate: fee engine sobre um item representativo ao preço médio da live
//   • Net AWQ: revenue share da marca (bps) sobre o GMV
// flag pré/pós-flip 15/07 por data da live.

import type { LiveSession, Order } from "./types";
import { applyBps, ratioBps, type Bps, type Money } from "./money";
import { computeOrderFees } from "./fee-engine";
import { FEE_SCHEDULES, TIKTOK_CHANNEL } from "./fee-schedules";

export const FLIP_DATE = "2026-07-15";

export interface SessionResult {
  id: string;
  startedAt: string;
  gmv: Money;
  paidOrders: number;
  aov: Money;
  itemsPerOrderMilli: number; // ×1000 (1,10 = 1100)
  ctrBps: Bps;
  ctorBps: Bps;
  takeRateBps: Bps; // Σ fees plataforma / GMV (engine, estimativa)
  netAwq: Money; // revenue share da AWQ sobre o GMV
  preFlip: boolean; // live antes do flip 15/07
}

function rateBps(part: number, whole: number): Bps {
  return whole === 0 ? 0 : Math.round((part / whole) * 10_000);
}

/** Take-rate da plataforma para uma live: fee engine sobre item representativo. */
function sessionTakeRateBps(s: LiveSession): Bps {
  if (s.gmv === 0 || s.items === 0) return 0;
  const avgItemPrice = Math.round(s.gmv / s.items);
  const order: Order = {
    id: `rep:${s.id}`, sessionId: s.id, placedAt: s.startedAt,
    isAffiliate: false, affiliateBps: null, gross: s.gmv, sellerDiscount: 0,
    status: "paid", source: "api",
    items: [{ sku: "rep", qty: s.items, unitPrice: avgItemPrice, unitDiscount: 0 }],
  };
  const fees = computeOrderFees(order, { channel: TIKTOK_CHANNEL, schedules: FEE_SCHEDULES });
  return ratioBps(fees.totalFees, s.gmv);
}

/** Série de resultados por live, mais recentes primeiro. */
export function computeSessionResults(sessions: LiveSession[], revShareBps: Bps): SessionResult[] {
  return sessions
    .map((s): SessionResult => {
      const aov = s.paidOrders === 0 ? 0 : Math.round(s.gmv / s.paidOrders);
      return {
        id: s.id,
        startedAt: s.startedAt,
        gmv: s.gmv,
        paidOrders: s.paidOrders,
        aov,
        itemsPerOrderMilli: s.paidOrders === 0 ? 0 : Math.round((s.items / s.paidOrders) * 1000),
        ctrBps: rateBps(s.clicks, s.views),
        ctorBps: rateBps(s.funnelOrders, s.clicks),
        takeRateBps: sessionTakeRateBps(s),
        netAwq: applyBps(s.gmv, revShareBps),
        preFlip: s.startedAt.slice(0, 10) < FLIP_DATE,
      };
    })
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}
