/**
 * test-epm-db.ts — Teste completo do layer epm-planning-db
 *
 * Sem DATABASE_URL: testa o fallback estático (forma e valores mínimos).
 * Com DATABASE_URL: testa leitura e escrita reais no Supabase.
 *
 * Uso:
 *   npx tsx scripts/test-epm-db.ts
 *   DATABASE_URL="..." npx tsx scripts/test-epm-db.ts
 */

import {
  getBUData, getVentureContracts, getMonthlyRevenue, getCategoryBudget,
  getAllocFlags, getHoldingTreasury, getChartOfAccounts, getFiscalRates,
  getOperatingBUs, getConsolidated, getConsolidatedMargins,
  getBudgetVsActual, getBudgetLines, getRiskSignals, getRiskCategories,
  getJACQESMRR, getVentureFeeMRR, getVentureFeeARR, getVentureContractValueRemaining,
  upsertBUData, upsertMonthlyRevenue, upsertAllocFlag, upsertFiscalRate,
  type FiscalRates, type SupplierType,
} from "../lib/epm-planning-db";
import { USE_DB } from "../lib/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function t(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(e as Error).message}`);
    failed++;
  }
}

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n━━ EPM Planning DB — ${USE_DB ? "Supabase (live)" : "static fallback"} ━━\n`);

  // ── READ ────────────────────────────────────────────────────────────────────
  console.log("🔍  READ — shape e valores mínimos");

  await t("getBUData: array não-vazio com campos obrigatórios", async () => {
    const rows = await getBUData();
    ok(Array.isArray(rows) && rows.length > 0, "array vazio");
    const r = rows[0];
    ok(typeof r.id === "string",      "id não é string");
    ok(typeof r.name === "string",    "name não é string");
    ok(typeof r.revenue === "number", "revenue não é number");
    ok(typeof r.ebitda === "number",  "ebitda não é number");
  });

  await t("getOperatingBUs: exclui 'venture'", async () => {
    const rows = await getOperatingBUs();
    ok(rows.every((b) => b.id !== "venture"), "venture não foi excluído");
  });

  await t("getConsolidated: campos numéricos presentes", async () => {
    const c = await getConsolidated();
    ok(typeof c.revenue === "number",     "revenue inválido");
    ok(typeof c.cashBalance === "number", "cashBalance inválido");
    ok(typeof c.ftes === "number",        "ftes inválido");
  });

  await t("getConsolidatedMargins: margens plausíveis (|margin| ≤ 200%)", async () => {
    const m = await getConsolidatedMargins();
    ok(typeof m.grossMargin === "number",  "grossMargin inválido");
    ok(typeof m.ebitdaMargin === "number", "ebitdaMargin inválido");
    ok(typeof m.netMargin === "number",    "netMargin inválido");
    ok(Math.abs(m.grossMargin) <= 200,  `grossMargin suspeito: ${m.grossMargin}`);
  });

  await t("getVentureContracts: campos financeiros obrigatórios", async () => {
    const rows = await getVentureContracts();
    ok(Array.isArray(rows), "não é array");
    if (rows.length > 0) {
      const r = rows[0];
      ok(typeof r.counterparty === "string",       "counterparty inválido");
      ok(typeof r.monthlyFee === "number",         "monthlyFee inválido");
      ok(typeof r.totalContractValue === "number", "totalContractValue inválido");
    }
  });

  await t("getMonthlyRevenue: pontos com month e valores numéricos", async () => {
    const rows = await getMonthlyRevenue();
    ok(Array.isArray(rows) && rows.length > 0, "array vazio");
    const r = rows[0];
    ok(typeof r.month === "string",   "month inválido");
    ok(typeof r.jacqes === "number",  "jacqes inválido");
    ok(typeof r.caza === "number",    "caza inválido");
    ok(typeof r.advisor === "number", "advisor inválido");
  });

  await t("getCategoryBudget: itens com budget e actual numéricos", async () => {
    const rows = await getCategoryBudget();
    ok(Array.isArray(rows) && rows.length > 0, "array vazio");
    const r = rows[0];
    ok(typeof r.category === "string", "category inválido");
    ok(typeof r.budget === "number",   "budget inválido");
    ok(typeof r.actual === "number",   "actual inválido");
  });

  await t("getAllocFlags: mapa buId→flag não-vazio", async () => {
    const flags = await getAllocFlags();
    ok(typeof flags === "object" && !Array.isArray(flags), "não é objeto");
    ok(Object.keys(flags).length > 0, "mapa vazio");
  });

  await t("getHoldingTreasury: asOf, totalInvestedReal, operationalCash", async () => {
    const snapshot = await getHoldingTreasury();
    ok(typeof snapshot.asOf === "string",              "asOf inválido");
    ok(typeof snapshot.totalInvestedReal === "number", "totalInvestedReal inválido");
    ok(typeof snapshot.operationalCash === "number",   "operationalCash inválido");
  });

  await t("getChartOfAccounts: plano com account_code e account_name", async () => {
    const rows = await getChartOfAccounts();
    ok(Array.isArray(rows) && rows.length > 0, "array vazio");
    ok(typeof rows[0].account_code === "string", "account_code inválido");
    ok(typeof rows[0].account_name === "string", "account_name inválido");
  });

  await t("getFiscalRates: taxas por tipo de fornecedor", async () => {
    const rates = await getFiscalRates();
    ok(typeof rates === "object", "não é objeto");
    const sp = rates["service_professional"];
    ok(sp !== undefined,                 "service_professional ausente");
    ok(typeof sp.irrf_rate === "number", "irrf_rate inválido");
    ok(typeof sp.iss_rate === "number",  "iss_rate inválido");
  });

  await t("getBudgetVsActual: retorna number", async () => {
    const v = await getBudgetVsActual();
    ok(typeof v === "number", `não é number: ${typeof v}`);
  });

  await t("getBudgetLines: retorna objeto ou array", async () => {
    const bl = await getBudgetLines();
    ok(bl !== null && typeof bl === "object", "valor nulo ou não-objeto");
  });

  await t("getRiskSignals: sinais com id e severity", async () => {
    const rows = await getRiskSignals();
    ok(Array.isArray(rows), "não é array");
    if (rows.length > 0) {
      ok(typeof rows[0].id === "string",       "id inválido");
      ok(typeof rows[0].severity === "string", "severity inválido");
    }
  });

  await t("getRiskCategories: categorias com id e title", async () => {
    const rows = await getRiskCategories();
    ok(Array.isArray(rows), "não é array");
    if (rows.length > 0) {
      ok(typeof rows[0].id === "string",    "id inválido");
      ok(typeof rows[0].title === "string", "title inválido");
    }
  });

  await t("getJACQESMRR: { current, q1 } > 0", async () => {
    const mrr = await getJACQESMRR();
    ok(typeof mrr.current === "number" && mrr.current > 0, `current inválido: ${mrr.current}`);
    ok(typeof mrr.q1 === "number"      && mrr.q1 > 0,      `q1 inválido: ${mrr.q1}`);
  });

  await t("getVentureFeeMRR: number >= 0", async () => {
    const v = await getVentureFeeMRR();
    ok(typeof v === "number" && v >= 0, `valor inválido: ${v}`);
  });

  await t("getVentureFeeARR = MRR × 12", async () => {
    const [mrr, arr] = await Promise.all([getVentureFeeMRR(), getVentureFeeARR()]);
    ok(Math.abs(arr - mrr * 12) < 0.01, `ARR ${arr} ≠ MRR ${mrr} × 12`);
  });

  await t("getVentureContractValueRemaining: number >= 0", async () => {
    const v = await getVentureContractValueRemaining();
    ok(typeof v === "number" && v >= 0, `valor inválido: ${v}`);
  });

  // ── WRITE ────────────────────────────────────────────────────────────────────
  if (USE_DB) {
    console.log("\n✏️   WRITE — upsert e leitura de volta");

    await t("upsertBUData: altera revenue e lê de volta", async () => {
      const before = await getBUData();
      const target = before.find((b) => b.id === "jacqes");
      ok(target !== undefined, "BU jacqes não encontrada");
      const orig = target!.revenue;
      await upsertBUData({ ...target!, revenue: orig + 1 });
      const after = (await getBUData()).find((b) => b.id === "jacqes")!;
      ok(after.revenue === orig + 1, `revenue não atualizado: ${after.revenue}`);
      await upsertBUData({ ...target!, revenue: orig }); // restaura
    });

    await t("upsertMonthlyRevenue: altera jacqes e lê de volta", async () => {
      const before = await getMonthlyRevenue();
      const row    = before[0];
      const orig   = row.jacqes;
      await upsertMonthlyRevenue({ ...row, jacqes: orig + 1 });
      const after = (await getMonthlyRevenue()).find((m) => m.month === row.month)!;
      ok(after.jacqes === orig + 1, `jacqes não atualizado: ${after.jacqes}`);
      await upsertMonthlyRevenue({ ...row, jacqes: orig }); // restaura
    });

    await t("upsertAllocFlag: grava e lê de volta", async () => {
      const flags   = await getAllocFlags();
      const buId    = Object.keys(flags)[0];
      const orig    = flags[buId];
      const newFlag = orig === "green" ? "yellow" : "green";
      await upsertAllocFlag(buId, newFlag);
      const after   = await getAllocFlags();
      ok(after[buId] === newFlag, `flag não atualizado: ${after[buId]}`);
      await upsertAllocFlag(buId, orig); // restaura
    });

    await t("upsertFiscalRate: altera iss_rate e lê de volta", async () => {
      const before   = await getFiscalRates();
      const type: SupplierType = "service_professional";
      const orig     = before[type];
      const modified: FiscalRates = { ...orig, iss_rate: orig.iss_rate + 0.001 };
      await upsertFiscalRate(type, modified);
      const after    = await getFiscalRates();
      ok(
        Math.abs(after[type].iss_rate - modified.iss_rate) < 0.0001,
        `iss_rate não atualizado: ${after[type].iss_rate}`,
      );
      await upsertFiscalRate(type, orig); // restaura
    });
  } else {
    console.log("\n⚠️   WRITE tests pulados — DATABASE_URL não definida (fallback estático ativo)");
    console.log("    Para testar escrita real: DATABASE_URL=... npx tsx scripts/test-epm-db.ts\n");
  }

  // ── Resultado ─────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Resultado: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(`\n❌  ${failed} teste(s) falharam.`);
    process.exit(1);
  } else {
    console.log(`\n✅  Todos os testes passaram.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
