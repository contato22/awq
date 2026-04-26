"use client";

// ─── Transaction Entry Form ───────────────────────────────────────────────────
// Client component — calls /api/awq/transactions (SSR) or Supabase Edge Function
// (static build). Works in both GitHub Pages and Vercel deployments.

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, AlertCircle, Loader2, PlusCircle,
  ArrowUpRight, ArrowDownRight, Building2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Account {
  id:          string;
  label:       string;
  accountName: string;
  bank:        string;
  entity:      string;
  status:      string;
}

type Direction = "credit" | "debit";

interface FormState {
  document_id:               string;
  transaction_date:          string;
  description_original:      string;
  amount:                    string;
  direction:                 Direction;
  managerial_category:       string;
  counterparty_name:         string;
  classification_confidence: string;
  classification_note:       string;
  is_intercompany:           boolean;
}

// ─── Category options (matches ManagerialCategory in financial-db.ts) ─────────

const CATEGORIES_CREDIT = [
  { value: "receita_recorrente",             label: "Receita Recorrente" },
  { value: "receita_projeto",                label: "Receita de Projeto" },
  { value: "receita_consultoria",            label: "Receita de Consultoria" },
  { value: "receita_producao",               label: "Receita de Produção" },
  { value: "receita_social_media",           label: "Receita Social Media" },
  { value: "receita_revenue_share",          label: "Revenue Share" },
  { value: "receita_fee_venture",            label: "Fee Recorrente Venture" },
  { value: "receita_eventual",               label: "Receita Eventual" },
  { value: "rendimento_financeiro",          label: "Rendimento Financeiro" },
  { value: "aporte_socio",                   label: "Aporte do Sócio" },
  { value: "transferencia_interna_recebida", label: "Transf. Intercompany (recebida)" },
  { value: "ajuste_bancario_credito",        label: "Ajuste / Crédito Bancário" },
  { value: "recebimento_ambiguo",            label: "Recebimento Ambíguo" },
];

const CATEGORIES_DEBIT = [
  { value: "fornecedor_operacional",       label: "Fornecedor Operacional" },
  { value: "freelancer_terceiro",          label: "Freelancer / Terceiro" },
  { value: "folha_remuneracao",            label: "Folha / Remuneração" },
  { value: "prolabore_retirada",           label: "Pró-labore / Retirada" },
  { value: "imposto_tributo",              label: "Imposto / Tributo" },
  { value: "juros_multa_iof",              label: "Juros / Multa / IOF" },
  { value: "tarifa_bancaria",              label: "Tarifa Bancária" },
  { value: "software_assinatura",          label: "Software / Assinatura" },
  { value: "marketing_midia",              label: "Marketing / Mídia Paga" },
  { value: "deslocamento_combustivel",     label: "Deslocamento / Combustível" },
  { value: "alimentacao_representacao",    label: "Alimentação / Representação" },
  { value: "viagem_hospedagem",            label: "Viagem / Hospedagem" },
  { value: "aluguel_locacao",              label: "Aluguel / Locação" },
  { value: "energia_agua_internet",        label: "Energia / Água / Internet" },
  { value: "servicos_contabeis_juridicos", label: "Serviços Contábeis / Jurídicos" },
  { value: "cartao_compra_operacional",    label: "Compra via Cartão Corporativo" },
  { value: "despesa_pessoal_misturada",    label: "Despesa Pessoal Misturada" },
  { value: "aplicacao_financeira",         label: "Aplicação Financeira" },
  { value: "transferencia_interna_enviada","label": "Transf. Intercompany (enviada)" },
  { value: "despesa_ambigua",              label: "Despesa Ambígua" },
  { value: "unclassified",                 label: "Não Classificado" },
];

