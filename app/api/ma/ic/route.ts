import { NextRequest, NextResponse } from "next/server";
import { maSupabaseAdmin } from "@/lib/ma-supabase";
import { SEED_IC_MEETINGS, SEED_IC_DECISIONS } from "@/lib/ma-db";

function ok(data: unknown)              { return NextResponse.json({ success: true,  data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const dealId = p.get("deal_id") ?? undefined;

    if (!maSupabaseAdmin) {
      return ok({
        meetings:  SEED_IC_MEETINGS,
        decisions: dealId ? SEED_IC_DECISIONS.filter(d => d.deal_id === dealId) : SEED_IC_DECISIONS,
      });
    }

    let dq = maSupabaseAdmin
      .from("ma_ic_decisions")
      .select("*")
      .order("decision_date", { ascending: false });
    if (dealId) dq = dq.eq("deal_id", dealId);

    const [meetingsRes, decisionsRes] = await Promise.all([
      maSupabaseAdmin.from("ma_ic_meetings").select("*").order("meeting_date", { ascending: false }),
      dq,
    ]);
    if (meetingsRes.error)  throw meetingsRes.error;
    if (decisionsRes.error) throw decisionsRes.error;

    return ok({ meetings: meetingsRes.data ?? [], decisions: decisionsRes.data ?? [] });
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    const body    = await req.json();
    const { action, ...rest } = body;
    if (!maSupabaseAdmin) return err("Database not available", 503);

    if (action === "create_meeting") {
      const { data, error } = await maSupabaseAdmin
        .from("ma_ic_meetings")
        .insert({
          meeting_date: rest.meeting_date,
          meeting_type: rest.meeting_type ?? "deal_review",
          attendees:    rest.attendees ? (typeof rest.attendees === "string" ? rest.attendees.split(",").map((s: string) => s.trim()) : rest.attendees) : null,
          deals_reviewed: rest.deals_reviewed ?? null,
          minutes_url:    rest.minutes_url    ?? null,
          status:         rest.status         ?? "scheduled",
        })
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    if (action === "create_decision") {
      const { data, error } = await maSupabaseAdmin
        .from("ma_ic_decisions")
        .insert({
          ic_meeting_id:      rest.ic_meeting_id      ?? null,
          deal_id:            rest.deal_id,
          decision:           rest.decision           ?? "deferred",
          decision_date:      rest.decision_date,
          votes:              rest.votes              ?? null,
          vote_result:        rest.vote_result        ?? null,
          decision_rationale: rest.decision_rationale ?? null,
          conditions:         rest.conditions         ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
