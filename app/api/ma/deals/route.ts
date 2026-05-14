import { NextRequest, NextResponse } from "next/server";
import {
  initMaDB,
  listDeals,
  createDeal,
  updateDeal,
  createPortfolioCompany,
} from "@/lib/ma-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initMaDB();
    const p = req.nextUrl.searchParams;
    const rows = await listDeals({
      pipeline_stage: p.get("pipeline_stage") ?? undefined,
      deal_type:      p.get("deal_type")      ?? undefined,
    });
    return ok(rows);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    await initMaDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.deal_name?.trim())    return err("deal_name required", 400);
      if (!data.company_name?.trim()) return err("company_name required", 400);
      if (!data.deal_type?.trim())    return err("deal_type required", 400);
      const row = await createDeal(data);
      return ok(row);
    }

    if (action === "update") {
      const { deal_id, ...rest } = data;
      if (!deal_id) return err("deal_id required", 400);
      const row = await updateDeal(deal_id, rest);
      return ok(row);
    }

    if (action === "close") {
      const { deal_id, pipeline_stage, close_reason, ...rest } = data;
      if (!deal_id)        return err("deal_id required", 400);
      if (!pipeline_stage) return err("pipeline_stage required", 400);
      if (pipeline_stage !== "closed_won" && pipeline_stage !== "closed_lost") {
        return err("pipeline_stage must be closed_won or closed_lost", 400);
      }
      if (!close_reason?.trim()) return err("close_reason required", 400);

      let portco_id: string | undefined;

      if (pipeline_stage === "closed_won") {
        const {
          legal_name,
          awq_ownership_pct,
          awq_shares_held,
          total_shares_outstanding,
          entry_valuation,
          media_commitment_value,
          media_delivery_period_months,
        } = rest;

        const portco = await createPortfolioCompany({
          deal_id,
          legal_name,
          awq_ownership_pct,
          awq_shares_held,
          total_shares_outstanding,
          entry_valuation,
          media_commitment_value,
          media_delivery_period_months,
          ...rest,
        });
        portco_id = portco?.portco_id ?? null;
      }

      const updatedDeal = await updateDeal(deal_id, {
        pipeline_stage,
        close_reason,
        ...(portco_id ? { portco_id } : {}),
      });

      return ok({ deal: updatedDeal, portco_id: portco_id ?? null });
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
