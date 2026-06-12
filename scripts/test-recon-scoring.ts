/**
 * test-recon-scoring.ts — Conciliação Inteligente, scoring puro (PR-3).
 * Uso: npx tsx scripts/test-recon-scoring.ts
 */

import {
  scoreCandidate, stateFromScore, jaroWinkler, normalizeKey,
  calendarDayDiff, businessDayDiff, subsetSum, isGatePassed, percentile, TETO_TARIFA,
} from "../lib/recon-scoring";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗ FAIL", name, extra); }
}

// Normalização: lower(unaccent(trim()))
check("normalizeKey acentos", normalizeKey("  José da SILVA  ") === "jose da silva");

// Jaro-Winkler
check("JW idêntico = 1", jaroWinkler("acme", "acme") === 1);
check("JW prefixo alto", jaroWinkler(normalizeKey("Construtora Alfa"), normalizeKey("Construtora Alfah")) >= 0.9);
check("JW distante baixo", jaroWinkler("abc", "xyz") < 0.5);

// Datas
check("calDayDiff", calendarDayDiff("2026-03-10", "2026-03-13") === 3);
check("businessDayDiff sex→seg = 1", businessDayDiff("2026-03-06", "2026-03-09") === 1);

// Thresholds
check("≥90 auto", stateFromScore(90) === "auto");
check("70 suggested", stateFromScore(70) === "suggested");
check("40 weak", stateFromScore(40) === "weak");
check("39 exceção", stateFromScore(39) === "exception");

// Score: valor exato + mesmo dia + doc igual → 35+25+25 = 85 (suggested)
{
  const br = scoreCandidate(
    { absAmount: 1000, valueDate: "2026-03-10", counterparty: "ACME", counterDoc: "12.345.678/0001-90" },
    { openAmount: 1000, dueDate: "2026-03-10", counterparty: "ACME", counterDoc: "12345678000190", memoryKnown: false },
  );
  check("score exato+data+doc = 85", br.total === 85, JSON.stringify(br));
  check("diff = 0", br.diff === 0);
}

// Score tarifa: 998 vs 1000 (teto 5) → valor 22; mesmo dia 25; doc 25 = 72 (suggested)
{
  const br = scoreCandidate(
    { absAmount: 998, valueDate: "2026-03-10", counterparty: "ACME", counterDoc: "12345678000190" },
    { openAmount: 1000, dueDate: "2026-03-10", counterparty: "ACME", counterDoc: "12345678000190", memoryKnown: false },
  );
  check("score tarifa = 72", br.total === 72, JSON.stringify(br));
  check("diff = -2 (≤ teto)", br.diff === -2 && Math.abs(br.diff) <= TETO_TARIFA);
  check("estado suggested", stateFromScore(br.total) === "suggested");
}

// Memória soma 12: 85 + 12 = 97 (auto)
{
  const br = scoreCandidate(
    { absAmount: 1000, valueDate: "2026-03-10", counterparty: "ACME", counterDoc: "12345678000190" },
    { openAmount: 1000, dueDate: "2026-03-10", counterparty: "ACME", counterDoc: "12345678000190", memoryKnown: true },
  );
  check("memória eleva a auto (97)", br.total === 97 && stateFromScore(br.total) === "auto", JSON.stringify(br));
}

// subset-sum (Via 3)
{
  const idx = subsetSum([300, 300, 400], 1000, 5, 0.01);
  check("subsetSum acha 300+300+400=1000", !!idx && idx.length === 3);
  check("subsetSum sem solução → null", subsetSum([700], 1000, 5, 0.01) === null);
  check("subsetSum respeita maxItens", subsetSum([100, 100, 100, 100, 100, 100], 600, 5, 0.01) === null);
  const two = subsetSum([250, 750, 999], 1000, 5, 0.01);
  check("subsetSum 250+750=1000", !!two && two.length === 2);
}

// Gate de publicação (Teste 9)
check("gate: 95% cobertura → provisório", isGatePassed(0.95, 0) === false);
check("gate: 98% + divergência 0 → definitivo", isGatePassed(0.98, 0) === true);
check("gate: 98% + divergência 50 → provisório", isGatePassed(0.98, 50) === false);
check("gate: 100% + div 0 → definitivo", isGatePassed(1, 0) === true);

// Percentil (lead time p95)
check("percentile vazio = 0", percentile([], 95) === 0);
check("percentile p95 de 1..100 = 95", percentile(Array.from({ length: 100 }, (_, i) => i + 1), 95) === 95);
check("percentile p95 [1,2,3,4] = 4", percentile([1, 2, 3, 4], 95) === 4);
check("percentile p50 [1,2,3,4] = 2", percentile([1, 2, 3, 4], 50) === 2);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
