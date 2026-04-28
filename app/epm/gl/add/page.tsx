"use client";

// ─── /awq/epm/gl/add — Add GL Journal Entry ──────────────────────────────────
//
// Client component: form → POST /api/epm/gl → server persists entry.
// Double-entry: user picks debit account, credit account, and amount.

import { useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { Plus, CheckCircle2, AlertTriangle, ChevronLeft } from "lucide-react";
import { CHART_OF_ACCOUNTS } from "@/lib/epm-gl";

// ─── Types ────────────────────────────────────────────────────────────────────

type BuCode = "AWQ" | "JACQES" | "CAZA" | "ADVISOR" | "VENTURE";

const BU_OPTIONS: { value: BuCode; label: string }[] = [
  { value: "AWQ",     label: "AWQ Group (Holding)" },
  { value: "JACQES",  label: "JACQES"              },
  { value: "CAZA",    label: "Caza Vision"          },
  { value: "ADVISOR", label: "Advisor"              },
  { value: "VENTURE", label: "AWQ Venture"          },
];

const SOURCE_OPTIONS = [
  { value: "manual",      label: "Lançamento manual" },
  { value: "ap_payment",  label: "Pagamento AP"      },
  { value: "ar_receipt",  label: "Recebimento AR"    },
];

function fmtBRL(n: number): string {
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Account Selector ─────────────────────────────────────────────────────────

function AccountSelect({
  id, label, value, onChange,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void;
}) {
  const byType = CHART_OF_ACCOUNTS.reduce((acc, a) => {
    const key = a.account_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {} as Record<string, typeof CHART_OF_ACCOUNTS>);

  const TYPE_LABELS: Record<string, string> = {
    ASSET: "Ativo", LIABILITY: "Passivo", EQUITY: "Patrimônio Líquido",
    REVENUE: "Receita", COGS: "Custo", EXPENSE: "Despesa",
    FINANCIAL_REVENUE: "Receita Financeira", FINANCIAL_EXPENSE: "Despesa Financeira",
    INTERCOMPANY: "Intercompany",
  };

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        required
      >
        <option value="">Selecionar conta…</option>
        {Object.entries(byType).map(([type, accounts]) => (
          <optgroup key={type} label={TYPE_LABELS[type] ?? type}>
            {accounts.map((a) => (
              <option key={a.account_code} value={a.account_code}>
                {a.account_code} — {a.account_name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddGLPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    transaction_date:    today,
    bu_code:             "AWQ" as BuCode,
    description:         "",
    reference_doc:       "",
    source_system:       "manual",
    debit_account_code:  "",
    credit_account_code: "",
    amount:              "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState<{ debit: { account_code: string; account_name: string }; credit: { account_code: string; account_name: string } } | null>(null);

  const debitAccount  = CHART_OF_ACCOUNTS.find((a) => a.account_code === form.debit_account_code);
  const creditAccount = CHART_OF_ACCOUNTS.find((a) => a.account_code === form.credit_account_code);
  const amount        = parseFloat(form.amount) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) { setErrorMsg("Informe um valor positivo."); setStatus("error"); return; }
    if (!form.debit_account_code || !form.credit_account_code) {
      setErrorMsg("Selecione as contas de débito e crédito."); setStatus("error"); return;
    }
    if (form.debit_account_code === form.credit_account_code) {
      setErrorMsg("Débito e crédito não podem ser a mesma conta."); setStatus("error"); return;
    }

    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/epm/gl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_date:    form.transaction_date,
          bu_code:             form.bu_code,
          description:         form.description,
          reference_doc:       form.reference_doc || undefined,
          source_system:       form.source_system,
          debit_account_code:  form.debit_account_code,
          debit_amount:        amount,
          credit_account_code: form.credit_account_code,
          credit_amount:       amount,
        }),
      });

      const json = await res.json() as { success: boolean; data?: { debit: { account_code: string; account_name: string }; credit: { account_code: string; account_name: string } }; error?: string };
      if (!json.success) {
        setErrorMsg(json.error ?? "Erro desconhecido");
        setStatus("error");
        return;
      }

      setSuccessData(json.data ?? null);
      setStatus("success");
      // Reset form (keep date + bu)
      setForm((f) => ({
        ...f,
        description:         "",
        reference_doc:       "",
        debit_account_code:  "",
        credit_account_code: "",
        amount:              "",
      }));
    } catch (err) {
      setErrorMsg(String(err));
      setStatus("error");
    }
  }

  return (
    <>
      <Header title="Novo Lançamento GL" subtitle="EPM · Razão Geral · Partidas dobradas" />
      <div className="page-container max-w-2xl">

        <Link href="/epm/gl" className="flex items-center gap-1 text-xs text-brand-600 hover:underline mb-2">
          <ChevronLeft size={12} /> Voltar para Razão Geral
        </Link>

        {/* ── Success banner ─────────────────────────────────────────── */}
        {status === "success" && successData && (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800">
              <div className="font-semibold mb-1">Lançamento registrado!</div>
              <div className="text-xs space-y-0.5">
                <div>D: <strong>{successData.debit.account_code}</strong> — {successData.debit.account_name}</div>
                <div>C: <strong>{successData.credit.account_code}</strong> — {successData.credit.account_name}</div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Link href="/epm/gl" className="text-xs text-emerald-700 underline font-medium">
                  Ver razão geral
                </Link>
                <button
                  onClick={() => setStatus("idle")}
                  className="text-xs text-emerald-700 underline"
                >
                  Novo lançamento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Error banner ────────────────────────────────────────────── */}
        {status === "error" && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <div className="font-semibold">Erro no lançamento</div>
              <div className="text-xs mt-0.5">{errorMsg}</div>
            </div>
          </div>
        )}

        {/* ── Form ───────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">

          {/* Row 1: Date + BU */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Data</label>
              <input
                type="date"
                value={form.transaction_date}
                onChange={(e) => setForm((f) => ({ ...f, transaction_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Business Unit</label>
              <select
                value={form.bu_code}
                onChange={(e) => setForm((f) => ({ ...f, bu_code: e.target.value as BuCode }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {BU_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Histórico / Descrição</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Provisão de férias — Danilo"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          {/* Ref doc */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Documento de referência <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.reference_doc}
              onChange={(e) => setForm((f) => ({ ...f, reference_doc: e.target.value }))}
              placeholder="Ex: NF-3421, Contrato 001, etc."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Double entry accounts */}
          <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Partidas Dobradas — D = C
            </div>
            <AccountSelect
              id="debit_account"
              label="Conta de Débito (D)"
              value={form.debit_account_code}
              onChange={(v) => setForm((f) => ({ ...f, debit_account_code: v }))}
            />
            <AccountSelect
              id="credit_account"
              label="Conta de Crédito (C)"
              value={form.credit_account_code}
              onChange={(v) => setForm((f) => ({ ...f, credit_account_code: v }))}
            />

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            {/* Preview */}
            {amount > 0 && debitAccount && creditAccount && (
              <div className="bg-white rounded-lg p-3 border border-gray-200 text-xs font-mono space-y-1">
                <div className="text-gray-400 mb-1">Pré-visualização:</div>
                <div className="flex justify-between">
                  <span className="text-red-700">D  {debitAccount.account_code} {debitAccount.account_name}</span>
                  <span className="text-red-700 tabular-nums">{fmtBRL(amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">&nbsp;&nbsp;&nbsp;C  {creditAccount.account_code} {creditAccount.account_name}</span>
                  <span className="text-emerald-700 tabular-nums">{fmtBRL(amount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Source */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Origem do lançamento</label>
            <select
              value={form.source_system}
              onChange={(e) => setForm((f) => ({ ...f, source_system: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={14} />
            {status === "loading" ? "Registrando…" : "Registrar Lançamento GL"}
          </button>
        </form>

      </div>
    </>
  );
}
