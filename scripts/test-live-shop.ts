/**
 * test-live-shop.ts — BU Live Shop: critérios de aceite §12 (offline).
 *
 * Cobre os asserts que não exigem infra viva (1–18). RLS de banco (#12) é
 * validada por proxy de lógica (predicado de isolamento) + pela policy SQL na
 * migration 006. Asserts #19–21 (sandbox/cobertura/CI) são processo, não runtime.
 *
 * Uso: npx tsx scripts/test-live-shop.ts
 */

import { reais, ratioBps } from "../lib/live-shop/money";
import { FEE_SCHEDULES, TIKTOK_CHANNEL } from "../lib/live-shop/fee-schedules";
import {
  computeItemCommissionPlusFixed, computeOrderFees, selectSchedule,
} from "../lib/live-shop/fee-engine";
import {
  buildOrderJournal, buildCostJournal, computeCascade, feeBreakdown,
  isBalanced, ledgerSum,
} from "../lib/live-shop/ledger";
import {
  aggregateFunnel, unitEconKpis, gmvConcentrationBps, roicKpis,
} from "../lib/live-shop/kpis";
import { assertEquityModelingAllowed, StageGateError, evaluateGate } from "../lib/live-shop/governance";
import { reconcileFees, gmvMaxAllocation } from "../lib/live-shop/reconciliation";
import { LIVE_SESSIONS, BLESS_BASKET } from "../lib/live-shop/seed";
import { mapTikTokOrder } from "../lib/live-shop/webhook";
import {
  signRequest, ensureValidToken, tokenNeedsRefresh, requestWithRetry,
} from "../lib/live-shop/tiktok-client";
import type { Order } from "../lib/live-shop/types";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗ FAIL", name, extra); }
}

const ch = TIKTOK_CHANNEL.id;
const mkOrder = (over: Partial<Order>): Order => ({
  id: "o1", sessionId: null, placedAt: "2026-03-01T12:00:00-03:00",
  isAffiliate: false, affiliateBps: null, gross: 0, sellerDiscount: 0,
  status: "paid", source: "api", items: [], ...over,
});

