"use client";

import type { CaseItem, CaseStage } from "@/lib/patricia-canto/cases";
import { CASE_STAGES, daysSinceUpdate, isCommunicationLate } from "@/lib/patricia-canto/cases";

export default function CaseCard({
  item,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onMoveStage,
}: {
  item: CaseItem;
  dragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onOpen: (id: string) => void;
  onMoveStage: (id: string, stage: CaseStage) => void;
}) {
  const late = isCommunicationLate(item);
  const days = daysSinceUpdate(item);
  const whatsappDigits = item.telefone.replace(/\D/g, "");
  const canWhatsapp = whatsappDigits.length >= 10;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(item.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(item.id)}
      className={`group cursor-grab rounded-xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${
        late ? "border-rose-300" : "border-canto-200 hover:border-canto-300"
      } ${dragging ? "opacity-40" : "opacity-100"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight text-canto-900">{item.nomeCliente}</p>
        {late && (
          <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700 ring-1 ring-rose-200">
            Atraso
          </span>
        )}
      </div>

      <p className="mt-1 text-xs font-medium text-canto-600">{item.tipoProcesso}</p>

      <div className="mt-2 flex items-center justify-between text-xs text-canto-500">
        <span>{item.telefone || "—"}</span>
        {canWhatsapp && (
          <a
            href={`https://wa.me/55${whatsappDigits}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            WhatsApp
          </a>
        )}
      </div>

      {item.statusInss && <p className="mt-2 text-xs text-canto-500">INSS: {item.statusInss}</p>}
      {item.statusJudicial && <p className="mt-1 text-xs text-canto-500">Judicial: {item.statusJudicial}</p>}
      {item.resultado && (
        <p className={`mt-1 text-xs font-semibold ${item.resultado === "Deferido" ? "text-emerald-700" : "text-rose-700"}`}>
          {item.resultado}
        </p>
      )}

      <p className={`mt-2 text-[11px] font-medium ${late ? "text-rose-600" : "text-canto-400"}`}>
        Última atualização: {days === 0 ? "hoje" : `há ${days}d`}
      </p>

      <div className="mt-3 border-t border-canto-100 pt-2" onClick={(e) => e.stopPropagation()}>
        <select
          value={item.stage}
          onChange={(e) => onMoveStage(item.id, e.target.value as CaseStage)}
          className="w-full rounded-md border border-canto-200 bg-canto-50 px-2 py-1 text-[11px] text-canto-600 outline-none focus:border-canto-500"
          aria-label="Mover caso para outra etapa"
        >
          {CASE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              Mover para: {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
