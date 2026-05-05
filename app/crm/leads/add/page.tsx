"use client";

import { useState, useEffect, useCallback } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import {
  User, Building2, Mail, Phone, Briefcase,
  BarChart3, CheckCircle2, AlertCircle, ChevronLeft,
  DollarSign, Calendar, FileText, Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  contact_name: string;
  company_name: string;
  email: string;
  phone: string;
  job_title: string;
  bu: string;
  lead_source: string;
  assigned_to: string;
  status: string;
  bant_budget: string;
  bant_authority: boolean;
  bant_need: string;
  bant_timeline: string;
  qualification_notes: string;
};

// ─── Score Calculation ────────────────────────────────────────────────────────

function calcScore(data: FormData): number {
  let score = 0;
  const budget = parseFloat(data.bant_budget) || 0;
  if (budget >= 50000)      score += 30;
  else if (budget >= 20000) score += 20;
  else if (budget >= 10000) score += 10;
  if (data.bant_authority) score += 20;
  if (data.bant_need === "high")   score += 25;
  else if (data.bant_need === "medium") score += 15;
  else if (data.bant_need === "low")    score += 5;
  if (data.bant_timeline) {
    const days = Math.ceil((new Date(data.bant_timeline).getTime() - Date.now()) / 86400000);
    if (days <= 30)      score += 15;
    else if (days <= 60) score += 10;
    else if (days <= 90) score += 5;
  }
  return Math.min(score, 100);
}

