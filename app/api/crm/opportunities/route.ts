import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseClient } from "@/lib/supabase";
import { getForcedBu } from "@/lib/api-guard";
import { STAGE_PROBABILITY } from "@/lib/crm-types";
import type { CrmOpportunity } from "@/lib/crm-types";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

function mapRow(row: Record<string, unknown>): CrmOpportunity {
  const acct = row.crm_accounts as { account_name?: string } | null;
  const cont = row.crm_contacts as { full_name?: string } | null;
  return {
    ...row,
    account_name: acct?.account_name ?? undefined,
    contact_name: cont?.full_name ?? null,
    crm_accounts: undefined,
    crm_contacts: undefined,
  } as unknown as CrmOpportunity;
}

const SELECT = `*, crm_accounts ( account_name ), crm_contacts ( full_name )`;

export async function GET(req: NextRequest) {
  const db = supabase ?? supabaseClient;
  try {
    const p = req.nextUrl.searchParams;
    const forcedBu = await getForcedBu(req);
    const id = p.get("id");

    if (id) {
      const { data, error } = await db
        .from("crm_opportunities")
        .select(SELECT)
        .eq("opportunity_id", id)
        .single();
      if (error || !data) return err("Not found", 404);
      const row = mapRow(data as Record<string, unknown>);
      if (forcedBu && row.bu !== forcedBu) return err("Not found", 404);
      return ok(row);
    }

    let query = db.from("crm_opportunities").select(SELECT).order("created_at", { ascending: false });
    if (forcedBu ?? p.get("bu")) query = query.eq("bu", forcedBu ?? p.get("bu")!);
    if (p.get("stage"))      query = query.eq("stage", p.get("stage")!);
    if (p.get("owner"))      query = query.eq("owner", p.get("owner")!);
    if (p.get("account_id")) query = query.eq("account_id", p.get("account_id")!);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ok((data ?? []).map((r: Record<string, unknown>) => mapRow(r)));
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  const db = supabase ?? supabaseClient;
  try {
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.opportunity_name || !data.bu) return err("opportunity_name and bu required", 400);
      const stage = data.stage ?? "discovery";
      const { data: row, error } = await db
        .from("crm_opportunities")
        .insert({
          opportunity_name: data.opportunity_name,
          account_id: data.account_id ?? null,
          contact_id: data.contact_id ?? null,
          bu: data.bu,
          stage,
          probability: data.probability ?? STAGE_PROBABILITY[stage as keyof typeof STAGE_PROBABILITY] ?? 25,
          deal_value: data.deal_value ?? 0,
          expected_close_date: data.expected_close_date ?? null,
          owner: data.owner ?? "Miguel",
          proposal_sent_date: data.proposal_sent_date ?? null,
          created_by: data.owner ?? "Miguel",
        })
        .select(SELECT)
        .single();
      if (error) throw new Error(error.message);
      return ok(mapRow(row as Record<string, unknown>));
    }

    if (action === "update" || action === "close") {
      const { opportunity_id, ...rest } = data;
      if (!opportunity_id) return err("opportunity_id required", 400);
      if (rest.stage) rest.probability = STAGE_PROBABILITY[rest.stage as keyof typeof STAGE_PROBABILITY] ?? rest.probability;
      const { data: row, error } = await db
        .from("crm_opportunities")
        .update(rest)
        .eq("opportunity_id", opportunity_id)
        .select(SELECT)
        .single();
      if (error) throw new Error(error.message);
      return ok(mapRow(row as Record<string, unknown>));
    }

    if (action === "delete") {
      const { opportunity_id } = data;
      if (!opportunity_id) return err("opportunity_id required", 400);
      const { error } = await db
        .from("crm_opportunities")
        .delete()
        .eq("opportunity_id", opportunity_id);
      if (error) throw new Error(error.message);
      return ok({ deleted: true });
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
