"use client";

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  User, Building2, Mail, Phone, Briefcase,
  MessageSquare, CheckCircle2, AlertCircle, Send,
  Zap, ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BU = "JACQES" | "CAZA" | "ADVISOR" | "VENTURE";

const BU_CONFIG: Record<BU, { name: string; tagline: string; color: string; bg: string; accent: string }> = {
  JACQES: {
    name: "JACQES",
    tagline: "Social Media & Content Strategy",
    color: "text-blue-700",
    bg: "from-blue-600 to-blue-800",
    accent: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
  },
  CAZA: {
    name: "Caza Vision",
    tagline: "Produção Audiovisual & Conteúdo Premium",
    color: "text-violet-700",
    bg: "from-violet-600 to-purple-800",
    accent: "bg-violet-600 hover:bg-violet-700 focus:ring-violet-500",
  },
  ADVISOR: {
    name: "AWQ Advisor",
    tagline: "Consultoria Estratégica de Marketing",
    color: "text-emerald-700",
    bg: "from-emerald-600 to-teal-800",
    accent: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500",
  },
  VENTURE: {
    name: "AWQ Venture",
    tagline: "Inovação & Investimentos em Startups",
    color: "text-amber-700",
    bg: "from-amber-500 to-orange-700",
    accent: "bg-amber-500 hover:bg-amber-600 focus:ring-amber-400",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = [
  "w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900",
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400",
  "transition-colors shadow-sm",
].join(" ");

function Field({ icon, label, required, children }: {
  icon: React.ReactNode; label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</span>
        {children}
      </div>
    </div>
  );
}

// ─── States ───────────────────────────────────────────────────────────────────

function SuccessState({ buCfg }: { buCfg: typeof BU_CONFIG[BU] }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 size={32} className="text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Mensagem recebida!</h2>
      <p className="text-sm text-gray-500 max-w-xs mx-auto">
        Nossa equipe de {buCfg.name} vai entrar em contato em até{" "}
        <strong className="text-gray-700">1 dia útil</strong>.
      </p>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function CaptureFormInner() {
  const searchParams = useSearchParams();

  const buParam = (searchParams?.get("bu")?.toUpperCase() ?? "JACQES") as BU;
  const bu: BU = buParam in BU_CONFIG ? buParam : "JACQES";
  const utm_source   = searchParams?.get("utm_source") ?? "";
  const utm_medium   = searchParams?.get("utm_medium") ?? "";
  const utm_campaign = searchParams?.get("utm_campaign") ?? "";

  const buCfg = BU_CONFIG[bu];

  const [form, setForm] = useState({
    contact_name: "",
    company_name: "",
    email: "",
    phone: "",
    job_title: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  function set(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: "" }));
    setServerError("");
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.contact_name.trim()) errs.contact_name = "Nome obrigatório";
    if (!form.company_name.trim()) errs.company_name = "Empresa obrigatória";
    if (!form.email.trim()) errs.email = "E-mail obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "E-mail inválido";
    setErrors(errs);
    return !Object.keys(errs).length;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, bu, utm_source, utm_medium, utm_campaign }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
      } else {
        setServerError(json.error ?? "Erro ao enviar. Tente novamente.");
      }
    } catch {
      setServerError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Hero bar */}
      <div className={`bg-gradient-to-r ${buCfg.bg} py-10 px-6 text-white text-center`}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap size={20} className="opacity-80" />
            <span className="text-xs font-semibold uppercase tracking-widest opacity-75">AWQ Group</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">{buCfg.name}</h1>
          <p className="text-sm opacity-80">{buCfg.tagline}</p>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

          {submitted ? (
            <SuccessState buCfg={buCfg} />
          ) : (
            <>
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">Fale com a gente</h2>
                <p className="text-xs text-gray-500 mt-0.5">Preencha o formulário e entraremos em contato rapidamente.</p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field icon={<User size={14} />} label="Nome completo" required>
                    <input
                      type="text"
                      className={`${inputCls} ${errors.contact_name ? "border-red-400 focus:ring-red-400/25" : ""}`}
                      placeholder="Rafael Moura"
                      value={form.contact_name}
                      onChange={e => set("contact_name", e.target.value)}
                      autoComplete="name"
                    />
                    {errors.contact_name && <p className="text-[11px] text-red-600 mt-1">{errors.contact_name}</p>}
                  </Field>

                  <Field icon={<Building2 size={14} />} label="Empresa" required>
                    <input
                      type="text"
                      className={`${inputCls} ${errors.company_name ? "border-red-400 focus:ring-red-400/25" : ""}`}
                      placeholder="Minha Empresa"
                      value={form.company_name}
                      onChange={e => set("company_name", e.target.value)}
                      autoComplete="organization"
                    />
                    {errors.company_name && <p className="text-[11px] text-red-600 mt-1">{errors.company_name}</p>}
                  </Field>
                </div>

                <Field icon={<Mail size={14} />} label="E-mail" required>
                  <input
                    type="email"
                    className={`${inputCls} ${errors.email ? "border-red-400 focus:ring-red-400/25" : ""}`}
                    placeholder="rafael@empresa.com.br"
                    value={form.email}
                    onChange={e => set("email", e.target.value)}
                    autoComplete="email"
                  />
                  {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field icon={<Phone size={14} />} label="Telefone / WhatsApp">
                    <input
                      type="tel"
                      className={inputCls}
                      placeholder="11 99999-0000"
                      value={form.phone}
                      onChange={e => set("phone", e.target.value)}
                      autoComplete="tel"
                    />
                  </Field>

                  <Field icon={<Briefcase size={14} />} label="Cargo">
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="CEO, CMO, Gerente…"
                      value={form.job_title}
                      onChange={e => set("job_title", e.target.value)}
                    />
                  </Field>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-gray-400" />
                      Como podemos ajudar?
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-colors shadow-sm resize-none"
                    placeholder="Conte brevemente sobre o seu projeto ou necessidade…"
                    value={form.message}
                    onChange={e => set("message", e.target.value)}
                  />
                </div>

                {serverError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                    <AlertCircle size={13} />
                    {serverError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${buCfg.accent}`}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Enviar mensagem
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-gray-400">
                  Suas informações são confidenciais e não serão compartilhadas com terceiros.
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      <footer className="text-center text-[10px] text-gray-400 py-4">
        © {new Date().getFullYear()} AWQ Group · Todos os direitos reservados
      </footer>
    </div>
  );
}

export default function LeadCapturePage() {
  return (
    <Suspense>
      <CaptureFormInner />
    </Suspense>
  );
}
