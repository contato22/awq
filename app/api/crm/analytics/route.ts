import { NextResponse } from "next/server";
import { initCrmDB, getDashboardMetrics, listOpportunities } from "@/lib/crm-db";

export async function GET() {
  try {
    await initCrmDB();
    const [dashboard, allOpps] = await Promise.all([
      getDashboardMetrics(),
      listOpportunities(),
    ]);

    // Pipeline by BU
    const buList = ["JACQES","CAZA","ADVISOR","VENTURE"];
    const byBU: Record<string, { count: number; value: number; weighted: number }> = {};
    for (const bu of buList) {
      const opps = allOpps.filter(o => o.bu === bu && o.stage !== "closed_won" && o.stage !== "closed_lost");
      byBU[bu] = {
        count:    opps.length,
        value:    opps.reduce((s, o) => s + o.deal_value, 0),
        weighted: opps.reduce((s, o) => s + o.deal_value * o.probability / 100, 0),
      };
    }

    // Pipeline by stage
    const stageList = ["discovery","qualification","proposal","negotiation"];
    const byStage: Record<string, { count: number; value: number; weighted: number }> = {};
    for (const stage of stageList) {
      const opps = allOpps.filter(o => o.stage === stage);
      byStage[stage] = {
        count:    opps.length,
        value:    opps.reduce((s, o) => s + o.deal_value, 0),
        weighted: opps.reduce((s, o) => s + o.deal_value * o.probability / 100, 0),
      };
    }

    return NextResponse.json({
      success: true,
      data: { ...dashboard, byBU, byStage },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
