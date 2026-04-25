/** Parse a date string in DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD format.
 *  Returns ISO YYYY-MM-DD or null if not recognizable. */
export function parseDate(s: string): string | null {
  const t = s.trim();
  // DD/MM/YYYY or DD-MM-YYYY (2-digit or 4-digit year)
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.exec(t);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    const y = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    if (parseInt(m) < 1 || parseInt(m) > 12) return null;
    if (parseInt(d) < 1 || parseInt(d) > 31) return null;
    return `${y}-${m}-${d}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return null;
}

/** Parse a Brazilian or US decimal amount string.
 *  Handles: "1.234,56"  "-1.234,56"  "1,234.56"  "1234.56"  "R$ 1.234,56"
 *  Returns number or null if not parseable. */
export function parseAmount(s: string): number | null {
  if (!s) return null;
  let t = s.trim().replace(/R\$\s*/g, "").replace(/\s/g, "");
  if (!t) return null;

  const neg = t.startsWith("-") || (t.startsWith("(") && t.endsWith(")"));
  t = t.replace(/[()]/g, "").replace(/^-/, "");

  // Determine format by looking at separators
  const hasDot = t.includes(".");
  const hasComma = t.includes(",");

  if (hasDot && hasComma) {
    // Whichever comes last is the decimal separator
    if (t.lastIndexOf(".") > t.lastIndexOf(",")) {
      // US: 1,234.56
      t = t.replace(/,/g, "");
    } else {
      // BR: 1.234,56
      t = t.replace(/\./g, "").replace(",", ".");
    }
  } else if (hasComma && !hasDot) {
    // Could be BR decimal (1234,56) or BR thousands (1,234) — assume decimal
    t = t.replace(",", ".");
  } else if (hasDot && !hasComma) {
    // Could be US decimal (1234.56) or BR thousands (1.234) — assume decimal
    // no change needed
  }

  const v = parseFloat(t);
  if (isNaN(v)) return null;
  return neg ? -v : v;
}
