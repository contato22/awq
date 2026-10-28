// Regras de acesso por função: páginas (canAccess) e APIs (isApiAllowedForRole).
// Rode: npm run test:access
import assert from "node:assert";
import { canAccess, ROLE_ALLOWED_PREFIXES, USERS, type Role } from "../lib/auth-users";
import { isApiAllowedForRole } from "../lib/api-scope";

let n = 0;
const ok = (cond: boolean, msg: string) => { assert.ok(cond, msg); n++; };
const page = (r: Role, p: string, want: boolean) => ok(canAccess(r, p) === want, `página ${r} ${p} deveria ser ${want}`);
const api  = (r: Role, p: string, want: boolean) => ok(isApiAllowedForRole(r, p) === want, `API ${r} ${p} deveria ser ${want}`);

// Roles permissivas e owner
for (const r of ["owner", "admin", "analyst", "cs-ops"] as Role[]) {
  page(r, "/awq/epm", true); api(r, "/api/bpm/my-tasks", true); api(r, "/api/cora/sync", true);
}

// Caza: só /caza-vision e /crm; nenhuma área Holding
page("caza", "/caza-vision/estoque", true); page("caza", "/crm/leads", true);
page("caza", "/awq/epm", false); page("caza", "/jacqes", false); page("caza", "/awq/bpm", false);
api("caza", "/api/crm/leads", true); api("caza", "/api/caza/x", true);
api("caza", "/api/cora/sync", false); api("caza", "/api/epm/dre", false); api("caza", "/api/bpm/my-tasks", false);

// JACQES
page("jacqes", "/jacqes", true); page("jacqes", "/csops/x", true); page("jacqes", "/awq/ppm", true);
page("jacqes", "/awq/bpm", false); page("jacqes", "/awq/epm", false); page("jacqes", "/caza-vision", false);
api("jacqes", "/api/jacqes/x", true); api("jacqes", "/api/cora/sync", true);
api("jacqes", "/api/cora/debug", false); api("jacqes", "/api/epm/dre", false); api("jacqes", "/api/erp/assets/post-to-gl", false); api("jacqes", "/api/setup/x", false);

// ENRD: bloqueios dentro de /awq/ppm
page("enrd", "/awq/ppm", true); page("enrd", "/awq/ppm/resources", false); page("enrd", "/awq/ppm/risks/1", false);
page("enrd", "/awq/bpm", false); page("enrd", "/awq/bpm/processes", false); page("enrd", "/awq/epm", false); page("enrd", "/jacqes", false);
api("enrd", "/api/enrd/x", true); api("enrd", "/api/conciliacao/x", true);
api("enrd", "/api/epm/dre", false); api("enrd", "/api/agents", false); api("enrd", "/api/chat", false);

// Live Shop e convidados
page("live-shop", "/awq/live-shop/x", true); page("live-shop", "/awq/epm", false);
api("live-shop", "/api/live-shop/x", true); api("live-shop", "/api/crm/x", false);
page("live-guest", "/awq/live-shop/publico/marca", true); page("live-guest", "/awq/live-shop/sessoes", false);
page("jacqes-guest", "/jacqes", true); page("jacqes-guest", "/crm", false);
for (const r of ["live-guest", "jacqes-guest"] as Role[]) { api(r, "/api/crm/x", false); api(r, "/api/health", false); }

// Prefixos não casam por substring ("/crmx" não é "/crm")
page("caza", "/crmx", false); page("caza", "/caza-visionary", false);

// Integridade: todo usuário tem role conhecida, home acessível e hash bcrypt
for (const u of USERS) {
  ok(u.role in ROLE_ALLOWED_PREFIXES, `${u.email}: role desconhecida ${u.role}`);
  ok(/^\$2[aby]\$\d{2}\$/.test(u.passwordHash), `${u.email}: passwordHash não é bcrypt`);
  if (u.role !== "live-guest") ok(canAccess(u.role, u.homeRoute), `${u.email}: homeRoute ${u.homeRoute} inacessível para ${u.role}`);
}
console.log(`access-rules: OK (${n} verificações)`);
