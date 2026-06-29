// ─── Live Shop — Fee schedules (Anexo A) ─────────────────────────────────────
// Valores a semear no canal tiktok_shop. NUNCA hardcodar fee fora daqui (§13):
// a engine seleciona a versão por DATA do pedido. `confirmed=false` sinaliza que
// o valor ainda não foi batido no Seller Center (reconciliação §14.5 valida).

import type { Channel, FeeSchedule } from "./types";
import { reais } from "./money";

export const TIKTOK_CHANNEL: Channel = {
  id: "ch_tiktok_shop",
  name: "tiktok_shop",
  freeShippingEnrolled: true,
  newSellerWaiverUntil: null, // verificar elegibilidade Bless no Seller Center
  newSellerWaiverCap: reais(17_000),
  payoutLagDays: 14,
};

// Anexo A — 3 versões. Faixas progressivas via tiers; versão "flat" = 1 tier [0,∞).
export const FEE_SCHEDULES: FeeSchedule[] = [
  {
    id: "fee_v1",
    channelId: TIKTOK_CHANNEL.id,
    effectiveFrom: null, // -∞
    effectiveTo: "2026-02-01", // exclusivo → vigente até 2026-01-31
    shippingServiceBps: 600,
    shippingCapPerItem: reais(50),
    paymentBps: 0,
    source: "legado",
    confirmed: true,
    tiers: [
      { minPrice: reais(0), maxPrice: reais(79), commissionBps: 600, fixedFee: reais(2), fixedFeeThreshold: reais(79) },
      { minPrice: reais(79), maxPrice: null, commissionBps: 600, fixedFee: reais(0), fixedFeeThreshold: null },
    ],
  },
  {
    id: "fee_v2",
    channelId: TIKTOK_CHANNEL.id,
    effectiveFrom: "2026-02-01",
    effectiveTo: "2026-07-15", // exclusivo → vigente até 2026-07-14
    shippingServiceBps: 600,
    shippingCapPerItem: reais(50),
    paymentBps: 0,
    source: "multiplas",
    confirmed: false, // threshold R$79 a confirmar no Seller Center
    tiers: [
      { minPrice: reais(0), maxPrice: null, commissionBps: 600, fixedFee: reais(4), fixedFeeThreshold: null },
    ],
  },
  {
    id: "fee_v3",
    channelId: TIKTOK_CHANNEL.id,
    effectiveFrom: "2026-07-15",
    effectiveTo: null, // +∞
    shippingServiceBps: 600,
    shippingCapPerItem: reais(50),
    paymentBps: 0,
    source: "calc-terceira",
    confirmed: false, // valores 15/07 a confirmar (reconciliação §14.5)
    tiers: [
      { minPrice: reais(0), maxPrice: reais(50), commissionBps: 1000, fixedFee: reais(4), fixedFeeThreshold: null },
      { minPrice: reais(50), maxPrice: null, commissionBps: 600, fixedFee: reais(6), fixedFeeThreshold: null },
    ],
  },
];
