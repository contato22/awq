import { NextRequest, NextResponse } from "next/server";
import { listOpportunities } from "@/lib/crm-db";
import { getForcedBu } from "@/lib/api-guard";
import type { CrmOpportunity } from "@/lib/crm-types";

export async function GET(req: NextRequest) {
  try {
    const forcedBu = await getForcedBu(req);
    const opps = await listOpportunities(forcedBu ? { bu: forcedBu } : undefined);

    const activeStages = ["discovery", "qualification", "proposal", "negotiation"] as const;
    const byStage: Record<string, CrmOpportunity[]> = {};
    for (const stage of activeStages) {
      byStage[stage] = opps.filter(o => o.stage === stage);
    }
    const closedWon  = opps.filter(o => o.stage === "closed_won");
    const closedLost = opps.filter(o => o.stage === "closed_lost");

    const open = opps.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");

    return NextResponse.json({
      success: true,
      data: {
        byStage,
        closedWon,
        closedLost,
        totalPipeline: open.reduce((sum, o) => sum + o.deal_value, 0),
        weightedForecast: open.reduce((sum, o) => sum + o.deal_value * o.probability / 100, 0),
        openDeals: open.length,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
