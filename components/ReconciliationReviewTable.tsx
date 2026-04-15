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
// Client-safe copy of ManagerialCategory — must stay in sync with financial-db.ts
type ManagerialCategory =
  | "receita_recorrente" | "receita_projeto" | "receita_consultoria" | "receita_producao"
  | "receita_social_media" | "receita_revenue_share" | "receita_fee_venture" | "receita_eventual"
  | "rendimento_financeiro" | "aporte_socio" | "transferencia_interna_recebida"
  | "ajuste_bancario_credito" | "recebimento_ambiguo"
  | "fornecedor_operacional" | "freelancer_terceiro" | "folha_remuneracao" | "prolabore_retirada"
  | "imposto_tributo" | "juros_multa_iof" | "tarifa_bancaria" | "software_assinatura"
  | "marketing_midia" | "deslocamento_combustivel" | "alimentacao_representacao"
  | "viagem_hospedagem" | "aluguel_locacao" | "energia_agua_internet"
  | "servicos_contabeis_juridicos" | "cartao_compra_operacional" | "despesa_pessoal_misturada"
  | "aplicacao_financeira" | "resgate_financeiro" | "transferencia_interna_enviada"
  | "reserva_limite_cartao" | "despesa_ambigua" | "unclassified";

export interface ReviewItem {
  id:            string;
  date:          string;         // YYYY-MM-DD
  description:   string;
  amount:        number;
  direction:     Direction;
  entityLabel:   string;         // already translated (e.g. "AWQ Holding")
  categoryId:    ManagerialCategory;  // raw ID for dropdown
  categoryLabel: string;         // already translated (display)
  status:        ReconciliationStatus;
  note:          string | null;
  cashflowClass: CashflowClass | null;
  dreEffect:     DREEffect | null;
}

// ─── Select options ───────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: ManagerialCategory; label: string }[] = [
  { value: "receita_recorrente",            label: "Receita Recorrente"              },
  { value: "receita_projeto",               label: "Receita de Projeto"              },
  { value: "receita_consultoria",           label: "Receita de Consultoria"          },
  { value: "receita_producao",              label: "Receita de Produção"             },
  { value: "receita_social_media",          label: "Receita Social Media"            },
  { value: "receita_revenue_share",         label: "Revenue Share"                   },
  { value: "receita_fee_venture",           label: "Fee Recorrente Venture"          },
  { value: "receita_eventual",              label: "Receita Eventual"                },
  { value: "rendimento_financeiro",         label: "Rendimento Financeiro"           },
  { value: "ajuste_bancario_credito",       label: "Ajuste / Crédito Bancário"       },
  { value: "aporte_socio",                  label: "Aporte do Sócio"                 },
  { value: "transferencia_interna_recebida",label: "Transf. Intercompany (recebida)" },
  { value: "recebimento_ambiguo",           label: "Recebimento Ambíguo"             },
  { value: "fornecedor_operacional",        label: "Fornecedor Operacional"          },
  { value: "freelancer_terceiro",           label: "Freelancer / Terceiro"           },
  { value: "folha_remuneracao",             label: "Folha / Remuneração"             },
  { value: "prolabore_retirada",            label: "Pró-labore / Retirada"           },
  { value: "imposto_tributo",               label: "Imposto / Tributo"               },
  { value: "juros_multa_iof",               label: "Juros / Multa / IOF"             },
  { value: "tarifa_bancaria",               label: "Tarifa Bancária"                 },
  { value: "software_assinatura",           label: "Software / Assinatura"           },
  { value: "marketing_midia",               label: "Marketing / Mídia Paga"          },
  { value: "deslocamento_combustivel",      label: "Deslocamento / Combustível"      },
  { value: "alimentacao_representacao",     label: "Alimentação / Representação"     },
  { value: "viagem_hospedagem",             label: "Viagem / Hospedagem"             },
  { value: "aluguel_locacao",               label: "Aluguel / Locação"               },
  { value: "energia_agua_internet",         label: "Energia / Água / Internet"       },
  { value: "servicos_contabeis_juridicos",  label: "Serviços Contábeis / Jurídicos"  },
  { value: "cartao_compra_operacional",     label: "Compra via Cartão Corporativo"   },
  { value: "despesa_pessoal_misturada",     label: "Despesa Pessoal Misturada"       },
  { value: "aplicacao_financeira",          label: "Aplicação Financeira"            },
  { value: "resgate_financeiro",            label: "Resgate Financeiro"              },
  { value: "transferencia_interna_enviada", label: "Transf. Intercompany (enviada)"  },
  { value: "reserva_limite_cartao",         label: "Reserva Limite Cartão"           },
  { value: "despesa_ambigua",               label: "Despesa Ambígua"                 },
  { value: "unclassified",                  label: "Não Classificado"                },
];

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
    cashflowClass?:      CashflowClass | null;
    dreEffect?:          DREEffect | null;
    managerialCategory?: ManagerialCategory;
    classificationNote?: string | null;
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
    field: "cashflowClass" | "dreEffect" | "managerialCategory" | "classificationNote",
    value: CashflowClass | DREEffect | ManagerialCategory | string | null
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
    if (itemEdits.cashflowClass      !== undefined) patch.cashflowClass      = itemEdits.cashflowClass;
    if (itemEdits.dreEffect          !== undefined) patch.dreEffect           = itemEdits.dreEffect;
    if (itemEdits.managerialCategory !== undefined) patch.managerialCategory  = itemEdits.managerialCategory;
    if (itemEdits.classificationNote !== undefined) patch.classificationNote  = itemEdits.classificationNote;

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
                status:        action,
                cashflowClass: itemEdits.cashflowClass      !== undefined ? itemEdits.cashflowClass      : i.cashflowClass,
                dreEffect:     itemEdits.dreEffect          !== undefined ? itemEdits.dreEffect          : i.dreEffect,
                categoryLabel: itemEdits.managerialCategory !== undefined
                  ? (CATEGORY_OPTIONS.find((o) => o.value === itemEdits.managerialCategory)?.label ?? i.categoryLabel)
                  : i.categoryLabel,
                categoryId:    itemEdits.managerialCategory !== undefined ? itemEdits.managerialCategory : i.categoryId,
                note:          itemEdits.classificationNote !== undefined ? itemEdits.classificationNote : i.note,
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
          const currentCfc   = itemEdits.cashflowClass      !== undefined ? itemEdits.cashflowClass      : item.cashflowClass;
          const currentDre   = itemEdits.dreEffect          !== undefined ? itemEdits.dreEffect          : item.dreEffect;
          const currentCat   = itemEdits.managerialCategory !== undefined ? itemEdits.managerialCategory : item.categoryId;
          const currentNote  = itemEdits.classificationNote !== undefined ? itemEdits.classificationNote : (item.note ?? "");
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

              {/* ── Classification fields ────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                {/* Category */}
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-500 block mb-1">Categoria</label>
                  <select
                    className="w-full text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
                    value={currentCat}
                    onChange={(e) =>
                      setEdit(item.id, "managerialCategory", e.target.value as ManagerialCategory)
                    }
                    disabled={isSaving}
                  >
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {/* cashflowClass */}
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">
                    DFC (cashflowClass)
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
                {/* dreEffect */}
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">
                    DRE (dreEffect)
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
              {/* Note */}
              <div className="mb-3">
                <label className="text-[10px] text-gray-500 block mb-1">Observação</label>
                <input
                  type="text"
                  className="w-full text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
                  placeholder="Nota de classificação (opcional)"
                  value={currentNote}
                  onChange={(e) => setEdit(item.id, "classificationNote", e.target.value || null)}
                  disabled={isSaving}
                />
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
