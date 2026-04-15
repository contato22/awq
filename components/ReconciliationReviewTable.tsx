"use client";

// ─── ReconciliationReviewTable ────────────────────────────────────────────────
// Interactive table for reviewing and editing bank transactions.
//
// TWO PERSISTENCE MODES (controlled by `isStatic` prop):
//   isStatic=false (Vercel/SSR): edits sent via PATCH /api/transactions/[id]
//   isStatic=true  (GitHub Pages): edits saved to localStorage; manual
//                  transactions added via /awq/ingest also loaded from localStorage
//
// localStorage keys:
//   awq_reconciliation_overrides  — { [txId]: Partial<BankTransaction> }
//   awq_manual_transactions       — BankTransaction[] (added manually in ingest)
//
// Editable fields: managerialCategory, classificationNote, counterpartyName,
//                  reconciliationStatus, isIntercompany, excludedFromConsolidated.
// Immutable fields (shown only): amount, transactionDate, descriptionOriginal,
//                                accountName, bank, entity, documentId, direction.

import { useEffect, useMemo, useState, useTransition } from "react";
import type {
  BankTransaction,
  ManagerialCategory,
  ReconciliationStatus,
} from "@/lib/financial-db";

// ─── Taxonomies & labels ──────────────────────────────────────────────────────

const ALL_CATEGORIES: ManagerialCategory[] = [
  "receita_recorrente",
  "receita_projeto",
  "receita_consultoria",
  "receita_producao",
  "receita_social_media",
  "receita_revenue_share",
  "receita_fee_venture",
  "receita_eventual",
  "rendimento_financeiro",
  "aporte_socio",
  "transferencia_interna_recebida",
  "ajuste_bancario_credito",
  "recebimento_ambiguo",
  "fornecedor_operacional",
  "freelancer_terceiro",
  "folha_remuneracao",
  "prolabore_retirada",
  "imposto_tributo",
  "juros_multa_iof",
  "tarifa_bancaria",
  "software_assinatura",
  "marketing_midia",
  "deslocamento_combustivel",
  "alimentacao_representacao",
  "viagem_hospedagem",
  "aluguel_locacao",
  "energia_agua_internet",
  "servicos_contabeis_juridicos",
  "cartao_compra_operacional",
  "despesa_pessoal_misturada",
  "aplicacao_financeira",
  "resgate_financeiro",
  "transferencia_interna_enviada",
  "reserva_limite_cartao",
  "despesa_ambigua",
  "unclassified",
];

const STATUS_LABELS: Record<ReconciliationStatus, string> = {
  pendente:   "Pendente",
  em_revisao: "Em Revisão",
  conciliado: "Conciliado",
  descartado: "Descartado",
};

const STATUS_COLORS: Record<ReconciliationStatus, string> = {
  pendente:   "bg-amber-100 text-amber-800 border-amber-200",
  em_revisao: "bg-blue-100 text-blue-800 border-blue-200",
  conciliado: "bg-emerald-100 text-emerald-800 border-emerald-200",
  descartado: "bg-gray-100 text-gray-700 border-gray-200",
};

// ─── Derived DFC / DRE badges ─────────────────────────────────────────────────

function cashflowClassOf(cat: ManagerialCategory): { label: string; color: string } {
  if (cat.startsWith("receita_")) return { label: "FCO — Entrada", color: "bg-emerald-50 text-emerald-700" };
  if (cat === "rendimento_financeiro") return { label: "FCF — Financeiro", color: "bg-sky-50 text-sky-700" };
  if (cat === "aplicacao_financeira" || cat === "resgate_financeiro") return { label: "FCF — Investimento", color: "bg-sky-50 text-sky-700" };
  if (cat === "ajuste_bancario_credito") return { label: "FCO — Ajuste", color: "bg-emerald-50 text-emerald-700" };
  if (cat === "aporte_socio") return { label: "FCI — Capital", color: "bg-violet-50 text-violet-700" };
  if (cat.startsWith("transferencia_interna_")) return { label: "Intercompany", color: "bg-indigo-50 text-indigo-700" };
  if (cat === "reserva_limite_cartao") return { label: "FCF — Reserva", color: "bg-sky-50 text-sky-700" };
  if (cat === "despesa_pessoal_misturada") return { label: "FCO — Pessoal (⚑)", color: "bg-rose-50 text-rose-700" };
  if (cat === "despesa_ambigua" || cat === "recebimento_ambiguo" || cat === "unclassified") {
    return { label: "Pendente", color: "bg-amber-50 text-amber-700" };
  }
  return { label: "FCO — Saída", color: "bg-rose-50 text-rose-700" };
}

