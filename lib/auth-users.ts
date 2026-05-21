export type Role = "owner" | "admin" | "analyst" | "cs-ops" | "caza" | "enrd";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  // Route the user lands on after login
  homeRoute: string;
}

// Password hashes removed from source code — stored in awq_users table (Supabase).
// This list is used only as a metadata fallback for role/route resolution when
// SUPABASE_SERVICE_ROLE_KEY is absent (static export, CI without DB access).
// Authentication via findUserByEmailDB() in lib/auth-users-db.ts.
export const USERS: AuthUser[] = [
  { id: "1", name: "Alex Whitmore",     email: "alex@awqgroup.com",          passwordHash: "", role: "owner",   homeRoute: "/awq" },
  { id: "2", name: "Sam Chen",          email: "s.chen@jacqes.com",          passwordHash: "", role: "admin",   homeRoute: "/awq" },
  { id: "3", name: "Priya Nair",        email: "p.nair@jacqes.com",          passwordHash: "", role: "analyst", homeRoute: "/jacqes" },
  { id: "4", name: "Danilo",            email: "danilo@jacqes.com",          passwordHash: "", role: "cs-ops",  homeRoute: "/jacqes/csops" },
  { id: "5", name: "Miguel",            email: "contato@awq.com.br",         passwordHash: "", role: "owner",   homeRoute: "/awq" },
  { id: "6", name: "Daniel Chiappetta", email: "danielcchiappetta@live.com", passwordHash: "", role: "caza",    homeRoute: "/caza-vision" },
  { id: "7", name: "Kazadem",           email: "Kazadem2@gmail.com",         passwordHash: "", role: "enrd",    homeRoute: "/enrd" },
];

// ── RBAC route prefixes ───────────────────────────────────────────────────────
//
//   owner:   ["/"]                                  — all routes
//   admin:   ["/"]                                  — all routes
//   analyst: JACQES only (no financials, no holding)
//   cs-ops:  JACQES CS Ops only
//   caza:    ["/caza-vision", "/crm"]               — Caza Vision BU only
//   enrd:    ["/enrd", "/crm", "/awq/ppm"]          — ENRD BU + CRM + PPM
//
export const ROLE_ALLOWED_PREFIXES: Record<Role, string[]> = {
  owner:    ["/"],
  admin:    ["/"],
  analyst:  ["/jacqes", "/api/crm", "/api/epm", "/api/bpm", "/carreira", "/settings"],
  "cs-ops": ["/jacqes/csops", "/jacqes/crm", "/api/crm", "/api/bpm", "/settings"],
  caza:     ["/caza-vision", "/crm"],
  enrd:     ["/enrd", "/crm", "/awq/ppm"],
};

export function canAccess(role: Role, pathname: string): boolean {
  if (role === "owner") return true;
  const allowed = ROLE_ALLOWED_PREFIXES[role];
  return allowed.some((prefix) => prefix === "/" || pathname === prefix || pathname.startsWith(prefix + "/"));
}

export function findUserByEmail(email: string): AuthUser | undefined {
  return USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
}
