// ─── Live Shop — Money & Bps primitives ──────────────────────────────────────
//
// REGRA DE OURO (§13): dinheiro é SEMPRE inteiro em centavos (Money), percentual
// é SEMPRE inteiro em basis points (Bps). ZERO float em dinheiro. Toda conta
// monetária arredonda explicitamente para o centavo mais próximo aqui — nunca
// espalhar Math.round pela base de código.
//
//   Money = inteiro de centavos   (R$ 1,00 = 100)
//   Bps   = inteiro de basis points (6,00% = 600; 100,00% = 10000)
//
// Pure module — sem I/O, importável em client e server.

export type Money = number; // inteiro de centavos
export type Bps = number; // inteiro de basis points

export const BPS_DENOM = 10_000;

/** Reais (number/string "62.42") → Money (centavos). Arredonda ao centavo. */
export function reais(v: number | string): Money {
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) throw new Error(`reais(): valor inválido ${v}`);
  return Math.round(n * 100);
}

/** Money (centavos) → reais como number (apenas display/serialização externa). */
export function toReais(m: Money): number {
  return m / 100;
}

/** Aplica um percentual em bps a um valor Money, arredondando ao centavo. */
export function applyBps(amount: Money, bps: Bps): Money {
  assertInt(amount, "applyBps.amount");
  assertInt(bps, "applyBps.bps");
  return Math.round((amount * bps) / BPS_DENOM);
}

/** take rate / razão entre dois Money, devolvido em bps inteiros. 0 se base 0. */
export function ratioBps(part: Money, whole: Money): Bps {
  if (whole === 0) return 0;
  return Math.round((part * BPS_DENOM) / whole);
}

/** Soma type-safe de Money (mantém inteiro). */
export function sum(values: Money[]): Money {
  return values.reduce((a, b) => a + b, 0);
}

/** Formata Money como BRL pt-BR. */
export function fmtBRL(m: Money): string {
  return toReais(m).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formata Bps como percentual pt-BR (600 → "6,00%"). */
export function fmtPct(bps: Bps, decimals = 2): string {
  return (bps / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + "%";
}

/** bps → fração decimal (600 → 0.06). Só para exibição/gráfico, nunca p/ $$. */
export function bpsToFraction(bps: Bps): number {
  return bps / BPS_DENOM;
}

function assertInt(n: number, who: string): void {
  if (!Number.isInteger(n)) {
    throw new Error(`${who}: esperado inteiro (centavos/bps), recebido ${n} — float em dinheiro é proibido (§13).`);
  }
}
