// ─── Conciliação Inteligente — scoring puro (sem DB, testável) ───────────────
// Implementa a tabela de score normalizada (cap 100) e os thresholds → estado.
// E2E NÃO entra aqui (é trava da Via 1 no motor).

export const TETO_TARIFA = 5.0; // teto de diferença tratada como tarifa/IOF/juros (R$)

export type MatchState = "auto" | "suggested" | "weak" | "exception";

/** Transação bancária (lado banco) reduzida ao necessário para o score. */
export interface ScoreTx {
  absAmount: number;        // valor absoluto
  valueDate: string;        // YYYY-MM-DD
  counterparty: string | null;
  counterDoc: string | null;
}

/** Candidato (lançamento aberto) reduzido ao necessário para o score. */
export interface ScoreCand {
  openAmount: number;       // saldo ainda não conciliado (absoluto)
  dueDate: string | null;   // YYYY-MM-DD
  counterparty: string | null;
  counterDoc: string | null;
  memoryKnown: boolean;     // contraparte já memorizada no BU
}

export interface ScoreBreakdown {
  valor: number;
  data: number;
  contraparte: number;
  memoria: number;
  total: number;
  /** absTx - openAmount (sinalizado): + = sobra na tx (tarifa/IOF), - = falta. */
  diff: number;
}

// ── Normalização de contraparte: lower(unaccent(trim())) ─────────────────────
export function normalizeKey(s: string | null): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // remove acentos (combining marks)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// ── Jaro-Winkler ─────────────────────────────────────────────────────────────
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const m = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatch = new Array(a.length).fill(false);
  const bMatch = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - m);
    const hi = Math.min(i + m + 1, b.length);
    for (let j = lo; j < hi; j++) {
      if (bMatch[j] || a[i] !== b[j]) continue;
      aMatch[i] = bMatch[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  // transposições
  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatch[i]) continue;
    while (!bMatch[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  t /= 2;
  const jaro = (matches / a.length + matches / b.length + (matches - t) / matches) / 3;
  // prefixo comum (até 4) para Winkler
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

// ── Datas ────────────────────────────────────────────────────────────────────
function toDate(s: string): Date {
  return new Date(`${s.slice(0, 10)}T00:00:00Z`);
}

export function calendarDayDiff(a: string, b: string): number {
  return Math.round(Math.abs(toDate(a).getTime() - toDate(b).getTime()) / 86_400_000);
}

/** Dias úteis entre duas datas (ignora sábados/domingos). Não considera feriados. */
export function businessDayDiff(a: string, b: string): number {
  let d1 = toDate(a);
  let d2 = toDate(b);
  if (d1 > d2) [d1, d2] = [d2, d1];
  let count = 0;
  const cur = new Date(d1);
  while (cur < d2) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

// ── Score ────────────────────────────────────────────────────────────────────
export function scoreCandidate(tx: ScoreTx, cand: ScoreCand): ScoreBreakdown {
  const diff = round2(tx.absAmount - cand.openAmount);
  const absDiff = Math.abs(diff);

  // Valor
  let valor = 0;
  if (absDiff <= 0.005) valor = 35;
  else if (absDiff <= TETO_TARIFA) valor = 22;

  // Data
  let data = 0;
  if (cand.dueDate) {
    const cal = calendarDayDiff(tx.valueDate, cand.dueDate);
    if (cal === 0) data = 25;
    else if (businessDayDiff(tx.valueDate, cand.dueDate) <= 1) data = 18;
    else if (cal <= 3) data = 10;
    else if (cal <= 7) data = 4;
  }

  // Contraparte
  let contraparte = 0;
  const docA = normalizeKey(tx.counterDoc).replace(/\D/g, "");
  const docB = normalizeKey(cand.counterDoc).replace(/\D/g, "");
  if (docA && docB && docA === docB) {
    contraparte = 25;
  } else {
    const jw = jaroWinkler(normalizeKey(tx.counterparty), normalizeKey(cand.counterparty));
    if (jw >= 0.9) contraparte = 13;
    else if (jw >= 0.8) contraparte = 6;
  }

  // Memória
  const memoria = cand.memoryKnown ? 12 : 0;

  const total = Math.min(100, valor + data + contraparte + memoria);
  return { valor, data, contraparte, memoria, total, diff };
}

/** Thresholds → estado: ≥90 auto · 70–89 suggested · 40–69 weak · <40 exceção. */
export function stateFromScore(score: number): MatchState {
  if (score >= 90) return "auto";
  if (score >= 70) return "suggested";
  if (score >= 40) return "weak";
  return "exception";
}

/**
 * Subset-sum limitado (Via 3 — fuzzy N:1 / 1:N). Acha um subconjunto de `values`
 * que some `target` dentro de `tol`, com no máximo `maxItems` itens. Retorna os
 * índices (no array original) do primeiro subconjunto encontrado, ou null.
 *
 * Poda: descarta itens > target+tol (todos positivos), ordena desc e corta ramos
 * cujo acumulado já passou do alvo. Itens individuais idênticos não são deduzidos
 * (300 + 300 é válido). Chamador deve limitar o tamanho do pool (ex.: ≤30).
 */
export function subsetSum(
  values: number[],
  target: number,
  maxItems = 5,
  tol = 0.01,
): number[] | null {
  // Mantém o índice original ao filtrar/ordenar.
  const items = values
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v > tol && x.v <= target + tol)
    .sort((a, b) => b.v - a.v);

  const chosen: number[] = [];
  let found: number[] | null = null;

  function dfs(start: number, remaining: number) {
    if (found) return;
    if (Math.abs(remaining) <= tol && chosen.length > 0) {
      found = chosen.map((k) => items[k].i);
      return;
    }
    if (chosen.length >= maxItems || remaining < -tol) return;
    for (let k = start; k < items.length; k++) {
      if (items[k].v > remaining + tol) continue; // poda (ordenado desc)
      chosen.push(k);
      dfs(k + 1, round2(remaining - items[k].v));
      chosen.pop();
      if (found) return;
    }
  }

  dfs(0, target);
  return found;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
