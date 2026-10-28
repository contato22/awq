export type Role = "owner" | "admin" | "analyst" | "cs-ops" | "caza" | "enrd" | "jacqes" | "live-shop" | "live-guest" | "jacqes-guest";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  // Route the user lands on after login
  homeRoute: string;
}

const ROLES: Role[] = ["owner", "admin", "analyst", "cs-ops", "caza", "enrd", "jacqes", "live-shop", "live-guest", "jacqes-guest"];

function isAuthUser(u: unknown): u is AuthUser {
  const x = u as Partial<AuthUser> | null;
  return !!x && typeof x.id === "string" && typeof x.name === "string" && typeof x.email === "string"
    && typeof x.passwordHash === "string" && typeof x.homeRoute === "string" && ROLES.includes(x.role as Role);
}

// Os usuários da Plataforma (e-mail, hash bcrypt, papel) NÃO ficam no código: o repositório
// é público/versionado. Vêm de AUTH_USERS_JSON (Vercel env). Gere com scripts/gerar-auth-users.mjs.
// Sem a variável, ninguém da Plataforma entra (fail-closed); convidados seguem pelo banco.
function loadUsers(): AuthUser[] {
  const raw = process.env.AUTH_USERS_JSON;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAuthUser) : [];
  } catch {
    return [];
  }
}

export const USERS: AuthUser[] = loadUsers();

// ── RBAC route prefixes ───────────────────────────────────────────────────────
//
// POLICY: Mostly permissive (MVP), with strict isolation for BU-scoped roles.
//
//   owner:   ["/"]                           — all routes
//   admin:   ["/"]                           — all routes
//   analyst: ["/"]                           — full access (permissive, MVP)
//   cs-ops:  ["/"]                           — full access (permissive, MVP)
//   caza:    ["/caza-vision", "/crm"]        — Caza Vision BU only; no holding, no other BUs
//   enrd:    ["/enrd", "/crm", "/awq/ppm"]  — ENRD BU + CRM + PPM compartilhados
//   jacqes:  ["/jacqes", "/crm", "/csops", "/awq/ppm"]
//                                          — JACQES BU + CRM + CS Ops + PPM compartilhado
//                                          (BPM bloqueado: schema sem bu_code, vazaria Holding)
//
// CLASSIFICATION: Security layer = authentication REAL, authorization ENFORCED for "caza", "enrd" and "jacqes".
//
export const ROLE_ALLOWED_PREFIXES: Record<Role, string[]> = {
  owner:    ["/"],             // unrestricted
  admin:    ["/"],             // full access — permissive by design (MVP)
  analyst:  ["/"],             // full access — permissive by design (MVP)
  "cs-ops": ["/"],             // full access — permissive by design (MVP)
  caza:     ["/caza-vision", "/crm"],           // Caza Vision BU + CRM compartilhado
  enrd:     ["/crm", "/awq/ppm", "/awq/bpm"],   // ENRD: CRM + PPM + BPM (BI vive sob /crm)
  // NOTA: /awq/bpm fora porque BPM ainda não tem coluna bu_code — liberar
  // significa vazar workflows/tasks da Holding para Danilo.
  jacqes:   ["/jacqes", "/crm", "/csops", "/awq/ppm"], // JACQES BU + CRM + CS Ops + PPM compartilhado
  // Operador Live Shop — escopo SOMENTE /awq/live-shop (RLS isola bu='LIVE', §10).
  "live-shop": ["/awq/live-shop"],
  // Convidado da área da marca — SOMENTE o portal público da marca. A liberação
  // por marca específica é checada no middleware via brandGrants do token.
  "live-guest": ["/awq/live-shop/publico"],
  // Convidado JACQES — SOMENTE a área /jacqes (dashboard da BU).
  "jacqes-guest": ["/jacqes"],
};

// Routes denied to specific roles even when within an allowed prefix.
// For ENRD agency PMs we hide the enterprise-grade PPM modules
// (capacity/EVM/risk register) — they're irrelevant for a small BU
// and only add noise.
const ROLE_DENY_PREFIXES: Partial<Record<Role, string[]>> = {
  enrd: ["/awq/ppm/resources", "/awq/ppm/utilization", "/awq/ppm/profitability", "/awq/ppm/risks"],
};

export function canAccess(role: Role, pathname: string): boolean {
  if (role === "owner") return true;
  const denied = ROLE_DENY_PREFIXES[role];
  if (denied?.some(p => pathname === p || pathname.startsWith(p + "/"))) return false;
  const allowed = ROLE_ALLOWED_PREFIXES[role];
  return allowed.some((prefix) => prefix === "/" || pathname === prefix || pathname.startsWith(prefix + "/"));
}

export function findUserByEmail(email: string): AuthUser | undefined {
  return USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
}
