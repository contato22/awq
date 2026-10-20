/**
 * Formulário público /leads/capture: query, validação, stub e o matcher.
 * Não fala com banco nem com a rede.
 *
 * Uso: npx tsx scripts/test-lead-capture.ts
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  LEAD_CAPTURE_BUS,
  LEAD_CAPTURE_UNAVAILABLE_MESSAGE,
  BR_PHONE_ERROR,
  leadCaptureSubmitter,
  readLeadCaptureQuery,
  sanitizeUtm,
  validateLeadCaptureDraft,
  type LeadCaptureBu,
  type LeadCaptureDraft,
} from "../lib/lead-capture";
import { isPublicRoute } from "../lib/public-routes";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    pass++;
    console.log("  ✓", name);
  } else {
    fail++;
    console.log("  ✗ FAIL", name, extra);
  }
}

function query(params: Record<string, string>) {
  const usp = new URLSearchParams(params);
  return { get: (name: string) => usp.get(name) };
}

const base = (over: Partial<LeadCaptureDraft> = {}): LeadCaptureDraft => ({
  contact_name: "Ana Souza",
  company_name: "Oficina Norte",
  email: "ana@oficina.example",
  phone: "",
  job_title: "",
  message: "",
  bu: "JACQES",
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
  ...over,
});

console.log("\n── query bu / UTM ──");
{
  const parsed = readLeadCaptureQuery(query({
    bu: "caza",
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "lancamento",
    utm_term: "agencia",
    utm_content: "hero",
  }));
  check("bu minúsculo vira CAZA", parsed.bu === "CAZA");
  check("utm_source", parsed.utm.utm_source === "google");
  check("utm_medium", parsed.utm.utm_medium === "cpc");
  check("utm_campaign", parsed.utm.utm_campaign === "lancamento");
  check("utm_term", parsed.utm.utm_term === "agencia");
  check("utm_content", parsed.utm.utm_content === "hero");
}
check("sem bu cai em JACQES", readLeadCaptureQuery(query({})).bu === "JACQES");
check("ENRD não é marca pública", readLeadCaptureQuery(query({ bu: "ENRD" })).bu === "JACQES");
check("bu com controle é descartado", readLeadCaptureQuery(query({ bu: "CAZA\n" })).bu === "CAZA");
for (const bu of LEAD_CAPTURE_BUS) {
  check(`aceita ${bu}`, readLeadCaptureQuery(query({ bu })).bu === bu);
}
check("utm corta controle e tamanho", sanitizeUtm("ok\u0000\n" + "x".repeat(500)).length === 200);
check("utm vazio", sanitizeUtm(null) === "");

async function main() {
console.log("\n── validação e stub ──");
check("rascunho válido não tem erro", Object.keys(validateLeadCaptureDraft(base())).length === 0);
check("nome vazio", validateLeadCaptureDraft(base({ contact_name: "  " })).contact_name === "Nome obrigatório");
check("e-mail inválido", !!validateLeadCaptureDraft(base({ email: "sem-arroba" })).email);
check("telefone com letra", validateLeadCaptureDraft(base({ phone: "abc12345" })).phone === BR_PHONE_ERROR);
check("telefone com 9 dígitos", !!validateLeadCaptureDraft(base({ phone: "119999888" })).phone);
check("telefone com 10 dígitos", !validateLeadCaptureDraft(base({ phone: "11 3333-4444" })).phone);
check("telefone com 11 dígitos", !validateLeadCaptureDraft(base({ phone: "11 99999-0000" })).phone);
check("telefone vazio passa", !validateLeadCaptureDraft(base({ phone: "" })).phone);
{
  const result = await leadCaptureSubmitter.submit(base({
    bu: "VENTURE" as LeadCaptureBu,
    utm_source: "newsletter",
  }));
  check("stub não grava", result.ok === false && result.code === "unavailable");
  check("mensagem de indisponível", !result.ok && result.message === LEAD_CAPTURE_UNAVAILABLE_MESSAGE);
}
{
  const result = await leadCaptureSubmitter.submit(base({ email: "" }));
  check("stub inválido não finge sucesso", result.ok === false && result.code === "invalid");
}
const stubSource = readFileSync(resolve("lib/lead-capture.ts"), "utf8");
check("stub não importa supabase", !/supabase|crm-db|fetch\(/.test(stubSource));

console.log("\n── rotas públicas ──");
const middlewareSrc = readFileSync(resolve("middleware.ts"), "utf8");
check("comentário cita leads/capture/?$", middlewareSrc.includes("leads/capture/?$"));
check("matcher não lista api/public", !/matcher:\s*\[[\s\S]*api\/public/.test(middlewareSrc));
check("middleware descarta x-user-email nas públicas", middlewareSrc.includes("nextWithoutIdentity"));

const publicPaths = [
  "/login",
  "/leads/capture",
  "/leads/capture/",
  "/patricia-canto",
  "/api/auth/csrf",
  "/api/health",
];
const protectedPaths = [
  "/",
  "/awq",
  "/crm/leads",
  "/leads",
  "/leads/captured",
  "/leads/capture-admin",
  "/leads/capture/extra",
  "/LEADS/CAPTURE",
  "/Leads/Capture",
  "/leads/capture/%2e%2e/api/crm/leads",
  "/leads/capture/..%2Fapi/crm/leads",
  "/leads/capture/%2e%2e%2fapi/erp/health",
  "//api/erp/health",
  "//api/crm/leads",
  "/api/crm/leads",
  "/api/erp/health",
  "/api/public",
  "/api/public/leads/capture",
  "/api/publicity",
  "/api/public-leads",
  "/jacqes",
];
for (const path of publicPaths) check(`público ${path}`, isPublicRoute(path));
for (const path of protectedPaths) check(`protegido ${path}`, !isPublicRoute(path));

const allowMention = new Set([
  "app/leads/capture/page.tsx",
  "app/leads/capture/lead-capture-form.tsx",
  "components/LayoutShell.tsx",
  "middleware.ts",
  "lib/lead-capture.ts",
  "lib/public-routes.ts",
  "e2e/smoke.spec.ts",
  "scripts/test-lead-capture.ts",
]);
const leaks: string[] = [];
function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "out" || name === ".git") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(tsx|ts|jsx|js|xml)$/.test(name)) continue;
    const rel = full.slice(resolve(".").length + 1);
    if (allowMention.has(rel)) continue;
    const text = readFileSync(full, "utf8");
    if (text.includes("/leads/capture") || text.includes("leads/capture")) leaks.push(rel);
  }
}
for (const root of ["app", "components", "lib", "public"]) {
  try { walk(resolve(root)); } catch { /* pasta ausente */ }
}
check("rota fora de links e sitemap", leaks.length === 0, leaks.join(", "));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
}

main();
