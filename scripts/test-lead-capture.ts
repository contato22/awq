/**
 * Formulário público /leads/capture: query, validação, stub e o matcher.
 * Não fala com banco nem com a rede.
 *
 * Uso: npx tsx scripts/test-lead-capture.ts
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(pathToFileURL(resolve("scripts/test-lead-capture.ts")));
const pathToRegexp = require("next/dist/compiled/path-to-regexp") as {
  parse: (path: string) => unknown[];
  tokensToRegexp: (tokens: unknown[]) => RegExp;
};
import {
  LEAD_CAPTURE_BUS,
  LEAD_CAPTURE_UNAVAILABLE_MESSAGE,
  leadCaptureSubmitter,
  readLeadCaptureQuery,
  sanitizeUtm,
  validateLeadCaptureDraft,
  type LeadCaptureBu,
  type LeadCaptureDraft,
} from "../lib/lead-capture";

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
check("telefone com letra", !!validateLeadCaptureDraft(base({ phone: "abc12345" })).phone);
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

console.log("\n── matcher ──");
const middlewareSrc = readFileSync(resolve("middleware.ts"), "utf8");
const literal = middlewareSrc.match(/matcher:\s*\[\s*("(?:\\.|[^"\\])*")/);
if (!literal) {
  check("matcher literal encontrado", false);
} else {
  const matcher: string = JSON.parse(literal[1]);
  const inner = matcher.slice("/((?!".length, -").*)".length);
  const parts = inner
    .replaceAll("(?:/|$)", "\u0000")
    .split("|")
    .map((part) => part.replaceAll("\u0000", "(?:/|$)"));

  const previous = [
    "login",
    "patricia-canto",
    "api/patricia-canto",
    "api/auth",
    "api/health",
    "api/debug/version",
    "api/cora/audit-probe",
    "api/cora/sync-probe",
    "api/cora/cron-sync",
    "api/enrd/montagem/cron-sync",
    "api/live-shop/webhook",
    "api/live-shop/cron",
    "api/office/head/tick",
    "api/setup/seed-santander-extracts",
    "api/setup/seed-btg-extract-jun2026",
    "api/setup/seed-itau-extract-jun2026",
    "api/setup/backfill-snapshots",
    "api/enrd/debug-saldo",
    "_next/static",
    "_next/image",
    "favicon\\.ico",
  ];
  const added = ["leads/capture(?:/|$)", "api/public(?:/|$)"];
  const expected = new Set([...previous, ...added]);
  check("só entram /leads/capture e /api/public/*", parts.length === expected.size && parts.every((part) => expected.has(part)), parts.join(","));
  check("prefixos antigos continuam isentos", previous.every((part) => parts.includes(part)));

  // Next envolve o matcher e compila com path-to-regexp (âncora no pathname).
  const wrapped = `/:nextData(_next/data/[^/]{1,})?${matcher}(.json)?`;
  const re = pathToRegexp.tokensToRegexp(pathToRegexp.parse(wrapped));
  const isPublic = (path: string) => !re.test(path);
  const publicPaths = [
    "/login",
    "/leads/capture",
    "/leads/capture/",
    "/leads/capture/extra",
    "/api/public",
    "/api/public/leads/capture",
    "/patricia-canto",
    "/api/auth/csrf",
    "/api/health",
    "/favicon.ico",
  ];
  const protectedPaths = [
    "/",
    "/awq",
    "/crm/leads",
    "/leads",
    "/leads/captured",
    "/leads/capture-admin",
    "/api/crm/leads",
    "/api/erp/health",
    "/api/publicity",
    "/api/public-leads",
    "/jacqes",
  ];
  for (const path of publicPaths) check(`público ${path}`, isPublic(path));
  for (const path of protectedPaths) check(`protegido ${path}`, !isPublic(path));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
}

main();
