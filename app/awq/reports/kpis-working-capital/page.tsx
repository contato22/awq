"use client";

import { useState, useEffect } from "react";
import type { APARKPIs, BuCode } from "@/lib/ap-ar-db";

const BU_CODES: BuCode[] = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtDays(v: number | null) { if (v == null) return "—"; return `${Math.round(v)} dias`; }

interface KpiCardProps { label: string; value: string; sub?: string; color?: string; }
function KpiCard({ label, value, sub, color = "text-gray-900" }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 text-center">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

const AGING_LABELS: Record<string, string> = {
  CURRENT:  "Em dia",
  "1-30d":  "1–30 d",
  "31-60d": "31–60 d",
  "61-90d": "61–90 d",
  "+90d":   "+90 d",
};
const AGING_BAR_COLOR: Record<string, string> = {
  CURRENT:  "bg-emerald-400",
  "1-30d":  "bg-yellow-400",
  "31-60d": "bg-orange-400",
  "61-90d": "bg-red-400",
  "+90d":   "bg-red-700",
};

function AgingBar({ aging, total }: { aging: Record<string, number>; total: number }) {
  if (total === 0) return <div className="text-xs text-gray-400">Sem dados</div>;
  return (
    <div className="space-y-1.5">
      {Object.entries(aging).map(([bucket, amount]) => (
        <div key={bucket} className="flex items-center gap-2">
          <div className="text-xs text-gray-500 w-16">{AGING_LABELS[bucket] ?? bucket}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${AGING_BAR_COLOR[bucket] ?? "bg-gray-400"}`}
              style={{ width: `${Math.min(100, (amount / total) * 100)}%` }}
            />
          </div>
          <div className="text-xs font-medium text-gray-700 w-28 text-right">{fmt(amount)}</div>
          <div className="text-xs text-gray-400 w-10 text-right">
            {((amount / total) * 100).toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
}

function cccColor(ccc: number) {
  if (ccc < 30) return "text-emerald-600";
  if (ccc < 60) return "text-yellow-600";
  return "text-red-600";
}
function cccInterpretation(ccc: number, dso: number, dpo: number) {
  if (ccc < 0) return "Ótimo: você recebe antes de pagar.";
  if (ccc < 30) return "Bom: ciclo de caixa curto.";
  if (dso > dpo + 20) return "Atenção: clientes demoram a pagar mais do que você paga fornecedores.";
  return "Ciclo extenso. Considere antecipar recebíveis ou negociar mais prazo com fornecedores.";
}

export default function KPIsWorkingCapitalPage() {
  const [kpis,    setKpis]    = useState<APARKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [bu,      setBu]      = useState<BuCode | "">("");

  useEffect(() => {
    setLoading(true);
    const qs = bu ? `?bu_code=${bu}&view=kpis` : "?view=kpis";
    fetch(`/api/epm/ar${qs}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setKpis(j.data); })
      .finally(() => setLoading(false));
  }, [bu]);

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPIs — Capital de Giro</h1>
          <p className="text-sm text-gray-500 mt-1">DSO, DPO, CCC e análise de aging</p>
        </div>
        <select
          value={bu}
          onChange={(e) => setBu(e.target.value as BuCode | "")}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Consolidado</option>
          {BU_CODES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando KPIs...</div>
      ) : !kpis ? (
        <div className="text-center py-16 text-gray-400">Nenhum dado disponível.</div>
      ) : (
        <>
          {/* Main KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="DSO"
              value={fmtDays(kpis.dso)}
              sub="Dias a receber"
              color={kpis.dso == null ? "text-gray-500" : kpis.dso > 45 ? "text-red-600" : kpis.dso > 30 ? "text-yellow-600" : "text-emerald-600"}
            />
            <KpiCard
              label="DPO"
              value={fmtDays(kpis.dpo)}
              sub="Dias a pagar"
              color="text-gray-900"
            />
            <KpiCard
              label="CCC"
              value={fmtDays(kpis.ccc)}
              sub="Ciclo de caixa"
              color={cccColor(kpis.ccc ?? 0)}
            />
            <div className="bg-white rounded-xl border shadow-sm p-5 text-center">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Interpretação</div>
              <div className="text-sm text-gray-700 leading-snug">{cccInterpretation(kpis.ccc ?? 0, kpis.dso ?? 0, kpis.dpo ?? 0)}</div>
            </div>
          </div>

          {/* Balance KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total a Receber" value={fmt(kpis.totalAROutstanding)} sub="AR pendente" color="text-emerald-700" />
            <KpiCard label="Total a Pagar"   value={fmt(kpis.totalAPOutstanding)} sub="AP pendente" color="text-red-700" />
            <KpiCard label="AR Vencido"       value={fmt(kpis.totalAROverdue)} sub="Em atraso" color={kpis.totalAROverdue > 0 ? "text-red-600" : "text-gray-900"} />
            <KpiCard label="AP Vencido"       value={fmt(kpis.totalAPOverdue)} sub="Em atraso" color={kpis.totalAPOverdue > 0 ? "text-red-600" : "text-gray-900"} />
          </div>

          {/* Aging charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4">AP Aging — Contas a Pagar</h3>
              <AgingBar
                aging={kpis.apAging as unknown as Record<string, number>}
                total={Object.values(kpis.apAging).reduce((s, v) => s + v, 0)}
              />
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4">AR Aging — Contas a Receber</h3>
              <AgingBar
                aging={kpis.arAging as unknown as Record<string, number>}
                total={Object.values(kpis.arAging).reduce((s, v) => s + v, 0)}
              />
            </div>
          </div>

          {/* Formula explanation */}
          <div className="bg-gray-50 rounded-xl border p-5 text-sm text-gray-600 space-y-2">
            <div className="font-semibold text-gray-800 mb-3">Como os KPIs são calculados</div>
            <div><span className="font-medium">DSO</span> (Days Sales Outstanding) = AR Pendente ÷ Receita média diária</div>
            <div><span className="font-medium">DPO</span> (Days Payable Outstanding) = AP Pendente ÷ Custo médio diário</div>
            <div><span className="font-medium">CCC</span> (Cash Conversion Cycle) = DSO − DPO</div>
            <div className="text-xs text-gray-400 pt-1">Receita/custo médio calculado com base nos últimos 30 dias.</div>
          </div>
        </>
      )}
    </div>
  );
}
