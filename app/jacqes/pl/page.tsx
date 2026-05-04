import Header from "@/components/Header";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { buData, monthlyRevenue, JACQES_MRR } from "@/lib/awq-group-data";
import { JACQES_CLIENTS } from "@/lib/jacqes-customers";

const jacqes = buData.find((b) => b.id === "jacqes")!;
const mrrHistory = monthlyRevenue.filter((m) => m.jacqes > 0).map((m) => ({ month: m.month, mrr: m.jacqes }));
const clientes   = JACQES_CLIENTS;
const totalPago  = clientes.filter((c) => c.status === "Pago").reduce((s, c) => s + c.fee, 0);
const totalPend  = clientes.filter((c) => c.status === "Pendente").reduce((s, c) => s + c.fee, 0);

function fmt(n: number) {
  return "R$ " + n.toLocaleString("pt-BR");
}

type LineStatus = "real" | "parcial" | "pendente";

interface PlRow {
  label:   string;
  value:   number | null;
  status:  LineStatus;
  bold:    boolean;
  indent:  boolean;
  type:    "positive" | "negative" | "neutral";
}

const MES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const rows: PlRow[] = [
  { label: "(+) Receita Bruta",       value: jacqes.revenue, status: "real",     bold: false, indent: false, type: "positive" },
  { label: "(-) Deduções (ISS/PIS…)", value: null,           status: "pendente", bold: false, indent: true,  type: "negative" },
  { label: "(=) Receita Líquida",     value: jacqes.revenue, status: "parcial",  bold: true,  indent: false, type: "positive" },
  { label: "(-) COGS",                value: null,           status: "pendente", bold: false, indent: true,  type: "negative" },
  { label: "(=) Lucro Bruto",         value: null,           status: "pendente", bold: true,  indent: false, type: "neutral"  },
  { label: "(-) Pessoal",             value: null,           status: "pendente", bold: false, indent: true,  type: "negative" },
  { label: "(-) Adm & Marketing",     value: null,           status: "pendente", bold: false, indent: true,  type: "negative" },
  { label: "(=) EBITDA",              value: null,           status: "pendente", bold: true,  indent: false, type: "neutral"  },
  { label: "(-) D&A",                 value: null,           status: "pendente", bold: false, indent: true,  type: "negative" },
  { label: "(=) EBIT",                value: null,           status: "pendente", bold: true,  indent: false, type: "neutral"  },
  { label: "(+/-) Resultado Fin.",    value: null,           status: "pendente", bold: false, indent: true,  type: "neutral"  },
  { label: "(-) IR / CSLL",           value: null,           status: "pendente", bold: false, indent: true,  type: "negative" },
  { label: "(=) Lucro Líquido",       value: jacqes.netIncome || null, status: jacqes.netIncome ? "real" : "pendente", bold: true, indent: false, type: "neutral" },
];

const statusLabel: Record<LineStatus, string> = {
  real:     "real",
  parcial:  "parcial",
  pendente: "—",
};
const statusCls: Record<LineStatus, string> = {
  real:     "text-emerald-600 bg-emerald-50",
  parcial:  "text-amber-600 bg-amber-50",
  pendente: "text-gray-300 bg-transparent",
};

const maxBar = Math.max(...mrrHistory.map((r) => r.mrr));

export default function MiniPlPage() {
  return (
    <>
      <Header title="Mini P&L — JACQES" subtitle="Demonstrativo de Resultado · Q1/Q2 2026" />
      <div className="page-container max-w-2xl">

        {/* ── Aviso de dados parciais ─────────────────────────────────────── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Receita confirmada via Notion CRM. Custos, impostos e deduções aguardam
            lançamento contábil — insira via FP&A para completar o DRE.
          </p>
        </div>

        {/* ── MRR Trend ───────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">MRR Atual</div>
              <div className="text-2xl font-bold text-gray-900 mt-0.5">{fmt(JACQES_MRR)}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                ARR projetado: {fmt(JACQES_MRR * 12)}
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
              <TrendingUp size={13} />
              <span className="text-xs font-semibold">
                {(((JACQES_MRR - mrrHistory[0].mrr) / mrrHistory[0].mrr) * 100).toFixed(0)}% vs Jan
              </span>
            </div>
          </div>

          {/* Barra de MRR por mês */}
          <div className="flex items-end gap-2 h-16">
            {mrrHistory.map((row) => {
              const pct = (row.mrr / maxBar) * 100;
              const [, yrRaw] = row.month.split("/");
              const mesIdx = MES_PT.findIndex((m) => row.month.startsWith(m));
              const label  = (mesIdx >= 0 ? MES_PT[mesIdx] : row.month.split("/")[0]) + "/" + (yrRaw ?? "");
              return (
                <div key={row.month} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-brand-500"
                    style={{ height: `${pct}%`, minHeight: "4px" }}
                    title={`${label}: ${fmt(row.mrr)}`}
                  />
                  <span className="text-[9px] text-gray-400 leading-none">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Receita Clientes ────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Receita por Status · {mrrHistory[mrrHistory.length - 1]?.month ?? ""}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
              <div className="text-[10px] font-semibold text-emerald-600 mb-1">Pago</div>
              <div className="text-base font-bold text-emerald-700">{fmt(totalPago)}</div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
              <div className="text-[10px] font-semibold text-amber-600 mb-1">Pendente</div>
              <div className="text-base font-bold text-amber-700">{fmt(totalPend)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
              <div className="text-[10px] font-semibold text-gray-500 mb-1">Clientes</div>
              <div className="text-base font-bold text-gray-700">{jacqes.customers}</div>
            </div>
          </div>
        </div>

        {/* ── DRE Resumido ────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            DRE · YTD {mrrHistory[mrrHistory.length - 1]?.month ?? ""}
          </div>
          <div className="space-y-0.5">
            {rows.map((row, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-2 ${
                  i < rows.length - 1 ? "border-b border-gray-50" : ""
                } ${row.bold ? "bg-gray-50/60 rounded px-2 -mx-2" : ""}`}
              >
                <span
                  className={`text-xs ${row.indent ? "pl-4 text-gray-500" : "text-gray-800"} ${
                    row.bold ? "font-semibold" : ""
                  }`}
                >
                  {row.label}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {row.status !== "pendente" && (
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${statusCls[row.status]}`}>
                      {statusLabel[row.status]}
                    </span>
                  )}
                  <span
                    className={`text-xs font-mono ${
                      row.value === null
                        ? "text-gray-300"
                        : row.type === "positive"
                        ? "text-emerald-700 font-semibold"
                        : row.type === "negative"
                        ? "text-red-600"
                        : "font-semibold text-gray-700"
                    }`}
                  >
                    {row.value !== null ? fmt(row.value) : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
