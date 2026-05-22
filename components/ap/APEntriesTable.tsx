"use client";

import { useState, useMemo, useTransition, Fragment } from "react";
import {
  CheckCircle2, Clock, AlertTriangle, XCircle, Banknote,
  Link2, Trash2, ChevronDown, Search,
} from "lucide-react";
import type { APEntry, APStatus } from "@/lib/ap-shared";
import { effectiveStatus } from "@/lib/ap-shared";

interface Props {
  entries: APEntry[];
  onUpdated: (entry: APEntry) => void;
  onDeleted: (id: string) => void;
}

const STATUS_CONFIG: Record<APStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pendente:  { label: "Pendente",  color: "text-amber-600 bg-amber-50 border-amber-200",   icon: <Clock size={11} /> },
  aprovado:  { label: "Aprovado",  color: "text-blue-600 bg-blue-50 border-blue-200",      icon: <CheckCircle2 size={11} /> },
  pago:      { label: "Pago",      color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: <Banknote size={11} /> },
  vencido:   { label: "Vencido",   color: "text-red-600 bg-red-50 border-red-200",         icon: <AlertTriangle size={11} /> },
  cancelado: { label: "Cancelado", color: "text-gray-400 bg-gray-50 border-gray-200",      icon: <XCircle size={11} /> },
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function APEntriesTable({ entries, onUpdated, onDeleted }: Props) {
  const [filter, setFilter] = useState<APStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [actionErr, setActionErr] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);

  const filtered = entries.filter(e => {
    const eff = effectiveStatus(e, today);
    const matchStatus = filter === "all" || eff === filter;
    const matchSearch = !search || e.supplierName.toLowerCase().includes(search.toLowerCase())
      || e.accountDescription.toLowerCase().includes(search.toLowerCase())
      || e.accountCode.includes(search);
    return matchStatus && matchSearch;
  });

  async function patch(id: string, body: Record<string, unknown>, entry: APEntry) {
    setActionErr(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/ap/entries/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json() as { error?: string };
          throw new Error(j.error ?? "Falha ao atualizar");
        }
        onUpdated({ ...entry, ...body } as APEntry);
      } catch (err) {
        setActionErr(err instanceof Error ? err.message : "Falha ao atualizar");
      }
    });
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta AP? Ação irreversível.")) return;
    setActionErr(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/ap/entries/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Falha ao excluir");
        onDeleted(id);
      } catch (err) {
        setActionErr(err instanceof Error ? err.message : "Falha ao excluir");
      }
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar fornecedor, conta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "pendente", "aprovado", "vencido", "pago", "cancelado"] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                filter === s ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "Todos" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          Nenhuma AP encontrada
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-24">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Fornecedor</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">Conta</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 hidden lg:table-cell">Entidade</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Valor</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 hidden sm:table-cell">Venc.</th>
                <th className="px-4 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(e => {
                const eff = effectiveStatus(e, today);
                const cfg = STATUS_CONFIG[eff];
                const isOpen = expanded === e.id;

                return (
                  <Fragment key={e.id}>
                    <tr className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 text-xs">{e.supplierName}</p>
                        {e.invoiceNumber && <p className="text-[11px] text-gray-400">NF {e.invoiceNumber}</p>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs text-gray-600 truncate max-w-[180px]">{e.accountDescription}</p>
                        <p className="text-[11px] font-mono text-gray-400">{e.accountCode}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-500">{e.entity}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-800 text-xs tabular-nums">{fmtBRL(e.amount)}</span>
                        {e.currency !== "BRL" && <span className="text-[11px] text-gray-400 ml-1">{e.currency}</span>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs ${eff === "vencido" ? "text-red-600 font-medium" : "text-gray-600"}`}>
                          {fmtDate(e.dueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : e.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="bg-gray-50/70">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-3">
                            <span>Emissão: {fmtDate(e.issueDate)}</span>
                            {e.paymentDate && <span>Pagamento: {fmtDate(e.paymentDate)}</span>}
                            {e.bankTransactionId && (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <Link2 size={11} /> Vinculada à transação bancária
                              </span>
                            )}
                            <span className="text-gray-400">{STATUS_CONFIG[eff]?.label ?? eff} · {e.managerialCategory.replace(/_/g, " ")}</span>
                          </div>
                          {e.description && <p className="text-xs text-gray-600 mb-3">{e.description}</p>}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            {eff === "pendente" && (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => patch(e.id, { status: "aprovado", approvedAt: new Date().toISOString() }, e)}
                                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                Aprovar
                              </button>
                            )}
                            {(eff === "pendente" || eff === "aprovado" || eff === "vencido") && (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => {
                                  const d = prompt("Data de pagamento (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
                                  if (d) patch(e.id, { status: "pago", paymentDate: d }, e);
                                }}
                                className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                              >
                                Marcar como Pago
                              </button>
                            )}
                            {eff === "pago" && !e.bankTransactionId && (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => {
                                  const txId = prompt("ID da transação bancária para vincular:");
                                  if (txId) patch(e.id, { bankTransactionId: txId }, e);
                                }}
                                className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                              >
                                <Link2 size={11} /> Vincular Transação
                              </button>
                            )}
                            {eff !== "cancelado" && eff !== "pago" && (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => patch(e.id, { status: "cancelado" }, e)}
                                className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                              >
                                Cancelar
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => remove(e.id)}
                              className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                            >
                              <Trash2 size={11} /> Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {actionErr && (
        <div role="alert" className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700 flex justify-between items-center">
          <span>{actionErr}</span>
          <button type="button" onClick={() => setActionErr(null)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
        <span>{filtered.length} de {entries.length} APs</span>
        <span className="font-medium text-gray-600 tabular-nums">
          Total aberto: {fmtBRL(
            filtered
              .filter(e => { const eff = effectiveStatus(e, today); return eff !== "pago" && eff !== "cancelado"; })
              .reduce((s, e) => s + e.amount, 0)
          )}
        </span>
      </div>
    </div>
  );
}
