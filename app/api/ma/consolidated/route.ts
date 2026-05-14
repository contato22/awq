export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  initMaDB,
  listPortfolioCompanies,
  listIntercompanyTransactions,
} from "@/lib/ma-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(_req: NextRequest) {
  try {
    await initMaDB();

    const [portcos, transactions] = await Promise.all([
      listPortfolioCompanies({}),
      listIntercompanyTransactions({}),
    ]);

    // Equity portfolio
    const total_invested      = portcos.reduce((s: number, r: any) => s + (Number(r.entry_valuation)   || 0), 0);
    const total_current_value = portcos.reduce((s: number, r: any) => s + (Number(r.current_valuation) || 0), 0);
    const unrealized_gain     = total_current_value - total_invested;
    const avg_multiple        = total_invested > 0 ? total_current_value / total_invested : 0;

    // Intercompany eliminations
    const total_transactions  = transactions.length;
    const total_eliminated    = transactions
      .filter((t: any) => t.elimination_status === "eliminated")
      .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
    const pending_elimination = transactions
      .filter((t: any) => t.elimination_status !== "eliminated")
      .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

    // Media obligations
    const total_committed = portcos.reduce((s: number, r: any) => s + (Number(r.media_commitment_value) || 0), 0);
    const total_delivered = portcos.reduce((s: number, r: any) => s + (Number(r.media_delivered_value)  || 0), 0);
    const total_remaining = total_committed - total_delivered;
    const delivery_pct    = total_committed > 0 ? (total_delivered / total_committed) * 100 : 0;

    return ok({
      equity_portfolio: {
        total_invested,
        total_current_value,
        unrealized_gain,
        avg_multiple,
      },
      intercompany: {
        total_transactions,
        total_eliminated,
        pending_elimination,
      },
      media_obligations: {
        total_committed,
        total_delivered,
        total_remaining,
        delivery_pct,
      },
    });
  } catch (e) { return err(String(e)); }
}
