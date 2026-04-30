"use client";

import { useState, useEffect } from "react";
import type { DFCLine, BuCode } from "@/lib/ap-ar-db";

const BU_CODES: BuCode[] = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  const date = new Date(Number(y), Number(mo) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

export default function DFCPage() {
  const [data,    setData]    = useState<DFCLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [bu,      setBu]      = useState<BuCode | "">("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const qs = bu ? `?bu_code=${bu}` : "";
    fetch(`/api/epm/dfc${qs}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  }, [bu]);

  let runningBalance = 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DFC — Demonstração do Fluxo de Caixa</h1>
          <p className="text-sm text-gray-500 mt-1">Regime de caixa — apenas valores efetivamente pagos/recebidos</p>
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
        <div className="text-center py-16 text-gray-400">Nenhum dado de caixa encontrado. Registre pagamentos e recebimentos primeiro.</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 text-center">
              <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Total Entradas</div>
              <div className="text-xl font-bold text-emerald-700">
                {fmt(data.reduce((s, l) => s + l.totalInflows, 0))}
              </div>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
              <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Total Saídas</div>
              <div className="text-xl font-bold text-red-700">
                {fmt(data.reduce((s, l) => s + l.totalOutflows, 0))}
              </div>
            </div>
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4 text-center">
              <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Saldo Líquido</div>
              <div className={`text-xl font-bold ${data.reduce((s, l) => s + l.netCash, 0) >= 0 ? "text-indigo-700" : "text-red-700"}`}>
                {fmt(data.reduce((s, l) => s + l.netCash, 0))}
              </div>
            </div>
          </div>

          {/* Monthly detail */}
          <div className="space-y-3">
            {[...data].reverse().map((line) => {
              runningBalance += line.netCash;
              const isOpen = expanded === line.month;
              return (
                <div key={line.month} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : line.month)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-gray-800 w-24 text-left">{fmtMonth(line.month)}</span>
                      <span className="text-sm text-emerald-600 font-medium">+{fmt(line.totalInflows)}</span>
                      <span className="text-sm text-red-500 font-medium">-{fmt(line.totalOutflows)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-bold ${line.netCash >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {line.netCash >= 0 ? "+" : ""}{fmt(line.netCash)}
                      </span>
                      <span className="text-xs text-gray-400">Saldo acum. {fmt(runningBalance)}</span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t grid grid-cols-2 divide-x">
                      {/* Inflows */}
                      <div className="p-3">
                        <div className="text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">Entradas ({line.inflows.length})</div>
                        {line.inflows.length === 0 ? (
                          <div className="text-xs text-gray-400">—</div>
                        ) : (
                          <table className="w-full text-xs">
                            <tbody>
                              {line.inflows.map((item) => (
                                <tr key={item.id} className="border-b last:border-0">
                                  <td className="py-1 text-gray-700 truncate max-w-[180px]">{item.customer_name}</td>
                                  <td className="py-1 text-right text-emerald-600 font-medium pl-2">
                                    {fmt(item.received_amount ?? item.net_amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                      {/* Outflows */}
                      <div className="p-3">
                        <div className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">Saídas ({line.outflows.length})</div>
                        {line.outflows.length === 0 ? (
                          <div className="text-xs text-gray-400">—</div>
                        ) : (
                          <table className="w-full text-xs">
                            <tbody>
                              {line.outflows.map((item) => (
                                <tr key={item.id} className="border-b last:border-0">
                                  <td className="py-1 text-gray-700 truncate max-w-[180px]">{item.supplier_name}</td>
                                  <td className="py-1 text-right text-red-500 font-medium pl-2">
                                    {fmt(item.paid_amount ?? item.net_amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
