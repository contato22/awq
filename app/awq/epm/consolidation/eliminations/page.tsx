"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GitMerge, CheckCircle2, AlertTriangle, ArrowLeftRight,
  Building2, XCircle, BarChart3, ArrowLeft,
} from "lucide-react";
import type { ICTransaction } from "@/lib/epm-db";

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

const SEED: ICTransaction[] = [
  { id: "IC-001", date: "2026-01-15", from_entity: "AWQ",    to_entity: "JACQES", description: "Fee de gestão — Jan/2026",          amount:  8_500, type: "MANAGEMENT_FEE", ar_booked: true,  ap_booked: true,  status: "ELIMINATED"   },
  { id: "IC-002", date: "2026-01-15", from_entity: "AWQ",    to_entity: "CAZA",   description: "Fee de gestão — Jan/2026",          amount:  5_000, type: "MANAGEMENT_FEE", ar_booked: true,  ap_booked: true,  status: "ELIMINATED"   },
  { id: "IC-003", date: "2026-02-15", from_entity: "AWQ",    to_entity: "JACQES", description: "Fee de gestão — Fev/2026",          amount:  8_500, type: "MANAGEMENT_FEE", ar_booked: true,  ap_booked: true,  status: "ELIMINATED"   },
  { id: "IC-004", date: "2026-02-15", from_entity: "AWQ",    to_entity: "CAZA",   description: "Fee de gestão — Fev/2026",          amount:  5_000, type: "MANAGEMENT_FEE", ar_booked: true,  ap_booked: true,  status: "ELIMINATED"   },
  { id: "IC-005", date: "2026-03-10", from_entity: "JACQES", to_entity: "CAZA",   description: "Serviços de consultoria — Q1",      amount: 18_000, type: "SERVICE",        ar_booked: true,  ap_booked: true,  status: "ELIMINATED"   },
  { id: "IC-006", date: "2026-03-15", from_entity: "AWQ",    to_entity: "JACQES", description: "Fee de gestão — Mar/2026",          amount:  8_500, type: "MANAGEMENT_FEE", ar_booked: true,  ap_booked: true,  status: "ELIMINATED"   },
  { id: "IC-007", date: "2026-03-15", from_entity: "AWQ",    to_entity: "CAZA",   description: "Fee de gestão — Mar/2026",          amount:  5_000, type: "MANAGEMENT_FEE", ar_booked: true,  ap_booked: true,  status: "ELIMINATED"   },
  { id: "IC-008", date: "2026-04-01", from_entity: "AWQ",    to_entity: "ADVISOR",description: "Adiantamento infraestrutura Q2",    amount: 25_000, type: "LOAN",           ar_booked: true,  ap_booked: false, status: "UNMATCHED_AP" },
  { id: "IC-009", date: "2026-04-15", from_entity: "AWQ",    to_entity: "JACQES", description: "Fee de gestão — Abr/2026",          amount:  8_500, type: "MANAGEMENT_FEE", ar_booked: true,  ap_booked: true,  status: "ELIMINATED"   },
  { id: "IC-010", date: "2026-04-15", from_entity: "AWQ",    to_entity: "CAZA",   description: "Fee de gestão — Abr/2026",          amount:  5_000, type: "MANAGEMENT_FEE", ar_booked: true,  ap_booked: true,  status: "ELIMINATED"   },
  { id: "IC-011", date: "2026-04-20", from_entity: "CAZA",   to_entity: "JACQES", description: "Serviços de design — campanha Q1", amount: 12_000, type: "SERVICE",        ar_booked: false, ap_booked: true,  status: "UNMATCHED_AR" },
];

const STATUS_CFG = {
  ELIMINATED:   { label: "Eliminado",  color: "text-emerald-700", bg: "bg-emerald-100" },
  UNMATCHED_AR: { label: "Sem AP",     color: "text-amber-700",   bg: "bg-amber-100"   },
  UNMATCHED_AP: { label: "Sem AR",     color: "text-red-700",     bg: "bg-red-100"     },
  MATCHED:      { label: "Matched",    color: "text-brand-700",   bg: "bg-brand-100"   },
};

