// ─── Live Shop — Seed (Anexo B: 5 sessões + basket Bless) ─────────────────────
//
// Baseline HISTÓRICA de validação (16–18/06/2026), não a fonte corrente (§0.6).
// Os agregados por sessão são escolhidos para reproduzir EXATAMENTE os Σ do §12:
//   GMV 2.621,85 · 42 pedidos · 46 itens · 39 clientes · CTR 13,5% · CTOR 1,18%
//
// Funil (views/clicks/funnelOrders) é telemetria de live → source 'export'
// (a API não cobre micro-funil ao vivo, §14.1). GMV/pedidos → source 'api'.
// Os dados granulares do Anexo B são internamente inconsistentes (CTR/CTOR vs
// views×orders); por isso o funil é semeado em nível AGREGADO consistente e o
// detalhe de GMV/pedidos/itens em nível de sessão.

import type { LiveSession, OrderItem } from "./types";
import { reais } from "./money";
import { TIKTOK_CHANNEL } from "./fee-schedules";

const ch = TIKTOK_CHANNEL.id;

export const LIVE_SESSIONS: LiveSession[] = [
  {
    id: "L1", channelId: ch, startedAt: "2026-06-16T18:39:00-03:00", durationMin: 227,
    hostCost: 0, adSpend: 0, views: 8839, clicks: 1131, funnelOrders: 13, peakCcv: 84, avgWatchSec: 42,
    gmv: reais(1475.73), paidOrders: 24, items: 28, customers: 21, returns: 0,
  },
  {
    id: "L2", channelId: ch, startedAt: "2026-06-17T17:23:00-03:00", durationMin: 233,
    hostCost: 0, adSpend: 0, views: 4632, clicks: 746, funnelOrders: 8, peakCcv: 61, avgWatchSec: 38,
    gmv: reais(773.98), paidOrders: 13, items: 13, customers: 13, returns: 0,
  },
  {
    id: "L3", channelId: ch, startedAt: "2026-06-18T16:38:00-03:00", durationMin: 48,
    hostCost: 0, adSpend: 0, views: 330, clicks: 32, funnelOrders: 1, peakCcv: 12, avgWatchSec: 31,
    gmv: reais(53.82), paidOrders: 1, items: 1, customers: 1, returns: 0,
  },
  {
    id: "L4", channelId: ch, startedAt: "2026-06-18T19:16:00-03:00", durationMin: 19,
    hostCost: 0, adSpend: 0, views: 675, clicks: 56, funnelOrders: 1, peakCcv: 18, avgWatchSec: 29,
    gmv: reais(113.43), paidOrders: 1, items: 1, customers: 1, returns: 0,
  },
  {
    id: "L5", channelId: ch, startedAt: "2026-06-18T19:36:00-03:00", durationMin: 109,
    hostCost: 0, adSpend: 0, views: 1224, clicks: 155, funnelOrders: 2, peakCcv: 27, avgWatchSec: 34,
    gmv: reais(204.89), paidOrders: 3, items: 3, customers: 3, returns: 0,
  },
];

// Custo direto da BU sobre a infra Caza (§2): depreciação R$ 794,66/mês rateada
// ~25–30% por multiuso ≈ R$ 200–240/mês.
export const CAZA_DEPRECIATION_MONTHLY: number = reais(794.66);
export const CAZA_ALLOCATION_BPS = 2800; // 28% — ponto médio da faixa 25–30%

// Basket representativo Bless (AOV/item ≈ R$ 57; parcela relevante < R$ 50 →
// migra para 10% em 15/07). Usado para o delta de take-rate pré×pós-flip (§12.10).
export const BLESS_BASKET: OrderItem[] = [
  { sku: "BL-001", qty: 1, unitPrice: reais(45.0), unitDiscount: 0 }, // < R$50
  { sku: "BL-002", qty: 1, unitPrice: reais(57.0), unitDiscount: 0 },
  { sku: "BL-003", qty: 1, unitPrice: reais(49.9), unitDiscount: 0 }, // < R$50
  { sku: "BL-004", qty: 1, unitPrice: reais(90.0), unitDiscount: 0 },
  { sku: "BL-005", qty: 1, unitPrice: reais(62.0), unitDiscount: 0 },
];
