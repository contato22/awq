"use client";

import { useState, useEffect } from "react";
import type { ARItem, AgingBucket, BuCode } from "@/lib/ap-ar-db";

const BUCKETS: AgingBucket[] = ["CURRENT", "1-30d", "31-60d", "61-90d", "+90d"];
const BUCKET_LABELS: Record<AgingBucket, string> = {
  CURRENT:  "Em dia",
  "1-30d":  "1–30 dias",
  "31-60d": "31–60 dias",
  "61-90d": "61–90 dias",
  "+90d":   "+90 dias",
};
const BUCKET_COLOR: Record<AgingBucket, string> = {
  CURRENT:  "bg-emerald-100 text-emerald-800",
  "1-30d":  "bg-yellow-100 text-yellow-800",
  "31-60d": "bg-orange-100 text-orange-800",
  "61-90d": "bg-red-100 text-red-800",
  "+90d":   "bg-red-200 text-red-900",
};
const BUS: BuCode[] = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function getAgingBucket(due_date: string): AgingBucket {
  const today = new Date();
  const due   = new Date(due_date + "T12:00:00");
  const diff  = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  if (diff <= 0) return "CURRENT";
  if (diff <= 30) return "1-30d";
  if (diff <= 60) return "31-60d";
  if (diff <= 90) return "61-90d";
  return "+90d";
}

export default function ARAgingPage() {
  const [items,       setItems]       = useState<ARItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [bucketFilter,setBucketFilter]= useState<AgingBucket | "ALL">("ALL");
  const [filterBU,    setFilterBU]    = useState<BuCode | "">("");

  useEffect(() => {
    setLoading(true);
    const qs = filterBU ? `?bu_code=${filterBU}` : "";
    fetch(`/api/epm/ar${qs}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setItems(j.data); })
      .finally(() => setLoading(false));
  }, [filterBU]);

  const overdue = items.filter((i) => i.status === "OVERDUE" || i.status === "PENDING");

  const bucketMap = BUCKETS.reduce<Record<AgingBucket, ARItem[]>>((acc, b) => {
    acc[b] = overdue.filter((i) => getAgingBucket(i.due_date) === b);
    return acc;
  }, {} as Record<AgingBucket, ARItem[]>);

  const bucketTotals = BUCKETS.reduce<Record<AgingBucket, number>>((acc, b) => {
    acc[b] = bucketMap[b].reduce((s, i) => s + i.net_amount, 0);
    return acc;
  }, {} as Record<AgingBucket, number>);

  const displayed = bucketFilter === "ALL"
    ? overdue
    : bucketMap[bucketFilter as AgingBucket];

  const byCustomer = displayed.reduce<Record<string, { items: ARItem[]; total: number }>>((acc, i) => {
    if (!acc[i.customer_name]) acc[i.customer_name] = { items: [], total: 0 };
    acc[i.customer_name].items.push(i);
    acc[i.customer_name].total += i.net_amount;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AR Aging — Contas a Receber Vencidas</h1>
        <p className="text-sm text-gray-500 mt-1">Visão por faixa de vencimento e cliente</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterBU("")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!filterBU ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Todas BUs
        </button>
        {BUS.map((b) => (
          <button key={b} onClick={() => setFilterBU(b)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterBU === b ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {b}
          </button>
        ))}
      </div>

      {/* Bucket summary */}
      <div className="grid grid-cols-5 gap-3">
        {BUCKETS.map((b) => (
          <button
            key={b}
            onClick={() => setBucketFilter(bucketFilter === b ? "ALL" : b)}
            className={`rounded-lg border p-3 text-center transition-all ${
              bucketFilter === b ? "ring-2 ring-blue-500" : "hover:shadow-sm"
            }`}
          >
            <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BUCKET_COLOR[b]} mb-2`}>
              {BUCKET_LABELS[b]}
            </div>
            <div className="text-sm font-bold text-gray-800">{fmt(bucketTotals[b])}</div>
            <div className="text-xs text-gray-500">{bucketMap[b].length} itens</div>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : Object.keys(byCustomer).length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nenhum item vencido encontrado.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCustomer)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([customer, data]) => (
              <div key={customer} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                  <span className="font-semibold text-gray-800">{customer}</span>
                  <span className="text-sm font-bold text-red-600">{fmt(data.total)}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="px-4 py-2 text-left">Descrição</th>
                      <th className="px-4 py-2 text-left">Vencimento</th>
                      <th className="px-4 py-2 text-left">Faixa</th>
                      <th className="px-4 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => {
                      const bucket = getAgingBucket(item.due_date);
                      return (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-700">{item.description}</td>
                          <td className="px-4 py-2 text-gray-600">
                            {new Date(item.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BUCKET_COLOR[bucket]}`}>
                              {BUCKET_LABELS[bucket]}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-gray-800">{fmt(item.net_amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
