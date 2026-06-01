"use client";

// ─── /awq/ppm/calendar — PPM Project Calendar ────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLockedBU } from "@/lib/use-locked-bu";
import Header from "@/components/Header";
import { Calendar, ChevronLeft, ChevronRight, Briefcase, Plus } from "lucide-react";
import type { PpmProject } from "@/lib/ppm-types";

type ProjectListResponse = { success: boolean; data?: { projects: PpmProject[] } };

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function toDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const gridStart = new Date(year, month, 1 - startWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

const STATUS_DOT: Record<string, string> = {
  active:     "bg-emerald-500",
  on_hold:    "bg-amber-500",
  completed:  "bg-blue-500",
  cancelled:  "bg-gray-400",
  planning:   "bg-violet-500",
};

export default function PpmCalendarPage() {
  const { lockedBU, sessionLoading } = useLockedBU();
  const [projects, setProjects] = useState<PpmProject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [cursor, setCursor]     = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    if (sessionLoading) return;
    const qs = lockedBU ? `?bu_code=${lockedBU}` : "";
    fetch(`/api/ppm/projects${qs}`)
      .then(r => r.json() as Promise<ProjectListResponse>)
      .then(json => { setProjects(json.data?.projects ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lockedBU, sessionLoading]);

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { project: PpmProject; kind: "start" | "end" }[]>();
    const push = (d: Date, project: PpmProject, kind: "start" | "end") => {
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push({ project, kind });
      map.set(key, arr);
    };
    for (const p of projects) {
      const start = toDate(p.start_date);
      const end   = toDate(p.actual_end_date ?? p.planned_end_date);
      if (start) push(start, p, "start");
      if (end)   push(end,   p, "end");
    }
    return map;
  }, [projects]);

  const monthLabel = `${MONTHS_PT[cursor.month]} ${cursor.year}`;
  const today = new Date();

  function shiftMonth(delta: number) {
    setCursor(c => {
      const m = c.month + delta;
      const ny = c.year + Math.floor(m / 12);
      const nm = ((m % 12) + 12) % 12;
      return { year: ny, month: nm };
    });
  }

  return (
    <>
      <Header title="Calendário — PPM" subtitle={lockedBU ? `Projetos da BU ${lockedBU}` : "Projetos & Marcos"} />
      <div className="page-container">

        <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="text-sm font-semibold text-gray-900 min-w-[150px] text-center">{monthLabel}</div>
            <button
              onClick={() => shiftMonth(1)}
              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
              aria-label="Próximo mês"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => {
                const n = new Date();
                setCursor({ year: n.getFullYear(), month: n.getMonth() });
              }}
              className="ml-2 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700"
            >
              Hoje
            </button>
          </div>
          <Link
            href={lockedBU ? `/awq/ppm/add?bu=${lockedBU}` : "/awq/ppm/add"}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={14} />
            Novo Projeto
          </Link>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
            {WEEKDAYS_PT.map(w => (
              <div key={w} className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-center">
                {w}
              </div>
            ))}
          </div>
          {loading ? (
            <div className="p-12 flex items-center justify-center text-sm text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin mr-3" />
              Carregando projetos…
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {grid.map((d, i) => {
                const inMonth = d.getMonth() === cursor.month;
                const isToday = sameDay(d, today);
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                const events = eventsByDay.get(key) ?? [];
                return (
                  <div
                    key={i}
                    className={`min-h-[88px] border-b border-r border-gray-100 p-1.5 flex flex-col gap-1 ${
                      inMonth ? "bg-white" : "bg-gray-50/60"
                    }`}
                  >
                    <div className={`text-[11px] font-semibold ${
                      isToday
                        ? "text-white bg-brand-600 rounded-full w-5 h-5 flex items-center justify-center"
                        : inMonth ? "text-gray-700" : "text-gray-400"
                    }`}>
                      {d.getDate()}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {events.slice(0, 3).map((ev, idx) => {
                        const dot = STATUS_DOT[ev.project.status] ?? "bg-gray-400";
                        const labelPrefix = ev.kind === "start" ? "▶" : "■";
                        return (
                          <Link
                            key={idx}
                            href={`/awq/ppm/${ev.project.project_id}`}
                            className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] bg-gray-50 hover:bg-gray-100 truncate"
                            title={`${ev.kind === "start" ? "Início" : "Entrega"}: ${ev.project.project_name}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
                            <span className="text-gray-700 truncate">
                              {labelPrefix} {ev.project.project_name}
                            </span>
                          </Link>
                        );
                      })}
                      {events.length > 3 && (
                        <div className="text-[9px] text-gray-400 px-1">+{events.length - 3} mais</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-2">
            <Calendar size={12} className="text-brand-600" />
            Legenda
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-600">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Ativo</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500" /> Planejamento</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Em Espera</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Concluído</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400" /> Cancelado</span>
            <span className="ml-auto flex items-center gap-2 text-gray-500">
              <Briefcase size={12} /> ▶ Início · ■ Entrega
            </span>
          </div>
        </div>

      </div>
    </>
  );
}
