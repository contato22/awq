import { NextRequest, NextResponse } from "next/server";
import { maSupabaseAdmin } from "@/lib/ma-supabase";
import { SEED_PORTCOS } from "@/lib/ma-db";

function ok(data: unknown)              { return NextResponse.json({ success: true,  data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    if (!maSupabaseAdmin) return ok(SEED_PORTCOS);
    const p = req.nextUrl.searchParams;
    let q = maSupabaseAdmin
      .from("ma_portfolio_companies")
      .select("*")
      .order("investment_date", { ascending: false });
    if (p.get("status")) q = q.eq("status", p.get("status")!);
    const { data, error } = await q;
    if (error) throw error;
    return ok(data ?? []);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, portco_id, ...rest } = body;

    if (action === "get_one") {
      if (!maSupabaseAdmin) {
        const found = SEED_PORTCOS.find(p => p.portco_id === portco_id);
        return found ? ok(found) : err("Not found", 404);
      }
      const { data, error } = await maSupabaseAdmin
        .from("ma_portfolio_companies")
        .select("*")
        .eq("portco_id", portco_id)
        .single();
      if (error) throw error;
      return ok(data);
    }

    if (action === "create") {
      if (!maSupabaseAdmin) return err("Database not available", 503);
      const { data, error } = await maSupabaseAdmin
        .from("ma_portfolio_companies")
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    if (action === "update") {
      if (!maSupabaseAdmin) return err("Database not available", 503);
      const { data, error } = await maSupabaseAdmin
        .from("ma_portfolio_companies")
        .update(rest)
        .eq("portco_id", portco_id)
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
