import { NextRequest, NextResponse } from "next/server";
import { maSupabaseAdmin } from "@/lib/ma-supabase";
import { SEED_INTERCOMPANY } from "@/lib/ma-db";

function ok(data: unknown)              { return NextResponse.json({ success: true,  data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    if (!maSupabaseAdmin) return ok(SEED_INTERCOMPANY);
    const p  = req.nextUrl.searchParams;
    let q = maSupabaseAdmin
      .from("ma_intercompany_transactions")
      .select("*")
      .order("transaction_date", { ascending: false });
    if (p.get("from_entity_id")) q = q.eq("from_entity_id", p.get("from_entity_id")!);
    if (p.get("to_entity_id"))   q = q.eq("to_entity_id",   p.get("to_entity_id")!);
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
      .from("ma_intercompany_transactions")
      .insert(body)
      .select()
      .single();
    if (error) throw error;
    return ok(data);
  } catch (e) { return err(String(e)); }
}
