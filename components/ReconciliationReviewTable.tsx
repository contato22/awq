"use client";
// ─── ReconciliationReviewTable ─────────────────────────────────────────────────
//
// Interactive client component for resolving em_revisao / pendente transactions.
// Calls PATCH /api/transactions/[id] to update cashflowClass, dreEffect,
// reconciliationStatus without altering raw financial data.
//
// Renders an empty state if items.length === 0.
// In static export mode (NEXT_PUBLIC_STATIC_DATA=1) the edit UI is hidden and a
// read-only notice is shown instead.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ─── Types (mirrored from financial-db — client-safe copy, no Node.js imports)

type CashflowClass = "operacional" | "investimento" | "financiamento" | "exclusao";
type DREEffect = "receita" | "custo" | "opex" | "financeiro" | "imposto" | "nao_aplicavel";
type ReconciliationStatus = "pendente" | "classificado" | "conciliado" | "em_revisao" | "rejeitado";
type Direction = "credit" | "debit";

export interface ReviewItem {
  id:            string;
  date:          string;         // YYYY-MM-DD
  description:   string;
  amount:        number;
  direction:     Direction;
  entityLabel:   string;         // already translated (e.g. "AWQ Holding")
  categoryLabel: string;         // already translated
  status:        ReconciliationStatus;
  note:          string | null;
  cashflowClass: CashflowClass | null;
  dreEffect:     DREEffect | null;
}

// ─── Select options ───────────────────────────────────────────────────────────

const CFC_OPTIONS: { value: CashflowClass; label: string }[] = [
  { value: "operacional",   label: "Operacional (FCO)"        },
  { value: "investimento",  label: "Investimento (FCInv)"     },
  { value: "financiamento", label: "Financiamento (FCFin)"    },
  { value: "exclusao",      label: "Exclusão (intercompany)"  },
];

const DRE_OPTIONS: { value: DREEffect; label: string }[] = [
  { value: "receita",        label: "Receita (top-line)"       },
  { value: "custo",          label: "Custo Direto (COGS)"      },
  { value: "opex",           label: "OpEx (SG&A)"              },
  { value: "financeiro",     label: "Resultado Financeiro"     },
  { value: "imposto",        label: "Imposto / Tributo"        },
  { value: "nao_aplicavel",  label: "Não aplicável (patrimonial)" },
];

// ─── Client-safe formatting (no financial-query import — server-only module) ──

function fmtAmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return "R$" + (abs / 1_000).toFixed(1) + "K";
  return "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtD(s: string): string {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReconciliationReviewTable({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localItems, setLocalItems]  = useState<ReviewItem[]>(items);
  const [saving,     setSaving]      = useState<string | null>(null);
  const [errors,     setErrors]      = useState<Record<string, string>>({});
  const [edits,      setEdits]       = useState<Record<string, {
    cashflowClass?: CashflowClass | null;
    dreEffect?:     DREEffect | null;
  }>>({});

  // Static export — no API available
  const isStatic = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

  if (localItems.length === 0) {
    return (
      <p className="text-xs text-emerald-600 px-1 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        Nenhum lançamento pendente de revisão — todos conciliados.
      </p>
    );
  }

  if (isStatic) {
    return (
      <p className="text-xs text-amber-600 px-1">
        Edição de conciliação disponível apenas na versão SSR/Vercel — não em build estático.
      </p>
    );
  }

  function setEdit(
    id: string,
    field: "cashflowClass" | "dreEffect",
    value: CashflowClass | DREEffect | null
  ) {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function handleAction(item: ReviewItem, action: "conciliado" | "em_revisao") {
    setSaving(item.id);
    setErrors((prev) => ({ ...prev, [item.id]: "" }));

    const itemEdits = edits[item.id] ?? {};
    const patch: Record<string, unknown> = { reconciliationStatus: action };
    if (itemEdits.cashflowClass !== undefined) patch.cashflowClass = itemEdits.cashflowClass;
    if (itemEdits.dreEffect      !== undefined) patch.dreEffect     = itemEdits.dreEffect;

    try {
      const res = await fetch(`/api/transactions/${encodeURIComponent(item.id)}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(patch),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      if (action === "conciliado") {
        // Remove from review list — it's done
        setLocalItems((prev) => prev.filter((i) => i.id !== item.id));
      } else {
        // Update in-place with new edit state
        setLocalItems((prev) => prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: action,
                cashflowClass: itemEdits.cashflowClass !== undefined ? itemEdits.cashflowClass : i.cashflowClass,
                dreEffect:     itemEdits.dreEffect     !== undefined ? itemEdits.dreEffect     : i.dreEffect,
              }
            : i
        ));
      }

      // Revalidate server component data
      startTransition(() => router.refresh());
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [item.id]: err instanceof Error ? err.message : "Erro desconhecido",
      }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className={isPending ? "opacity-60 pointer-events-none" : ""}>
      <div className="space-y-3">
        {localItems.map((item) => {
          const itemEdits    = edits[item.id] ?? {};
          const currentCfc   = itemEdits.cashflowClass !== undefined ? itemEdits.cashflowClass : item.cashflowClass;
          const currentDre   = itemEdits.dreEffect     !== undefined ? itemEdits.dreEffect     : item.dreEffect;
          const isSaving     = saving === item.id;
          const hasNullField = currentCfc === null || currentDre === null;

          return (
            <div
              key={item.id}
              className={`border rounded-xl p-4 transition-colors ${
                item.status === "em_revisao"
                  ? "border-orange-200 bg-orange-50/30"
                  : "border-amber-200 bg-amber-50/30"
              }`}
            >
              {/* ── Header row ─────────────────────────────────────────────── */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      item.status === "em_revisao"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {item.status === "em_revisao" ? "Em Revisão" : "Pendente"}
                    </span>
                    <span className="text-[10px] text-gray-500">{fmtD(item.date)}</span>
                    <span className="text-[10px] font-medium text-gray-600">{item.entityLabel}</span>
                    <span className="text-[10px] text-gray-400">{item.categoryLabel}</span>
                    {hasNullField && (
                      <span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded">
                        ⚠ campo nulo
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-gray-800 truncate" title={item.description}>
                    {item.description}
                  </p>
                  {item.note && (
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{item.note}</p>
                  )}
                </div>
                <span className={`text-sm font-bold shrink-0 ${
                  item.direction === "credit" ? "text-emerald-600" : "text-red-600"
                }`}>
                  {item.direction === "credit" ? "+" : "−"}{fmtAmt(item.amount)}
                </span>
              </div>

              {/* ── Classification dropdowns ────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">
                    cashflowClass
                    {currentCfc === null && (
                      <span className="ml-1 text-amber-500 font-semibold">⚠ nulo</span>
                    )}
                  </label>
                  <select
                    className="w-full text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
                    value={currentCfc ?? ""}
                    onChange={(e) =>
                      setEdit(item.id, "cashflowClass", (e.target.value as CashflowClass) || null)
                    }
                    disabled={isSaving}
                  >
                    <option value="">— nulo (ambíguo) —</option>
                    {CFC_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">
                    dreEffect
                    {currentDre === null && (
                      <span className="ml-1 text-amber-500 font-semibold">⚠ nulo</span>
                    )}
                  </label>
                  <select
                    className="w-full text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
                    value={currentDre ?? ""}
                    onChange={(e) =>
                      setEdit(item.id, "dreEffect", (e.target.value as DREEffect) || null)
                    }
                    disabled={isSaving}
                  >
                    <option value="">— nulo (ambíguo) —</option>
                    {DRE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Action buttons ──────────────────────────────────────────── */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleAction(item, "conciliado")}
                  disabled={isSaving}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? "Salvando..." : "✓ Conciliar"}
                </button>
                <button
                  onClick={() => handleAction(item, "em_revisao")}
                  disabled={isSaving}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50 active:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Salvar e manter em revisão
                </button>
                {errors[item.id] && (
                  <span className="text-[10px] text-red-600 ml-1">{errors[item.id]}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
