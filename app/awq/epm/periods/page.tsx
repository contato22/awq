// ─── /awq/epm/periods — Period Close / Lock Management ────────────────────────
//
// Fiscal period management:
//   • FY2026 monthly + quarterly periods
//   • Period close workflow: OPEN → REVIEWING → CLOSED
//   • Close checklist per period (GL balanced, AP/AR reconciled, bank rec done)
//   • Lock prevents new GL entries for closed periods

import Header from "@/components/Header";
import Link from "next/link";
import {
  Lock, Unlock, CheckCircle2, Clock, AlertTriangle,
  Calendar, FileText, ChevronRight,
} from "lucide-react";

type PeriodStatus = "OPEN" | "REVIEWING" | "CLOSED" | "LOCKED";

interface FiscalPeriod {
  period_code: string;
  period_type: "MONTH" | "QUARTER" | "YEAR";
  start_date:  string;
  end_date:    string;
  status:      PeriodStatus;
  closed_by?:  string;
  closed_at?:  string;
  checklist:   ChecklistItem[];
}

interface ChecklistItem {
  label:   string;
  done:    boolean;
  note?:   string;
}

function buildChecklist(done: boolean[], notes?: (string | undefined)[]): ChecklistItem[] {
  const labels = [
    "Balancete (GL) balanceado",
    "AP reconciliado com fornecedores",
    "AR reconciliado com clientes",
    "Conciliação bancária completa",
    "Depreciação lançada no GL",
    "Provisões registradas",
  ];
  return labels.map((label, i) => ({
    label,
    done:  done[i] ?? false,
    note:  notes?.[i],
  }));
}

const PERIODS: FiscalPeriod[] = [
  {
    period_code: "2026-01", period_type: "MONTH",
    start_date: "2026-01-01", end_date: "2026-01-31",
    status: "LOCKED",
    closed_by: "CFO", closed_at: "2026-02-05T09:00:00Z",
    checklist: buildChecklist([true, true, true, true, true, true]),
  },
  {
    period_code: "2026-02", period_type: "MONTH",
    start_date: "2026-02-01", end_date: "2026-02-28",
    status: "LOCKED",
    closed_by: "CFO", closed_at: "2026-03-04T10:30:00Z",
    checklist: buildChecklist([true, true, true, true, true, true]),
  },
  {
    period_code: "2026-03", period_type: "MONTH",
    start_date: "2026-03-01", end_date: "2026-03-31",
    status: "CLOSED",
    closed_by: "CFO", closed_at: "2026-04-03T14:00:00Z",
    checklist: buildChecklist([true, true, true, true, true, false], [undefined, undefined, undefined, undefined, undefined, "Provisão férias pendente"]),
  },
  {
    period_code: "2026-Q1", period_type: "QUARTER",
    start_date: "2026-01-01", end_date: "2026-03-31",
    status: "CLOSED",
    closed_by: "CEO", closed_at: "2026-04-08T11:00:00Z",
    checklist: buildChecklist([true, true, true, true, true, true]),
  },
  {
    period_code: "2026-04", period_type: "MONTH",
    start_date: "2026-04-01", end_date: "2026-04-30",
    status: "REVIEWING",
    checklist: buildChecklist([true, true, false, true, false, false], [undefined, undefined, "3 faturas AP pendentes", undefined, "Deprec. abril não lançada"]),
  },
  {
    period_code: "2026-05", period_type: "MONTH",
    start_date: "2026-05-01", end_date: "2026-05-31",
    status: "OPEN",
    checklist: buildChecklist([false, false, false, false, false, false]),
  },
  {
    period_code: "2026-06", period_type: "MONTH",
    start_date: "2026-06-01", end_date: "2026-06-30",
    status: "OPEN",
    checklist: buildChecklist([false, false, false, false, false, false]),
  },
  {
    period_code: "2026-Q2", period_type: "QUARTER",
    start_date: "2026-04-01", end_date: "2026-06-30",
    status: "OPEN",
    checklist: buildChecklist([false, false, false, false, false, false]),
  },
  {
    period_code: "2026-07", period_type: "MONTH",
    start_date: "2026-07-01", end_date: "2026-07-31",
    status: "OPEN",
    checklist: buildChecklist([false, false, false, false, false, false]),
  },
  {
    period_code: "2026-08", period_type: "MONTH",
    start_date: "2026-08-01", end_date: "2026-08-31",
    status: "OPEN",
    checklist: buildChecklist([false, false, false, false, false, false]),
  },
  {
    period_code: "2026-09", period_type: "MONTH",
    start_date: "2026-09-01", end_date: "2026-09-30",
    status: "OPEN",
    checklist: buildChecklist([false, false, false, false, false, false]),
  },
  {
    period_code: "2026-Q3", period_type: "QUARTER",
    start_date: "2026-07-01", end_date: "2026-09-30",
    status: "OPEN",
    checklist: buildChecklist([false, false, false, false, false, false]),
  },
];

