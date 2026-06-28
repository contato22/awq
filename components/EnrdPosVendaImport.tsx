"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText } from "lucide-react";

// Import do CSV da Tamara: upload de arquivo OU colar texto. POST para
// /api/enrd/posvenda/import. Recarrega a página ao concluir.
export default function EnrdPosVendaImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function send(text: string) {
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/enrd/posvenda/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setResult(
        `${j.gravadas} OS gravadas · conciliação OK ${j.conciliacao.ok} / REVISAR ${j.conciliacao.revisar}` +
          (j.descartadas ? ` · ${j.descartadas} descartadas` : "")
      );
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) await send(await f.text());
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 cursor-pointer">
          <Upload size={13} /> Importar planilha (CSV)
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} disabled={loading} />
        </label>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <FileText size={13} /> ou colar texto
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-2">
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder="data;cliente;cidade;tipo_servico;valor;custo_material;tecnico"
            className="w-full h-28 text-xs font-mono border rounded-lg p-2"
          />
          <button
            onClick={() => send(csv)}
            disabled={loading || !csv.trim()}
            className="self-start rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {loading ? "Enviando…" : "Enviar CSV colado"}
          </button>
        </div>
      )}
      {result && <span className="text-xs text-emerald-700">{result}</span>}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
