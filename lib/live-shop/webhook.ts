// ─── Live Shop — Webhook inbound idempotente — §14.4 ──────────────────────────
// Valida assinatura → grava ls_webhook_event (dedupe_key único) → upsert do
// pedido → responde 200. Falha de processamento ≠ falha de recebimento.
// Lógica pura com dependências injetadas (store) — testável offline (#14).

import type { Order, OrderItem } from "./types";

export type WebhookType =
  | "ORDER_STATUS_CHANGE" | "ORDER_PLACED" | "RETURN_INITIATED" | string;

export interface InboundWebhook {
  type: WebhookType;
  /** chave natural do TikTok (order_id / statement_id) → dedupe determinístico. */
  dedupeKey: string;
  shopId: string;
  payload: unknown;
}

export interface WebhookStore {
  /** true se o dedupe_key já foi processado (idempotência). */
  hasProcessed(dedupeKey: string): Promise<boolean>;
  /** persiste o evento bruto (status 'received'). */
  recordEvent(w: InboundWebhook): Promise<void>;
  /** upsert do pedido derivado (nunca insert cego). */
  upsertOrder(order: Order): Promise<void>;
  /** marca o evento como processado. */
  markProcessed(dedupeKey: string): Promise<void>;
}

export interface WebhookResult {
  ok: boolean;
  duplicate: boolean;
  orderId?: string;
}

/** Mapeia um payload de pedido do TikTok → nosso Order (cascata via ledger). */
export function mapTikTokOrder(raw: any): Order {
  const items: OrderItem[] = (raw.line_items ?? raw.items ?? []).map((it: any) => ({
    sku: String(it.sku_id ?? it.sku ?? it.seller_sku ?? "UNKNOWN"),
    qty: Number(it.quantity ?? it.qty ?? 1),
    unitPrice: Math.round(Number(it.sale_price ?? it.unit_price ?? 0) * 100),
    unitDiscount: Math.round(Number(it.seller_discount ?? it.unit_discount ?? 0) * 100),
  }));
  const gross = Math.round(Number(raw.total_amount ?? raw.payment_amount ?? 0) * 100)
    || items.reduce((a, i) => a + i.unitPrice * i.qty, 0);
  return {
    id: String(raw.order_id ?? raw.id),
    sessionId: raw.session_id ?? null,
    placedAt: raw.create_time
      ? new Date(Number(raw.create_time) * 1000).toISOString()
      : (raw.placed_at ?? new Date(0).toISOString()),
    isAffiliate: !!raw.is_affiliate,
    affiliateBps: raw.affiliate_bps ?? null,
    gross,
    sellerDiscount: Math.round(Number(raw.seller_discount ?? 0) * 100),
    status: mapStatus(raw.order_status ?? raw.status),
    source: "api",
    items,
  };
}

function mapStatus(s: any): Order["status"] {
  const m: Record<string, Order["status"]> = {
    UNPAID: "placed", PLACED: "placed", AWAITING_SHIPMENT: "paid", PAID: "paid",
    DELIVERED: "delivered", COMPLETED: "delivered", RETURNED: "returned",
    CANCELLED: "cancelled", CANCEL: "cancelled",
  };
  return m[String(s).toUpperCase()] ?? "placed";
}

/**
 * Processa um webhook idempotentemente. Reenvio do mesmo dedupe_key NÃO duplica
 * o pedido (#14): retorna { duplicate: true } sem reprocessar.
 */
export async function processWebhook(
  w: InboundWebhook,
  store: WebhookStore,
): Promise<WebhookResult> {
  if (await store.hasProcessed(w.dedupeKey)) {
    return { ok: true, duplicate: true };
  }
  await store.recordEvent(w);

  let orderId: string | undefined;
  if (w.type.startsWith("ORDER") || w.type === "RETURN_INITIATED") {
    const order = mapTikTokOrder(w.payload);
    await store.upsertOrder(order);
    orderId = order.id;
  }

  await store.markProcessed(w.dedupeKey);
  return { ok: true, duplicate: false, orderId };
}
