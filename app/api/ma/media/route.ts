import { NextRequest, NextResponse } from "next/server";
import { maSupabaseAdmin } from "@/lib/ma-supabase";
import { SEED_MEDIA_DELIVERABLES } from "@/lib/ma-db";

function ok(data: unknown)              { return NextResponse.json({ success: true,  data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    const portco_id = req.nextUrl.searchParams.get("portco_id") ?? undefined;
    if (!maSupabaseAdmin) {
      const rows = portco_id ? SEED_MEDIA_DELIVERABLES.filter(m => m.portco_id === portco_id) : SEED_MEDIA_DELIVERABLES;
      return ok(rows);
    }
    let q = maSupabaseAdmin
      .from("ma_media_deliverables")
      .select("*")
      .order("scheduled_delivery_date", { ascending: false });
    if (portco_id) q = q.eq("portco_id", portco_id);
    const { data, error } = await q;
    if (error) throw error;
    return ok(data ?? []);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, deliverable_id, ...rest } = body;
    if (!maSupabaseAdmin) return err("Database not available", 503);

    if (action === "create") {
      const { data, error } = await maSupabaseAdmin
        .from("ma_media_deliverables")
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    if (action === "update") {
      if (!deliverable_id) return err("deliverable_id required", 400);
      const { data, error } = await maSupabaseAdmin
        .from("ma_media_deliverables")
        .update(rest)
        .eq("deliverable_id", deliverable_id)
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
