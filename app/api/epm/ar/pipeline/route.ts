// GET /api/epm/ar/pipeline
// Returns aggregated pipeline status: Cadastro → Conciliação → DFC → DRE → Balanço

import { NextResponse } from "next/server";
import { getAllAR, initAPARDB } from "@/lib/ap-ar-db";
import { getPddRate } from "@/lib/ar-coa";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initAPARDB(); _ready = true; }
}

function r2(n: number) { return Math.round(n * 100) / 100; }

export async function GET() {
  try {
    await ensureDB();
    const items = await getAllAR();

    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);
    const lastMonth = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().slice(0, 7);
    })();

    const active = items.filter((i) => i.status !== "CANCELLED");

    // ── Conciliação ────────────────────────────────────────────────────────────
    const pendingItems = active.filter((i) => i.status === "PENDING" || i.status === "PARTIAL");
    const overdueItems = active.filter((i) => {
      if (i.status === "RECEIVED") return false;
      return i.due_date < today;
    });
    const conciliacao = {
      pendingCount:  pendingItems.length,
      pendingAmount: r2(pendingItems.reduce((s, i) => s + i.net_amount, 0)),
      overdueCount:  overdueItems.length,
      overdueAmount: r2(overdueItems.reduce((s, i) => s + i.net_amount, 0)),
      topPending: pendingItems
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .slice(0, 5)
        .map((i) => ({ id: i.id, customer_name: i.customer_name, net_amount: i.net_amount, due_date: i.due_date, status: i.status })),
    };

    // ── DFC ────────────────────────────────────────────────────────────────────
    const receivedThisMonth = active
      .filter((i) => i.status === "RECEIVED" && i.received_date?.startsWith(thisMonth));
    const receivedLastMonth = active
      .filter((i) => i.status === "RECEIVED" && i.received_date?.startsWith(lastMonth));
    const dueThisMonthNotReceived = active
      .filter((i) => i.status !== "RECEIVED" && i.due_date.startsWith(thisMonth));
    const dfc = {
      receivedThisMonthCount:  receivedThisMonth.length,
      receivedThisMonthAmount: r2(receivedThisMonth.reduce((s, i) => s + (i.received_amount ?? i.net_amount), 0)),
      receivedLastMonthAmount: r2(receivedLastMonth.reduce((s, i) => s + (i.received_amount ?? i.net_amount), 0)),
      pendingThisMonthCount:   dueThisMonthNotReceived.length,
      pendingThisMonthAmount:  r2(dueThisMonthNotReceived.reduce((s, i) => s + i.net_amount, 0)),
    };

    // ── DRE (competência — emissão) ────────────────────────────────────────────
    const issuedThisMonth = active.filter((i) => i.issue_date.startsWith(thisMonth));
    const issuedYtd       = active.filter((i) => i.issue_date.startsWith(thisMonth.slice(0, 4)));
    const dre = {
      grossThisMonth:  r2(issuedThisMonth.reduce((s, i) => s + i.gross_amount, 0)),
      netThisMonth:    r2(issuedThisMonth.reduce((s, i) => s + i.net_amount, 0)),
      issThisMonth:    r2(issuedThisMonth.reduce((s, i) => s + i.iss_amount + i.pis_amount + i.cofins_amount, 0)),
      grossYtd:        r2(issuedYtd.reduce((s, i) => s + i.gross_amount, 0)),
      netYtd:          r2(issuedYtd.reduce((s, i) => s + i.net_amount, 0)),
      invoiceCountYtd: issuedYtd.length,
    };

    // ── Balanço (AR líquido) ───────────────────────────────────────────────────
    const outstandingItems = active.filter((i) => i.status !== "RECEIVED");
    const grossAr = r2(outstandingItems.reduce((s, i) => s + i.gross_amount, 0));

    // PDD: estimate per item based on account_code
    let pddEstimate = 0;
    for (const item of outstandingItems) {
      const rate = item.account_code ? getPddRate(item.account_code) : 0.02;
      pddEstimate += item.gross_amount * rate;
    }
    pddEstimate = r2(pddEstimate);

    // Group by top-level account (1.1.2.x)
    const accountGroups: Record<string, { label: string; gross: number; pdd: number }> = {
      "1.1.2.1": { label: "Serviços Nacionais",  gross: 0, pdd: 0 },
      "1.1.2.2": { label: "Internacional",        gross: 0, pdd: 0 },
      "1.1.2.3": { label: "Capital / Advisory",   gross: 0, pdd: 0 },
      "1.1.2.4": { label: "Platform (SaaS)",      gross: 0, pdd: 0 },
      "1.1.2.5": { label: "Partes Relacionadas",  gross: 0, pdd: 0 },
      "_other":  { label: "Sem conta CoA",        gross: 0, pdd: 0 },
    };
    for (const item of outstandingItems) {
      const prefix = item.account_code?.slice(0, 7) ?? "_other";
      const key = accountGroups[prefix] ? prefix : "_other";
      const rate = item.account_code ? getPddRate(item.account_code) : 0.02;
      accountGroups[key].gross += item.gross_amount;
      accountGroups[key].pdd   += item.gross_amount * rate;
    }
    const byAccountGroup = Object.entries(accountGroups)
      .filter(([, v]) => v.gross > 0)
      .map(([code, v]) => ({
        code,
        label:  v.label,
        gross:  r2(v.gross),
        pdd:    r2(v.pdd),
        net:    r2(v.gross - v.pdd),
      }));

    const balanco = {
      grossAr,
      pddEstimate,
      netAr:      r2(grossAr - pddEstimate),
      overdueAr:  r2(overdueItems.reduce((s, i) => s + i.gross_amount, 0)),
      byAccountGroup,
    };

    return NextResponse.json({
      success: true,
      data: { conciliacao, dfc, dre, balanco },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
