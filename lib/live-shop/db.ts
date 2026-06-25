// ─── Live Shop — acesso server-side (Supabase ERP, schema ls_*, migration 006) ─
//
// Mesma priority chain das demais BUs (lib/recon-db.ts):
//   erpAdmin (service role, bypass RLS)  ??  erpAnon (anon — RLS aplica)
// Service role escreve com bu_id='LIVE' (isolamento por coluna). Leitura sempre
// filtra .eq('bu_id', LIVE). Fallback de leitura para o seed quando não há DB
// (dev local) — espelha o padrão do app (financial-db).
//
// IMPORTANTE: importar APENAS de Route Handlers / jobs server-side.

import { erpAdmin, erpAnon } from "@/lib/supabase";
import { LIVE_SHOP_BU } from "./types";
import type { LiveSession, Order } from "./types";
import { LIVE_SESSIONS } from "./seed";
import { TIKTOK_CHANNEL, FEE_SCHEDULES } from "./fee-schedules";
import { computeOrderFees } from "./fee-engine";
import { buildOrderJournal } from "./ledger";
import type { WebhookStore, InboundWebhook } from "./webhook";

const db = erpAdmin ?? erpAnon;
export const LIVE_DB_AVAILABLE = !!db;

function requireDb() {
  if (!db) throw new Error("ERP Supabase não configurado — Live Shop requer migration 006.");
  return db;
}

// ── Leitura para o cockpit ────────────────────────────────────────────────────
/** Sessões da BU. Fallback para o seed (Anexo B) quando não há DB (dev local). */
export async function getLiveSessions(): Promise<LiveSession[]> {
  if (!db) return LIVE_SESSIONS;
  try {
    const { data, error } = await db
      .from("ls_live_session")
      .select("*")
      .eq("bu_id", LIVE_SHOP_BU)
      .order("started_at", { ascending: true });
    if (error || !data || data.length === 0) return LIVE_SESSIONS;
    return data.map(rowToSession);
  } catch {
    return LIVE_SESSIONS;
  }
}

function rowToSession(r: any): LiveSession {
  return {
    id: r.id, channelId: r.channel_id, startedAt: r.started_at, durationMin: r.duration_min,
    hostCost: Number(r.host_cost), adSpend: Number(r.ad_spend), views: r.views, clicks: r.clicks,
    funnelOrders: r.funnel_orders ?? 0, peakCcv: r.peak_ccv, avgWatchSec: r.avg_watch_sec,
    gmv: Number(r.gmv ?? 0), paidOrders: r.paid_orders ?? 0, items: r.items ?? 0,
    customers: r.customers ?? 0, returns: r.returns ?? 0,
  };
}

// ── Persistência de pedido + fees + ledger (cascata §5) ───────────────────────
/**
 * Upsert idempotente do pedido (chave natural = order.id), grava ls_fee_line e
 * posta a cascata no ledger (ls_ledger_entry + ls_ledger_line balanceado).
 * cmv resolvido por SKU (ls_sku.cost) — 0 se ausente.
 */
export async function persistOrder(order: Order): Promise<void> {
  const client = requireDb();
  const fees = computeOrderFees(order, { channel: TIKTOK_CHANNEL, schedules: FEE_SCHEDULES });

  // CMV por SKU
  const skus = order.items.map((i) => i.sku);
  let cmv = 0;
  if (skus.length) {
    const { data } = await client.from("ls_sku").select("sku,cost").in("sku", skus);
    const costBySku = new Map((data ?? []).map((r: any) => [r.sku, Number(r.cost)]));
    cmv = order.items.reduce((a, i) => a + (costBySku.get(i.sku) ?? 0) * i.qty, 0);
  }

  await client.from("ls_order").upsert({
    id: order.id, bu_id: LIVE_SHOP_BU, session_id: order.sessionId, customer_ref: null,
    placed_at: order.placedAt, is_affiliate: order.isAffiliate, affiliate_bps: order.affiliateBps,
    gross: order.gross, seller_discount: order.sellerDiscount, status: order.status, source: order.source,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  // itens: apaga e reinsere (upsert idempotente do conjunto)
  await client.from("ls_order_item").delete().eq("order_id", order.id);
  if (order.items.length) {
    await client.from("ls_order_item").insert(order.items.map((i) => ({
      bu_id: LIVE_SHOP_BU, order_id: order.id, sku: i.sku, qty: i.qty,
      unit_price: i.unitPrice, unit_discount: i.unitDiscount,
    })));
  }

  // fee lines (recomputa)
  await client.from("ls_fee_line").delete().eq("order_id", order.id);
  if (fees.lines.length) {
    await client.from("ls_fee_line").insert(fees.lines.map((l) => ({
      bu_id: LIVE_SHOP_BU, order_id: order.id, fee_type: l.feeType,
      amount: l.amount, schedule_id: l.scheduleId,
    })));
  }

  // ledger (idempotente por ref)
  const journal = buildOrderJournal(order, fees, cmv);
  await client.from("ls_ledger_entry").delete().eq("ref", journal.ref).eq("bu_id", LIVE_SHOP_BU);
  const { data: entry, error } = await client.from("ls_ledger_entry").insert({
    bu_id: LIVE_SHOP_BU, ref: journal.ref, entry_date: journal.date, source: journal.source,
  }).select("id").single();
  if (error || !entry) throw new Error(`persistOrder: falha no ledger_entry — ${error?.message}`);
  await client.from("ls_ledger_line").insert(journal.lines.map((l) => ({
    bu_id: LIVE_SHOP_BU, entry_id: entry.id, account: l.account,
    debit: l.debit, credit: l.credit, memo: l.memo ?? null,
  })));
}

// ── WebhookStore (idempotência via ls_webhook_event.dedupe_key) ───────────────
export function makeWebhookStore(): WebhookStore {
  const client = requireDb();
  return {
    async hasProcessed(dedupeKey) {
      const { data } = await client.from("ls_webhook_event")
        .select("status").eq("dedupe_key", dedupeKey).maybeSingle();
      return !!data && data.status === "processed";
    },
    async recordEvent(w: InboundWebhook) {
      await client.from("ls_webhook_event").upsert({
        bu_id: LIVE_SHOP_BU, event_type: w.type, payload: w.payload as any,
        dedupe_key: w.dedupeKey, status: "received",
      }, { onConflict: "dedupe_key" });
    },
    async upsertOrder(order: Order) {
      await persistOrder(order);
    },
    async markProcessed(dedupeKey) {
      await client.from("ls_webhook_event").update({
        status: "processed", processed_at: new Date().toISOString(),
      }).eq("dedupe_key", dedupeKey);
    },
  };
}
