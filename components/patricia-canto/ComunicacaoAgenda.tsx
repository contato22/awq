"use client";

import { useMemo, useState } from "react";
import type { ComunicacaoItem } from "@/lib/patricia-canto/gtm-extra";

const FORMATO_DOT: Record<string, string> = {
  video: "bg-rose-400",
  arte: "bg-violet-400",
  planejamento: "bg-amber-400",
  outro: "bg-canto-400",
};

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function ComunicacaoAgenda({
  items,
  onOpen,
}: {
  items: ComunicacaoItem[];
  onOpen: (id: string) => void;
}) {
  const [cursor, setCursor] = useState(() => new Date());

  const monthLabel = cursor
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = segunda
    const gridStart = new Date(year, month, 1 - startWeekday);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  const today = new Date();

  return (
    <div className="rounded-xl border border-canto-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-canto-serif text-base font-semibold text-canto-900">{monthLabel}</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="rounded-lg border border-canto-200 px-2 py-1 text-xs text-canto-600 hover:bg-canto-50"
            aria-label="Mês anterior"
          >
            ‹
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="rounded-lg border border-canto-200 px-2 py-1 text-xs text-canto-600 hover:bg-canto-50"
          >
            Hoje
          </button>
          <button
            onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="rounded-lg border border-canto-200 px-2 py-1 text-xs text-canto-600 hover:bg-canto-50"
            aria-label="Próximo mês"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-canto-400">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = sameDay(day, today);
          const dayItems = items.filter((it) => sameDay(new Date(it.dataPlanejada), day));
          return (
            <div
              key={i}
              className={`min-h-[72px] rounded-lg border p-1 text-left align-top ${
                inMonth ? "border-canto-100 bg-white" : "border-transparent bg-canto-50/50"
              }`}
            >
              <p
                className={`text-[11px] font-semibold ${
                  isToday
                    ? "flex h-4 w-4 items-center justify-center rounded-full bg-canto-700 text-white"
                    : inMonth
                      ? "text-canto-600"
                      : "text-canto-300"
                }`}
              >
                {day.getDate()}
              </p>
              <div className="mt-1 space-y-0.5">
                {dayItems.slice(0, 3).map((it) => (
                  <button
                    key={it.id}
                    onClick={() => onOpen(it.id)}
                    className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] text-canto-700 hover:bg-canto-100"
                    title={it.titulo}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${FORMATO_DOT[it.formato] ?? FORMATO_DOT.outro}`} />
                    <span className="truncate">{it.titulo}</span>
                  </button>
                ))}
                {dayItems.length > 3 && (
                  <p className="px-1 text-[10px] text-canto-400">+{dayItems.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
