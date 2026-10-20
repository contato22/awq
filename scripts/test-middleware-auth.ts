/**
 * Decisão única de rota pública (lib/public-routes.ts) no path cru,
 * e headers de identidade. Não fala com banco, rede nem produção.
 *
 * O matcher só tira _next/static, _next/image e favicon.ico do middleware.
 * Quem é público é isPublicRoute. Um path com %, \, //, ".." ou segmento "."
 * nunca é público — Next roteia o path cru, e canonicalizar antes da decisão
 * entregava /login ao handler de [id].
 *
 * Uso: npx tsx scripts/test-middleware-auth.ts
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { authPathname, identityRequestHeaders, isLegitNextAuthPath } from "../lib/middleware-request";
import { isLegacyPublicPath, isPublicRoute } from "../lib/public-routes";

const require = createRequire(pathToFileURL(resolve("scripts/test-middleware-auth.ts")));
const pathToRegexp = require("next/dist/compiled/path-to-regexp") as {
  parse: (path: string) => unknown[];
  tokensToRegexp: (tokens: unknown[]) => RegExp;
};

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

function compileMatcher(matcher: string): RegExp {
  const wrapped = `/:nextData(_next/data/[^/]{1,})?${matcher}(.json)?`;
  const source = pathToRegexp.tokensToRegexp(pathToRegexp.parse(wrapped)).source;
  return new RegExp(source);
}

if (isPublicRoute("/loginX")) {
  console.error("FAIL isPublicRoute('/loginX') is true — prefixo público reaberto");
  process.exit(1);
}

const middlewareSrc = readFileSync(resolve("middleware.ts"), "utf8");
const literal = middlewareSrc.match(/matcher:\s*\[\s*(?:\/\/[^\n]*\n\s*)*("(?:\\.|[^"\\])*")/);
if (!literal) {
  console.error("matcher literal não encontrado");
  process.exit(1);
}
const matcher: string = JSON.parse(literal[1]);
const middlewareRuns = (path: string) => compileMatcher(matcher).test(path);

console.log("\n── matcher só isenta asset, a decisão pública é isPublicRoute ──");
check("loginX não é rota pública", isPublicRoute("/loginX") === false);
check("loginX não é legado público", isLegacyPublicPath("/loginX") === false);
check("matcher não lista login", !matcher.includes("login"));
check("matcher não lista api/health", !matcher.includes("api/health"));
check("matcher não lista patricia-canto", !matcher.includes("patricia-canto"));
check("matcher não lista api/debug/version", !matcher.includes("api/debug/version"));
check("matcher não lista api/public", !matcher.includes("api/public"));
check("matcher não lista cron/webhook", !matcher.includes("api/live-shop/webhook") && !matcher.includes("api/office/head/tick"));
check("asset _next/static e _next/image com fronteira", matcher.includes("_next/static(?:/|$)") && matcher.includes("_next/image(?:/|$)"));
check("/loginX entra no middleware", middlewareRuns("/loginX"));
check("/_next/static/chunks/main.js fica fora", !middlewareRuns("/_next/static/chunks/main.js"));
check("/_next/image fica fora", !middlewareRuns("/_next/image"));
check("/_next/staticX entra no middleware", middlewareRuns("/_next/staticX"));
check("/_next/webpack-hmr entra no middleware", middlewareRuns("/_next/webpack-hmr"));
check("/favicon.ico fica fora", !middlewareRuns("/favicon.ico"));
const middlewareCode = middlewareSrc
  .split("\n")
  .filter((line) => !line.trim().startsWith("//"))
  .join("\n");
check(
  "um único NextResponse.next, com identity headers",
  (middlewareCode.match(/NextResponse\.next\(/g) ?? []).length === 1 && middlewareCode.includes("identityRequestHeaders"),
);
check("allow-list enxerga o path canônico", middlewareSrc.includes("const pathname = authPathname(req.nextUrl.pathname)") && middlewareSrc.includes("re.test(pathname)"));
check("withAuth não libera qualquer /_next", middlewareSrc.includes('pathname.startsWith("/_next") && !isNextAssetPath(pathname)'));
check(
  "webpack-hmr só em development",
  middlewareSrc.includes('process.env.NODE_ENV === "development"') && middlewareSrc.includes('"/_next/webpack-hmr"'),
);

console.log("\n── rotas públicas legítimas (path cru) ──");
for (const path of [
  "/login",
  "/login/",
  "/leads/capture",
  "/leads/capture/",
  "/api/auth",
  "/api/auth/",
  "/api/auth/csrf",
  "/api/auth/signin",
  "/api/auth/signout",
  "/api/auth/session",
  "/api/auth/providers",
  "/api/auth/error",
  "/api/auth/_log",
  "/api/auth/callback/credentials",
  "/api/health",
  "/api/health/",
  "/patricia-canto",
  "/patricia-canto/",
  "/patricia-canto/login",
  "/api/patricia-canto",
  "/api/patricia-canto/",
  "/api/patricia-canto/auth/login",
  "/api/cora/audit-probe",
  "/api/cora/sync-probe",
  "/api/cora/cron-sync",
  "/api/cora/cron-sync/",
  "/api/enrd/montagem/cron-sync",
  "/api/live-shop/webhook",
  "/api/live-shop/webhook/",
  "/api/live-shop/cron",
  "/api/office/head/tick",
  "/api/setup/seed-santander-extracts",
  "/api/setup/seed-btg-extract-jun2026",
  "/api/setup/seed-itau-extract-jun2026",
  "/api/setup/backfill-snapshots",
  "/api/setup/backfill-snapshots/",
  "/api/enrd/debug-saldo",
]) {
  check(`público ${path}`, isPublicRoute(path));
}

console.log("\n── não podem escapar do auth ──");
for (const path of [
  "/loginX",
  "/loginfoo",
  "/login/extra",
  "/LOGIN",
  "/Login",
  "/api/healthcheck",
  "/api/healthcare",
  "/api/health/extra",
  "/API/HEALTH",
  "/api/HEALTH",
  "/Api/Health",
  "/API/AUTH/csrf",
  "/api/AUTH/csrf",
  "/api/authentication",
  "/api/health/%2e%2e/erp/health",
  "/api/health/%2E%2E/%2E%2E/awq",
  "/login/%2e%2e/awq",
  "/api/auth/%2e%2e/%2e%2e/api/erp/health",
  "/api/auth/..%2Ferp/health",
  "/login/..%2Fawq",
  "/api/auth/..%2f..%2fapi/erp/health",
  "//login",
  "//api/health",
  "/api//health",
  "//api/healthcheck",
  "//api/erp/health",
  "///api/erp/health",
  "//API/health",
  "/api/auth//csrf",
  "/api/auth/csrf/../../../api/erp/health",
  "/x/../login",
  "/api/./health",
  "/api/crm/..%2F..%2Flogin",
  "/api/caza/clients/x%2F..%2F..%2F..%2F..%2Flogin",
  "/api/ppm/projects/x%2F..%2F..%2F..%2F..%2Fapi%2Fhealth",
  "/api/erp/health",
  "/patricia-cantoX",
  "/api/patricia-cantoX",
  "/patricia-canto/%2e%2e/awq",
  "/api/cora/cron-syncX",
  "/api/cora/cron-sync/extra",
  "/api/cora/audit-probeX",
  "/api/cora/sync-probeX",
  "/api/live-shop/webhookX",
  "/api/live-shop/cronX",
  "/api/office/head/tickX",
  "/api/setup/backfill-snapshotsX",
  "/api/setup/seed-santander-extractsX",
  "/api/setup/seed-btg-extract-jun2026X",
  "/api/setup/seed-itau-extract-jun2026X",
  "/api/enrd/debug-saldoX",
  "/api/enrd/montagem/cron-syncX",
  "/api/debug/version",
  "/leads/capture/extra",
  "/leads/captureX",
  "/LEADS/CAPTURE",
  "/api/public",
  "/api/public/leads/capture",
  "/_next/webpack-hmr",
]) {
  check(`protegido ${path}`, isPublicRoute(path) === false && isLegacyPublicPath(path) === false);
}

console.log("\n── nextauth legítimo (atalho do withAuth) ──");
for (const path of ["/api/auth", "/api/auth/", "/api/auth/csrf", "/api/auth/callback/credentials", "/api/auth/_log"]) {
  check(`legit ${path}`, isLegitNextAuthPath(path));
}
for (const path of [
  "/api/auth/..%2Ferp/health",
  "/api/auth/../erp/health",
  "/api/auth/%2e%2e/x",
  "/api/authentication",
  "/API/AUTH/csrf",
  "/api/auth//csrf",
]) {
  check(`não é nextauth ${path}`, !isLegitNextAuthPath(path));
}

console.log("\n── path canônico só para allow-list, não para público ──");
check("path comum intacto", authPathname("/awq/financial") === "/awq/financial");
check("caixa preservada", authPathname("/API/HEALTH") === "/API/HEALTH");
check("%2e%2e", authPathname("/api/health/%2e%2e/erp/health") === "/api/erp/health");
check("%252e dupla codificação", authPathname("/api/health/%252e%252e/erp/health") === "/api/erp/health");
check("..%2F", authPathname("/login/..%2Fawq") === "/awq");
check("traversal no allow-list", authPathname("/api/jacqes/../../api/setup/migrate") === "/api/setup/migrate");
check(
  "canonical de [id] não promove a público",
  authPathname("/api/caza/clients/x%2F..%2F..%2F..%2F..%2Flogin") === "/login" &&
    isPublicRoute("/api/caza/clients/x%2F..%2F..%2F..%2F..%2Flogin") === false,
);
check(
  "canonical de health não promove a público",
  authPathname("/api/ppm/projects/x%2F..%2F..%2F..%2F..%2Fapi%2Fhealth") === "/api/health" &&
    isPublicRoute("/api/ppm/projects/x%2F..%2F..%2F..%2F..%2Fapi%2Fhealth") === false,
);

console.log("\n── headers de identidade ──");
{
  const incoming = new Headers();
  incoming.set("X-User-Email", "attacker@evil");
  incoming.set("X-User-Role", "owner");
  incoming.set("X-Bu-Lock", "AWQ");
  incoming.set("accept", "application/json");
  const next = identityRequestHeaders(incoming, { email: "ana@awq.example", role: "jacqes" }, { jacqes: "JACQES" });
  check("e-mail vem do token", next.get("x-user-email") === "ana@awq.example");
  check("role vem do token", next.get("x-user-role") === "jacqes");
  check("bu-lock vem do mapa da role", next.get("x-bu-lock") === "JACQES");
  check("header comum permanece", next.get("accept") === "application/json");
}
{
  const incoming = new Headers({ "x-user-role": "owner", "x-bu-lock": "ENRD", "x-user-email": "attacker@evil" });
  const next = identityRequestHeaders(incoming, { role: "analyst" }, { jacqes: "JACQES" });
  check("role sem bu-lock apaga x-bu-lock", next.get("x-bu-lock") === null);
  check("e-mail ausente no token não herda o do cliente", next.get("x-user-email") === null);
  check("role do token substitui a forjada", next.get("x-user-role") === "analyst");
}
{
  const incoming = new Headers({ "x-user-email": "a", "x-user-role": "owner", "x-bu-lock": "X" });
  const next = identityRequestHeaders(incoming, null, {});
  check("sem token não sobra identidade", next.get("x-user-email") === null && next.get("x-user-role") === null && next.get("x-bu-lock") === null);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
