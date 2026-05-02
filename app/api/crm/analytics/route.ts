import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, getDashboardMetrics, listOpportunities } from "@/lib/crm-db";
import { BU_OPTIONS } from "@/lib/crm-types";
import { getForcedBu } from "@/lib/api-guard";

type Bucket = { count: number; value: number; weighted: number };
const emptyBucket = (): Bucket => ({ count: 0, value: 0, weighted: 0 });

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const forcedBu = await getForcedBu(req);
    const [dashboard, allOpps] = await Promise.all([
      getDashboardMetrics(),
      listOpportunities(forcedBu ? { bu: forcedBu } : undefined),
    ]);

    const OPEN_STAGES = new Set(["discovery","qualification","proposal","negotiation"]);
    // When BU is forced, expose only that BU's bucket; otherwise show all
    const visibleBUs = forcedBu ? [forcedBu] : [...BU_OPTIONS];
    const byBU: Record<string, Bucket> = Object.fromEntries(visibleBUs.map(b => [b, emptyBucket()]));
    const byStage: Record<string, Bucket> = Object.fromEntries([...OPEN_STAGES].map(s => [s, emptyBucket()]));

    for (const o of allOpps) {
      const weighted = o.deal_value * o.probability / 100;
      if (OPEN_STAGES.has(o.stage)) {
        const sb = byStage[o.stage];
        sb.count++;
        sb.value += o.deal_value;
        sb.weighted += weighted;
        const bb = byBU[o.bu];
        if (bb) { bb.count++; bb.value += o.deal_value; bb.weighted += weighted; }
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...dashboard, byBU, byStage },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
