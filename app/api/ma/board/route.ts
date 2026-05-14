import { NextRequest, NextResponse } from "next/server";
import { maSupabaseAdmin } from "@/lib/ma-supabase";
import { SEED_BOARD_MEETINGS } from "@/lib/ma-db";

function ok(data: unknown)              { return NextResponse.json({ success: true,  data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    const portco_id = req.nextUrl.searchParams.get("portco_id") ?? undefined;
    if (!maSupabaseAdmin) {
      const rows = portco_id ? SEED_BOARD_MEETINGS.filter(m => m.portco_id === portco_id) : SEED_BOARD_MEETINGS;
      return ok(rows);
    }
    let q = maSupabaseAdmin
      .from("ma_board_meetings")
      .select("*")
      .order("meeting_date", { ascending: false });
    if (portco_id) q = q.eq("portco_id", portco_id);
    const { data, error } = await q;
    if (error) throw error;
    return ok(data ?? []);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, meeting_id, ...rest } = body;
    if (!maSupabaseAdmin) return err("Database not available", 503);

    if (action === "create") {
      const { data, error } = await maSupabaseAdmin
        .from("ma_board_meetings")
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    if (action === "update") {
      if (!meeting_id) return err("meeting_id required", 400);
      const { data, error } = await maSupabaseAdmin
        .from("ma_board_meetings")
        .update(rest)
        .eq("meeting_id", meeting_id)
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
