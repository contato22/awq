// ─── Backfill: cashflowClass, dreEffect, reconciliationStatus ─────────────────
//
// Reads existing transactions.json (filesystem adapter — no DATABASE_URL needed).
// Derives the 3 new Conciliação Bancária fields from existing data:
//   cashflowClass       ← deriveCashflowClass(managerialCategory)
//   dreEffect           ← deriveDREEffect(managerialCategory)
//   reconciliationStatus← deriveReconciliationStatus(classificationConfidence)
//                         overridden to "conciliado" when isIntercompany=true
//
// Idempotent: skips transactions that already have all 3 fields populated.
// Safe: no amounts, dates, descriptions, or categories are changed.
//
// Run: npx tsx scripts/backfill-conciliacao.ts

import fs from "fs";
import path from "path";
import {
  deriveCashflowClass,
  deriveDREEffect,
  deriveReconciliationStatus,
} from "../lib/financial-classifier";
import type { BankTransaction } from "../lib/financial-db";

const TXN_FILE = path.join(process.cwd(), "public", "data", "financial", "transactions.json");

function main() {
  if (!fs.existsSync(TXN_FILE)) {
    console.log("transactions.json not found — nothing to backfill.");
    process.exit(0);
  }

  const raw = fs.readFileSync(TXN_FILE, "utf-8").trim();
  if (!raw) {
    console.log("transactions.json is empty — nothing to backfill.");
    process.exit(0);
  }

  const transactions: BankTransaction[] = JSON.parse(raw);
  let backfilled = 0;
  let skipped    = 0;

  const updated = transactions.map((t) => {
    // Already has all 3 fields — idempotent skip
    if (
      "cashflowClass" in t &&
      "dreEffect"     in t &&
      "reconciliationStatus" in t
    ) {
      skipped++;
      return t;
    }

    const cashflowClass =
      t.isIntercompany
        ? "exclusao" as const            // intercompany always excluded
        : deriveCashflowClass(t.managerialCategory);

    const dreEffect = deriveDREEffect(t.managerialCategory);

    const reconciliationStatus =
      t.isIntercompany
        ? "conciliado" as const           // matched intercompany pair
        : deriveReconciliationStatus(t.classificationConfidence);

    backfilled++;
    return { ...t, cashflowClass, dreEffect, reconciliationStatus };
  });

  fs.writeFileSync(TXN_FILE, JSON.stringify(updated, null, 2), "utf-8");

  console.log(`\nBackfill completo:`);
  console.log(`  Transações totais : ${transactions.length}`);
  console.log(`  Backfilled        : ${backfilled}`);
  console.log(`  Já preenchidos    : ${skipped}`);

  // Summary by cashflowClass
  const byClass: Record<string, number> = {};
  for (const t of updated) {
    const k = (t.cashflowClass ?? "null") as string;
    byClass[k] = (byClass[k] ?? 0) + 1;
  }
  console.log(`\n  cashflowClass breakdown:`);
  for (const [k, v] of Object.entries(byClass)) {
    console.log(`    ${k.padEnd(16)}: ${v}`);
  }

  // Summary by dreEffect
  const byDRE: Record<string, number> = {};
  for (const t of updated) {
    const k = (t.dreEffect ?? "null") as string;
    byDRE[k] = (byDRE[k] ?? 0) + 1;
  }
  console.log(`\n  dreEffect breakdown:`);
  for (const [k, v] of Object.entries(byDRE)) {
    console.log(`    ${k.padEnd(20)}: ${v}`);
  }

  // Summary by reconciliationStatus
  const byRS: Record<string, number> = {};
  for (const t of updated) {
    const k = (t.reconciliationStatus ?? "null") as string;
    byRS[k] = (byRS[k] ?? 0) + 1;
  }
  console.log(`\n  reconciliationStatus breakdown:`);
  for (const [k, v] of Object.entries(byRS)) {
    console.log(`    ${k.padEnd(20)}: ${v}`);
  }

  console.log(`\nArquivo atualizado: ${TXN_FILE}\n`);
}

main();
