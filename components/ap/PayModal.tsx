"use client";

// ─── PayModal ─────────────────────────────────────────────────────────────────
// Modal para registrar pagamento de uma AP.

import { useState, type ChangeEvent } from "react";
import { X, CheckCircle2, AlertCircle, DollarSign } from "lucide-react";
import type { AccountsPayable } from "@/lib/ap-types";
import { AP_PAYMENT_METHOD_LABELS } from "@/lib/ap-types";

interface Props {
  ap:        AccountsPayable;
  onClose:   () => void;
  onSuccess: () => void;
}

function fmtR(n: number) {
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type FormState = {
  payment_date: string; paid_amount: string; payment_method: string;
  payment_reference: string; payment_bank_code: string;
  payment_bank_branch: string; payment_bank_account: string; notes: string;
};

export default function PayModal({ ap, onClose, onSuccess }: Props) {
  const item = ap;
  const [form, setForm] = useState<FormState>({
    payment_date:        new Date().toISOString().slice(0, 10),
    paid_amount:         String(item.net_amount),
    payment_method:      item.payment_method ?? item.supplier?.default_payment_method ?? "pix",
    payment_reference:   "",
    payment_bank_code:   item.payment_bank_code ?? "",
    payment_bank_branch: item.payment_bank_branch ?? "",
    payment_bank_account:item.payment_bank_account ?? "",
    notes:               "",
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState<string | null>(null);

  async function handlePay() {
    if (!form.payment_date || !form.paid_amount) {
      setErr("Data e valor do pagamento são obrigatórios.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/ap/${item.ap_id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_date:         form.payment_date,
          paid_amount:          Number(form.paid_amount),
          payment_method:       form.payment_method || null,
          payment_reference:    form.payment_reference || null,
          payment_bank_code:    form.payment_bank_code || null,
          payment_bank_branch:  form.payment_bank_branch || null,
          payment_bank_account: form.payment_bank_account || null,
          notes:                form.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        setErr(String(data.error ?? "Erro ao registrar pagamento."));
        return;
      }
      onSuccess();
    } catch {
      setErr("Erro de rede.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-600" />
            <span className="text-sm font-semibold text-gray-800">Registrar Pagamento</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={15} />
          </button>
        </div>

        {/* AP summary */}
        <div className="p-3 rounded-xl bg-gray-50 text-xs space-y-1">
          <div className="font-semibold text-gray-800 truncate">
            {item.supplier?.trade_name || item.supplier?.legal_name || `Fornecedor #${item.supplier_id}`}
          </div>
          <div className="text-gray-500">{item.description || item.document_number || "—"}</div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-gray-500">Bruto: <strong className="text-gray-700">{fmtR(item.gross_amount)}</strong></span>
            <span className="text-gray-500">Líquido: <strong className="text-red-600">{fmtR(item.net_amount)}</strong></span>
          </div>
        </div>

        {err && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-xs">
            <AlertCircle size={13} /> {err}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Data */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Data do Pagamento *</label>
            <input
              type="date" value={form.payment_date}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((f: FormState) => ({ ...f, payment_date: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Valor pago */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Valor Pago (R$) *</label>
            <input
              type="number" step="0.01" min="0" value={form.paid_amount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((f: FormState) => ({ ...f, paid_amount: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Método */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Método</label>
            <select
              value={form.payment_method}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm((f: FormState) => ({ ...f, payment_method: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
            >
              <option value="">— Selecionar —</option>
              {Object.entries(AP_PAYMENT_METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Referência */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Comprovante / Ref.</label>
            <input
              type="text" placeholder="DOC/TED/e2e ID" value={form.payment_reference}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((f: FormState) => ({ ...f, payment_reference: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Observações */}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide pl-1">Observações</label>
            <input
              type="text" placeholder="Nota opcional" value={form.notes}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((f: FormState) => ({ ...f, notes: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handlePay}
            disabled={saving || !form.payment_date || !form.paid_amount}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={14} />
            {saving ? "Registrando…" : "Confirmar Pagamento"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
