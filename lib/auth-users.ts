export type Role = "owner" | "admin" | "analyst" | "cs-ops" | "caza";

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
    passwordHash: "$2b$10$2FbtWd3diTZ8Hp5BV5QqbONApQ7VcRBmwbN.JQKrjQNNaORBmwKOm",
    role: "owner",
    homeRoute: "/awq",
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
//   caza:    ["/caza-vision"]                — Caza Vision BU only; no holding, no other BUs
//
// CLASSIFICATION: Security layer = authentication REAL, authorization ENFORCED for "caza".
//
export const ROLE_ALLOWED_PREFIXES: Record<Role, string[]> = {
  owner:    ["/"],             // unrestricted
  admin:    ["/"],             // full access — permissive by design (MVP)
  analyst:  ["/"],             // full access — permissive by design (MVP)
  "cs-ops": ["/"],             // full access — permissive by design (MVP)
  caza:     ["/caza-vision"],  // restricted to Caza Vision BU only
};

export function canAccess(role: Role, pathname: string): boolean {
  if (role === "owner") return true;
  const allowed = ROLE_ALLOWED_PREFIXES[role];
  return allowed.some((prefix) => prefix === "/" || pathname === prefix || pathname.startsWith(prefix + "/"));
}

export function findUserByEmail(email: string): AuthUser | undefined {
  return USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
}
