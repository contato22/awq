import { NextRequest, NextResponse } from "next/server";
import { maSupabaseAdmin } from "@/lib/ma-supabase";
import { SEED_DEALS } from "@/lib/ma-db";

function ok(data: unknown)              { return NextResponse.json({ success: true,  data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    if (!maSupabaseAdmin) return ok(SEED_DEALS);
    const p = req.nextUrl.searchParams;
    let q = maSupabaseAdmin
      .from("ma_deals")
      .select("*")
      .order("created_at", { ascending: false });
    if (p.get("pipeline_stage")) q = q.eq("pipeline_stage", p.get("pipeline_stage")!);
    if (p.get("deal_type"))      q = q.eq("deal_type",      p.get("deal_type")!);
    const { data, error } = await q;
    if (error) throw error;
    return ok(data ?? []);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!maSupabaseAdmin) return err("Database not available", 503);
    const { data, error } = await maSupabaseAdmin
      .from("ma_deals")
      .insert(body)
      .select()
      .single();
    if (error) throw error;
    return ok(data);
  } catch (e) { return err(String(e)); }
}
