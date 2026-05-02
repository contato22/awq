// ─── POST /api/bpm/mark-notification-read ────────────────────────────────────
// Mark one or all notifications as read for a user.
// Body: { notification_id?: string, user_id?: string, mark_all?: boolean }

import { NextRequest, NextResponse } from "next/server";
import { initBpmDB, markNotificationRead, getUnreadNotifications } from "@/lib/bpm-db";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initBpmDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body: { notification_id?: string; user_id?: string; mark_all?: boolean } = await req.json();

    if (body.mark_all && body.user_id) {
      // Mark all unread for user
      const unread = await getUnreadNotifications(body.user_id);
      await Promise.all(unread.map((n) => markNotificationRead(n.notification_id)));
      return ok({ marked: unread.length });
    }

    if (body.notification_id) {
      await markNotificationRead(body.notification_id);
      return ok({ marked: 1 });
    }

    return err("Provide notification_id or user_id + mark_all=true");
  } catch (e) {
    console.error("[bpm/mark-notification-read]", e);
    return err(String(e), 500);
  }
}

// GET: unread count/list for a user
export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const userId = req.nextUrl.searchParams.get("user_id");
    if (!userId) return err("user_id is required");

    const notifications = await getUnreadNotifications(userId);
    return ok({ notifications, unread_count: notifications.length });
  } catch (e) {
    console.error("[bpm/mark-notification-read GET]", e);
    return err(String(e), 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
