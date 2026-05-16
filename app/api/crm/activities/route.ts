import { NextRequest, NextResponse } from "next/server";
import { listActivities, createActivity } from "@/lib/crm-db";
import type { CrmActivity } from "@/lib/crm-types";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const data = await listActivities({
      related_to_type: p.get("related_to_type") ?? undefined,
      related_to_id:   p.get("related_to_id")   ?? undefined,
      created_by:      p.get("created_by")       ?? undefined,
    });
    return ok(data);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.activity_type || !data.related_to_type || !data.related_to_id || !data.subject)
        return err("activity_type, related_to_type, related_to_id and subject required", 400);
      const row = await createActivity({
        activity_type:   data.activity_type,
        related_to_type: data.related_to_type,
        related_to_id:   data.related_to_id,
        subject:         data.subject,
        description:     data.description ?? null,
        outcome:         data.outcome     ?? null,
        scheduled_at:    data.scheduled_at ?? null,
        status:          data.status      ?? "completed",
        created_by:      data.created_by  ?? null,
      });
      return ok(row as CrmActivity);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