function scoreColor(s: number) {
  if (s >= 71) return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (s >= 41) return { bar: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" };
  return               { bar: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",     border: "border-red-200" };
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-in ${
      type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
    }`}>
      {type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  );
}

// ─── Form Section ─────────────────────────────────────────────────────────────

function FormSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

function Field({
  label, required, children, fullWidth, hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
  hint?: string;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddLeadPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormData>({
    contact_name: "",
    company_name: "",
    email: "",
    phone: "",
    job_title: "",
    bu: "",
    lead_source: "manual",
    assigned_to: "",
    status: "new",
    bant_budget: "",
    bant_authority: false,
    bant_need: "medium",
    bant_timeline: "",
    qualification_notes: "",
  });

  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: "" }));
  }, []);

  const estimatedScore = calcScore(form);
  const scoreClr = scoreColor(estimatedScore);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.contact_name.trim()) errs.contact_name = "Nome obrigatório";
    if (!form.company_name.trim()) errs.company_name = "Empresa obrigatória";
    if (!form.bu) errs.bu = "BU obrigatória";
    if (!form.assigned_to) errs.assigned_to = "Responsável obrigatório";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        action: "create",
        contact_name: form.contact_name,
        company_name: form.company_name,
        email: form.email || null,
        phone: form.phone || null,
        job_title: form.job_title || null,
        bu: form.bu,
        lead_source: form.lead_source,
        assigned_to: form.assigned_to,
        status: form.status,
        lead_score: estimatedScore,
        bant_budget: form.bant_budget ? parseFloat(form.bant_budget) : null,
        bant_authority: form.bant_authority,
        bant_need: form.bant_need || null,
        bant_timeline: form.bant_timeline || null,
        qualification_notes: form.qualification_notes || null,
      };

      let saved = false;
      let apiError: string | null = null;

      try {
        const res = await fetch("/api/crm/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const json = await res.json();
          if (json.success) {
            saved = true;
          } else if (res.status >= 400 && res.status < 500) {
            // Validation error (400) — show to user
            apiError = json.error ?? json.message ?? "Erro ao criar lead";
          }
          // 5xx (DB unavailable etc.) — fall through to localStorage
        }
        // Non-JSON (HTML 404 in static export) — fall through to localStorage
      } catch {
        // Network error — fall through to localStorage
      }

      if (apiError) throw new Error(apiError);

      if (!saved) {
        // API unavailable (static export): persist lead locally
        const now = new Date().toISOString();
        const localLead = {
          lead_id: `local-${Date.now()}`,
          lead_source: payload.lead_source,
          company_name: payload.company_name,
          contact_name: payload.contact_name,
          email: payload.email,
          phone: payload.phone,
          job_title: payload.job_title,
          bu: payload.bu,
          lead_score: payload.lead_score,
          status: payload.status,
          qualification_notes: payload.qualification_notes,
          bant_budget: payload.bant_budget,
          bant_authority: payload.bant_authority,
          bant_need: payload.bant_need,
          bant_timeline: payload.bant_timeline,
          assigned_to: payload.assigned_to,
          converted_to_opportunity_id: null,
          converted_at: null,
          created_at: now,
          updated_at: now,
          created_by: payload.assigned_to,
        };
        const existing = JSON.parse(localStorage.getItem("awq_local_leads") ?? "[]");
        localStorage.setItem("awq_local_leads", JSON.stringify([localLead, ...existing]));
      }

      setToast({ message: "Lead criado com sucesso!", type: "success" });
      setTimeout(() => router.push("/crm/leads"), 1500);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Erro ao criar lead", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header title="Novo Lead" subtitle="Cadastrar novo prospect" />
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="page-container">
        <form onSubmit={handleSubmit} noValidate>

          {/* Back button */}
          <button
            type="button"
            onClick={() => router.push("/crm/leads")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2"
          >
            <ChevronLeft size={14} />
            Voltar para Leads
          </button>

          {/* Score preview */}
          <div className={`card p-4 border ${scoreClr.border} ${scoreClr.bg}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap size={15} className={scoreClr.text} />
                <span className={`text-sm font-semibold ${scoreClr.text}`}>Score estimado: {estimatedScore}/100</span>
              </div>
              <div className="flex-1 max-w-xs h-2 bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${scoreClr.bar} transition-all duration-500`}
                  style={{ width: `${estimatedScore}%` }}
                />
              </div>
              <span className="text-[11px] text-gray-500">
                {estimatedScore >= 71 ? "Lead quente" : estimatedScore >= 41 ? "Lead morno" : "Lead frio"}
              </span>
            </div>
          </div>

          {/* Section 1: Dados do Lead */}
          <FormSection icon={<User size={15} />} title="Dados do Lead">
            <Field label="Nome completo" required>
              <input
                type="text"
                className={`${inputCls} ${errors.contact_name ? "border-red-400 focus:border-red-400 focus:ring-red-500/20" : ""}`}
                placeholder="Rafael Moura"
                value={form.contact_name}
                onChange={e => set("contact_name", e.target.value)}
              />
              {errors.contact_name && <p className="text-[11px] text-red-600 mt-1">{errors.contact_name}</p>}
            </Field>
            <Field label="Empresa" required>
              <input
                type="text"
                className={`${inputCls} ${errors.company_name ? "border-red-400 focus:border-red-400 focus:ring-red-500/20" : ""}`}
                placeholder="Tech Solutions BR"
                value={form.company_name}
                onChange={e => set("company_name", e.target.value)}
              />
              {errors.company_name && <p className="text-[11px] text-red-600 mt-1">{errors.company_name}</p>}
            </Field>
            <Field label="E-mail">
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  className={`${inputCls} pl-9`}
                  placeholder="rafael@empresa.com.br"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                />
              </div>
            </Field>
            <Field label="Telefone">
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="tel"
                  className={`${inputCls} pl-9`}
                  placeholder="11 99999-0000"
                  value={form.phone}
                  onChange={e => set("phone", e.target.value)}
                />
              </div>
            </Field>
            <Field label="Cargo" fullWidth>
              <div className="relative">
                <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  className={`${inputCls} pl-9`}
                  placeholder="CEO, CMO, Diretor de Marketing…"
                  value={form.job_title}
                  onChange={e => set("job_title", e.target.value)}
                />
              </div>
            </Field>
          </FormSection>

          {/* Section 2: Qualificação */}
          <FormSection icon={<Building2 size={15} />} title="Qualificação">
            <Field label="BU (Unidade de Negócio)" required>
              <select
                className={`${selectCls} ${errors.bu ? "border-red-400 focus:border-red-400 focus:ring-red-500/20" : ""}`}
                value={form.bu}
                onChange={e => set("bu", e.target.value)}
              >
                <option value="">Selecionar BU…</option>
                <option value="JACQES">JACQES</option>
                <option value="CAZA">CAZA</option>
                <option value="ADVISOR">ADVISOR</option>
                <option value="VENTURE">VENTURE</option>
              </select>
              {errors.bu && <p className="text-[11px] text-red-600 mt-1">{errors.bu}</p>}
            </Field>
            <Field label="Fonte do Lead">
              <select className={selectCls} value={form.lead_source} onChange={e => set("lead_source", e.target.value)}>
                <option value="manual">Manual</option>
                <option value="inbound">Inbound</option>
                <option value="referral">Referral / Indicação</option>
                <option value="organic">Orgânico</option>
                <option value="paid">Pago</option>
                <option value="outbound">Outbound</option>
                <option value="event">Evento</option>
              </select>
            </Field>
            <Field label="Responsável" required>
              <select
                className={`${selectCls} ${errors.assigned_to ? "border-red-400 focus:border-red-400 focus:ring-red-500/20" : ""}`}
                value={form.assigned_to}
                onChange={e => set("assigned_to", e.target.value)}
              >
                <option value="">Selecionar responsável…</option>
                <option value="Miguel">Miguel</option>
                <option value="Danilo">Danilo</option>
              </select>
              {errors.assigned_to && <p className="text-[11px] text-red-600 mt-1">{errors.assigned_to}</p>}
            </Field>
            <Field label="Status inicial">
              <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="new">Novo</option>
                <option value="contacted">Contato feito</option>
                <option value="qualified">Qualificado</option>
              </select>
            </Field>
          </FormSection>

          {/* Section 3: BANT */}
          <FormSection icon={<DollarSign size={15} />} title="BANT">
            <Field label="Budget (Orçamento estimado)" hint="30pts ≥R$50K · 20pts ≥R$20K · 10pts ≥R$10K">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">R$</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className={`${inputCls} pl-9`}
                  placeholder="25000"
                  value={form.bant_budget}
                  onChange={e => set("bant_budget", e.target.value)}
                />
              </div>
            </Field>
            <Field label="Need (Necessidade)" hint="25pts Alta · 15pts Média · 5pts Baixa">
              <select className={selectCls} value={form.bant_need} onChange={e => set("bant_need", e.target.value)}>
                <option value="">Selecionar…</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </Field>
            <Field label="Timeline (Prazo de decisão)" hint="15pts ≤30d · 10pts ≤60d · 5pts ≤90d">
              <div className="relative">
                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  className={`${inputCls} pl-9`}
                  value={form.bant_timeline}
                  onChange={e => set("bant_timeline", e.target.value)}
                />
              </div>
            </Field>
            <Field label="Authority (É o decisor?)" hint="20pts se sim">
              <label className="flex items-center gap-3 mt-1 cursor-pointer">
                <div
                  onClick={() => set("bant_authority", !form.bant_authority)}
                  className={`w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer ${form.bant_authority ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.bant_authority ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <span className={`text-sm font-medium ${form.bant_authority ? "text-blue-700" : "text-gray-600"}`}>
                  {form.bant_authority ? "Sim, é o decisor" : "Não é o decisor principal"}
                </span>
              </label>
            </Field>
          </FormSection>

          {/* Section 4: Notas */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gray-400"><FileText size={15} /></span>
              <h2 className="text-sm font-semibold text-gray-900">Notas de Qualificação</h2>
            </div>
            <textarea
              rows={4}
              className={`${inputCls} resize-none`}
              placeholder="Descreva o contexto do lead, dores identificadas, próximos passos…"
              value={form.qualification_notes}
              onChange={e => set("qualification_notes", e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/crm/leads")}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Salvando…
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Criar Lead
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </>
  );
}
