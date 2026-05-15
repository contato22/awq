import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { CrmActivity } from "@/lib/crm-types";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  if (!supabase) return err("Supabase not configured", 503);
  try {
    const p = req.nextUrl.searchParams;
    let query = supabase
      .from("crm_activities")
      .select("*")
      .order("created_at", { ascending: false });

    if (p.get("related_to_type")) query = query.eq("related_to_type", p.get("related_to_type")!);
    if (p.get("related_to_id"))   query = query.eq("related_to_id",   p.get("related_to_id")!);
    if (p.get("created_by"))      query = query.eq("created_by",      p.get("created_by")!);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ok(data ?? []);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  if (!supabase) return err("Supabase not configured", 503);
  try {
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.activity_type || !data.related_to_type || !data.related_to_id || !data.subject)
        return err("activity_type, related_to_type, related_to_id and subject required", 400);
      const { data: row, error } = await supabase
        .from("crm_activities")
        .insert({
          activity_type:   data.activity_type,
          related_to_type: data.related_to_type,
          related_to_id:   data.related_to_id,
          subject:         data.subject,
          description:     data.description ?? null,
          outcome:         data.outcome ?? null,
          scheduled_at:    data.scheduled_at ?? null,
          status:          data.status ?? "completed",
          created_by:      data.created_by ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return ok(row as CrmActivity);
    }

    if (action === "complete") {
      const { activity_id } = data;
      if (!activity_id) return err("activity_id required", 400);
      const { data: row, error } = await supabase
        .from("crm_activities")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("activity_id", activity_id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return ok(row);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
