"use client";

import type { Lead, Stage } from "@/lib/patricia-canto/leads";
import { STAGES, STAGE_SLA_DAYS, daysInCurrentStage } from "@/lib/patricia-canto/leads";

const PRIORITY_STYLES: Record<string, string> = {
  Alta: "bg-orange-50 text-orange-800 ring-1 ring-orange-200",
  Média: "bg-canto-100 text-canto-700 ring-1 ring-canto-300",
  Baixa: "bg-canto-50 text-canto-500 ring-1 ring-canto-200",
};

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return raw || "—";
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const mid = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4);
  const end = rest.length === 9 ? rest.slice(5) : rest.slice(4);
  return `(${ddd}) ${mid}-${end}`;
}

function currency(v: number | null) {
  if (v == null) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function LeadCard({
  lead,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onMoveStage,
}: {
  lead: Lead;
  dragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onOpen: (id: string) => void;
  onMoveStage: (id: string, stage: Stage) => void;
}) {
  const whatsappDigits = lead.telefone.replace(/\D/g, "");
  const canWhatsapp = whatsappDigits.length >= 10;
  const sla = STAGE_SLA_DAYS[lead.stage];
  const days = daysInCurrentStage(lead);
  const isLate = sla != null && days > sla;
  const isWarning = sla != null && days === sla;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(lead.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(lead.id)}
      className={`group cursor-grab rounded-xl border border-canto-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-canto-300 hover:shadow-md active:cursor-grabbing ${
        dragging ? "opacity-40" : "opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight text-canto-900">
          {lead.nomeCliente || "Sem nome"}
        </p>
        {lead.prioridade && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_STYLES[lead.prioridade] ?? PRIORITY_STYLES.Baixa}`}
          >
            {lead.prioridade}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-canto-600">{lead.tipoProcesso}</p>
        <span
          className={`shrink-0 text-[10px] font-semibold ${
            isLate ? "text-rose-600" : isWarning ? "text-amber-600" : "text-canto-400"
          }`}
          title={sla != null ? `SLA do estágio: ${sla} dia(s)` : undefined}
        >
          {days === 0 ? "hoje" : `${days}d`} no estágio
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-canto-500">
        <span>{formatPhone(lead.telefone)}</span>
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

      {(lead.valorAcao != null || lead.honorarios != null) && (
        <div className="mt-2 space-y-0.5 text-xs">
          {lead.valorAcao != null && (
            <p className="text-canto-500">
              Valor da ação: <span className="font-semibold text-canto-800">{currency(lead.valorAcao)}</span>
            </p>
          )}
          {lead.honorarios != null && (
            <p className="text-canto-500">
              Honorários: <span className="font-semibold text-canto-700">{currency(lead.honorarios)}</span>
            </p>
          )}
        </div>
      )}

      {lead.percChances != null && (
        <p className="mt-1 text-xs text-canto-500">{Math.round(lead.percChances * 100)}% chance</p>
      )}

      {lead.origem && (
        <p className="mt-2 text-[11px] text-canto-400">
          Origem: {lead.origem}
          {lead.indicadoPor ? ` (${lead.indicadoPor})` : ""}
        </p>
      )}

      <div
        className="mt-3 border-t border-canto-100 pt-2"
        onClick={(e) => e.stopPropagation()}
      >
        <select
          value={lead.stage}
          onChange={(e) => onMoveStage(lead.id, e.target.value as Stage)}
          className="w-full rounded-md border border-canto-200 bg-canto-50 px-2 py-1 text-[11px] text-canto-600 outline-none focus:border-canto-500"
          aria-label="Mover lead para outra etapa"
        >
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              Mover para: {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
