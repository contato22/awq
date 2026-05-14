import { NextResponse } from "next/server";
import { maSupabaseAdmin } from "@/lib/ma-supabase";
import { SEED_PORTCOS, SEED_INTERCOMPANY, SEED_MEDIA_DELIVERABLES } from "@/lib/ma-db";

function ok(data: unknown)              { return NextResponse.json({ success: true,  data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET() {
  try {
    let portcos   = SEED_PORTCOS;
    let icTxns    = SEED_INTERCOMPANY;
    let media     = SEED_MEDIA_DELIVERABLES;

    if (maSupabaseAdmin) {
      const [portcosRes, icRes, mediaRes] = await Promise.all([
        maSupabaseAdmin.from("ma_portfolio_companies").select("*"),
        maSupabaseAdmin.from("ma_intercompany_transactions").select("*"),
        maSupabaseAdmin.from("ma_media_deliverables").select("*"),
      ]);
      if (portcosRes.error) throw portcosRes.error;
      if (icRes.error)      throw icRes.error;
      if (mediaRes.error)   throw mediaRes.error;
      portcos = portcosRes.data as typeof portcos;
      icTxns  = icRes.data  as typeof icTxns;
      media   = mediaRes.data as typeof media;
    }

    const totalInvested      = portcos.reduce((s, p) => s + (p.entry_valuation   ?? 0), 0);
    const totalCurrentValue  = portcos.reduce((s, p) => s + (p.current_valuation ?? p.entry_valuation ?? 0), 0);
    const unrealizedGain     = totalCurrentValue - totalInvested;
    const avgMultiple        = totalInvested > 0 ? totalCurrentValue / totalInvested : 1;

    const eliminated         = icTxns.filter(t => t.elimination_status === "eliminated").length;
    const pending            = icTxns.filter(t => t.elimination_status === "pending").length;

    const totalCommitted     = portcos.reduce((s, p) => s + (p.media_commitment_value  ?? 0), 0);
    const totalDelivered     = media.filter(m => m.status === "approved").reduce((s, m) => s + (m.agreed_value ?? 0), 0);
    const totalRemaining     = totalCommitted - totalDelivered;
    const deliveryPct        = totalCommitted > 0 ? Math.round((totalDelivered / totalCommitted) * 100) : 0;

    return ok({
      equity_portfolio: {
        total_invested:       totalInvested,
        total_current_value:  totalCurrentValue,
        unrealized_gain:      unrealizedGain,
        avg_multiple:         Math.round(avgMultiple * 100) / 100,
      },
      intercompany: {
        total_transactions:  icTxns.length,
        total_eliminated:    eliminated,
        pending_elimination: pending,
      },
      media_obligations: {
        total_committed:  totalCommitted,
        total_delivered:  totalDelivered,
        total_remaining:  totalRemaining,
        delivery_pct:     deliveryPct,
      },
    });
  } catch (e) { return err(String(e)); }
}
