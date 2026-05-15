import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getForcedBu } from "@/lib/api-guard";
import type { CrmOpportunity } from "@/lib/crm-types";
import { STAGE_PROBABILITY } from "@/lib/crm-types";

export async function GET(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 503 });
    }

    const forcedBu = await getForcedBu(req);

    let query = supabase
      .from("crm_opportunities")
      .select(`
        *,
        crm_accounts ( account_name ),
        crm_contacts ( full_name )
      `)
      .order("created_at", { ascending: false });

    if (forcedBu) query = query.eq("bu", forcedBu);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const allOpps: CrmOpportunity[] = (data ?? []).map((row: Record<string, unknown>) => {
      const acct = row.crm_accounts as { account_name?: string } | null;
      const cont = row.crm_contacts as { full_name?: string } | null;
      return {
        ...row,
        account_name: acct?.account_name ?? undefined,
        contact_name: cont?.full_name ?? null,
        crm_accounts: undefined,
        crm_contacts: undefined,
      } as unknown as CrmOpportunity;
    });

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
