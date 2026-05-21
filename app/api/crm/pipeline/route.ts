import { NextRequest, NextResponse } from "next/server";
import { getForcedBu } from "@/lib/api-guard";
import { listOpportunities } from "@/lib/crm-db";
import { STAGE_PROBABILITY } from "@/lib/crm-types";
import type { CrmOpportunity } from "@/lib/crm-types";

export async function GET(req: NextRequest) {
  try {
    const forcedBu = await getForcedBu(req);
    const allOpps = await listOpportunities(forcedBu ? { bu: forcedBu } : undefined);

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
