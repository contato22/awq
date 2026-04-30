import { NextResponse } from "next/server";
import { initCrmDB, listOpportunities, getPipelineMetrics } from "@/lib/crm-db";
import type { CrmOpportunity } from "@/lib/crm-types";

export async function GET() {
  try {
    await initCrmDB();
    const [metrics, allOpps] = await Promise.all([
      getPipelineMetrics(),
      listOpportunities(),
    ]);

    const activeStages = ["discovery","qualification","proposal","negotiation"] as const;
    const byStage: Record<string, CrmOpportunity[]> = {};
    for (const stage of activeStages) {
      byStage[stage] = allOpps.filter(o => o.stage === stage);
    }
    const closedWon  = allOpps.filter(o => o.stage === "closed_won");
    const closedLost = allOpps.filter(o => o.stage === "closed_lost");

    return NextResponse.json({
      success: true,
      data: {
        ...metrics,
        byStage,
        closedWon,
        closedLost,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
