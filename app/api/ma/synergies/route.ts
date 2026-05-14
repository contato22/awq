import { NextRequest, NextResponse } from "next/server";
import { maSupabaseAdmin } from "@/lib/ma-supabase";
import { SEED_SYNERGIES } from "@/lib/ma-db";

function ok(data: unknown)              { return NextResponse.json({ success: true,  data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    if (!maSupabaseAdmin) return ok(SEED_SYNERGIES);
    const p = req.nextUrl.searchParams;
    let q = maSupabaseAdmin
      .from("ma_synergy_opportunities")
      .select("*")
      .order("created_at", { ascending: false });
    if (p.get("portco_id"))  q = q.eq("portco_id",  p.get("portco_id")!);
    if (p.get("source_bu"))  q = q.eq("source_bu",  p.get("source_bu")!);
    const { data, error } = await q;
    if (error) throw error;
    return ok(data ?? []);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, synergy_id, ...rest } = body;
    if (!maSupabaseAdmin) return err("Database not available", 503);

    if (action === "create") {
      const { data, error } = await maSupabaseAdmin
        .from("ma_synergy_opportunities")
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    if (action === "update") {
      if (!synergy_id) return err("synergy_id required", 400);
      const { data, error } = await maSupabaseAdmin
        .from("ma_synergy_opportunities")
        .update(rest)
        .eq("synergy_id", synergy_id)
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
