"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { FileSpreadsheet, Printer } from "lucide-react";
import { persistenciaDoEstudioLigada } from "@/lib/studio-store";
import { assinarEstudio, listarShots, type ShotEstudio } from "@/lib/studio-store";
import {
  callSheetDaProducao,
  csvDaProducao,
  csvDoDiretor,
  htmlDaFicha,
  shotListDoDiretor,
} from "@/lib/studio-templates";

function baixar(nome: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function imprimir(shots: ShotEstudio[]) {
  const iframe = document.createElement("iframe");
  iframe.title = "Ficha do Estúdio";
  iframe.style.cssText = "position:fixed;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) { iframe.remove(); return; }
  doc.open();
  doc.write(htmlDaFicha(shots));
  doc.close();
  win.focus();
  win.print();
  setTimeout(() => iframe.remove(), 1500);
}

export default function EstudioCazaPage() {
  const [shots, setShots] = useState<ShotEstudio[]>([]);
  useEffect(() => {
    const ler = () => setShots(listarShots());
    ler();
    return assinarEstudio(ler);
  }, []);

  const diretor = shotListDoDiretor(shots);
  const dia = callSheetDaProducao(shots);
  const ligado = persistenciaDoEstudioLigada();

  return (
    <>
      <Header title="Estúdio" subtitle="Diretor e Produção · Caza Vision" />
      <div className="page-container space-y-4">
        <p className="text-sm text-gray-600">
          Os dois agentes leem os planos capturados no Estúdio e preenchem a lista e a ordem do dia com regras fixas. Sem modelo de linguagem.
          {" "}
          {ligado
            ? "Os planos ficam guardados neste navegador."
            : "Os planos vivem só nesta sessão do navegador."}
        </p>

        <section className="card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Diretor · lista de planos</h2>
            <button
              type="button"
              onClick={() => baixar("estudio-diretor.csv", csvDoDiretor(shots))}
              disabled={shots.length === 0}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 inline-flex items-center gap-1 disabled:opacity-40"
            >
              <FileSpreadsheet size={12} /> CSV
            </button>
          </div>
          {diretor.length === 0 && (
            <p className="text-xs text-gray-400">
              Nenhum plano.{" "}
              <Link href="/agents/office?estudio=1" className="font-medium text-brand-700 underline">Abra o Estúdio</Link>
              {" "}e capture um plano.
            </p>
          )}
          <ol className="space-y-2">
            {diretor.map((l, i) => {
              const png = shots[i]?.png ?? "";
              const miniatura = png.startsWith("data:image/");
              return (
                <li key={l.ordem} className="text-sm text-gray-800 flex gap-3">
                  {miniatura && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={png} alt={`Miniatura de ${l.plano}`} className="w-28 h-16 object-cover rounded-md bg-gray-900 shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold">{l.ordem}. {l.plano}</span>
                    <span className="text-gray-500"> · {l.enquadramento} · {l.lenteMm} mm · {l.sensor} · {l.aspecto}</span>
                    <div className="text-xs text-gray-600">{l.indicacao}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Produção · ordem do dia</h2>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => baixar("estudio-producao.csv", csvDaProducao(shots))}
                disabled={shots.length === 0}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 inline-flex items-center gap-1 disabled:opacity-40"
              >
                <FileSpreadsheet size={12} /> CSV
              </button>
              <button
                type="button"
                onClick={() => imprimir(shots)}
                disabled={shots.length === 0}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 inline-flex items-center gap-1 disabled:opacity-40"
              >
                <Printer size={12} /> PDF
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">{dia.chamada} · lentes {dia.lentes}</p>
          {dia.linhas.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Hora</th>
                  <th className="py-1 pr-2">Plano</th>
                  <th className="py-1 pr-2">Lente</th>
                  <th className="py-1">Setup</th>
                </tr>
              </thead>
              <tbody>
                {dia.linhas.map((l) => (
                  <tr key={l.ordem} className="border-t border-gray-100">
                    <td className="py-1.5 pr-2">{l.ordem}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{l.horario}</td>
                    <td className="py-1.5 pr-2">{l.plano}</td>
                    <td className="py-1.5 pr-2">{l.lenteMm} mm</td>
                    <td className="py-1.5">{l.setup}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