const TYPE_LABELS: Record<string, string> = {
  SERVICE:        "Serviço",
  LOAN:           "Empréstimo",
  MANAGEMENT_FEE: "Fee Gestão",
  REIMBURSEMENT:  "Reembolso",
};

const PRE_POST = [
  { label: "Receita Consolidada (pré)",  pre: 5_220_000, post: 5_040_000 },
  { label: "COGS (pré)",                 pre:   610_000, post:   580_000 },
  { label: "Lucro Bruto (pré→pós)",      pre: 4_610_000, post: 4_460_000 },
  { label: "OPEX (pré)",                 pre: 3_900_000, post: 3_704_000 },
  { label: "EBITDA (pré→pós)",           pre:   710_000, post:   756_000 },
];

interface EntityPair { from: string; to: string; total: number; count: number; types: string[] }

function buildPairs(txs: ICTransaction[]): EntityPair[] {
  const map = new Map<string, EntityPair>();
  for (const t of txs.filter(t => t.status === "ELIMINATED")) {
    const key = `${t.from_entity}→${t.to_entity}`;
    const ex  = map.get(key);
    if (ex) { ex.total += t.amount; ex.count++; if (!ex.types.includes(t.type)) ex.types.push(t.type); }
    else map.set(key, { from: t.from_entity, to: t.to_entity, total: t.amount, count: 1, types: [t.type] });
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export default function EliminationsPage() {
  const [items, setItems]   = useState<ICTransaction[]>(SEED);
  const [isSeed, setIsSeed] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/epm/eliminations")
      .then(r => r.json())
      .then(j => { if (j.success && j.data.length > 0) { setItems(j.data); setIsSeed(false); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const eliminated   = items.filter(t => t.status === "ELIMINATED");
  const unmatched    = items.filter(t => t.status !== "ELIMINATED");
  const totalElim    = eliminated.reduce((s, t) => s + t.amount, 0);
  const totalUnmatch = unmatched.reduce((s, t) => s + t.amount, 0);
  const entityPairs  = buildPairs(items);

  if (loading) return <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/epm/consolidation" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <GitMerge size={20} className="text-gray-400" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Eliminações Intercompany</h1>
            <p className="text-xs text-gray-500">EPM · Consolidação · Eliminação IC · AWQ Group</p>
          </div>
          {isSeed && (
            <span className="ml-auto text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-semibold">
              dados de exemplo
            </span>
          )}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* Methodology note */}
        <div className="flex items-start gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-800">
          <GitMerge size={13} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Metodologia de eliminação AWQ:</span>{" "}
            Transações entre entidades do grupo são registradas como AR (conta 9.1.xx) na entidade vendedora
            e AP (conta 9.2.xx) na entidade compradora. Na consolidação, ambos os lados são eliminados
            para evitar dupla contagem.
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Eliminado",   value: fmtBRL(totalElim), color: "text-emerald-700", Icon: CheckCircle2  },
            { label: "Pares Entidade",    value: entityPairs.length, color: "text-brand-700",  Icon: ArrowLeftRight },
            { label: "Transações IC",     value: eliminated.length,  color: "text-gray-700",   Icon: GitMerge       },
            { label: "Não Reconciliados", value: unmatched.length,   color: unmatched.length > 0 ? "text-red-700" : "text-emerald-700", Icon: unmatched.length > 0 ? AlertTriangle : CheckCircle2 },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <Icon size={14} className={`${color} mb-1`} />
              <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
              <div className="text-xs text-gray-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Unmatched alert */}
        {unmatched.length > 0 && (
          <div className="bg-white rounded-xl border border-amber-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">
                {unmatched.length} Item(ns) Sem Contrapartida — {fmtBRL(totalUnmatch)} não eliminado
              </span>
            </div>
            <div className="space-y-2">
              {unmatched.map(t => {
                const scfg = STATUS_CFG[t.status as keyof typeof STATUS_CFG];
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                    <XCircle size={13} className="text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900">{t.description}</div>
                      <div className="text-[11px] text-gray-400">{t.from_entity} → {t.to_entity} · {t.date}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-amber-700 tabular-nums">{fmtBRL(t.amount)}</div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${scfg.bg} ${scfg.color}`}>
                        {scfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Entity pair summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={14} className="text-violet-600" />
            <span className="text-sm font-semibold text-gray-900">Eliminações por Par de Entidade</span>
          </div>
          <div className="space-y-3">
            {entityPairs.map(pair => {
              const pct = totalElim > 0 ? (pair.total / totalElim) * 100 : 0;
              return (
                <div key={`${pair.from}-${pair.to}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-brand-700">{pair.from}</span>
                      <ArrowLeftRight size={10} className="text-gray-400" />
                      <span className="font-semibold text-gray-700">{pair.to}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-400">{pair.count} transações</span>
                      {pair.types.map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">
                          {TYPE_LABELS[t] ?? t}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-gray-900 tabular-nums">{fmtBRL(pair.total)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pre vs Post P&L */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">P&L — Pré vs Pós Eliminação IC</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="py-2.5 px-3 text-gray-500 font-semibold">Linha</th>
                <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Pré-Eliminação</th>
                <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Eliminação IC</th>
                <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Pós-Eliminação</th>
                <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Impacto %</th>
              </tr>
            </thead>
            <tbody>
              {PRE_POST.map(row => {
                const elim   = row.post - row.pre;
                const pctChg = row.pre !== 0 ? (elim / Math.abs(row.pre)) * 100 : 0;
                return (
                  <tr key={row.label} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-gray-700 font-medium">{row.label}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-500">{fmtBRL(row.pre)}</td>
                    <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${elim < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {elim >= 0 ? "+" : ""}{fmtBRL(elim)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold text-gray-900">{fmtBRL(row.post)}</td>
                    <td className={`py-2.5 px-3 text-right tabular-nums text-xs ${pctChg < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {pctChg >= 0 ? "+" : ""}{pctChg.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Full IC register */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <GitMerge size={14} className="text-violet-600" />
            <span className="text-sm font-semibold text-gray-900">Registro de Transações Intercompany</span>
            <span className="ml-auto text-xs text-gray-400">{items.length} transações · YTD 2026</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">ID</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Data</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">De</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Para</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Descrição</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Tipo</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Valor</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map(t => {
                  const scfg = STATUS_CFG[t.status as keyof typeof STATUS_CFG];
                  return (
                    <tr key={t.id} className={`border-b border-gray-50 hover:bg-gray-50 ${t.status !== "ELIMINATED" ? "bg-amber-50/40" : ""}`}>
                      <td className="py-2 px-3 font-mono text-gray-400">{t.id}</td>
                      <td className="py-2 px-3 text-gray-500">{t.date}</td>
                      <td className="py-2 px-3 font-semibold text-brand-700">{t.from_entity}</td>
                      <td className="py-2 px-3 text-gray-700">{t.to_entity}</td>
                      <td className="py-2 px-3 text-gray-600 max-w-[200px] truncate">{t.description}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">
                          {TYPE_LABELS[t.type] ?? t.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold text-gray-900">{fmtBRL(t.amount)}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${scfg.bg} ${scfg.color}`}>
                          {scfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                  <td className="py-2.5 px-3 text-xs text-gray-700" colSpan={6}>
                    Total IC · Eliminado: {fmtBRL(totalElim)} · Pendente: {fmtBRL(totalUnmatch)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs tabular-nums text-gray-900">
                    {fmtBRL(totalElim + totalUnmatch)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm/consolidation" className="text-brand-600 hover:underline">← Consolidação</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/gl" className="text-brand-600 hover:underline">GL →</Link>
          <Link href="/awq/epm" className="text-brand-600 hover:underline">EPM Overview →</Link>
        </div>
      </div>
    </div>
  );
}
