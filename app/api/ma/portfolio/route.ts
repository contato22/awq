export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  initMaDB,
  listPortfolioCompanies,
  updatePortfolioCompany,
  listCapTable,
  listPortcoKpis,
  listBoardMeetings,
  listMediaDeliverables,
} from "@/lib/ma-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initMaDB();
    const p = req.nextUrl.searchParams;
    const rows = await listPortfolioCompanies({
      status: p.get("status") ?? undefined,
    });

    const total_portcos       = rows.length;
    const active_portcos      = rows.filter((r: any) => r.status === "active").length;
    const total_investment    = rows.reduce((s: number, r: any) => s + (Number(r.entry_valuation) || 0), 0);
    const total_current_value = rows.reduce((s: number, r: any) => s + (Number(r.current_valuation) || 0), 0);
    const total_unrealized_gain = total_current_value - total_investment;
    const weighted_avg_multiple =
      total_investment > 0 ? total_current_value / total_investment : 0;
    const total_media_committed  = rows.reduce((s: number, r: any) => s + (Number(r.media_commitment_value) || 0), 0);
    const total_media_delivered  = rows.reduce((s: number, r: any) => s + (Number(r.media_delivered_value)  || 0), 0);
    const media_delivery_pct     = total_media_committed > 0
      ? (total_media_delivered / total_media_committed) * 100
      : 0;

    const totals = {
      total_portcos,
      active_portcos,
      total_investment,
      total_current_value,
      total_unrealized_gain,
      weighted_avg_multiple,
      total_media_committed,
      total_media_delivered,
      media_delivery_pct,
    };

    return NextResponse.json({ success: true, data: rows, totals });
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    await initMaDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "update") {
      const { portco_id, ...rest } = data;
      if (!portco_id) return err("portco_id required", 400);
      const row = await updatePortfolioCompany(portco_id, rest);
      return ok(row);
    }

    if (action === "get_one") {
      const { portco_id } = data;
      if (!portco_id) return err("portco_id required", 400);

      const [allCompanies, capTable, recentKpis, boardMeetings, mediaDeliverables] = await Promise.all([
        listPortfolioCompanies(),
        listCapTable(portco_id),
        listPortcoKpis(portco_id),
        listBoardMeetings(portco_id),
        listMediaDeliverables(portco_id),
      ]);

      const companies = Array.isArray(allCompanies) ? allCompanies.filter(c => c.portco_id === portco_id) : [];
      const portco = companies[0];
      if (!portco) return err("Portfolio company not found", 404);

      return ok({
        portco,
        cap_table:         capTable,
        recent_kpis:       recentKpis,
        board_meetings:    boardMeetings,
        media_deliverables: mediaDeliverables,
      });
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
