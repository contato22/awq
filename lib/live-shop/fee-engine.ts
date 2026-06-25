// ─── Live Shop — Fee engine (determinística, versionada) — §6 ─────────────────
//
// Princípio: fees do TikTok Shop mudam por campanha e por DATA. A engine
// SELECIONA a versão pela data do pedido e a faixa (tier) pelo preço do item.
// Nunca usa constante (§13). Tudo em Money (centavos) / Bps.
//
// Pure module — recebe as schedules/channel como argumento (dep-injection),
// sem I/O. Testável offline contra Anexo A.

import type {
  Channel, FeeSchedule, FeeTier, FeeLine, Order, OrderItem,
} from "./types";
import { applyBps, type Money } from "./money";

/** Data (YYYY-MM-DD) do pedido — só a data importa para selecionar versão. */
export function orderDate(placedAt: string): string {
  return placedAt.slice(0, 10);
}

/** Seleciona a schedule vigente em `date` para o canal. effective_to é EXCLUSIVO. */
export function selectSchedule(
  schedules: FeeSchedule[],
  channelId: string,
  date: string,
): FeeSchedule {
  const match = schedules.find(
    (s) =>
      s.channelId === channelId &&
      (s.effectiveFrom === null || s.effectiveFrom <= date) &&
      (s.effectiveTo === null || date < s.effectiveTo),
  );
  if (!match) {
    throw new Error(`fee-engine: nenhuma fee_schedule vigente em ${date} para canal ${channelId}`);
  }
  return match;
}

/** Seleciona o tier pela faixa de preço unitário (já líquido de desconto). */
export function selectTier(schedule: FeeSchedule, unitPrice: Money): FeeTier {
  const tier = schedule.tiers.find(
    (t) => t.minPrice <= unitPrice && (t.maxPrice === null || unitPrice < t.maxPrice),
  );
  if (!tier) {
    throw new Error(`fee-engine: nenhum tier para preço ${unitPrice} na schedule ${schedule.id}`);
  }
  return tier;
}

/** Preço unitário líquido de desconto do seller (base da comissão, §6.3). */
export function netUnitPrice(item: OrderItem): Money {
  return Math.max(0, item.unitPrice - item.unitDiscount);
}

export interface FeeContext {
  channel: Channel;
  schedules: FeeSchedule[];
  /** acumulado de comissão já isentado pelo waiver de novo seller (para o cap). */
  waiverConsumed?: Money;
}

export interface OrderFeeResult {
  scheduleId: string;
  lines: FeeLine[]; // sempre positivos (magnitude da dedução)
  totalFees: Money; // Σ deduções
}

/**
 * Computa TODAS as deduções de plataforma de um pedido (§6, passos 1–9).
 * Ordem: comissão + fixo por item → frete (order-level, cap por item) →
 * afiliado por item → pagamento (order-level) → waiver de novo seller.
 */
export function computeOrderFees(order: Order, ctx: FeeContext): OrderFeeResult {
  const date = orderDate(order.placedAt);
  const schedule = selectSchedule(ctx.schedules, ctx.channel.id, date);
  const lines: FeeLine[] = [];

  let commissionTotal = 0;
  let fixedTotal = 0;
  let affiliateTotal = 0;

  for (const item of order.items) {
    const unit = netUnitPrice(item);
    const tier = selectTier(schedule, unit);

    // 3) Comissão (por unidade × qty)
    commissionTotal += applyBps(unit, tier.commissionBps) * item.qty;

    // 4) Fixo por item — só cobra abaixo do threshold se este for não-nulo
    const chargesFixed = tier.fixedFeeThreshold === null || unit < tier.fixedFeeThreshold;
    if (chargesFixed) fixedTotal += tier.fixedFee * item.qty;

    // 6) Afiliado por item (base = preço líquido)
    if (order.isAffiliate) {
      const affBps = order.affiliateBps ?? 0;
      affiliateTotal += applyBps(unit, affBps) * item.qty;
    }
  }

  // 8) Waiver de novo seller: zera comissão até o cap, dentro da vigência
  if (
    ctx.channel.newSellerWaiverUntil &&
    date <= ctx.channel.newSellerWaiverUntil
  ) {
    const consumed = ctx.waiverConsumed ?? 0;
    const room = Math.max(0, ctx.channel.newSellerWaiverCap - consumed);
    const waived = Math.min(commissionTotal, room);
    commissionTotal -= waived;
  }

  // 5) Frete (serviço) — order-level, cap por item × nº de itens
  let shippingTotal = 0;
  if (ctx.channel.freeShippingEnrolled && schedule.shippingServiceBps > 0) {
    const itemCount = order.items.reduce((a, i) => a + i.qty, 0);
    const raw = applyBps(order.gross, schedule.shippingServiceBps);
    const cap = schedule.shippingCapPerItem * itemCount;
    shippingTotal = Math.min(raw, cap);
  }

  // 7) Pagamento — order-level
  const paymentTotal = schedule.paymentBps > 0
    ? applyBps(order.gross, schedule.paymentBps)
    : 0;

  if (commissionTotal > 0) lines.push({ feeType: "commission", amount: commissionTotal, scheduleId: schedule.id });
  if (fixedTotal > 0) lines.push({ feeType: "fixed", amount: fixedTotal, scheduleId: schedule.id });
  if (shippingTotal > 0) lines.push({ feeType: "shipping", amount: shippingTotal, scheduleId: schedule.id });
  if (affiliateTotal > 0) lines.push({ feeType: "affiliate", amount: affiliateTotal, scheduleId: schedule.id });
  if (paymentTotal > 0) lines.push({ feeType: "payment", amount: paymentTotal, scheduleId: schedule.id });

  const totalFees = lines.reduce((a, l) => a + l.amount, 0);
  return { scheduleId: schedule.id, lines, totalFees };
}

/**
 * Atalho para teste/diagnóstico: comissão + fixo de UM item em Uma data.
 * Não inclui frete/pagamento/afiliado (que são order-level / condicionais).
 */
export function computeItemCommissionPlusFixed(
  schedules: FeeSchedule[],
  channelId: string,
  date: string,
  unitPrice: Money,
): { commission: Money; fixed: Money; total: Money } {
  const schedule = selectSchedule(schedules, channelId, date);
  const tier = selectTier(schedule, unitPrice);
  const commission = applyBps(unitPrice, tier.commissionBps);
  const fixed = tier.fixedFeeThreshold === null || unitPrice < tier.fixedFeeThreshold ? tier.fixedFee : 0;
  return { commission, fixed, total: commission + fixed };
}
