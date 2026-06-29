// ─── Live Shop — Calendário de lives (apresentacional) ────────────────────────
// Grid mensal (um por mês com lives) marcando os dias com live (realizada/
// planejada/confirmada). Server component puro. Usa só data + status.

export interface CalendarEntry {
  id: string;
  startsAt: string; // ISO
  status: string; // 'realizada' | 'planejada' | 'confirmada'
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function groupByMonth(entries: CalendarEntry[]): Map<string, CalendarEntry[]> {
  const m = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    const key = e.startsAt.slice(0, 7);
    (m.get(key) ?? m.set(key, []).get(key)!).push(e);
  }
  return m;
}

function dotClass(status: string, dark: boolean): string {
  if (status === "realizada") return dark ? "bg-white/40" : "bg-gray-400";
  if (status === "confirmada") return "bg-pink-500";
  return "bg-blue-400"; // planejada
}

function MonthGrid({ ym, entries, dark }: { ym: string; entries: CalendarEntry[]; dark: boolean }) {
  const [year, month] = ym.split("-").map(Number); // month 1-12
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const byDay = new Map<number, CalendarEntry[]>();
  for (const e of entries) {
    const d = Number(e.startsAt.slice(8, 10));
    (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(e);
  }

  const cells: ({ day: number; evs: CalendarEntry[] } | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, evs: byDay.get(d) ?? [] });

  const border = dark ? "border-white/10" : "border-gray-200/80";
  const head = dark ? "text-white/40" : "text-gray-400";
  const liveCell = dark
    ? "bg-pink-600/20 text-pink-100 ring-1 ring-pink-500/30 font-semibold"
    : "bg-pink-50 text-pink-700 ring-1 ring-pink-200 font-semibold";
  const normal = dark ? "text-white/60" : "text-gray-600";

  return (
    <div className={`rounded-2xl border ${border} ${dark ? "bg-white/[0.04]" : "bg-white"} p-4`}>
      <p className={`mb-3 text-center text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
        {MONTHS[month - 1]} {year}
      </p>
      <div className={`grid grid-cols-7 gap-1 text-center text-[10px] uppercase ${head}`}>
        {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const has = c.evs.length > 0;
          const title = has
            ? c.evs.map((e) => new Date(e.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })).join(" · ")
            : undefined;
          return (
            <div
              key={i}
              title={title}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs ${has ? liveCell : normal}`}
            >
              <span>{c.day}</span>
              {has && <span className={`mt-0.5 h-1 w-1 rounded-full ${dotClass(c.evs[0].status, dark)}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LiveShopCalendar({ entries, dark = true }: { entries: CalendarEntry[]; dark?: boolean }) {
  if (entries.length === 0) {
    return <p className={`text-center text-sm ${dark ? "text-white/40" : "text-gray-400"}`}>Sem lives na agenda.</p>;
  }
  const months = [...groupByMonth(entries).entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {months.map(([ym, evs]) => <MonthGrid key={ym} ym={ym} entries={evs} dark={dark} />)}
      </div>
      <div className={`mt-3 flex flex-wrap justify-center gap-4 text-[11px] ${dark ? "text-white/40" : "text-gray-400"}`}>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-pink-500" /> Confirmada</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Planejada</span>
        <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${dark ? "bg-white/40" : "bg-gray-400"}`} /> Realizada</span>
      </div>
    </div>
  );
}