const STATUS_CFG: Record<PeriodStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  OPEN:      { label: "Aberto",     color: "text-gray-600",    bg: "bg-gray-100",    icon: Unlock       },
  REVIEWING: { label: "Em revisão", color: "text-amber-700",   bg: "bg-amber-100",   icon: Clock        },
  CLOSED:    { label: "Fechado",    color: "text-brand-700",   bg: "bg-brand-100",   icon: CheckCircle2 },
  LOCKED:    { label: "Bloqueado",  color: "text-violet-700",  bg: "bg-violet-100",  icon: Lock         },
};

const TYPE_CFG = {
  MONTH:   { color: "text-gray-700", bg: "bg-gray-50"    },
  QUARTER: { color: "text-brand-700",bg: "bg-brand-50"   },
  YEAR:    { color: "text-violet-700",bg: "bg-violet-50" },
};

export default function PeriodsPage() {
  const months    = PERIODS.filter((p) => p.period_type === "MONTH");
  const quarters  = PERIODS.filter((p) => p.period_type === "QUARTER");

  const lockedCount   = PERIODS.filter((p) => p.status === "LOCKED").length;
  const closedCount   = PERIODS.filter((p) => p.status === "CLOSED").length;
  const reviewCount   = PERIODS.filter((p) => p.status === "REVIEWING").length;
  const openCount     = PERIODS.filter((p) => p.status === "OPEN").length;

  const reviewing = PERIODS.find((p) => p.status === "REVIEWING");

  return (
    <>
      <Header
        title="Fechamento de Períodos"
        subtitle="EPM · Fiscal Periods · Close & Lock · FY2026"
      />
      <div className="page-container">

        {/* ── Summary pills ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Bloqueados", value: lockedCount,  ...STATUS_CFG.LOCKED   },
            { label: "Fechados",   value: closedCount,  ...STATUS_CFG.CLOSED   },
            { label: "Em revisão", value: reviewCount,  ...STATUS_CFG.REVIEWING },
            { label: "Abertos",    value: openCount,    ...STATUS_CFG.OPEN     },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={15} className={s.color} />
                </div>
                <div>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Period in review — checklist ─────────────────────────── */}
        {reviewing && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-amber-600" />
              <span className="text-sm font-semibold text-gray-900">
                Período em Revisão: {reviewing.period_code}
              </span>
              <span className="ml-auto text-xs text-gray-400">
                {reviewing.checklist.filter((c) => c.done).length} / {reviewing.checklist.length} itens concluídos
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {reviewing.checklist.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  {item.done
                    ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    : <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <div className={`text-xs font-medium ${item.done ? "text-gray-700" : "text-amber-700"}`}>
                      {item.label}
                    </div>
                    {item.note && (
                      <div className="text-[11px] text-amber-600 mt-0.5">{item.note}</div>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    item.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {item.done ? "OK" : "Pendente"}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                disabled={reviewing.checklist.some((c) => !c.done)}
                className="px-4 py-2 text-xs font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Fechar Período {reviewing.period_code}
              </button>
              <button className="px-4 py-2 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                Reabrir para Correção
              </button>
            </div>
            {reviewing.checklist.some((c) => !c.done) && (
              <div className="mt-2 text-[11px] text-amber-600">
                Resolva todos os itens pendentes antes de fechar o período.
              </div>
            )}
          </div>
        )}

        {/* ── Monthly periods timeline ──────────────────────────────── */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Calendar size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">Períodos Mensais — FY2026</span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Período</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Início</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Fim</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Status</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Checklist</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Fechado por</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Data</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold w-20" />
                </tr>
              </thead>
              <tbody>
                {months.map((p) => {
                  const cfg     = STATUS_CFG[p.status];
                  const Icon    = cfg.icon;
                  const doneN   = p.checklist.filter((c) => c.done).length;
                  const totalN  = p.checklist.length;
                  const allDone = doneN === totalN;
                  return (
                    <tr key={p.period_code} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-bold text-gray-900">{p.period_code}</td>
                      <td className="py-2.5 px-3 text-gray-500">{p.start_date}</td>
                      <td className="py-2.5 px-3 text-gray-500">{p.end_date}</td>
                      <td className="py-2.5 px-3">
                        <span className={`flex items-center gap-1 w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          <Icon size={9} /> {cfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${allDone ? "bg-emerald-400" : "bg-amber-400"}`}
                              style={{ width: `${(doneN / totalN) * 100}%` }}
                            />
                          </div>
                          <span className="text-gray-400">{doneN}/{totalN}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500">{p.closed_by ?? "—"}</td>
                      <td className="py-2.5 px-3 text-gray-500">{p.closed_at ? p.closed_at.slice(0, 10) : "—"}</td>
                      <td className="py-2.5 px-3">
                        {p.status === "OPEN" && (
                          <button className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded-lg font-semibold hover:bg-amber-200 transition-colors whitespace-nowrap">
                            Iniciar revisão
                          </button>
                        )}
                        {p.status === "LOCKED" && (
                          <span className="flex items-center gap-1 text-[10px] text-violet-500">
                            <Lock size={9} /> Bloqueado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Quarterly periods ─────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={14} className="text-violet-600" />
            <span className="text-sm font-semibold text-gray-900">Períodos Trimestrais — FY2026</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quarters.map((p) => {
              const cfg    = STATUS_CFG[p.status];
              const Icon   = cfg.icon;
              const doneN  = p.checklist.filter((c) => c.done).length;
              const totalN = p.checklist.length;
              return (
                <div key={p.period_code} className={`rounded-xl p-4 border ${p.status === "LOCKED" ? "border-violet-200 bg-violet-50" : p.status === "CLOSED" ? "border-brand-200 bg-brand-50" : "border-gray-200 bg-gray-50"}`}>
                  <div className="font-bold text-gray-900 mb-1">{p.period_code}</div>
                  <div className="text-[10px] text-gray-400 mb-2">
                    {p.start_date.slice(5, 7)}/{p.start_date.slice(0,4)} → {p.end_date.slice(5, 7)}/{p.end_date.slice(0,4)}
                  </div>
                  <span className={`flex items-center gap-1 w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${cfg.bg} ${cfg.color}`}>
                    <Icon size={9} /> {cfg.label}
                  </span>
                  <div className="text-[10px] text-gray-400">
                    Checklist: {doneN}/{totalN} ✓
                  </div>
                  {p.closed_by && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      Fechado por {p.closed_by}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Policy note ───────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800">
          <Lock size={13} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Política de fechamento AWQ:</span>{" "}
            Períodos mensais fecham até D+5 do mês seguinte. Trimestres fecham até D+10.
            Períodos BLOQUEADOS não aceitam novos lançamentos GL — alterações requerem aprovação do CFO
            e reabertura manual no sistema.
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/gl" className="text-brand-600 hover:underline">GL →</Link>
          <Link href="/awq/epm/reports/board-pack" className="text-brand-600 hover:underline">Board Pack →</Link>
        </div>

      </div>
    </>
  );
}
