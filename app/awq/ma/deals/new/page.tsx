"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import {
  ArrowLeft, Building2, DollarSign, BarChart3,
  Loader2, CheckCircle2, AlertCircle, Tv2,
  TrendingUp, Users, Package, Zap, FileText,
  Globe, Tag, Briefcase,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors";
const selectCls =
  "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

function Lbl({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <label className={labelCls}>
      {children}
      {req && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function Section({
  icon: Icon, title, accent, children,
}: {
  icon: React.ElementType; title: string; accent: string; children: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${accent} p-5 space-y-4 shadow-sm`}>
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-gray-600 shrink-0" />
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Score Slider ─────────────────────────────────────────────────────────────

function ScoreSlider({
  label, icon: Icon, value, onChange,
}: {
  label: string; icon: React.ElementType; value: number; onChange: (v: number) => void;
}) {
  const pct   = (value / 25) * 100;
  const color = value >= 18 ? "text-emerald-600" : value >= 12 ? "text-amber-600" : "text-red-500";
  const bar   = value >= 18 ? "#10b981" : value >= 12 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-600">{label}</span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${color}`}>{value}<span className="text-[10px] text-gray-400 font-normal">/25</span></span>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
          style={{ width: `${pct}%`, backgroundColor: bar }}
        />
      </div>
      <input
        type="range"
        min={0} max={25}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 opacity-0 cursor-pointer -mt-3 relative z-10"
        style={{ WebkitAppearance: "none" }}
      />
    </div>
  );
}

// ─── Score Summary ────────────────────────────────────────────────────────────

function ScoreSummary({ total }: { total: number }) {
  const pct   = (total / 100) * 100;
  const color = total >= 70 ? "text-emerald-600" : total >= 50 ? "text-amber-600" : "text-red-500";
  const bar   = total >= 70 ? "bg-emerald-500" : total >= 50 ? "bg-amber-500" : "bg-red-500";
  const label = total >= 70 ? "Forte" : total >= 50 ? "Moderado" : "Fraco";
  const ring  = total >= 70 ? "ring-emerald-200 bg-emerald-50" : total >= 50 ? "ring-amber-200 bg-amber-50" : "ring-red-200 bg-red-50";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Score Total</h3>
      <div className={`flex flex-col items-center justify-center py-4 rounded-xl ring-1 ${ring}`}>
        <span className={`text-4xl font-black tabular-nums ${color}`}>{total}</span>
        <span className="text-xs text-gray-500 mt-0.5">de 100 pontos</span>
        <span className={`mt-2 text-xs font-bold px-2.5 py-0.5 rounded-full ${color} ring-1 ${ring}`}>{label}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${bar} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-gray-400 text-center leading-snug">
        ≥70 recomendado para IC · ≥50 para Due Diligence
      </p>
    </div>
  );
}

// ─── Deal Type Pills ──────────────────────────────────────────────────────────

const DEAL_TYPES = [
  {
    value: "m4e",
    label: "M4E",
    sub: "Mídia por Equity",
    color: "border-cyan-400 bg-cyan-50 text-cyan-700",
    check: "bg-cyan-500",
    icon: Tv2,
  },
  {
    value: "equity_investment",
    label: "Equity",
    sub: "Investimento direto",
    color: "border-brand-400 bg-brand-50 text-brand-700",
    check: "bg-brand-500",
    icon: TrendingUp,
  },
  {
    value: "acquisition",
    label: "Aquisição",
    sub: "Compra total/parcial",
    color: "border-rose-400 bg-rose-50 text-rose-700",
    check: "bg-rose-500",
    icon: Briefcase,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewDealPage() {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    deal_name:                    "",
    company_name:                 "",
    company_website:              "",
    industry:                     "",
    company_stage:                "seed",
    deal_type:                    "m4e",
    lead_source:                  "inbound",
    market_score:                 0,
    team_score:                   0,
    product_score:                0,
    traction_score:               0,
    proposed_valuation:           "",
    proposed_investment_amount:   "",
    proposed_equity_pct:          "",
    media_commitment_value:       "",
    media_delivery_period_months: "",
    notes:                        "",
  });

  const totalScore = useMemo(
    () =>
      (form.market_score   || 0) +
      (form.team_score     || 0) +
      (form.product_score  || 0) +
      (form.traction_score || 0),
    [form.market_score, form.team_score, form.product_score, form.traction_score]
  );

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (process.env.NEXT_PUBLIC_STATIC_DATA === "1") {
      setSubmitError("Modo demonstração (GitHub Pages). Use a versão Vercel para criar deals.");
      return;
    }

    if (!form.deal_name.trim())    return setSubmitError("Nome do deal é obrigatório.");
    if (!form.company_name.trim()) return setSubmitError("Nome da empresa é obrigatório.");

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        action:         "create",
        deal_name:      form.deal_name.trim(),
        company_name:   form.company_name.trim(),
        deal_type:      form.deal_type,
        pipeline_stage: "sourcing",
        ...(form.company_website && { company_website: form.company_website.trim() }),
        ...(form.industry        && { industry:        form.industry }),
        ...(form.company_stage   && { company_stage:   form.company_stage }),
        ...(form.lead_source     && { lead_source:     form.lead_source }),
        market_score:   form.market_score,
        team_score:     form.team_score,
        product_score:  form.product_score,
        traction_score: form.traction_score,
        total_score:    totalScore,
        ...(form.proposed_valuation         && { proposed_valuation:         Number(form.proposed_valuation)         }),
        ...(form.proposed_investment_amount && { proposed_investment_amount: Number(form.proposed_investment_amount) }),
        ...(form.proposed_equity_pct        && { proposed_equity_pct:        Number(form.proposed_equity_pct)        }),
        ...(form.deal_type === "m4e" && form.media_commitment_value      && { media_commitment_value:       Number(form.media_commitment_value)       }),
        ...(form.deal_type === "m4e" && form.media_delivery_period_months && { media_delivery_period_months: Number(form.media_delivery_period_months) }),
        ...(form.notes.trim() && { notes: form.notes.trim() }),
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
        setTimeout(() => router.push("/awq/ma/deals"), 1500);
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
      <div className="px-6 lg:px-8 py-5">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5 text-xs text-gray-500">
          <Link href="/awq/ma" className="hover:text-gray-700 transition-colors">M&A Hub</Link>
          <span className="text-gray-300">/</span>
          <Link href="/awq/ma/deals" className="hover:text-gray-700 transition-colors">Pipeline</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-800 font-semibold">Novo Deal</span>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-center gap-2 mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
            <CheckCircle2 size={16} className="shrink-0" />
            Deal criado com sucesso! Redirecionando para o pipeline...
          </div>
        )}
        {submitError && (
          <div className="flex items-center gap-2 mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

            {/* ── Left: main form (2 cols) ─────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Identificação */}
              <Section icon={Building2} title="Identificação" accent="border-l-blue-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Lbl req>Nome do Deal</Lbl>
                    <input type="text" className={inputCls}
                      placeholder="ex: Projeto Alpha"
                      value={form.deal_name}
                      onChange={(e) => set("deal_name", e.target.value)} />
                  </div>
                  <div>
                    <Lbl req>Nome da Empresa</Lbl>
                    <input type="text" className={inputCls}
                      placeholder="ex: Empresa XYZ Ltda."
                      value={form.company_name}
                      onChange={(e) => set("company_name", e.target.value)} />
                  </div>
                  <div>
                    <Lbl>Website</Lbl>
                    <div className="relative">
                      <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="url" className={`${inputCls} pl-8`}
                        placeholder="https://empresa.com.br"
                        value={form.company_website}
                        onChange={(e) => set("company_website", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Lbl>Setor</Lbl>
                    <div className="relative">
                      <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <select className={`${selectCls} pl-8`}
                        value={form.industry}
                        onChange={(e) => set("industry", e.target.value)}>
                        <option value="">Selecionar setor...</option>
                        {["Tecnologia","Energia","Saúde","Mídia","Fintech","Agro","Varejo","Cleantech","Outro"].map((s) => (
                          <option key={s} value={s.toLowerCase()}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Lbl>Estágio</Lbl>
                    <select className={selectCls}
                      value={form.company_stage}
                      onChange={(e) => set("company_stage", e.target.value)}>
                      <option value="pre_seed">Pre-Seed</option>
                      <option value="seed">Seed</option>
                      <option value="series_a">Series A</option>
                      <option value="growth">Growth</option>
                    </select>
                  </div>
                  <div>
                    <Lbl>Origem do Lead</Lbl>
                    <select className={selectCls}
                      value={form.lead_source}
                      onChange={(e) => set("lead_source", e.target.value)}>
                      <option value="inbound">Inbound</option>
                      <option value="outbound">Outbound</option>
                      <option value="referral">Indicação</option>
                      <option value="event">Evento</option>
                      <option value="network">Network</option>
                    </select>
                  </div>
                </div>

                {/* Deal type pills */}
                <div>
                  <Lbl req>Tipo de Deal</Lbl>
                  <div className="grid grid-cols-3 gap-2">
                    {DEAL_TYPES.map((opt) => {
                      const Icon = opt.icon;
                      const active = form.deal_type === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => set("deal_type", opt.value)}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center ${
                            active
                              ? opt.color + " shadow-sm"
                              : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white"
                          }`}
                        >
                          <Icon size={16} className={active ? "" : "text-gray-400"} />
                          <span className="text-xs font-bold leading-none">{opt.label}</span>
                          <span className={`text-[10px] leading-tight ${active ? "opacity-80" : "text-gray-400"}`}>{opt.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Section>

              {/* Scoring */}
              <Section icon={BarChart3} title="Scoring — 0 a 25 por critério" accent="border-l-amber-500">
                <p className="text-xs text-gray-400 -mt-1">Arraste os sliders para pontuar cada dimensão do deal.</p>
                <div className="space-y-5">
                  <ScoreSlider
                    label="Mercado" icon={TrendingUp}
                    value={form.market_score}
                    onChange={(v) => set("market_score", v)}
                  />
                  <ScoreSlider
                    label="Time" icon={Users}
                    value={form.team_score}
                    onChange={(v) => set("team_score", v)}
                  />
                  <ScoreSlider
                    label="Produto" icon={Package}
                    value={form.product_score}
                    onChange={(v) => set("product_score", v)}
                  />
                  <ScoreSlider
                    label="Tração" icon={Zap}
                    value={form.traction_score}
                    onChange={(v) => set("traction_score", v)}
                  />
                </div>
              </Section>

              {/* Financeiro */}
              <Section icon={DollarSign} title="Termos Financeiros" accent="border-l-emerald-500">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Lbl>Valuation (R$)</Lbl>
                    <input type="number" className={inputCls}
                      placeholder="ex: 5.000.000"
                      value={form.proposed_valuation}
                      onChange={(e) => set("proposed_valuation", e.target.value)} />
                  </div>
                  <div>
                    <Lbl>Investimento (R$)</Lbl>
                    <input type="number" className={inputCls}
                      placeholder="ex: 500.000"
                      value={form.proposed_investment_amount}
                      onChange={(e) => set("proposed_investment_amount", e.target.value)} />
                  </div>
                  <div>
                    <Lbl>% Equity</Lbl>
                    <input type="number" min={0} max={100} step={0.01} className={inputCls}
                      placeholder="ex: 10.5"
                      value={form.proposed_equity_pct}
                      onChange={(e) => set("proposed_equity_pct", e.target.value)} />
                  </div>
                </div>

                {form.deal_type === "m4e" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div className="sm:col-span-2">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Tv2 size={13} className="text-cyan-600" />
                        <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">M4E — Termos de Mídia</span>
                      </div>
                    </div>
                    <div>
                      <Lbl>Valor de Mídia (R$)</Lbl>
                      <input type="number" className={inputCls}
                        placeholder="ex: 1.200.000"
                        value={form.media_commitment_value}
                        onChange={(e) => set("media_commitment_value", e.target.value)} />
                    </div>
                    <div>
                      <Lbl>Prazo de Entrega (meses)</Lbl>
                      <input type="number" min={1} className={inputCls}
                        placeholder="ex: 24"
                        value={form.media_delivery_period_months}
                        onChange={(e) => set("media_delivery_period_months", e.target.value)} />
                    </div>
                  </div>
                )}
              </Section>

              {/* Notas */}
              <Section icon={FileText} title="Notas e Contexto" accent="border-l-brand-500">
                <textarea
                  rows={4}
                  className={`${inputCls} resize-none`}
                  placeholder="Contexto estratégico, tese de investimento, red flags, pontos de atenção..."
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Section>

            </div>

            {/* ── Right: sticky sidebar ────────────────────────────────────── */}
            <div className="space-y-4 lg:sticky lg:top-6">

              <ScoreSummary total={totalScore} />

              {/* Deal snapshot */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resumo</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Empresa</span>
                    <span className="font-semibold text-gray-800 text-right max-w-[140px] truncate">
                      {form.company_name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Tipo</span>
                    <span className={`font-bold ${
                      form.deal_type === "m4e" ? "text-cyan-600" :
                      form.deal_type === "equity_investment" ? "text-brand-600" :
                      "text-rose-600"
                    }`}>
                      {DEAL_TYPES.find(d => d.value === form.deal_type)?.label ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Estágio</span>
                    <span className="font-semibold text-gray-700 capitalize">{form.company_stage.replace("_", " ")}</span>
                  </div>
                  {form.proposed_valuation && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Valuation</span>
                      <span className="font-bold text-emerald-600">
                        R${Number(form.proposed_valuation).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  )}
                  {form.deal_type === "m4e" && form.media_commitment_value && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Mídia</span>
                      <span className="font-bold text-cyan-600">
                        R${Number(form.media_commitment_value).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  type="submit"
                  form="deal-form"
                  disabled={submitting || success}
                  onClick={handleSubmit}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {success ? "✓ Criado!" : submitting ? "Criando..." : "Criar Deal no Pipeline"}
                </button>
                <Link
                  href="/awq/ma/deals"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 rounded-xl transition-colors"
                >
                  <ArrowLeft size={13} />
                  Voltar ao Pipeline
                </Link>
              </div>

              <p className="text-[10px] text-gray-400 text-center leading-snug">
                Deal entra automaticamente na etapa <strong>Sourcing</strong>.<br />
                Você pode avançá-lo pelo Kanban depois.
              </p>
            </div>

          </div>
        </form>
      </div>
    </>
  );
}
