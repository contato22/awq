// POST /api/epm/ap/seed
// One-time seed: creates JACQES AP entries for Danilo — 30% gross P&L Jun–Dec 2026.
// Idempotent — skips entries already present (same supplier + due_date).
//
// Gross P&L JACQES Jun+: CEM R$3.200 + André R$2.300 + Cardio Cat R$1.790 = R$7.290/mês
// Danilo share: 30% × R$7.290 = R$2.187/mês

import { NextResponse } from "next/server";
import { addAP, getAllAP, initAPARDB } from "@/lib/ap-ar-db";

const JACQES_GROSS_MRR = 7_290;
const DANILO_SHARE     = 0.30;
const MONTHLY_AMOUNT   = Math.round(JACQES_GROSS_MRR * DANILO_SHARE * 100) / 100; // 2187

export async function POST() {
  try {
    await initAPARDB();

    const existing = await getAllAP({ bu_code: "JACQES" });
    const existingKeys = new Set(
      existing.map((i) => `${i.supplier_name}::${i.due_date}`)
    );

    const months = ["06","07","08","09","10","11","12"];
    const created: string[] = [];
    const skipped:  string[] = [];

    for (const m of months) {
      const due_date = `2026-${m}-25`;
      const key = `Danilo::${due_date}`;

      if (existingKeys.has(key)) {
        skipped.push(key);
        continue;
      }

      await addAP({
        bu_code:       "JACQES",
        supplier_name: "Danilo",
        supplier_type: "other",
        description:   `Distribuição resultado JACQES — 30% P&L bruto ${due_date.slice(0, 7)}`,
        category:      "Distribuição de Resultado",
        issue_date:    due_date,
        due_date,
        gross_amount:  MONTHLY_AMOUNT,
        source_system: "seed-jacqes-2026",
      });

      created.push(key);
    }

    return NextResponse.json({
      success:      true,
      monthly:      MONTHLY_AMOUNT,
      total:        MONTHLY_AMOUNT * months.length,
      created:      created.length,
      skipped:      skipped.length,
      createdKeys:  created,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
