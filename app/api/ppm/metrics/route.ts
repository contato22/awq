import { NextResponse } from "next/server";
import { getPortfolioMetrics, getResourceUtilization, listProjects } from "@/lib/ppm-db";

function ok(data: unknown)          { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400)  { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET() {
  try {
    const [metrics, utilization, projects] = await Promise.all([
      getPortfolioMetrics(),
      getResourceUtilization(),
      listProjects(),
    ]);

    // Profitability table with EVM
    const profitability = projects.map(p => {
      const pv  = p.budget_cost;
      const ac  = p.actual_cost;
      const ev  = p.budget_revenue > 0 ? (p.actual_revenue / p.budget_revenue) * p.budget_cost : 0;
      const cpi = ac > 0   ? ev / ac  : null;
      const spi = pv > 0   ? ev / pv  : null;
      const etc = cpi && cpi > 0 ? (pv - ev) / cpi : null;
      const eac = etc != null ? ac + etc : null;
      return {
        project_id:       p.project_id,
        project_code:     p.project_code,
        project_name:     p.project_name,
        bu_code:          p.bu_code,
        status:           p.status,
        budget_revenue:   p.budget_revenue,
        actual_revenue:   p.actual_revenue,
        budget_cost:      p.budget_cost,
        actual_cost:      p.actual_cost,
        budget_margin:    p.budget_revenue - p.budget_cost,
        actual_margin:    p.actual_revenue - p.actual_cost,
        budget_margin_pct:p.budget_revenue > 0 ? ((p.budget_revenue - p.budget_cost) / p.budget_revenue) * 100 : 0,
        actual_margin_pct:p.actual_revenue > 0 ? ((p.actual_revenue - p.actual_cost) / p.actual_revenue) * 100 : 0,
        planned_value:    pv,
        earned_value:     ev,
        actual_cost_evm:  ac,
        cpi,
        spi,
        etc,
        eac,
      };
    });

    return ok({ metrics, utilization, profitability });
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
