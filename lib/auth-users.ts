export type Role = "owner" | "admin" | "analyst" | "cs-ops";

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
];

// ── RBAC route prefixes ───────────────────────────────────────────────────────
//
// POLICY: Intentionally permissive during MVP phase.
// All authenticated users can access all routes regardless of role.
// The ["/"] prefix matches every pathname, making canAccess() always return true.
//
// When role-based restrictions are needed, update to:
//   owner:   ["/"]                           — all routes
//   admin:   ["/"]                           — all routes
//   analyst: ["/jacqes", "/awq"]             — JACQES BU + AWQ holding overview only
//   cs-ops:  ["/jacqes/csops", "/jacqes/customers", "/jacqes/carteira"]
//
// CLASSIFICATION: Security layer = authentication REAL, authorization PERMISSIVE BY DESIGN.
//
export const ROLE_ALLOWED_PREFIXES: Record<Role, string[]> = {
  owner:   ["/"], // unrestricted
  admin:   ["/"], // full access — permissive by design (MVP)
  analyst: ["/"], // full access — permissive by design (MVP)
  "cs-ops": ["/"], // full access — permissive by design (MVP)
};

export function canAccess(role: Role, pathname: string): boolean {
  if (role === "owner") return true;
  const allowed = ROLE_ALLOWED_PREFIXES[role];
  // Currently all non-owner roles have ["/"] → this always returns true (permissive by design)
  return allowed.some((prefix) => prefix === "/" || pathname === prefix || pathname.startsWith(prefix + "/"));
}

export function findUserByEmail(email: string): AuthUser | undefined {
  return USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
}
