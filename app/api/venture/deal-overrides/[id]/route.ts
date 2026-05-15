import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const TABLE = "venture_deal_overrides";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!supabase) return ok({});
  const { data, error } = await supabase.from(TABLE).select("data").eq("deal_id", params.id).maybeSingle();
  if (error) return err(error.message);
  return ok(data?.data ?? {});
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!supabase) return err("Supabase not configured", 503);
  const body = await req.json();
  const { error } = await supabase.from(TABLE).upsert(
    { deal_id: params.id, data: body, updated_at: new Date().toISOString() },
    { onConflict: "deal_id" }
  );
  if (error) return err(error.message);
  return ok(null);
}
