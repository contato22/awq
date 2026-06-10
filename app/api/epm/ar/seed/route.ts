// POST /api/epm/ar/seed
// One-time seed: creates JACQES AR entries Jun–Dec 2026.
// Idempotent — skips entries already present (same customer + due_date).

import { NextResponse } from "next/server";
import { addAR, getAllAR, initAPARDB } from "@/lib/ap-ar-db";

interface SeedEntry {
  customer_name: string;
  gross_amount:  number;
  due_date:      string;
  account_code:  string;
}

function buildEntries(): SeedEntry[] {
  const months = ["06","07","08","09","10","11","12"];
  const entries: SeedEntry[] = [];

  for (const m of months) {
    entries.push({ customer_name: "CEM",          gross_amount: 3200, due_date: `2026-${m}-05`, account_code: "1.1.2.1.1.3" });
    entries.push({ customer_name: "ANDRÉ VIEIRA", gross_amount: 2300, due_date: `2026-${m}-15`, account_code: "1.1.2.1.1.4" });
    entries.push({ customer_name: "CARDIO CAT",   gross_amount: 1790, due_date: `2026-${m}-05`, account_code: "1.1.2.1.1.2" });
  }
  return entries;
}

export async function POST() {
  try {
    await initAPARDB();

    const existing = await getAllAR({ bu_code: "JACQES" });
    const existingKeys = new Set(
      existing.map((i) => `${i.customer_name}::${i.due_date}`)
    );

    const entries   = buildEntries();
    const created: string[] = [];
    const skipped:  string[] = [];

    for (const e of entries) {
      const key = `${e.customer_name}::${e.due_date}`;
      if (existingKeys.has(key)) {
        skipped.push(key);
        continue;
      }
      await addAR({
        bu_code:       "JACQES",
        customer_name: e.customer_name,
        description:   `Serviço recorrente JACQES — ${e.due_date.slice(0, 7)}`,
        category:      "Serviço Recorrente",
        issue_date:    e.due_date,
        due_date:      e.due_date,
        gross_amount:  e.gross_amount,
        account_code:  e.account_code,
        iss_rate:      0.05,
        source_system: "seed-jacqes-2026",
      });
      created.push(key);
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      createdKeys: created,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
