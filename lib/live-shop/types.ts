// ─── Live Shop — Domain types ────────────────────────────────────────────────
// Espelha o schema da migration 006 (tabelas ls_*). Money = centavos, Bps = bps.

import type { Money, Bps } from "./money";

export const LIVE_SHOP_BU = "LIVE" as const; // GUC app.current_bu / business_units.bu_code
export const LIVE_SHOP_SLUG = "live-shop" as const;

export type BUStage = "pilot" | "validated" | "formalized";
export type DataSource = "api" | "export" | "manual";
export type MarginClass = "resale" | "own";
export type OrderStatus = "placed" | "paid" | "delivered" | "returned" | "cancelled";

export type FunnelStage =
  | "view" | "click" | "order" | "checkout" | "paid" | "delivered" | "returned";

export type FeeType =
  | "commission" | "fixed" | "shipping" | "payment" | "affiliate" | "return";

export type SettlementLineType =
  | "commission" | "shipping" | "platform_discount" | "creator_commission"
  | "promo_rebate" | "tax_adj" | "refund";

// ── Fee schedule / tiers (versão versionada — §6, Anexo A) ───────────────────
export interface FeeTier {
  minPrice: Money; // inclusive
  maxPrice: Money | null; // exclusive; null = ∞
  commissionBps: Bps;
  fixedFee: Money;
  fixedFeeThreshold: Money | null; // só cobra fixo se unitPrice < threshold
}

export interface FeeSchedule {
  id: string;
  channelId: string;
  effectiveFrom: string | null; // "YYYY-MM-DD" | null = -∞
  effectiveTo: string | null; // "YYYY-MM-DD" exclusivo | null = +∞
  shippingServiceBps: Bps;
  shippingCapPerItem: Money;
  paymentBps: Bps;
  source: string;
  confirmed: boolean;
  tiers: FeeTier[];
}

export interface Channel {
  id: string;
  name: string;
  freeShippingEnrolled: boolean;
  newSellerWaiverUntil: string | null; // "YYYY-MM-DD"
  newSellerWaiverCap: Money;
  payoutLagDays: number;
}

// ── Pedido / item ────────────────────────────────────────────────────────────
export interface OrderItem {
  sku: string;
  qty: number;
  unitPrice: Money; // bruto por unidade
  unitDiscount: Money; // desconto do seller por unidade
}

export interface Order {
  id: string;
  sessionId: string | null;
  placedAt: string; // ISO; a DATA (YYYY-MM-DD) seleciona a fee schedule
  isAffiliate: boolean;
  affiliateBps: Bps | null;
  gross: Money; // bruto do pedido
  sellerDiscount: Money;
  status: OrderStatus;
  source: DataSource;
  items: OrderItem[];
}

export interface FeeLine {
  feeType: FeeType;
  amount: Money; // sempre POSITIVO (magnitude da dedução)
  scheduleId: string;
}

// ── Sessão de live (telemetria + agregados) ──────────────────────────────────
export interface LiveSession {
  id: string;
  channelId: string;
  startedAt: string;
  durationMin: number;
  hostCost: Money;
  adSpend: Money;
  views: number;
  clicks: number;
  funnelOrders: number; // pedidos atribuídos ao funil da live (export)
  peakCcv: number;
  avgWatchSec: number;
  // agregados de pedidos pagos (source 'api')
  gmv: Money;
  paidOrders: number;
  items: number;
  customers: number;
  returns: number;
}

// ── Settlement (repasse real da plataforma) ──────────────────────────────────
export interface SettlementLine {
  lineType: SettlementLineType;
  amount: Money; // POSITIVO = magnitude
}
