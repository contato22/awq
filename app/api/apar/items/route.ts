import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const TABLE = "awq_apar_items";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET() {
  if (!supabase) return ok([]);
  const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: false });
  if (error) return err(error.message);
  return ok(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!supabase) return err("Supabase not configured", 503);
  const body = await req.json();
  const { action, ...payload } = body as { action: string; [k: string]: unknown };

  if (action === "upsert") {
    const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "id" });
    if (error) return err(error.message);
    return ok(null);
  }

  if (action === "delete") {
    const { id } = payload as { id: string };
    if (!id) return err("id required", 400);
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) return err(error.message);
    return ok(null);
  }

  return err("Unknown action", 400);
}
