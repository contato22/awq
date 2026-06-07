"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2, X } from "lucide-react";

type ParsedRow = {
  sku: string;
  name: string;
  category: string;
  unit: string;
  unit_cost: number;
  sale_price: number | null;
  stock_qty: number;
  min_stock: number;
  description?: string;
  _source?: string;
};

type Warehouse = { id: string; name: string };

/** CSV parser — handles quoted fields with commas and escaped quotes. */
function parseCSV(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === delimiter) { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else { field += c; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ""));
}

/** Parses BR/US numbers — "1.200,50" or "1,200.50" or "R$ 1.200,50" → 1200.5 */
function toNumber(v: string | undefined): number {
  if (!v) return 0;
  const s = v.replace(/R\$|\s| /g, "");
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let clean = s;
  if (hasComma && hasDot) clean = s.replace(/\./g, "").replace(",", ".");
  else if (hasComma) clean = s.replace(",", ".");
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

const SKU_PREFIX_BY_CAT: Record<string, string> = {
  "CÂMERAS": "CAM", "COMPUTADORES": "COMP", "LENTES": "LENS", "CARTÕES": "CARD",
  "LUZES": "LUZ", "CABOS": "CAB", "ADAPTADORES": "ADP", "BATERIAS": "BAT",
  "GIMBALS": "GMB", "ÁUDIO": "AUD", "CASES": "CASE", "ACESSÓRIOS": "ACC",
  "TRIPÉ": "TRI", "CARREGADOR": "CHG", "MODIFICADOR DE LUZ": "MOD",
  "ARMAZENAMENTO": "STO", "ESCRITÓRIO": "OFF",
};

function buildSku(category: string, index: number): string {
  const norm = (category || "").toUpperCase().normalize("NFC").trim();
  const prefix = SKU_PREFIX_BY_CAT[norm] ?? (norm ? norm.replace(/[^A-Z]/g, "").slice(0, 3) || "ITM" : "ITM");
  return `CV-${prefix}-${String(index).padStart(3, "0")}`;
}

/** Map a Caza Vision row (after detecting header). Returns null if row should be skipped. */
function mapCazaRow(headerMap: Map<string, number>, cells: string[], counters: Map<string, number>): ParsedRow | null {
  const get = (key: string) => {
    const idx = headerMap.get(key);
    return idx == null ? "" : (cells[idx] ?? "").trim();
  };
  const name = get("EQUIPAMENTOS");
  if (!name) return null;
  const category = (get("TIPO") || "OUTROS").toUpperCase();
  const qty = toNumber(get("UNIDADE")) || 1;
  const cost = toNumber(get("VALOR DE COMPRA"));
  const price = toNumber(get("VALOR DE VENDA"));
  const ref = get("REFERÊNCIA");

  const n = (counters.get(category) ?? 0) + 1;
  counters.set(category, n);

  return {
    sku: buildSku(category, n),
    name,
    category,
    unit: "un",
    unit_cost: cost,
    sale_price: price > 0 ? price : null,
    stock_qty: qty,
    min_stock: 0,
    description: ref || undefined,
    _source: ref || undefined,
  };
}

export default function InventoryImportPage() {
  const [text, setText] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: { sku: string; reason: string }[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/erp/inventory/warehouses")
      .then(r => (r.ok ? r.json() : []))
      .then((data) => setWarehouses(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const rows = useMemo<ParsedRow[]>(() => {
    if (!text.trim()) return [];
    const delim = text.includes("\t") && !text.includes(",") ? "\t" : ",";
    const grid = parseCSV(text, delim);
    if (grid.length === 0) return [];

    // Find header row — one that contains "EQUIPAMENTOS"
    let headerIdx = -1;
    for (let i = 0; i < Math.min(grid.length, 10); i++) {
      if (grid[i].some(c => c.trim().toUpperCase() === "EQUIPAMENTOS")) { headerIdx = i; break; }
    }
    if (headerIdx === -1) return [];

    const header = grid[headerIdx].map(c => c.trim().toUpperCase());
    const headerMap = new Map<string, number>();
    header.forEach((h, i) => { if (h) headerMap.set(h, i); });

    const counters = new Map<string, number>();
    const out: ParsedRow[] = [];
    for (let i = headerIdx + 1; i < grid.length; i++) {
      const mapped = mapCazaRow(headerMap, grid[i], counters);
      if (mapped) out.push(mapped);
    }
    return out;
  }, [text]);

  const totalCost = rows.reduce((s, r) => s + r.unit_cost * r.stock_qty, 0);
  const totalPrice = rows.reduce((s, r) => s + (r.sale_price ?? 0) * r.stock_qty, 0);

  const onFile = async (f: File) => {
    setError("");
    setResult(null);
    setText(await f.text());
  };

  const doImport = async () => {
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/erp/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: rows, warehouseId: warehouseId || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao importar"); return; }
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/erp/inventory/items" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><ArrowLeft size={16} /></Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Importar Inventário (CSV)</h1>
            <p className="text-xs text-gray-500">ERP · Estoque · Importação em massa</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="text-brand-600 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold">Como exportar do Google Sheets</p>
              <p className="text-xs text-gray-500">
                Abra a planilha → <strong>Arquivo</strong> → <strong>Fazer download</strong> → <strong>Valores separados por vírgula (.csv)</strong>.
                O importador detecta automaticamente o cabeçalho (<code>EQUIPAMENTOS, TIPO, GRUPO, UNIDADE, VALOR DE COMPRA, VALOR DE VENDA, REFERÊNCIA</code>),
                gera SKUs no formato <code>CV-&lt;CAT&gt;-NNN</code> e ignora a linha de total.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-8 flex flex-col items-center gap-2 cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
              <Upload size={20} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Selecionar arquivo CSV/TSV</span>
              <input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            </label>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ou cole o conteúdo CSV</label>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="EQUIPAMENTOS,TIPO,..."
                className="w-full h-32 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Armazém (opcional)</label>
              <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white">
                <option value="">— Sem armazém —</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Preview · {rows.length} itens</h2>
                <p className="text-xs text-gray-500">
                  Custo total: <strong>R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> ·
                  Valor de venda: <strong>R$ {totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                </p>
              </div>
              <button onClick={doImport} disabled={importing}
                className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 shadow-sm">
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Importar {rows.length} itens
              </button>
            </div>
            <div className="overflow-x-auto max-h-[480px]">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {["SKU", "Nome", "Categoria", "Un.", "Qtd", "Custo Un.", "Preço", "Origem"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-gray-700">{r.sku}</td>
                      <td className="px-3 py-2 text-gray-900 max-w-md truncate">{r.name}</td>
                      <td className="px-3 py-2 text-gray-600">{r.category}</td>
                      <td className="px-3 py-2 text-gray-500">{r.unit}</td>
                      <td className="px-3 py-2 tabular-nums">{r.stock_qty}</td>
                      <td className="px-3 py-2 tabular-nums">R$ {r.unit_cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 tabular-nums text-gray-500">{r.sale_price != null ? `R$ ${r.sale_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{r._source ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {result && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 text-sm space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={16} /> {result.inserted} itens importados com sucesso
            </div>
            {result.skipped.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-amber-700">{result.skipped.length} itens ignorados</summary>
                <ul className="mt-2 space-y-0.5 ml-4 list-disc">
                  {result.skipped.map((s, i) => <li key={i}><code>{s.sku}</code>: {s.reason}</li>)}
                </ul>
              </details>
            )}
            <Link href="/awq/erp/inventory/items" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
              Ver itens cadastrados →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