const ENTITY_LABELS: Record<string, string> = {
  AWQ_Holding:  "AWQ Holding",
  JACQES:       "JACQES",
  Caza_Vision:  "Caza Vision",
  Intercompany: "Intercompany",
  Socio_PF:     "Sócio / PF",
  Unknown:      "Não identificado",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isStaticBuild(): boolean {
  return process.env.NEXT_PUBLIC_STATIC_DATA === "1";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TransactionForm() {
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountsError, setAccountsError]     = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    document_id:               "",
    transaction_date:          today(),
    description_original:      "",
    amount:                    "",
    direction:                 "credit",
    managerial_category:       "receita_recorrente",
    counterparty_name:         "",
    classification_confidence: "confirmed",
    classification_note:       "",
    is_intercompany:           false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<{ ok: boolean; message: string } | null>(null);

  // ── Load accounts ──────────────────────────────────────────────────────────
  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    setAccountsError(null);
    try {
      let data: { accounts?: Account[] } | null = null;

      if (isStaticBuild()) {
        // Static build: call Edge Function directly
        const edgeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!edgeUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada");
        const res = await fetch(
          `${edgeUrl}/functions/v1/get-accounts?status=done`,
          { headers: { "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" } }
        );
        if (!res.ok) throw new Error(`get-accounts falhou: ${res.status}`);
        data = await res.json();
      } else {
        // SSR: call Next.js API route
        const res = await fetch("/api/awq/transactions?type=accounts");
        if (!res.ok) throw new Error(`API falhou: ${res.status}`);
        data = await res.json();
      }

      setAccounts(data?.accounts ?? []);
    } catch (err) {
      setAccountsError(err instanceof Error ? err.message : String(err));
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  // Auto-switch category when direction changes
  function handleDirectionChange(dir: Direction) {
    const defaultCat = dir === "credit" ? "receita_recorrente" : "fornecedor_operacional";
    setForm((f) => ({ ...f, direction: dir, managerial_category: defaultCat }));
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const payload = {
        document_id:               form.document_id,
        transaction_date:          form.transaction_date,
        description_original:      form.description_original.trim(),
        amount:                    parseFloat(form.amount),
        direction:                 form.direction,
        managerial_category:       form.managerial_category,
        counterparty_name:         form.counterparty_name.trim() || null,
        classification_confidence: form.classification_confidence,
        classification_note:       form.classification_note.trim() || null,
        is_intercompany:           form.is_intercompany,
      };

      let res: Response;
      if (isStaticBuild()) {
        const edgeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!edgeUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada");
        res = await fetch(`${edgeUrl}/functions/v1/add-transaction`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/awq/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: json.error ?? `Erro ${res.status}` });
      } else {
        setResult({ ok: true, message: "Transação registrada com sucesso!" });
        setForm((f) => ({
          ...f,
          transaction_date:     today(),
          description_original: "",
          amount:               "",
          counterparty_name:    "",
          classification_note:  "",
        }));
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setSubmitting(false);
    }
  }

  const categories = form.direction === "credit" ? CATEGORIES_CREDIT : CATEGORIES_DEBIT;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">

      {/* Result banner */}
      {result && (
        <div className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${
          result.ok
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {result.ok
            ? <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-600" />
            : <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />}
          <p className="text-sm font-medium">{result.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">

        {/* Account selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Conta Bancária <span className="text-red-500">*</span>
          </label>
          {loadingAccounts ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
              <Loader2 size={13} className="animate-spin" /> Carregando contas...
            </div>
          ) : accountsError ? (
            <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {accountsError} —{" "}
              <button type="button" onClick={loadAccounts} className="underline font-medium">
                tentar novamente
              </button>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
              Nenhuma conta com extratos processados encontrada.
              Ingira extratos em <a href="/awq/ingest" className="underline font-medium">/awq/ingest</a> primeiro.
            </div>
          ) : (
            <select
              required
              value={form.document_id}
              onChange={(e) => setForm((f) => ({ ...f, document_id: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">— Selecione a conta —</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountName} — {acc.bank}
                  {acc.entity ? ` (${ENTITY_LABELS[acc.entity] ?? acc.entity})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Direction toggle */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Tipo <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {(["credit", "debit"] as Direction[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDirectionChange(d)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                  form.direction === d
                    ? d === "credit"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-red-400 bg-red-50 text-red-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {d === "credit"
                  ? <><ArrowUpRight size={15} /> Entrada (Crédito)</>
                  : <><ArrowDownRight size={15} /> Saída (Débito)</>}
              </button>
            ))}
          </div>
        </div>

        {/* Date + Amount row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Data <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={form.transaction_date}
              onChange={(e) => setForm((f) => ({ ...f, transaction_date: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Valor (R$) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Descrição <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={255}
            placeholder="Ex: JACQES DESIGN LTDA PIX ENTRADA"
            value={form.description_original}
            onChange={(e) => setForm((f) => ({ ...f, description_original: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Categoria Gerencial <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.managerial_category}
            onChange={(e) => setForm((f) => ({ ...f, managerial_category: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Counterparty + Confidence row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Contraparte
            </label>
            <input
              type="text"
              maxLength={120}
              placeholder="Nome do cliente ou fornecedor"
              value={form.counterparty_name}
              onChange={(e) => setForm((f) => ({ ...f, counterparty_name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Confiança
            </label>
            <select
              value={form.classification_confidence}
              onChange={(e) => setForm((f) => ({ ...f, classification_confidence: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="confirmed">Confirmado</option>
              <option value="probable">Provável</option>
              <option value="ambiguous">Ambíguo</option>
              <option value="unclassifiable">Não classificável</option>
            </select>
          </div>
        </div>

        {/* Note + intercompany row */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Nota de Classificação
          </label>
          <input
            type="text"
            maxLength={255}
            placeholder="Observação opcional sobre a classificação"
            value={form.classification_note}
            onChange={(e) => setForm((f) => ({ ...f, classification_note: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.is_intercompany}
            onChange={(e) => setForm((f) => ({ ...f, is_intercompany: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-gray-600">
            Transação intercompany (excluída da consolidação)
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || accounts.length === 0}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-6 py-3 text-sm font-semibold transition-colors"
        >
          {submitting ? (
            <><Loader2 size={15} className="animate-spin" /> Registrando...</>
          ) : (
            <><PlusCircle size={15} /> Registrar Transação</>
          )}
        </button>

      </form>

      {/* Info footer */}
      <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-400">
        <Building2 size={11} />
        <span>
          As transações registradas aqui entram no pipeline de caixa e aparecem em{" "}
          <a href="/awq/cashflow" className="underline hover:text-gray-600">/awq/cashflow</a>{" "}
          e{" "}
          <a href="/awq" className="underline hover:text-gray-600">Control Tower</a>.
        </span>
      </div>
    </div>
  );
}
