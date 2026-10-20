"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Mail,
  MessageSquare,
  Phone,
  Send,
  User,
  Zap,
} from "lucide-react";
import {
  LEAD_CAPTURE_CONTACT_EMAIL,
  leadCaptureSubmitter,
  readLeadCaptureQuery,
  validateLeadCaptureDraft,
  type LeadCaptureBu,
  type LeadCaptureDraft,
  type LeadCaptureField,
  type LeadCaptureUtm,
} from "@/lib/lead-capture";

const BU_CONFIG: Record<
  LeadCaptureBu,
  { name: string; tagline: string; bg: string; accent: string; field: string }
> = {
  JACQES: {
    name: "JACQES",
    tagline: "Social Media & Content Strategy",
    bg: "from-blue-600 to-blue-800",
    accent: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-600",
    field: "focus:border-blue-600 focus:ring-blue-600/30",
  },
  CAZA: {
    name: "Caza Vision",
    tagline: "Produção Audiovisual & Conteúdo Premium",
    bg: "from-violet-600 to-purple-800",
    accent: "bg-violet-600 hover:bg-violet-700 focus:ring-violet-600",
    field: "focus:border-violet-600 focus:ring-violet-600/30",
  },
  ADVISOR: {
    name: "AWQ Advisor",
    tagline: "Consultoria Estratégica de Marketing",
    bg: "from-emerald-600 to-teal-800",
    accent: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600",
    field: "focus:border-emerald-600 focus:ring-emerald-600/30",
  },
  VENTURE: {
    name: "AWQ Venture",
    tagline: "Inovação & Investimentos em Startups",
    bg: "from-amber-700 to-orange-800",
    accent: "bg-amber-700 hover:bg-amber-800 focus:ring-amber-700",
    field: "focus:border-amber-700 focus:ring-amber-700/30",
  },
};

const inputCls = [
  "w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-base text-gray-900 shadow-sm sm:text-sm",
  "placeholder:text-gray-400 focus:outline-none focus:ring-2",
].join(" ");

const FIELD_LIMITS: Partial<Record<LeadCaptureField, number>> = {
  contact_name: 120,
  company_name: 160,
  email: 200,
  phone: 40,
  job_title: 120,
  message: 2000,
};

type FormState = {
  contact_name: string;
  company_name: string;
  email: string;
  phone: string;
  job_title: string;
  message: string;
};

