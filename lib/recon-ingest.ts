// ─── Conciliação Inteligente — ingestão (Cora + fallback OFX/CSV) ────────────
// Normaliza extratos de várias fontes para ReconBankTxInput[]. Tudo server-side.
// Convenção de sinal: amount é SINALIZADO (+ crédito / - débito).
// posted_at usa meio-dia BRT para que a coluna gerada value_date fique estável.

import type { CoraStatementEntry } from "@/lib/cora-api";
import type { ReconBankTxInput } from "@/lib/recon-types";

/** YYYY-MM-DD → ISO timestamptz ao meio-dia em São Paulo (estável p/ value_date). */
export function dateToNoonBRT(date: string): string {
  const d = date.slice(0, 10);
  return `${d}T12:00:00-03:00`;
}

// ── Cora → input ─────────────────────────────────────────────────────────────
export function coraEntryToInput(
  entry: CoraStatementEntry,
  accountId: string,
): ReconBankTxInput {
  const signed = entry.direction === "credit" ? Math.abs(entry.amount) : -Math.abs(entry.amount);
  return {
    accountId,
    postedAt:     dateToNoonBRT(entry.date),
    amount:       signed,
    counterparty: entry.counterparty,
    counterDoc:   entry.counterDoc,
    e2eId:        entry.e2eId,
    txid:         entry.txid,
    rawDescr:     entry.description || null,
    source:       "cora_api",
    sourceId:     entry.id,
  };
}

// ── OFX (SGML) → input ───────────────────────────────────────────────────────
// Parser tolerante: extrai blocos <STMTTRN>…</STMTTRN> (ou até a próxima tag de
// fechamento implícita no OFX 1.x sem fechamento). Campos: TRNAMT, DTPOSTED,
// FITID, NAME/MEMO, CHECKNUM/REFNUM.
export function parseOFX(content: string, accountId: string): ReconBankTxInput[] {
  const out: ReconBankTxInput[] = [];
  const blocks = content.split(/<STMTTRN>/i).slice(1);
  for (const block of blocks) {
    const seg = block.split(/<\/STMTTRN>/i)[0];
    const get = (tag: string): string | null => {
      // OFX 1.x não fecha tags: pega até o fim da linha ou próxima '<'.
      const m = seg.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
      return m ? m[1].trim() || null : null;
    };
    const amtRaw = get("TRNAMT");
    const dt     = get("DTPOSTED");
    if (amtRaw === null || dt === null) continue;
    const amount = Number(amtRaw.replace(",", "."));
    if (!Number.isFinite(amount)) continue;
    const fitid = get("FITID");
    const name  = get("NAME");
    const memo  = get("MEMO");
    const date  = ofxDate(dt);
    out.push({
      accountId,
      postedAt:     dateToNoonBRT(date),
      amount,
      counterparty: name,
      counterDoc:   null,
      e2eId:        null,
      txid:         get("CHECKNUM") ?? get("REFNUM"),
      rawDescr:     memo ?? name ?? null,
      source:       "ofx",
      sourceId:     fitid ?? `${date}|${amount}|${memo ?? name ?? ""}`,
    });
  }
  return out;
}

/** OFX DTPOSTED (YYYYMMDD[HHMMSS][.xxx][tz]) → YYYY-MM-DD. */
function ofxDate(raw: string): string {
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : raw.slice(0, 10);
}

// ── CSV → input ──────────────────────────────────────────────────────────────
// Aceita cabeçalhos PT-BR/EN comuns. Delimitador autodetectado (',' ';' '\t').
// Valor: aceita "1.234,56" (BR) ou "1234.56" (EN); coluna única sinalizada OU
// par débito/crédito.
const HEADER_ALIASES: Record<string, string[]> = {
  date:         ["data", "date", "data lançamento", "data movimento", "posted", "dtposted"],
  amount:       ["valor", "amount", "value", "montante", "trnamt"],
  debit:        ["debito", "débito", "debit", "saida", "saída"],
  credit:       ["credito", "crédito", "credit", "entrada"],
  description:  ["descricao", "descrição", "description", "historico", "histórico", "memo", "lançamento"],
  counterparty: ["contraparte", "counterparty", "favorecido", "pagador", "beneficiario", "beneficiário", "name"],
  counterDoc:   ["documento", "cnpj", "cpf", "cnpj/cpf", "doc"],
  e2e:          ["e2e", "endtoend", "endtoendid", "e2eid", "id pix"],
  id:           ["id", "fitid", "txid", "identificador", "nosso numero", "nosso número"],
};

export function parseCSV(content: string, accountId: string): ReconBankTxInput[] {
  const lines = content.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const delim = detectDelimiter(lines[0]);
  const headers = splitCSVLine(lines[0], delim).map((h) => h.trim().toLowerCase());
  const col = (key: string): number =>
    headers.findIndex((h) => HEADER_ALIASES[key].includes(h));

  const iDate = col("date");
  const iAmt  = col("amount");
  const iDeb  = col("debit");
  const iCred = col("credit");
  const iDesc = col("description");
  const iCp   = col("counterparty");
  const iDoc  = col("counterDoc");
  const iE2e  = col("e2e");
  const iId   = col("id");
  if (iDate < 0 || (iAmt < 0 && iDeb < 0 && iCred < 0)) {
    throw new Error("CSV sem colunas reconhecíveis de data e valor.");
  }

  const out: ReconBankTxInput[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCSVLine(lines[r], delim);
    const at = (i: number): string | null => (i >= 0 && i < cells.length ? cells[i].trim() || null : null);

    let amount: number;
    if (iAmt >= 0) {
      amount = parseBRNumber(at(iAmt));
    } else {
      const deb = Math.abs(parseBRNumber(at(iDeb)));
      const cred = Math.abs(parseBRNumber(at(iCred)));
      amount = cred - deb;
    }
    if (!Number.isFinite(amount) || amount === 0) continue;

    const date = normalizeCSVDate(at(iDate));
    if (!date) continue;

    const e2e = at(iE2e);
    const sid = at(iId);
    out.push({
      accountId,
      postedAt:     dateToNoonBRT(date),
      amount,
      counterparty: at(iCp),
      counterDoc:   at(iDoc),
      e2eId:        e2e,
      txid:         sid,
      rawDescr:     at(iDesc),
      source:       "csv",
      sourceId:     sid ?? e2e ?? `${date}|${amount}|${at(iDesc) ?? ""}`,
    });
  }
  return out;
}

function detectDelimiter(headerLine: string): string {
  const counts: Record<string, number> = {
    ";": (headerLine.match(/;/g) ?? []).length,
    ",": (headerLine.match(/,/g) ?? []).length,
    "\t": (headerLine.match(/\t/g) ?? []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/** Split respeitando aspas duplas (campos com delimitador embutido). */
function splitCSVLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** "1.234,56" (BR) ou "1234.56" / "-50" (EN) → number. */
function parseBRNumber(raw: string | null): number {
  if (!raw) return 0;
  let s = raw.replace(/[R$\s]/g, "");
  if (s.includes(",") && s.includes(".")) {
    // Assume formato BR: ponto é milhar, vírgula é decimal.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Aceita YYYY-MM-DD ou DD/MM/YYYY → YYYY-MM-DD; null se não reconhecido. */
function normalizeCSVDate(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}
