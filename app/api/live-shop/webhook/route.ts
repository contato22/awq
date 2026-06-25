// POST /api/live-shop/webhook
//
// Receiver near-real-time da TikTok Shop (§14.4): valida assinatura → grava
// ls_webhook_event (idempotente por dedupe_key) → upsert do pedido + cascata no
// ledger → responde 200. Falha de processamento ≠ falha de recebimento.
//
// Rota PÚBLICA (TikTok chama sem sessão NextAuth) — protegida por assinatura
// HMAC do App Secret. Adicionar ao matcher de exclusão do middleware.

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, isTikTokConfigured } from "@/lib/live-shop/tiktok-client";
import { processWebhook, type InboundWebhook } from "@/lib/live-shop/webhook";
import { makeWebhookStore, LIVE_DB_AVAILABLE } from "@/lib/live-shop/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const raw = await req.text();
  const signature =
    req.headers.get("x-tts-signature") ||
    req.headers.get("authorization") ||
    "";

  // Assinatura obrigatória em produção (App Secret server-side).
  const appSecret = process.env.TIKTOK_APP_SECRET;
  if (appSecret) {
    if (!verifyWebhookSignature(appSecret, raw, signature)) {
      return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
    }
  } else if (isTikTokConfigured()) {
    return NextResponse.json({ error: "TIKTOK_APP_SECRET ausente" }, { status: 500 });
  }
  // Sem credenciais (dev local) → aceita para teste.

  let body: any;
  try { body = JSON.parse(raw); } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const w: InboundWebhook = {
    type: body.type ?? body.event_type ?? "UNKNOWN",
    // chave natural: order_id / statement_id → dedupe determinístico
    dedupeKey: String(
      body.data?.order_id ?? body.order_id ?? body.data?.statement_id ?? body.tts_notification_id ?? raw.length + ":" + (body.type ?? ""),
    ),
    shopId: String(body.shop_id ?? body.data?.shop_id ?? ""),
    payload: body.data ?? body,
  };

  if (!LIVE_DB_AVAILABLE) {
    // Recebimento OK mesmo sem DB — não perde o evento do ponto de vista do TikTok.
    console.warn("[live-shop/webhook] DB indisponível — evento aceito mas não persistido:", w.dedupeKey);
    return NextResponse.json({ ok: true, persisted: false }, { status: 200 });
  }

  try {
    const result = await processWebhook(w, makeWebhookStore());
    return NextResponse.json({ ...result, persisted: true }, { status: 200 });
  } catch (err) {
    // Grava-e-reprocessa: 200 evita reentrega infinita; o evento fica 'received'
    // e o cron de reconciliação reprocessa.
    console.error("[live-shop/webhook] erro de processamento:", err);
    return NextResponse.json({ ok: true, processed: false }, { status: 200 });
  }
}
