import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseClient } from "@/lib/supabase";
import { getForcedBu } from "@/lib/api-guard";
import type { CrmOpportunity } from "@/lib/crm-types";
import { STAGE_PROBABILITY } from "@/lib/crm-types";

export async function GET(req: NextRequest) {
  try {
    const db = supabase ?? supabaseClient;
    const forcedBu = await getForcedBu(req);

    // Simple select without embedded joins to avoid PostgREST schema cache issues
    let query = db
      .from("crm_opportunities")
      .select("*")
      .order("created_at", { ascending: false });

    if (forcedBu) query = query.eq("bu", forcedBu);

    const { data: oppsData, error: oppsError } = await query;
    if (oppsError) throw new Error(oppsError.message);

    const opps = (oppsData ?? []) as CrmOpportunity[];

    // Fetch account names separately
    const accountIds = [...new Set(opps.map(o => o.account_id).filter(Boolean))];
    const contactIds = [...new Set(opps.map(o => o.contact_id).filter(Boolean))];

    const [acctRes, contRes] = await Promise.all([
      accountIds.length > 0
        ? db.from("crm_accounts").select("account_id, account_name").in("account_id", accountIds as string[])
        : Promise.resolve({ data: [], error: null }),
      contactIds.length > 0
        ? db.from("crm_contacts").select("contact_id, full_name").in("contact_id", contactIds as string[])
        : Promise.resolve({ data: [], error: null }),
    ]);

    const acctMap = Object.fromEntries((acctRes.data ?? []).map((a: Record<string, string>) => [a.account_id, a.account_name]));
    const contMap = Object.fromEntries((contRes.data ?? []).map((c: Record<string, string>) => [c.contact_id, c.full_name]));

    const allOpps: CrmOpportunity[] = opps.map(o => ({
      ...o,
      account_name: o.account_id ? (acctMap[o.account_id] ?? o.account_name) : o.account_name,
      contact_name: o.contact_id ? (contMap[o.contact_id] ?? o.contact_name) : o.contact_name,
    }));

    const activeStages = ["discovery", "qualification", "proposal", "negotiation"] as const;
    const byStage: Record<string, CrmOpportunity[]> = {};
    for (const stage of activeStages) {
      byStage[stage] = allOpps.filter(o => o.stage === stage);
    }
    const closedWon  = allOpps.filter(o => o.stage === "closed_won");
    const closedLost = allOpps.filter(o => o.stage === "closed_lost");

    const open = allOpps.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");
    const metrics = {
      byStage: Object.fromEntries(
        activeStages.map(stage => {
          const s = open.filter(o => o.stage === stage);
          return [stage, {
            count: s.length,
            value: s.reduce((sum, o) => sum + o.deal_value, 0),
            weighted: s.reduce((sum, o) => sum + o.deal_value * (STAGE_PROBABILITY[stage] ?? o.probability) / 100, 0),
          }];
        })
      ),
      totalPipeline: open.reduce((sum, o) => sum + o.deal_value, 0),
      weightedForecast: open.reduce((sum, o) => sum + o.deal_value * o.probability / 100, 0),
      openDeals: open.length,
    };

    return NextResponse.json({
      success: true,
      data: { ...metrics, byStage, closedWon, closedLost },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
