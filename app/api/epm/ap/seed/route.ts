// POST /api/epm/ap/seed
// One-time seed: JACQES AP entries Jun–Dec 2026.
// Idempotent — skips entries already present (same supplier + due_date).
//
// Gross P&L JACQES Jun+: CEM R$3.200 + André R$2.300 + Cardio Cat R$1.790 = R$7.290/mês
// Danilo share : 30% × R$7.290 = R$2.187/mês  (venc dia 25)
// Aluguel sala : R$800/mês                      (venc dia 10)

import { NextResponse } from "next/server";
import { addAP, getAllAP, initAPARDB } from "@/lib/ap-ar-db";

const JACQES_GROSS_MRR = 7_290;
const DANILO_AMOUNT    = Math.round(JACQES_GROSS_MRR * 0.30 * 100) / 100; // 2187
const RENT_AMOUNT      = 800;

interface APSeedEntry {
  supplier_name: string;
  supplier_type: "other" | "rent";
  description:   string;
  category:      string;
  due_day:       number;
  gross_amount:  number;
}

const ENTRIES: APSeedEntry[] = [
  {
    supplier_name: "Danilo",
    supplier_type: "other",
    description:   "Distribuição resultado JACQES — 30% P&L bruto",
    category:      "Distribuição de Resultado",
    due_day:       25,
    gross_amount:  DANILO_AMOUNT,
  },
  {
    supplier_name: "Aluguel Sala",
    supplier_type: "rent",
    description:   "Aluguel sala JACQES",
    category:      "Aluguel",
    due_day:       10,
    gross_amount:  RENT_AMOUNT,
  },
];

export async function POST() {
  try {
    await initAPARDB();

    const existing = await getAllAP({ bu_code: "JACQES" });
    const existingKeys = new Set(
      existing.map((i) => `${i.supplier_name}::${i.due_date}`)
    );

    const months  = ["06","07","08","09","10","11","12"];
    const created: string[] = [];
    const skipped: string[] = [];

    for (const entry of ENTRIES) {
      for (const m of months) {
        const due_date = `2026-${m}-${String(entry.due_day).padStart(2, "0")}`;
        const key = `${entry.supplier_name}::${due_date}`;

        if (existingKeys.has(key)) {
          skipped.push(key);
          continue;
        }

        await addAP({
          bu_code:       "JACQES",
          supplier_name: entry.supplier_name,
          supplier_type: entry.supplier_type,
          description:   `${entry.description} — ${due_date.slice(0, 7)}`,
          category:      entry.category,
          issue_date:    due_date,
          due_date,
          gross_amount:  entry.gross_amount,
          source_system: "seed-jacqes-2026",
        });

        created.push(key);
      }
    }

    return NextResponse.json({
      success:     true,
      created:     created.length,
      skipped:     skipped.length,
      createdKeys: created,
      summary: {
        danilo_monthly: DANILO_AMOUNT,
        rent_monthly:   RENT_AMOUNT,
        total_monthly:  DANILO_AMOUNT + RENT_AMOUNT,
        total_7months:  (DANILO_AMOUNT + RENT_AMOUNT) * months.length,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
