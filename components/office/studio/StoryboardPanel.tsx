"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, FileSpreadsheet, Printer, Trash2 } from "lucide-react";
import { SENSORES } from "@/lib/studio-optics";
import { csvDoStoryboard } from "@/lib/studio-storyboard";
import { assinarEstudio, listarShots, moverShot, removerShot, type ShotEstudio } from "@/lib/studio-store";

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}

function imprimir(shots: ShotEstudio[]) {
  const iframe = document.createElement("iframe");
  iframe.title = "Storyboard";
  iframe.style.cssText = "position:fixed;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) { iframe.remove(); return; }
  const blocos = shots.map((s, i) => `
    <figure>
      <img src="${s.png}" alt="${escapar(s.nome)}">
      <figcaption><strong>${i + 1}. ${escapar(s.nome)}</strong> · ${s.lenteMm} mm · ${escapar(SENSORES[s.sensor].nome)} · ${escapar(s.aspecto)}<br>${escapar(s.nota)}</figcaption>
    </figure>`).join("");
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Storyboard · Estúdio Caza</title>
    <style>
      body { font-family: sans-serif; margin: 16px; color: #111; }
      h1 { font-size: 18px; }
      figure { break-inside: avoid; margin: 0 0 20px; }
      img { width: 100%; border: 1px solid #ddd; }
      figcaption { font-size: 12px; margin-top: 6px; }
    </style></head><body>
    <h1>Storyboard · Estúdio Caza Vision</h1>
    ${blocos || "<p>Nenhum plano.</p>"}
    </body></html>`);
  doc.close();
  win.focus();
  win.print();
  setTimeout(() => iframe.remove(), 1500);
}

function baixarCsv(shots: ShotEstudio[]) {
  const blob = new Blob([csvDoStoryboard(shots)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "estudio-storyboard.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function StoryboardPanel() {
  const [shots, setShots] = useState<ShotEstudio[]>([]);
  useEffect(() => {
    const ler = () => setShots(listarShots());
    ler();
    return assinarEstudio(ler);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-800">Storyboard do Estúdio</h2>
        <div className="flex gap-1">
          <button type="button" onClick={() => baixarCsv(shots)} disabled={shots.length === 0}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 inline-flex items-center gap-1 disabled:opacity-40">
            <FileSpreadsheet size={12} /> CSV
          </button>
          <button type="button" onClick={() => imprimir(shots)} disabled={shots.length === 0}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 inline-flex items-center gap-1 disabled:opacity-40">
            <Printer size={12} /> PDF
          </button>
        </div>
      </div>
      <p className="text-[11px] text-gray-500">Reordene os planos e exporte. O PDF abre a impressão do navegador. Sem a flag CAZA_STUDIO_PERSIST, a lista vive só nesta sessão.</p>
      {shots.length === 0 && <p className="text-xs text-gray-400">Nenhum plano ainda. Capture no Estúdio.</p>}
      <ol className="space-y-3">
        {shots.map((s, i) => (
          <li key={s.id} className="border border-gray-100 rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.png} alt={`Miniatura de ${s.nome}`} className="w-full bg-gray-900" />
            <div className="p-3 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{i + 1}. {s.nome}</p>
                <p className="text-[11px] text-gray-500">{s.lenteMm} mm · {SENSORES[s.sensor].nome} · {s.aspecto} · {s.fovVertical.toFixed(1)}°</p>
                {s.nota && <p className="text-xs text-gray-600 mt-1">{s.nota}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" aria-label={`Subir ${s.nome}`} disabled={i === 0} onClick={() => moverShot(s.id, -1)}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-30"><ArrowUp size={14} /></button>
                <button type="button" aria-label={`Descer ${s.nome}`} disabled={i === shots.length - 1} onClick={() => moverShot(s.id, 1)}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-30"><ArrowDown size={14} /></button>
                <button type="button" aria-label={`Remover ${s.nome}`} onClick={() => removerShot(s.id)}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
