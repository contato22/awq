// GET /api/bpm/notifications?user_id=X&unread=true — Notificações do usuário
// PATCH /api/bpm/notifications — Marca notificação como lida

import { NextRequest, NextResponse } from "next/server";
import { USE_DB, sql } from "@/lib/db";
import { initBpmDB, dbListNotifications, dbMarkNotificationRead } from "@/lib/bpm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const unreadOnly = searchParams.get("unread") === "true";

    if (!userId) {
      return NextResponse.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    if (!USE_DB || !sql) {
      return NextResponse.json({ success: true, no_db: true, data: [] });
    }

    await initBpmDB();
    const notifications = await dbListNotifications(userId, unreadOnly);

    return NextResponse.json({ success: true, data: notifications });
  } catch (err) {
    console.error("[bpm/notifications GET]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as { notification_id: string };

    if (!body.notification_id) {
      return NextResponse.json({ success: false, error: "notification_id is required" }, { status: 400 });
    }

    if (!USE_DB || !sql) {
      return NextResponse.json({ success: true, no_db: true });
    }

    await initBpmDB();
    await dbMarkNotificationRead(body.notification_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[bpm/notifications PATCH]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