const EMPTY_FORM: FormState = {
  contact_name: "",
  company_name: "",
  email: "",
  phone: "",
  job_title: "",
  message: "",
};

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 flex items-start gap-1 text-xs text-red-700">
      <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function Field({
  id,
  icon,
  label,
  required,
  error,
  children,
}: {
  id: string;
  icon: ReactNode;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-gray-700">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        {children}
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

function SuccessState({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div ref={ref} tabIndex={-1} role="status" className="px-6 py-12 text-center outline-none">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 size={32} className="text-emerald-600" aria-hidden="true" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">Mensagem recebida!</h2>
      <p className="mx-auto max-w-xs text-sm text-gray-600">
        Nossa equipe de {name} vai entrar em contato em até{" "}
        <strong className="text-gray-700">1 dia útil</strong>.
      </p>
    </div>
  );
}

export function LeadCaptureForm() {
  const searchParams = useSearchParams();
  const formId = useId();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<LeadCaptureField, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const { bu, utm } = readLeadCaptureQuery({
    get: (name) => searchParams?.get(name) ?? null,
  });
  const buCfg = BU_CONFIG[bu];
  const mailto = `mailto:${LEAD_CAPTURE_CONTACT_EMAIL}`;

  function setField(key: keyof FormState, value: string) {
    const limit = FIELD_LIMITS[key];
    const next = limit ? value.slice(0, limit) : value;
    setForm((prev) => ({ ...prev, [key]: next }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError("");
  }

  function draftFrom(state: FormState, brand: LeadCaptureBu, tracking: LeadCaptureUtm): LeadCaptureDraft {
    return { ...state, bu: brand, ...tracking, marketing_opt_in: marketingOptIn };
  }

  function blurField(key: keyof FormState) {
    const message = validateLeadCaptureDraft(draftFrom(form, bu, utm))[key];
    setErrors((prev) => ({ ...prev, [key]: message }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = draftFrom(form, bu, utm);
    const fieldErrors = validateLeadCaptureDraft(draft);
    setErrors(fieldErrors);
    setFormError("");
    if (Object.keys(fieldErrors).length > 0) {
      const first = Object.keys(fieldErrors)[0];
      document.getElementById(`${formId}-${first}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      // O stub resolve no mesmo turno. Sem este intervalo o aria-live
      // de "Enviando…" não chega a ser anunciado.
      await new Promise((resolve) => {
        window.setTimeout(resolve, 400);
      });
      const result = await leadCaptureSubmitter.submit(draft);
      if (result.ok) {
        setSubmitted(true);
        return;
      }
      if (result.fieldErrors) setErrors(result.fieldErrors);
      setFormError(result.message);
    } catch {
      setFormError("Não conseguimos registrar seu contato agora. Tente novamente mais tarde.");
    } finally {
      setSubmitting(false);
    }
  }

  const field = (key: keyof FormState) => {
    const id = `${formId}-${key}`;
    const error = errors[key];
    return {
      id,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `${id}-error` : undefined,
      className: `${inputCls} ${buCfg.field} ${error ? "border-red-400" : ""}`,
      onBlur: () => blurField(key),
    };
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className={`bg-gradient-to-r ${buCfg.bg} px-6 py-10 text-center text-white`}>
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Zap size={20} className="opacity-80" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-widest opacity-75">AWQ Group</span>
          </div>
          <h1 className="mb-1 text-2xl font-bold">{buCfg.name}</h1>
          <p className="text-sm opacity-80">{buCfg.tagline}</p>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center px-4 py-8">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
          {submitted ? (
            <SuccessState name={buCfg.name} />
          ) : (
            <>
              <div className="border-b border-gray-100 px-6 pb-4 pt-6">
                <h2 className="text-base font-bold text-gray-900">Fale com a gente</h2>
                <p className="mt-1 text-xs text-gray-600">
                  <span aria-hidden="true">* </span>obrigatório
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                aria-busy={submitting}
                className="space-y-4 px-6 py-5"
              >
                <UtmFields utm={utm} />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id={`${formId}-contact_name`} icon={<User size={14} aria-hidden="true" />} label="Nome completo" required error={errors.contact_name}>
                    <input
                      {...field("contact_name")}
                      type="text"
                      name="contact_name"
                      placeholder="Nome e sobrenome"
                      value={form.contact_name}
                      onChange={(e) => setField("contact_name", e.target.value)}
                      autoComplete="name"
                      required
                    />
                  </Field>
                  <Field id={`${formId}-company_name`} icon={<Building2 size={14} aria-hidden="true" />} label="Empresa" required error={errors.company_name}>
                    <input
                      {...field("company_name")}
                      type="text"
                      name="company_name"
                      placeholder="Sua empresa"
                      value={form.company_name}
                      onChange={(e) => setField("company_name", e.target.value)}
                      autoComplete="organization"
                      required
                    />
                  </Field>
                </div>

                <Field id={`${formId}-email`} icon={<Mail size={14} aria-hidden="true" />} label="E-mail" required error={errors.email}>
                  <input
                    {...field("email")}
                    type="email"
                    name="email"
                    placeholder="voce@empresa.com"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    autoComplete="email"
                    required
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id={`${formId}-phone`} icon={<Phone size={14} aria-hidden="true" />} label="Telefone / WhatsApp" error={errors.phone}>
                    <input
                      {...field("phone")}
                      type="tel"
                      name="phone"
                      inputMode="tel"
                      placeholder="11 99999-0000"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      autoComplete="tel"
                    />
                  </Field>
                  <Field id={`${formId}-job_title`} icon={<Briefcase size={14} aria-hidden="true" />} label="Cargo" error={errors.job_title}>
                    <input
                      {...field("job_title")}
                      type="text"
                      name="job_title"
                      placeholder="Diretor, gerente…"
                      value={form.job_title}
                      onChange={(e) => setField("job_title", e.target.value)}
                      autoComplete="organization-title"
                    />
                  </Field>
                </div>

                <div>
                  <label htmlFor={`${formId}-message`} className="mb-1.5 block text-xs font-semibold text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-gray-400" aria-hidden="true" />
                      Como podemos ajudar?
                    </span>
                  </label>
                  <textarea
                    id={`${formId}-message`}
                    name="message"
                    rows={3}
                    className={`w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 sm:text-sm ${buCfg.field} ${errors.message ? "border-red-400" : ""}`}
                    placeholder="Conte brevemente sobre o seu projeto ou necessidade…"
                    value={form.message}
                    onChange={(e) => setField("message", e.target.value)}
                    onBlur={() => blurField("message")}
                    aria-invalid={errors.message ? true : undefined}
                    aria-describedby={errors.message ? `${formId}-message-error` : undefined}
                  />
                  {errors.message && (
                    <FieldError id={`${formId}-message-error`}>{errors.message}</FieldError>
                  )}
                </div>

                <label className="flex items-start gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    name="marketing_opt_in"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className={`mt-0.5 h-4 w-4 rounded border-gray-300 ${buCfg.field}`}
                  />
                  <span>Quero receber novidades e comunicações de marketing.</span>
                </label>

                {formError && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                    <p className="flex items-center gap-2">
                      <AlertCircle size={13} aria-hidden="true" />
                      {formError}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${buCfg.accent}`}
                >
                  {submitting ? (
                    <span aria-live="polite">Enviando…</span>
                  ) : (
                    <>
                      <Send size={14} aria-hidden="true" />
                      Enviar mensagem
                      <ArrowRight size={14} aria-hidden="true" />
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-600">
                  Ao enviar, você concorda com a{" "}
                  <a href="#privacidade" className="font-semibold underline">
                    Política de Privacidade
                  </a>
                  .
                </p>
                <p className="text-xs text-gray-600">
                  O envio automático ainda não grava contatos. Escreva para{" "}
                  <a href={mailto} className="font-semibold underline">
                    {LEAD_CAPTURE_CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </form>
            </>
          )}

          <section id="privacidade" className="border-t border-gray-100 px-6 py-4 text-xs text-gray-600">
            <h2 className="mb-1 text-sm font-semibold text-gray-900">Política de Privacidade</h2>
            <p>
              O formulário pede nome, empresa e e-mail. Telefone, cargo, mensagem e a opção de
              marketing são opcionais. Também lemos a marca (<span className="font-mono">bu</span>) e
              os parâmetros de campanha (UTM) do endereço. Esses dados não são gravados enquanto a
              API de escrita estiver indisponível. O contato segue por {LEAD_CAPTURE_CONTACT_EMAIL}.
              Não vendemos essas informações.
            </p>
          </section>
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-gray-600">
        © {new Date().getFullYear()} AWQ Group · Todos os direitos reservados
      </footer>
    </div>
  );
}

function UtmFields({ utm }: { utm: LeadCaptureUtm }) {
  return (
    <>
      <input type="hidden" name="utm_source" value={utm.utm_source} />
      <input type="hidden" name="utm_medium" value={utm.utm_medium} />
      <input type="hidden" name="utm_campaign" value={utm.utm_campaign} />
      <input type="hidden" name="utm_term" value={utm.utm_term} />
      <input type="hidden" name="utm_content" value={utm.utm_content} />
    </>
  );
}
