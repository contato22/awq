import React from "react";

/**
 * Renderizador mínimo de markdown para os relatórios do Office.
 * Cobre títulos, listas, tabelas, negrito, itálico, código inline e links http(s).
 * Todo texto passa pelo React (sem dangerouslySetInnerHTML), então não há injeção de HTML.
 */

function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={key} className="px-1 rounded bg-gray-100 text-[0.85em]">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("[")) {
      const mm = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(tok);
      out.push(mm ? <a key={key} href={mm[2]} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">{mm[1]}</a> : tok);
    } else out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSeparator = (l: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && l.includes("-");

export default function MiniMarkdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls = ["", "text-lg font-bold mt-2", "text-base font-bold mt-5", "text-sm font-semibold mt-4", "text-sm font-semibold mt-3"][level];
      blocks.push(<div key={k++} role="heading" aria-level={level} className={`${cls} text-gray-900`}>{inline(h[2], `h${k}`)}</div>);
      i++;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push(<hr key={k++} className="my-3 border-gray-100" />); i++; continue; }

    if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) { rows.push(cells(lines[i])); i++; }
      blocks.push(
        <div key={k++} className="overflow-x-auto my-2">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr>{head.map((c, j) => <th key={j} className="text-left font-semibold text-gray-700 border-b border-gray-200 px-2 py-1">{inline(c, `th${k}-${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-gray-50">
                  {r.map((c, j) => <td key={j} className="px-2 py-1 align-top text-gray-700">{inline(c, `td${k}-${ri}-${j}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: { depth: number; text: string }[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        const m = /^(\s*)(?:[-*•]|\d+[.)])\s+(.*)$/.exec(lines[i])!;
        items.push({ depth: Math.min(Math.floor(m[1].length / 2), 3), text: m[2] });
        i++;
      }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={k++} className={`my-1.5 space-y-0.5 text-sm text-gray-700 ${ordered ? "list-decimal" : "list-disc"} pl-5`}>
          {items.map((it, j) => (
            <li key={j} style={{ marginLeft: it.depth * 16 }}>{inline(it.text, `li${k}-${j}`)}</li>
          ))}
        </Tag>
      );
      continue;
    }

    // Parágrafo: junta linhas consecutivas
    const para: string[] = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) && !isTableRow(lines[i])
    ) { para.push(lines[i].trim()); i++; }
    blocks.push(<p key={k++} className="text-sm text-gray-700 my-1.5 leading-relaxed">{inline(para.join(" "), `p${k}`)}</p>);
  }

  return <div>{blocks}</div>;
}
