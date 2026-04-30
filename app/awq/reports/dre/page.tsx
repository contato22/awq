"use client";

import { useState, useEffect } from "react";
import type { DRELine, BuCode } from "@/lib/ap-ar-db";

const BU_CODES: BuCode[] = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function pct(v: number | null | undefined) {
  if (v == null || !isFinite(v)) return "—";
  return v.toFixed(1) + "%";
}

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  const date = new Date(Number(y), Number(mo) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function marginColor(v: number | null | undefined) {
  if (v == null) return "text-gray-500";
  if (v >= 20) return "text-emerald-600";
  if (v >= 5)  return "text-yellow-600";
  return "text-red-600";
}

export default function DREPage() {
  const [data,    setData]    = useState<DRELine[]>([]);
  const [loading, setLoading] = useState(true);
  const [bu,      setBu]      = useState<BuCode | "">("");

  useEffect(() => {
    setLoading(true);
    const qs = bu ? `?bu_code=${bu}` : "";
    fetch(`/api/epm/dre${qs}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  }, [bu]);

  const grossMarginPct = (line: DRELine) =>
    line.netRevenue > 0 ? ((line.grossProfit / line.netRevenue) * 100) : null;
  const ebitdaMarginPct = (line: DRELine) =>
    line.netRevenue > 0 ? ((line.ebitda / line.netRevenue) * 100) : null;
  const netMarginPct = (line: DRELine) =>
    line.netRevenue > 0 ? ((line.netResult / line.netRevenue) * 100) : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DRE — Demonstração do Resultado</h1>
          <p className="text-sm text-gray-500 mt-1">Regime de competência, baseado em AP/AR</p>
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
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nenhum dado encontrado. Cadastre receitas e despesas primeiro.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white rounded-xl border shadow-sm overflow-hidden">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b">
                <th className="px-4 py-3 text-left w-48">Linha DRE</th>
                {data.map((line) => (
                  <th key={line.month} className="px-3 py-3 text-right min-w-[110px]">
                    {fmtMonth(line.month)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Receita bruta */}
              <tr className="border-b bg-blue-50 font-semibold">
                <td className="px-4 py-2 text-blue-800">Receita Bruta</td>
                {data.map((line) => (
                  <td key={line.month} className="px-3 py-2 text-right text-blue-800">{fmt(line.grossRevenue)}</td>
                ))}
              </tr>
              <tr className="border-b text-gray-500">
                <td className="px-4 py-2 pl-8">(-) ISS / Deduções</td>
                {data.map((line) => (
                  <td key={line.month} className="px-3 py-2 text-right">({fmt(line.issDeductions)})</td>
                ))}
              </tr>
              <tr className="border-b font-semibold">
                <td className="px-4 py-2">Receita Líquida</td>
                {data.map((line) => (
                  <td key={line.month} className="px-3 py-2 text-right">{fmt(line.netRevenue)}</td>
                ))}
              </tr>
              <tr className="border-b text-gray-500">
                <td className="px-4 py-2 pl-8">(-) CMV / COGS</td>
                {data.map((line) => (
                  <td key={line.month} className="px-3 py-2 text-right">({fmt(line.cogs)})</td>
                ))}
              </tr>
              {/* Lucro bruto */}
              <tr className="border-b bg-emerald-50 font-semibold">
                <td className="px-4 py-2 text-emerald-800">Lucro Bruto</td>
                {data.map((line) => (
                  <td key={line.month} className={`px-3 py-2 text-right ${line.grossProfit < 0 ? "text-red-600" : "text-emerald-800"}`}>
                    {fmt(line.grossProfit)}
                  </td>
                ))}
              </tr>
              <tr className="border-b text-xs text-gray-400">
                <td className="px-4 py-1 pl-8">Margem Bruta</td>
                {data.map((line) => {
                  const m = grossMarginPct(line);
                  return (
                    <td key={line.month} className={`px-3 py-1 text-right text-xs ${marginColor(m)}`}>{pct(m)}</td>
                  );
                })}
              </tr>
              <tr className="border-b text-gray-500">
                <td className="px-4 py-2 pl-8">(-) Despesas Operacionais</td>
                {data.map((line) => (
                  <td key={line.month} className="px-3 py-2 text-right">({fmt(line.opex)})</td>
                ))}
              </tr>
              {/* EBITDA */}
              <tr className="border-b bg-indigo-50 font-semibold">
                <td className="px-4 py-2 text-indigo-800">EBITDA</td>
                {data.map((line) => (
                  <td key={line.month} className={`px-3 py-2 text-right ${line.ebitda < 0 ? "text-red-600" : "text-indigo-800"}`}>
                    {fmt(line.ebitda)}
                  </td>
                ))}
              </tr>
              <tr className="border-b text-xs text-gray-400">
                <td className="px-4 py-1 pl-8">Margem EBITDA</td>
                {data.map((line) => {
                  const m = ebitdaMarginPct(line);
                  return (
                    <td key={line.month} className={`px-3 py-1 text-right text-xs ${marginColor(m)}`}>{pct(m)}</td>
                  );
                })}
              </tr>
              <tr className="border-b text-gray-500">
                <td className="px-4 py-2 pl-8">(-) Resultado Financeiro</td>
                {data.map((line) => (
                  <td key={line.month} className="px-3 py-2 text-right">({fmt(line.financials)})</td>
                ))}
              </tr>
              {/* Resultado líquido */}
              <tr className="bg-gray-100 font-bold text-base">
                <td className="px-4 py-3">Resultado Líquido</td>
                {data.map((line) => (
                  <td key={line.month} className={`px-3 py-3 text-right ${line.netResult < 0 ? "text-red-700" : "text-gray-900"}`}>
                    {fmt(line.netResult)}
                  </td>
                ))}
              </tr>
              <tr className="text-xs text-gray-400 border-t">
                <td className="px-4 py-1 pl-8">Margem Líquida</td>
                {data.map((line) => {
                  const m = netMarginPct(line);
                  return (
                    <td key={line.month} className={`px-3 py-1 text-right text-xs ${marginColor(m)}`}>{pct(m)}</td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
