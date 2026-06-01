export type Role = "owner" | "admin" | "analyst" | "cs-ops" | "caza" | "enrd" | "jacqes";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  // Route the user lands on after login
  homeRoute: string;
}

export const USERS: AuthUser[] = [
  {
    id: "1",
    name: "Alex Whitmore",
    email: "alex@awqgroup.com",
    passwordHash: "$2b$10$3DCcHvoCK2b5jFkXLX1hvuE0b98RPVQjR8fUYa4z7A..AwbjW5YFC",
    role: "owner",
    homeRoute: "/awq",
  },
  {
    id: "2",
    name: "Sam Chen",
    email: "s.chen@jacqes.com",
    passwordHash: "$2b$10$cPH8UGnkUGbDt84IeHvqTuLE.5ilSjFTjK8NZnHENQXEEMGLgD/M.",
    role: "admin",
    homeRoute: "/awq",
  },
  {
    id: "3",
    name: "Priya Nair",
    email: "p.nair@jacqes.com",
    passwordHash: "$2b$10$iDy4eveRpiC7Zdl0.wYL6eh976tMUW8ii1S9s.vWGbw7T5GkKfOS6",
    role: "analyst",
    homeRoute: "/jacqes",
  },
  {
    id: "4",
    name: "Danilo",
    email: "danilo@jacqes.com",
    passwordHash: "$2b$10$tb9af2CBLLhGzv4FzCiDKe9TKMAIDeiyrUPI9ornKfUCNsFh8cmfO",
    role: "cs-ops",
    homeRoute: "/jacqes/csops",  // canonical route — /csops redirects here
  },
  {
    id: "5",
    name: "Miguel",
    email: "contato@awq.com.br",
    passwordHash: "$2b$10$lFF4Ps8tL31kHLQuu9EbvOvDYWi/BH5oJaCepdi6hRwf7RUQh9T3S",
    role: "owner",
    homeRoute: "/awq",
  },
  {
    id: "6",
    name: "Daniel Chiappetta",
    email: "danielcchiappetta@live.com",
    passwordHash: "$2b$10$Y9gcPY4r6AbbIi5fz131GeSCmuu5nTiL7gZ4wTjJJQeb3KsdKsO92",
    role: "caza",
    homeRoute: "/caza-vision",
  },
  {
    id: "7",
    name: "Gabriel Cazadem",
    email: "Kazadem2@gmail.com",
    passwordHash: "$2b$10$Flk/HaeWLP9UkDxCIh5Qpu8T/PIRjrj6ocMnrw/CW84QdCTEB2E1.",
    role: "enrd",
    homeRoute: "/awq/ppm",
  },
  {
    // Owner da BU JACQES — corresponde à conta Cora "JACQES" (entity JACQES em lib/cora-api.ts).
    id: "8",
    name: "Danilo Jaques Jacinto",
    email: "awqmac@gmail.com",
    passwordHash: "$2b$10$yND0CGXI9V34.YNNAQMZceFgQd75ORehzXwgz2WXRHlUPbXLC1yvy",
    role: "jacqes",
    homeRoute: "/jacqes",
  },
];

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
//   jacqes:  ["/jacqes", "/crm", "/csops", "/awq/bpm", "/awq/ppm"]
//                                          — JACQES BU + CRM + CS Ops + BPM + PPM compartilhados
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
  jacqes:   ["/jacqes", "/crm", "/csops", "/awq/bpm", "/awq/ppm"], // JACQES BU + CRM + CS Ops + BPM/PPM compartilhados
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
