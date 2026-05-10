"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  DollarSign,
  BarChart3,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── Field Components ─────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-400 mb-1">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

const inputCls =
  "w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors";

const selectCls =
  "w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors";

// ─── Score Meter ──────────────────────────────────────────────────────────────

function ScoreMeter({ total }: { total: number }) {
  const pct   = (total / 100) * 100;
  const color =
    total >= 70 ? "bg-emerald-500" :
    total >= 50 ? "bg-amber-500"   :
    "bg-red-500";
  const textColor =
    total >= 70 ? "text-emerald-400" :
    total >= 50 ? "text-amber-400"   :
    "text-red-400";
  const label =
    total >= 70 ? "Forte" :
    total >= 50 ? "Moderado" :
    "Fraco";

  return (
    <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400">Score Total</span>
        <span className={`text-sm font-bold ${textColor}`}>{total}/100 · {label}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewDealPage() {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    deal_name:                  "",
    company_name:               "",
    company_website:            "",
    industry:                   "",
    company_stage:              "seed",
    deal_type:                  "m4e",
    lead_source:                "inbound",
    market_score:               0,
    team_score:                 0,
    product_score:              0,
    traction_score:             0,
    proposed_valuation:         "",
    proposed_investment_amount: "",
    proposed_equity_pct:        "",
    media_commitment_value:     "",
    media_delivery_period_months: "",
    notes:                      "",
  });

  const totalScore = useMemo(
    () =>
      (Number(form.market_score)   || 0) +
      (Number(form.team_score)     || 0) +
      (Number(form.product_score)  || 0) +
      (Number(form.traction_score) || 0),
    [form.market_score, form.team_score, form.product_score, form.traction_score]
  );

  function set(key: keyof typeof form, val: string | number) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!form.deal_name.trim())    return setSubmitError("Nome do deal é obrigatório.");
    if (!form.company_name.trim()) return setSubmitError("Nome da empresa é obrigatório.");
    if (!form.deal_type.trim())    return setSubmitError("Tipo de deal é obrigatório.");

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        action:        "create",
        deal_name:     form.deal_name.trim(),
        company_name:  form.company_name.trim(),
        deal_type:     form.deal_type,
        pipeline_stage: "sourcing",
        ...(form.company_website         && { company_website:         form.company_website.trim() }),
        ...(form.industry                && { industry:                form.industry }),
        ...(form.company_stage           && { company_stage:           form.company_stage }),
        ...(form.lead_source             && { lead_source:             form.lead_source }),
        market_score:   Number(form.market_score)   || 0,
        team_score:     Number(form.team_score)     || 0,
        product_score:  Number(form.product_score)  || 0,
        traction_score: Number(form.traction_score) || 0,
        total_score:    totalScore,
        ...(form.proposed_valuation         && { proposed_valuation:         Number(form.proposed_valuation)         }),
        ...(form.proposed_investment_amount && { proposed_investment_amount: Number(form.proposed_investment_amount) }),
        ...(form.proposed_equity_pct        && { proposed_equity_pct:        Number(form.proposed_equity_pct)        }),
        ...(form.deal_type === "m4e" && form.media_commitment_value      && { media_commitment_value:       Number(form.media_commitment_value)       }),
        ...(form.deal_type === "m4e" && form.media_delivery_period_months && { media_delivery_period_months: Number(form.media_delivery_period_months) }),
        ...(form.notes.trim()              && { notes: form.notes.trim() }),
      };

      const res  = await fetch("/api/ma/deals", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        setSubmitError(json.error ?? "Erro ao criar deal.");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/awq/ma/deals"), 1200);
      }
    } catch (e) {
      setSubmitError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header title="Novo Deal" subtitle="M&A Pipeline · AWQ Group" />
      <div className="px-6 lg:px-8 py-6 max-w-3xl mx-auto space-y-6">

        {/* Back link */}
        <Link
          href="/awq/ma/deals"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={12} />
          Pipeline de Deals
        </Link>

        {/* Success banner */}
        {success && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
            <CheckCircle2 size={15} />
            Deal criado com sucesso! Redirecionando...
          </div>
        )}

        {/* Error banner */}
        {submitError && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertCircle size={15} />
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Identificação ─────────────────────────────────────────────── */}
          <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={14} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Identificação</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Nome do Deal</FieldLabel>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="ex: Projeto Alpha"
                  value={form.deal_name}
                  onChange={(e) => set("deal_name", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel required>Nome da Empresa</FieldLabel>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="ex: Empresa XYZ Ltda"
                  value={form.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Website</FieldLabel>
                <input
                  type="url"
                  className={inputCls}
                  placeholder="https://empresa.com.br"
                  value={form.company_website}
                  onChange={(e) => set("company_website", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Setor</FieldLabel>
                <select
                  className={selectCls}
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                >
                  <option value="">Selecionar setor</option>
                  {["Tecnologia","Energia","Saúde","Mídia","Fintech","Agro","Varejo","Outro"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Estágio da Empresa</FieldLabel>
                <select
                  className={selectCls}
                  value={form.company_stage}
                  onChange={(e) => set("company_stage", e.target.value)}
                >
                  <option value="pre_seed">Pre-Seed</option>
                  <option value="seed">Seed</option>
                  <option value="series_a">Series A</option>
                  <option value="growth">Growth</option>
                </select>
              </div>
              <div>
                <FieldLabel>Origem do Lead</FieldLabel>
                <select
                  className={selectCls}
                  value={form.lead_source}
                  onChange={(e) => set("lead_source", e.target.value)}
                >
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                  <option value="referral">Indicação</option>
                  <option value="event">Evento</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            <div>
              <FieldLabel required>Tipo de Deal</FieldLabel>
              <div className="flex gap-3">
                {[
                  { value: "m4e",              label: "M4E (Mídia por Equity)" },
                  { value: "equity_investment", label: "Equity Investment"      },
                  { value: "acquisition",       label: "Aquisição"              },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-medium ${
                      form.deal_type === opt.value
                        ? "border-blue-500 bg-blue-500/10 text-blue-300"
                        : "border-gray-600 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deal_type"
                      value={opt.value}
                      checked={form.deal_type === opt.value}
                      onChange={() => set("deal_type", opt.value)}
                      className="hidden"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Scoring ───────────────────────────────────────────────────── */}
          <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={14} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Scoring (0–25 por critério)</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: "market_score"  as const, label: "Mercado"  },
                { key: "team_score"    as const, label: "Time"     },
                { key: "product_score" as const, label: "Produto"  },
                { key: "traction_score"as const, label: "Tração"   },
              ].map(({ key, label }) => (
                <div key={key}>
                  <FieldLabel>{label}</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    className={inputCls}
                    value={form[key]}
                    onChange={(e) => set(key, Math.min(25, Math.max(0, Number(e.target.value))))}
                  />
                </div>
              ))}
            </div>

            <ScoreMeter total={totalScore} />
          </div>

          {/* ── Financeiro ────────────────────────────────────────────────── */}
          <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className="text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Termos Financeiros</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel>Valuation Proposto (R$)</FieldLabel>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="ex: 5000000"
                  value={form.proposed_valuation}
                  onChange={(e) => set("proposed_valuation", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Investimento Proposto (R$)</FieldLabel>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="ex: 500000"
                  value={form.proposed_investment_amount}
                  onChange={(e) => set("proposed_investment_amount", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>% Equity Proposto</FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  className={inputCls}
                  placeholder="ex: 10.5"
                  value={form.proposed_equity_pct}
                  onChange={(e) => set("proposed_equity_pct", e.target.value)}
                />
              </div>
            </div>

            {/* M4E fields */}
            {form.deal_type === "m4e" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-700">
                <div>
                  <FieldLabel>Comprometimento de Mídia (R$)</FieldLabel>
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="ex: 1200000"
                    value={form.media_commitment_value}
                    onChange={(e) => set("media_commitment_value", e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Prazo de Entrega de Mídia (meses)</FieldLabel>
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    placeholder="ex: 24"
                    value={form.media_delivery_period_months}
                    onChange={(e) => set("media_delivery_period_months", e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Notas ─────────────────────────────────────────────────────── */}
          <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-5">
            <FieldLabel>Notas / Observações</FieldLabel>
            <textarea
              rows={4}
              className={`${inputCls} resize-none`}
              placeholder="Contexto adicional, observações estratégicas..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {/* ── Actions ───────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 justify-end pb-4">
            <Link
              href="/awq/ma/deals"
              className="px-4 py-2 rounded-lg border border-gray-600 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting || success}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {success ? "Criado!" : submitting ? "Criando..." : "Criar Deal"}
            </button>
          </div>

        </form>
      </div>
    </>
  );
}
