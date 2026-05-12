import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, listActivities, createActivity } from "@/lib/crm-db";
import { supabase } from "@/lib/supabase";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const p = req.nextUrl.searchParams;
    const rows = await listActivities({
      related_to_type: p.get("related_to_type") ?? undefined,
      related_to_id:   p.get("related_to_id")   ?? undefined,
      created_by:      p.get("created_by")       ?? undefined,
    });
    return ok(rows);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    await initCrmDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.activity_type || !data.related_to_type || !data.related_to_id || !data.subject)
        return err("activity_type, related_to_type, related_to_id and subject required", 400);
      const row = await createActivity(data);
      return ok(row);
    }
    if (action === "complete") {
      const { activity_id } = data;
      if (!activity_id) return err("activity_id required", 400);
      if (supabase) {
        const { data: row, error } = await supabase
          .from("crm_activities")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("activity_id", activity_id)
          .select()
          .single();
        if (error) return err(error.message);
        return ok(row);
      }
      return ok({ activity_id, status: "completed" });
    }
    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
