// Client-safe formatting utilities — no server-only imports.
// Import from here in "use client" components; import from financial-query in server pages.

export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}
