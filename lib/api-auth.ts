// Session and shared-secret checks for route handlers.
//
// Middleware (next-auth withAuth) is the primary gate on matched routes.
// These helpers re-read the JWT so a handler does not trust x-user-* headers,
// which a client can forge if middleware is skipped.
//
// Layer RBAC from apiGuard() is intentionally not applied here. The live role
// matrix collapses jacqes/caza/enrd to "viewer" and gives operator an empty
// "holding" set, which would 403 users the middleware still allows.

import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const ROLE_BU_LOCK: Record<string, string> = {
  enrd: "ENRD",
  caza: "CAZA",
  jacqes: "JACQES",
  "live-shop": "LIVE",
};

export type SessionOk = {
  ok: true;
  email: string;
  role: string;
  buLock: string | null;
  /** NEXTAUTH_SECRET absent outside production. Handlers may proceed locally. */
  bypass: boolean;
};

export type SessionResult = SessionOk | { ok: false; response: NextResponse };

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" && process.env.STATIC_EXPORT !== "1";
}

export function safeEqual(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function evaluateBearer(
  expected: string | undefined,
  authorization: string | null,
  isProd: boolean,
): "allow" | "unauthorized" | "unconfigured" {
  if (!expected) return isProd ? "unconfigured" : "allow";
  const presented = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  return safeEqual(presented, expected) ? "allow" : "unauthorized";
}

export function verifyBearerSecret(req: NextRequest, envName: string): NextResponse | null {
  const decision = evaluateBearer(
    process.env[envName],
    req.headers.get("authorization"),
    isProductionRuntime(),
  );
  if (decision === "allow") return null;
  if (decision === "unconfigured") {
    return NextResponse.json(
      { error: `${envName} não configurado.` },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
}

/**
 * Re-validates the NextAuth JWT. Returns 401 when there is no session.
 * Does not apply security-layer RBAC.
 */
export async function requireSession(req: NextRequest): Promise<SessionResult> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (isProductionRuntime()) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Autenticação indisponível." }, { status: 503 }),
      };
    }
    // Static export and local dev without a secret must not touch cookies.
    return { ok: true, email: "dev-bypass@local", role: "owner", buLock: null, bypass: true };
  }

  const token = await getToken({ req, secret });
  const email = typeof token?.email === "string" ? token.email : "";
  const role = typeof token?.role === "string" ? token.role : "";
  if (!email || !role) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  return { ok: true, email, role, buLock: ROLE_BU_LOCK[role] ?? null, bypass: false };
}
