"use client";

// ─── APForm ───────────────────────────────────────────────────────────────────
// Formulário de cadastro de Conta a Pagar com campos completos.

import { useState, useEffect, type ChangeEvent } from "react";
import { Plus, X, AlertCircle, Info } from "lucide-react";
import SupplierSelect from "./SupplierSelect";
import type { Supplier } from "@/lib/supplier-types";
import type { APDocumentType, APPaymentMethod } from "@/lib/ap-types";
import { AP_DOCUMENT_TYPE_LABELS, AP_PAYMENT_METHOD_LABELS } from "@/lib/ap-types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BU = "awq" | "jacqes" | "caza" | "venture" | "advisor";

export const BUS: { id: BU; label: string }[] = [
  { id: "awq",     label: "AWQ Holding"  },
  { id: "jacqes",  label: "JACQES"       },
  { id: "caza",    label: "Caza Vision"  },
  { id: "venture", label: "AWQ Venture"  },
  { id: "advisor", label: "Advisor"      },
];

interface Props {
  defaultBU?: BU;
  onSuccess:  () => void;
  onCancel?:  () => void;
}

// ── Empty form ────────────────────────────────────────────────────────────────

const EMPTY = {
  supplierName:             "",
  supplierId:               0,
  bu:                       "awq" as BU,
  document_type:            "" as APDocumentType | "",
  document_number:          "",
  document_series:          "",
  document_date:            "",
  nf_key:                   "",
  gross_amount:             "",
  discount_amount:          "0",
  irrf_withheld:            "0",
  iss_withheld:             "0",
  inss_withheld:            "0",
  pis_cofins_csll_withheld: "0",
  due_date:                 "",
  installment_number:       "",
  installment_total:        "",
  payment_method:           "" as APPaymentMethod | "",
  cost_center:              "",
  description:              "",
  notes:                    "",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function APForm({ defaultBU = "awq", onSuccess, onCancel }: Props) {
  const [form, setForm]           = useState({ ...EMPTY, bu: defaultBU });
  const [supplier, setSupplier]   = useState<Supplier | null>(null);
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // auto-fill withholdings from supplier compliance flags
  useEffect(() => {
    if (!supplier) return;
    setForm((f: typeof EMPTY) => ({
      ...f,
      irrf_withheld:            supplier.withhold_irrf             ? f.irrf_withheld  : "0",
      iss_withheld:             supplier.withhold_iss              ? f.iss_withheld   : "0",
      inss_withheld:            supplier.withhold_inss             ? f.inss_withheld  : "0",
      pis_cofins_csll_withheld: supplier.withhold_pis_cofins_csll  ? f.pis_cofins_csll_withheld : "0",
      payment_method:           (supplier.default_payment_method as APPaymentMethod) ?? f.payment_method,
    }));
  }, [supplier]);

  // computed net
  const gross    = parseFloat(form.gross_amount)             || 0;
  const discount = parseFloat(form.discount_amount)          || 0;
  const irrf     = parseFloat(form.irrf_withheld)            || 0;
  const iss      = parseFloat(form.iss_withheld)             || 0;
  const inss     = parseFloat(form.inss_withheld)            || 0;
  const pisCsll  = parseFloat(form.pis_cofins_csll_withheld) || 0;
  const net      = gross - discount - irrf - iss - inss - pisCsll;

  function field(key: keyof typeof form) {
    return {
      value: String(form[key]),
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm((f: typeof EMPTY) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit() {
    if (!form.supplierId) { setErr("Selecione um fornecedor."); return; }
    if (!form.gross_amount || gross <= 0) { setErr("Valor bruto obrigatório."); return; }
    if (!form.due_date) { setErr("Data de vencimento obrigatória."); return; }

    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/ap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id:              form.supplierId,
          bu:                       form.bu,
          document_type:            form.document_type   || null,
          document_number:          form.document_number || null,
          document_series:          form.document_series || null,
          document_date:            form.document_date   || null,
          nf_key:                   form.nf_key          || null,
          gross_amount:             gross,
          discount_amount:          discount,
          irrf_withheld:            irrf,
          iss_withheld:             iss,
          inss_withheld:            inss,
          pis_cofins_csll_withheld: pisCsll,
          net_amount:               net,
          due_date:                 form.due_date,
          installment_number:       form.installment_number ? Number(form.installment_number) : null,
          installment_total:        form.installment_total  ? Number(form.installment_total)  : null,
          payment_method:           form.payment_method || null,
          cost_center:              form.cost_center    || null,
          description:              form.description    || null,
          notes:                    form.notes          || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        setErr(String(data.error ?? "Erro ao salvar."));
        return;
      }
      onSuccess();
      setForm({ ...EMPTY, bu: form.bu });
      setSupplier(null);
    } catch {
      setErr("Erro de rede.");
    } finally {
      setSaving(false);
    }
  }

  const hasWithholdings = supplier && (
    supplier.withhold_irrf || supplier.withhold_iss ||
    supplier.withhold_inss || supplier.withhold_pis_cofins_csll
  );

  return (
    <div className="card p-5 border-l-4 border-l-red-400 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Plus size={15} className="text-red-600" />
        <span className="text-sm font-semibold text-gray-800">Nova Conta a Pagar</span>
      </div>

      {err && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-xs">
          <AlertCircle size={13} /> {err}
        </div>
      )}

      {/* Linha 1: Fornecedor + BU */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Fornecedor *</label>
          <SupplierSelect
            value={form.supplierName}
            supplierId={form.supplierId || undefined}
            onChange={(name, s) => {
              setForm((f: typeof EMPTY) => ({ ...f, supplierName: name, supplierId: s?.supplier_id ?? 0 }));
              setSupplier(s ?? null);
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Business Unit</label>
          <select
            {...field("bu")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
          >
            {BUS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </div>
      </div>

      {/* Supplier compliance hint */}
      {supplier && hasWithholdings && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <Info size={12} className="mt-0.5 shrink-0" />
          <span>
            Este fornecedor exige retenção de{" "}
            {[
              supplier.withhold_irrf && "IRRF",
              supplier.withhold_iss  && "ISS",
              supplier.withhold_inss && "INSS",
              supplier.withhold_pis_cofins_csll && "PIS/COFINS/CSLL",
            ].filter(Boolean).join(", ")}.
            Preencha os valores retidos abaixo.
          </span>
        </div>
      )}

      {/* Linha 2: Documento fiscal */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Tipo Doc.</label>
          <select
            {...field("document_type")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
          >
            <option value="">— Selecionar —</option>
            {Object.entries(AP_DOCUMENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Número</label>
          <input
            type="text" placeholder="Ex: 001234" {...field("document_number")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Série</label>
          <input
            type="text" placeholder="Ex: A" {...field("document_series")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Emissão</label>
          <input
            type="date" {...field("document_date")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Chave NF-e */}
      {form.document_type === "nota_fiscal" && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Chave NF-e (44 dígitos)</label>
          <input
            type="text" placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000" maxLength={44}
            {...field("nf_key")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 font-mono focus:outline-none focus:border-brand-500"
          />
        </div>
      )}

      {/* Descrição */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Descrição</label>
        <input
          type="text" placeholder="Ex: Serviços de consultoria — Janeiro/2025" {...field("description")}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
        />
      </div>

      {/* Linha 3: Valores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Valor Bruto (R$) *</label>
          <input
            type="number" step="0.01" min="0" placeholder="0,00" {...field("gross_amount")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Desconto (R$)</label>
          <input
            type="number" step="0.01" min="0" {...field("discount_amount")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Withholdings — collapses when no supplier or no flags */}
        {(showAdvanced || hasWithholdings) && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">IRRF Retido (R$)</label>
              <input
                type="number" step="0.01" min="0" {...field("irrf_withheld")}
                disabled={!supplier?.withhold_irrf && !showAdvanced}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">ISS Retido (R$)</label>
              <input
                type="number" step="0.01" min="0" {...field("iss_withheld")}
                disabled={!supplier?.withhold_iss && !showAdvanced}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">INSS Retido (R$)</label>
              <input
                type="number" step="0.01" min="0" {...field("inss_withheld")}
                disabled={!supplier?.withhold_inss && !showAdvanced}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">PIS/COFINS/CSLL (R$)</label>
              <input
                type="number" step="0.01" min="0" {...field("pis_cofins_csll_withheld")}
                disabled={!supplier?.withhold_pis_cofins_csll && !showAdvanced}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          </>
        )}

        {/* Valor líquido computed */}
        {gross > 0 && (
          <div className="flex flex-col gap-1 sm:col-span-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <span className="text-xs text-gray-600">Valor líquido a pagar:</span>
              <span className="text-sm font-bold text-red-700">
                R$ {net.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {(irrf + iss + inss + pisCsll) > 0 && (
                <span className="ml-auto text-[10px] text-gray-500">
                  Retenções: R$ {(irrf + iss + inss + pisCsll).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Linha 4: Vencimento + Parcelas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Vencimento *</label>
          <input
            type="date" {...field("due_date")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Método Pgto</label>
          <select
            {...field("payment_method")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
          >
            <option value="">— Selecionar —</option>
            {Object.entries(AP_PAYMENT_METHOD_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Parcela</label>
          <input
            type="number" min="1" placeholder="1" {...field("installment_number")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">de Total</label>
          <input
            type="number" min="1" placeholder="1" {...field("installment_total")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Centro de custo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Centro de Custo</label>
          <input
            type="text" placeholder="Ex: MKT-2025" {...field("cost_center")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Observações</label>
          <input
            type="text" placeholder="Nota interna" {...field("notes")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <button
          onClick={handleSubmit}
          disabled={saving || !form.supplierId || !form.gross_amount || !form.due_date}
          className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
          {saving ? "Salvando…" : "Adicionar Obrigação"}
        </button>
        <button
          onClick={() => setShowAdvanced((v: boolean) => !v)}
          className="px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {showAdvanced ? "Ocultar retenções" : "Retenções avançadas"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="ml-auto flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={12} /> Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