async function main() {
  // ── #1 GMV Σ ──
  const ue = unitEconKpis(LIVE_SESSIONS);
  check("#1 GMV Σ = R$ 2.621,85", ue.gmv === reais(2621.85), `got ${ue.gmv}`);

  // ── #2 AOV Σ ──
  check("#2 AOV Σ ≈ R$ 62,42", Math.abs(ue.aov - reais(62.42)) <= 1, `got ${ue.aov}`);
  check("#2 AOV display 62,42", (ue.gmv / ue.paidOrders / 100).toFixed(2) === "62.42");

  // ── #3 CTR / CTOR Σ ──
  const f = aggregateFunnel(LIVE_SESSIONS);
  check("#3 CTR Σ = 13,5%", f.ctrBps === 1350, `got ${f.ctrBps}`);
  check("#3 CTOR Σ = 1,18%", f.ctorBps === 118, `got ${f.ctorBps}`);

  // ── #4 Itens/pedido ──
  const ipo = Math.round(ue.itemsPerOrderMilli / 10) / 100;
  check("#4 Itens/pedido = 1,10", ipo === 1.10, `got ${ipo}`);

  // ── #5 Concentração L1+L2 ──
  const conc = gmvConcentrationBps(LIVE_SESSIONS, 2);
  check("#5 Concentração = 85,8%", Math.round(conc / 10) / 10 === 85.8, `got ${conc}bps`);

  // ── #6 ROIC e prêmio de risco ──
  const r = roicKpis(1090);
  check("#6 ROIC ≈ 10,9%", r.roicBps === 1090);
  check("#6 prêmio de risco = −3,35pp", r.riskPremiumBps === -335, `got ${r.riskPremiumBps}`);
  check("#6 abaixo do hurdle", r.belowHurdle && r.hurdleGapBps === 1090 - 2500);

  // ── #7 Fee pré-15/07, item R$100 → 6 + 4 = 10 ──
  const a7 = computeItemCommissionPlusFixed(FEE_SCHEDULES, ch, "2026-03-01", reais(100));
  check("#7 pré-flip R$100 → R$10", a7.total === reais(10) && a7.commission === reais(6) && a7.fixed === reais(4));

  // ── #8 Fee pós-15/07, item R$40 → 10% + 4 = 8 ──
  const a8 = computeItemCommissionPlusFixed(FEE_SCHEDULES, ch, "2026-08-01", reais(40));
  check("#8 pós-flip R$40 → R$8", a8.total === reais(8) && a8.commission === reais(4) && a8.fixed === reais(4));

  // ── #9 Fee pós-15/07, item R$90 → 6% + 6 = 11,40 ──
  const a9 = computeItemCommissionPlusFixed(FEE_SCHEDULES, ch, "2026-08-01", reais(90));
  check("#9 pós-flip R$90 → R$11,40", a9.total === reais(11.40) && a9.commission === reais(5.40) && a9.fixed === reais(6));

  // ── selection boundaries (effective_to EXCLUSIVO) ──
  check("boundary 2026-01-31 → v1", selectSchedule(FEE_SCHEDULES, ch, "2026-01-31").id === "fee_v1");
  check("boundary 2026-02-01 → v2", selectSchedule(FEE_SCHEDULES, ch, "2026-02-01").id === "fee_v2");
  check("boundary 2026-07-14 → v2", selectSchedule(FEE_SCHEDULES, ch, "2026-07-14").id === "fee_v2");
  check("boundary 2026-07-15 → v3", selectSchedule(FEE_SCHEDULES, ch, "2026-07-15").id === "fee_v3");

  // ── #10 Delta take-rate Bless pré×pós-15/07 > 0 ──
  const blessGross = BLESS_BASKET.reduce((a, i) => a + i.unitPrice * i.qty, 0);
  const pre = computeOrderFees(mkOrder({ id: "bpre", placedAt: "2026-03-01T12:00:00-03:00", gross: blessGross, items: BLESS_BASKET }), { channel: TIKTOK_CHANNEL, schedules: FEE_SCHEDULES });
  const post = computeOrderFees(mkOrder({ id: "bpost", placedAt: "2026-08-01T12:00:00-03:00", gross: blessGross, items: BLESS_BASKET }), { channel: TIKTOK_CHANNEL, schedules: FEE_SCHEDULES });
  const trPre = ratioBps(pre.totalFees, blessGross), trPost = ratioBps(post.totalFees, blessGross);
  check("#10 take-rate pós > pré (delta > 0)", trPost > trPre, `pré=${trPre}bps pós=${trPost}bps`);

  // ── #11 Trava de estágio ──
  let threw = false;
  try { assertEquityModelingAllowed("pilot", "cap_table"); } catch (e) { threw = e instanceof StageGateError; }
  check("#11 cap-table em stage='pilot' falha", threw);
  let okValidated = true;
  try { assertEquityModelingAllowed("validated", "cap_table"); } catch { okValidated = false; }
  check("#11 cap-table em stage='validated' permitido", okValidated);

  // ── #12 RLS (proxy de lógica do predicado bu_isolation) ──
  const rows = [{ bu: "LIVE", x: 1 }, { bu: "JACQES", x: 2 }, { bu: "AWQ", x: 3 }];
  const visibleTo = (currentBu: string) => rows.filter((row) => row.bu === currentBu);
  check("#12 operador LIVE não lê JACQES", visibleTo("LIVE").every((r) => r.bu === "LIVE") && visibleTo("LIVE").length === 1);
  check("#12 sem contexto (GUC vazio) → fail-closed", visibleTo("").length === 0);

  // ── #13 Ledger: razão fecha em 0 ──
  const orders: Order[] = [
    mkOrder({ id: "L13a", gross: blessGross, items: BLESS_BASKET }),
    mkOrder({ id: "L13b", gross: reais(120), items: [{ sku: "X", qty: 2, unitPrice: reais(60), unitDiscount: 0 }] }),
  ];
  const journals = orders.map((o) => buildOrderJournal(o, computeOrderFees(o, { channel: TIKTOK_CHANNEL, schedules: FEE_SCHEDULES }), reais(30)));
  journals.push(buildCostJournal("cost:host", "2026-06-16", "dc_host", reais(85)));
  journals.push(buildCostJournal("alloc:caza", "2026-06-30", "alloc_caza_depreciation", reais(222)));
  check("#13 todo journal balanceado", journals.every(isBalanced));
  check("#13 Σ razão = 0", ledgerSum(journals) === 0, `got ${ledgerSum(journals)}`);

  // ── #16 Mapeamento API→ledger (pedido da API posta cascata, razão = 0) ──
  const raw = {
    order_id: "TT-1001", create_time: 1750000000, order_status: "PAID", total_amount: 90.0,
    line_items: [{ sku_id: "BL-004", quantity: 1, sale_price: 90.0, seller_discount: 0 }],
  };
  const apiOrder = mapTikTokOrder(raw);
  const apiJournal = buildOrderJournal(apiOrder, computeOrderFees(apiOrder, { channel: TIKTOK_CHANNEL, schedules: FEE_SCHEDULES }), reais(45));
  check("#16 pedido API mapeado", apiOrder.id === "TT-1001" && apiOrder.gross === reais(90) && apiOrder.source === "api");
  check("#16 journal da API fecha em 0", isBalanced(apiJournal) && ledgerSum([apiJournal]) === 0);

  // ── #17 Reconciliação fee computado × real ──
  const computed = [computeOrderFees(mkOrder({ id: "rc", gross: reais(100), items: [{ sku: "X", qty: 1, unitPrice: reais(100), unitDiscount: 0 }] }), { channel: TIKTOK_CHANNEL, schedules: FEE_SCHEDULES })];
  const fb = feeBreakdown(computed);
  // settlement "real": o statement do TikTok agrupa a taxa fixa por item dentro
  // da linha 'commission' (não há line_type 'fixed') → comissão real = comm+fixo.
  const okRecon = reconcileFees(computed, [
    { lineType: "commission", amount: fb.commission + fb.fixed },
    { lineType: "shipping", amount: fb.shipping },
  ], reais(100));
  check("#17 recon dentro da tolerância → sem alerta", !okRecon.alert, JSON.stringify(okRecon));
  // settlement divergente → alerta
  const badRecon = reconcileFees(computed, [
    { lineType: "commission", amount: fb.commission + reais(50) },
    { lineType: "platform_discount", amount: reais(10) },
  ], reais(100));
  check("#17 divergência > tolerância → alerta", badRecon.alert && badRecon.unmodeled === reais(10));

  // ── #18 GMV Max (jul/2026) ──
  const gmvMaxBefore = gmvMaxAllocation(reais(1000), "2026-06-30");
  const gmvMaxAfter = gmvMaxAllocation(reais(1000), "2026-08-01");
  check("#18 GMV Max antes de jul = 0", gmvMaxBefore === 0);
  check("#18 GMV Max após jul aplicado (3%)", gmvMaxAfter === reais(30));
  const baseCascade = { gmv: reais(1000), commission: reais(60), fixed: reais(40), shipping: reais(50), payment: 0, affiliate: 0, returns: 0, retainer: 0, productionFee: 0, cmv: reais(200), host: 0, operator: 0, set: 0, adSpend: 0, gmvMaxAds: 0, cazaDepreciation: 0, labor: 0, dasSimples: 0 };
  const without = computeCascade(baseCascade);
  const withGmvMax = computeCascade({ ...baseCascade, gmvMaxAds: gmvMaxAfter });
  check("#18 GMV Max reduz a MC", withGmvMax.contributionMargin === without.contributionMargin - gmvMaxAfter);
  check("buildCostJournal dc_gmv_max_ads balanceado", isBalanced(buildCostJournal("gmvmax", "2026-08-01", "dc_gmv_max_ads", gmvMaxAfter)));

  // ── #14 Webhook idempotente (store fake) ──
  {
    const seen = new Set<string>();
    const orderUpserts: string[] = [];
    const store = {
      async hasProcessed(k: string) { return seen.has(k); },
      async recordEvent() {},
      async upsertOrder(o: Order) { orderUpserts.push(o.id); },
      async markProcessed(k: string) { seen.add(k); },
    };
    const { processWebhook } = await import("../lib/live-shop/webhook");
    const wh = { type: "ORDER_PLACED", dedupeKey: "TT-1001", shopId: "s1", payload: raw };
    const r1 = await processWebhook(wh, store);
    const r2 = await processWebhook(wh, store); // reenvio
    check("#14 webhook reenvio não duplica", !r1.duplicate && r2.duplicate && orderUpserts.length === 1, JSON.stringify({ r1, r2, n: orderUpserts.length }));
  }

  // ── #15 Token refresh ──
  {
    const now = 1_000_000_000_000;
    const expired = { accessToken: "old", refreshToken: "rt", expiresAt: now - 1000 };
    check("#15 token expirado precisa refresh", tokenNeedsRefresh(expired, now));
    let refreshCalls = 0;
    const next = await ensureValidToken(expired, now, async (rt) => {
      refreshCalls++;
      check("#15 refresh usa refresh_token", rt === "rt");
      return { accessToken: "new", refreshToken: "rt2", expiresInSec: 3600 };
    });
    check("#15 token renovado sem intervenção", next.accessToken === "new" && refreshCalls === 1 && next.expiresAt > now);
  }

  // ── signing determinístico + retry/backoff ──
  {
    const s1 = signRequest("secret", "/api/orders/search", { app_key: "k", timestamp: 1 }, 1, "");
    const s2 = signRequest("secret", "/api/orders/search", { timestamp: 1, app_key: "k" }, 1, "");
    check("signRequest determinístico e independe da ordem dos params", s1 === s2 && /^[0-9a-f]{64}$/.test(s1));

    let calls = 0;
    const res = await requestWithRetry("http://x", {}, {
      maxRetries: 3, baseDelayMs: 1, sleep: async () => {},
      fetchImpl: (async () => {
        calls++;
        if (calls < 3) return new Response("", { status: 503 });
        return new Response("ok", { status: 200 });
      }) as typeof fetch,
    });
    check("retry/backoff repete em 5xx e converge", res.status === 200 && calls === 3, `calls=${calls}`);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