function dreEffectOf(cat: ManagerialCategory): { label: string; color: string } {
  if (["receita_recorrente", "receita_projeto", "receita_consultoria", "receita_producao",
       "receita_social_media", "receita_revenue_share", "receita_fee_venture"].includes(cat)) {
    return { label: "Receita Operacional", color: "bg-emerald-50 text-emerald-700" };
  }
  if (cat === "receita_eventual") return { label: "Receita Eventual", color: "bg-emerald-50 text-emerald-700" };
  if (cat === "rendimento_financeiro") return { label: "Resultado Financeiro", color: "bg-sky-50 text-sky-700" };
  if (cat === "ajuste_bancario_credito") return { label: "Ajuste / Estorno", color: "bg-gray-50 text-gray-700" };
  if (cat === "prolabore_retirada") return { label: "Pró-labore", color: "bg-violet-50 text-violet-700" };
  if (cat === "despesa_pessoal_misturada") return { label: "Despesa Pessoal (⚑)", color: "bg-rose-50 text-rose-700" };
  if (["transferencia_interna_recebida", "transferencia_interna_enviada", "aporte_socio",
       "aplicacao_financeira", "resgate_financeiro", "reserva_limite_cartao"].includes(cat)) {
    return { label: "Não P&L", color: "bg-gray-50 text-gray-600" };
  }
  if (cat === "despesa_ambigua" || cat === "recebimento_ambiguo" || cat === "unclassified") {
    return { label: "Pendente", color: "bg-amber-50 text-amber-700" };
  }
  return { label: "Despesa Operacional", color: "bg-rose-50 text-rose-700" };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s: string): string {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

// ─── localStorage helpers (static mode only) ─────────────────────────────────

const LS_OVERRIDES = "awq_reconciliation_overrides";
const LS_MANUAL    = "awq_manual_transactions";

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function lsSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function applyOverrides(
  transactions: BankTransaction[],
  overrides: Record<string, Partial<BankTransaction>>
): BankTransaction[] {
  return transactions.map((t) =>
    overrides[t.id] ? { ...t, ...overrides[t.id] } : t
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type Filter = "todos" | ReconciliationStatus;

export default function ReconciliationReviewTable({
  initialTransactions,
  isStatic = false,
}: {
  initialTransactions: BankTransaction[];
  isStatic?: boolean;
}) {
  const [transactions, setTransactions] = useState<BankTransaction[]>(initialTransactions);
  const [filter, setFilter] = useState<Filter>("pendente");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<BankTransaction>>({});
  const [toast, setToast] = useState<{ kind: "ok" | "err" | "info"; msg: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // ── On mount (static mode): merge build-time data + localStorage ──────────
  useEffect(() => {
    if (!isStatic) return;
    const overrides = lsGet<Record<string, Partial<BankTransaction>>>(LS_OVERRIDES, {});
    const manual    = lsGet<BankTransaction[]>(LS_MANUAL, []);

    // Apply overrides to existing, then append manual transactions
    const withOverrides = applyOverrides(initialTransactions, overrides);
    const existingIds = new Set(withOverrides.map((t) => t.id));
    const newManual = manual.filter((t) => !existingIds.has(t.id));
    setTransactions([...withOverrides, ...newManual]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStatic]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: transactions.length, pendente: 0, em_revisao: 0, conciliado: 0, descartado: 0 };
    for (const t of transactions) {
      const s = t.reconciliationStatus ?? "pendente";
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [transactions]);

  const filtered = useMemo(() => {
    const base = filter === "todos" ? transactions : transactions.filter((t) => (t.reconciliationStatus ?? "pendente") === filter);
    return [...base].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  }, [transactions, filter]);

  function beginEdit(t: BankTransaction) {
    setEditingId(t.id);
    setDraft({
      managerialCategory:       t.managerialCategory,
      classificationNote:       t.classificationNote,
      counterpartyName:         t.counterpartyName,
      reconciliationStatus:     t.reconciliationStatus ?? "pendente",
      isIntercompany:           t.isIntercompany,
      excludedFromConsolidated: t.excludedFromConsolidated,
    });
  }

  function cancelEdit() { setEditingId(null); setDraft({}); }

  function showToast(kind: "ok" | "err" | "info", msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Save — static (localStorage) ─────────────────────────────────────────
  function saveToLocalStorage(id: string, patch: Partial<BankTransaction>) {
    const overrides = lsGet<Record<string, Partial<BankTransaction>>>(LS_OVERRIDES, {});
    overrides[id] = { ...(overrides[id] ?? {}), ...patch, classifiedAt: new Date().toISOString() };
    lsSet(LS_OVERRIDES, overrides);

    startTransition(() => {
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    });
    setEditingId(null);
    setDraft({});
    showToast("info", "Salvo localmente (GitHub Pages). Alterações persistem no navegador.");
  }

  // ── Save — SSR (PATCH API) ───────────────────────────────────────────────
  async function saveToApi(id: string) {
    setSavingId(id);
    setToast(null);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error((body as { error?: string }).error ?? "Falha ao salvar");
      }
      const updated = (await res.json()) as BankTransaction;
      startTransition(() => {
        setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
      });
      setEditingId(null);
      setDraft({});
      showToast("ok", "Transação salva. DFC e DRE recalculam no próximo acesso.");
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSavingId(null);
    }
  }

  function save(id: string) {
    if (isStatic) {
      saveToLocalStorage(id, draft);
    } else {
      void saveToApi(id);
    }
  }

  // ── Quick conciliar ──────────────────────────────────────────────────────
  async function quickConciliar(t: BankTransaction) {
    const patch = { reconciliationStatus: "conciliado" as ReconciliationStatus };
    if (isStatic) {
      saveToLocalStorage(t.id, patch);
      showToast("info", "Marcada como conciliada (localStorage).");
      return;
    }

    setSavingId(t.id);
    try {
      const res = await fetch(`/api/transactions/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      const updated = (await res.json()) as BankTransaction;
      startTransition(() => {
        setTransactions((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
      });
      showToast("ok", "Marcada como conciliada.");
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* ─── Toast ────────────────────────────────────────────────────── */}
      {toast && (
        <div
          role="status"
          className={
            toast.kind === "ok"   ? "rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-2 text-sm" :
            toast.kind === "info" ? "rounded-lg border border-blue-200 bg-blue-50 text-blue-800 px-4 py-2 text-sm" :
                                    "rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-2 text-sm"
          }
        >
          {toast.msg}
        </div>
      )}

      {/* ─── Filter tabs ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {(["pendente", "em_revisao", "conciliado", "descartado", "todos"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors " +
              (filter === f
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400")
            }
          >
            {f === "todos" ? "Todos" : STATUS_LABELS[f as ReconciliationStatus]}{" "}
            <span className="ml-1 opacity-70">({counts[f] ?? 0})</span>
          </button>
        ))}
        {isStatic && (
          <span className="ml-auto self-center text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
            GitHub Pages · edições no localStorage
          </span>
        )}
      </div>

      {/* ─── Table ────────────────────────────────────────────────────── */}
      <div className="card overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {filter === "pendente" && isStatic
              ? "Nenhuma transação pendente. Adicione transações em Integração Bancária ou mude o filtro."
              : "Nenhuma transação neste filtro."}
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Descrição</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-left">Conta / BU</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-left">DFC</th>
                <th className="px-3 py-2 text-left">DRE</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Nota</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => {
                const isEditing = editingId === t.id;
                const cat = (isEditing ? draft.managerialCategory : t.managerialCategory) ?? t.managerialCategory;
                const dfc = cashflowClassOf(cat);
                const dre = dreEffectOf(cat);
                const isCredit = t.direction === "credit";
                const status = t.reconciliationStatus ?? "pendente";

                return (
                  <tr key={t.id} className={isEditing ? "bg-amber-50/60" : "hover:bg-gray-50"}>
                    {/* Date — IMMUTABLE */}
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700 text-xs">{fmtDate(t.transactionDate)}</td>

                    {/* Description + counterparty */}
                    <td className="px-3 py-2 max-w-xs">
                      <div className="font-medium text-gray-900 text-xs truncate" title={t.descriptionOriginal}>
                        {t.descriptionOriginal}
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          placeholder="Contraparte (opcional)"
                          className="mt-1 w-full text-[11px] border border-gray-300 rounded px-1.5 py-1"
                          value={draft.counterpartyName ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, counterpartyName: e.target.value || null }))}
                        />
                      ) : t.counterpartyName ? (
                        <div className="text-[11px] text-gray-500">{t.counterpartyName}</div>
                      ) : null}
                    </td>

                    {/* Amount — IMMUTABLE */}
                    <td className={"px-3 py-2 text-right whitespace-nowrap font-mono text-xs " + (isCredit ? "text-emerald-700" : "text-rose-700")}>
                      {isCredit ? "+" : ""}{fmtBRL(Math.abs(t.amount))}
                    </td>

                    {/* Account / BU — IMMUTABLE */}
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      <div className="text-gray-700">{t.accountName}</div>
                      <div className="text-gray-400">{t.bank} · {t.entity}</div>
                    </td>

                    {/* Category — EDITABLE */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select
                          value={draft.managerialCategory ?? t.managerialCategory}
                          onChange={(e) => setDraft((d) => ({ ...d, managerialCategory: e.target.value as ManagerialCategory }))}
                          className="text-xs border border-gray-300 rounded px-1.5 py-1 w-full min-w-[190px]"
                        >
                          {ALL_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs font-mono text-gray-700">{t.managerialCategory}</span>
                      )}
                    </td>

                    {/* DFC — derived badge */}
                    <td className="px-3 py-2">
                      <span className={"text-[10px] px-1.5 py-0.5 rounded " + dfc.color}>{dfc.label}</span>
                    </td>

                    {/* DRE — derived badge */}
                    <td className="px-3 py-2">
                      <span className={"text-[10px] px-1.5 py-0.5 rounded " + dre.color}>{dre.label}</span>
                    </td>

                    {/* Status — EDITABLE */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select
                          value={draft.reconciliationStatus ?? status}
                          onChange={(e) => setDraft((d) => ({ ...d, reconciliationStatus: e.target.value as ReconciliationStatus }))}
                          className="text-xs border border-gray-300 rounded px-1.5 py-1"
                        >
                          {(Object.keys(STATUS_LABELS) as ReconciliationStatus[]).map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={"text-[11px] px-2 py-0.5 rounded border " + STATUS_COLORS[status]}>
                          {STATUS_LABELS[status]}
                        </span>
                      )}
                    </td>

                    {/* Note + flags — EDITABLE */}
                    <td className="px-3 py-2 max-w-[180px]">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            placeholder="Nota de conciliação"
                            className="w-full text-[11px] border border-gray-300 rounded px-1.5 py-1"
                            value={draft.classificationNote ?? ""}
                            onChange={(e) => setDraft((d) => ({ ...d, classificationNote: e.target.value || null }))}
                          />
                          <label className="flex items-center gap-1 mt-1 text-[10px] text-gray-600">
                            <input
                              type="checkbox"
                              checked={Boolean(draft.excludedFromConsolidated)}
                              onChange={(e) => setDraft((d) => ({ ...d, excludedFromConsolidated: e.target.checked }))}
                            />
                            Excluir do consolidado
                          </label>
                          <label className="flex items-center gap-1 text-[10px] text-gray-600">
                            <input
                              type="checkbox"
                              checked={Boolean(draft.isIntercompany)}
                              onChange={(e) => setDraft((d) => ({ ...d, isIntercompany: e.target.checked }))}
                            />
                            Intercompany
                          </label>
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-500 truncate block" title={t.classificationNote ?? ""}>
                          {t.classificationNote ?? "—"}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            disabled={savingId === t.id}
                            onClick={() => save(t.id)}
                            className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {savingId === t.id ? "Salvando…" : "Salvar"}
                          </button>
                          <button
                            disabled={savingId === t.id}
                            onClick={cancelEdit}
                            className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => beginEdit(t)}
                            className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Editar
                          </button>
                          {status !== "conciliado" && (
                            <button
                              disabled={savingId === t.id}
                              onClick={() => void quickConciliar(t)}
                              className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
                              title="Marcar como conciliado"
                            >
                              ✓
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
