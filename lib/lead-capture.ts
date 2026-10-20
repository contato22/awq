/**
 * Porta de escrita do formulário público /leads/capture.
 *
 * A API que grava lead (Supabase) ainda não existe. `leadCaptureSubmitter`
 * é um stub: valida o rascunho e recusa o envio. Não chama rede nem banco.
 * Quando POST /api/public/leads/capture existir, troque só esta ligação.
 */

export const LEAD_CAPTURE_BUS = ["JACQES", "CAZA", "ADVISOR", "VENTURE"] as const;

export type LeadCaptureBu = (typeof LEAD_CAPTURE_BUS)[number];

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type UtmKey = (typeof UTM_KEYS)[number];

export type LeadCaptureUtm = Record<UtmKey, string>;

export type LeadCaptureDraft = {
  contact_name: string;
  company_name: string;
  email: string;
  phone: string;
  job_title: string;
  message: string;
  bu: LeadCaptureBu;
} & LeadCaptureUtm;

export type LeadCaptureField = keyof LeadCaptureDraft;

export type LeadCaptureSubmitResult =
  | { ok: true }
  | {
      ok: false;
      code: "invalid" | "unavailable";
      message: string;
      fieldErrors?: Partial<Record<LeadCaptureField, string>>;
    };

export interface LeadCaptureSubmitter {
  submit(draft: LeadCaptureDraft): Promise<LeadCaptureSubmitResult>;
}

export const LEAD_CAPTURE_UNAVAILABLE_MESSAGE =
  "Não conseguimos registrar seu contato agora. Tente novamente mais tarde.";

const UTM_MAX = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+().\-\s]{8,40}$/;

const LIMITS: Partial<Record<LeadCaptureField, number>> = {
  contact_name: 120,
  company_name: 160,
  email: 200,
  phone: 40,
  job_title: 120,
  message: 2000,
};

export type QueryReader = { get(name: string): string | null };

function stripControls(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

export function sanitizeUtm(value: string | null | undefined): string {
  if (!value) return "";
  return stripControls(value).slice(0, UTM_MAX);
}

export function readLeadCaptureQuery(query: QueryReader): {
  bu: LeadCaptureBu;
  utm: LeadCaptureUtm;
} {
  const rawBu = stripControls(query.get("bu") ?? "").toUpperCase();
  const bu = (LEAD_CAPTURE_BUS as readonly string[]).includes(rawBu)
    ? (rawBu as LeadCaptureBu)
    : "JACQES";

  const utm = {} as LeadCaptureUtm;
  for (const key of UTM_KEYS) utm[key] = sanitizeUtm(query.get(key));
  return { bu, utm };
}

export function validateLeadCaptureDraft(
  draft: LeadCaptureDraft,
): Partial<Record<LeadCaptureField, string>> {
  const errors: Partial<Record<LeadCaptureField, string>> = {};
  const name = draft.contact_name.trim();
  const company = draft.company_name.trim();
  const email = draft.email.trim();
  const phone = draft.phone.trim();

  if (!name) errors.contact_name = "Nome obrigatório";
  else if (name.length > (LIMITS.contact_name ?? 120)) errors.contact_name = "Nome longo demais";

  if (!company) errors.company_name = "Empresa obrigatória";
  else if (company.length > (LIMITS.company_name ?? 160)) errors.company_name = "Empresa longa demais";

  if (!email) errors.email = "E-mail obrigatório";
  else if (!EMAIL_RE.test(email) || email.length > (LIMITS.email ?? 200)) errors.email = "E-mail inválido";

  if (phone && !PHONE_RE.test(phone)) errors.phone = "Telefone inválido";

  if (draft.job_title.trim().length > (LIMITS.job_title ?? 120)) errors.job_title = "Cargo longo demais";
  if (draft.message.trim().length > (LIMITS.message ?? 2000)) errors.message = "Mensagem longa demais";

  if (!(LEAD_CAPTURE_BUS as readonly string[]).includes(draft.bu)) {
    errors.bu = "Marca inválida";
  }

  return errors;
}

export const leadCaptureSubmitter: LeadCaptureSubmitter = {
  async submit(draft) {
    const fieldErrors = validateLeadCaptureDraft(draft);
    if (Object.keys(fieldErrors).length > 0) {
      return {
        ok: false,
        code: "invalid",
        message: "Revise os campos destacados.",
        fieldErrors,
      };
    }
    return {
      ok: false,
      code: "unavailable",
      message: LEAD_CAPTURE_UNAVAILABLE_MESSAGE,
    };
  },
};
