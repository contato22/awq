// ─── AWQ API Auth Helper ──────────────────────────────────────────────────────
//
// Substitui o padrão antigo de ler `req.headers.get("x-user-email")` / `x-user-role`
// / `x-bu-lock` — esses headers eram injetados pelo middleware após validar o JWT,
// mas como NÃO são headers reservados pelo Next.js, um atacante pode enviá-los
// diretamente. Combinado com CVE-2025-29927 (bypass de middleware via
// `x-middleware-subrequest`) isso virava impersonation arbitrário.
//
// Cada rota agora valida o JWT diretamente via getToken(), independente do
// middleware. Defense-in-depth: mesmo se o middleware for pulado, a rota
// continua protegida.
//
// USO:
//   const identity = await getAuthIdentity(req);
//   if (!identity) return unauthorized();
//   const { email, role, buLock } = identity;

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const ROLE_BU_LOCK: Record<string, string> = {
  enrd:   "ENRD",
  caza:   "CAZA",
  jacqes: "JACQES",
};

export interface AuthIdentity {
  email:  string;
  role:   string;
  buLock: string | null;
}

/**
 * Extrai identidade autenticada do JWT da request.
 * Retorna null se não autenticado.
 *
 * NUNCA confia em headers `x-user-*` da request — esses podem ser
 * forjados por atacantes. Sempre re-decodifica o JWT do cookie.
 */
export async function getAuthIdentity(req: NextRequest): Promise<AuthIdentity | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.email) return null;
  const role   = (token.role as string | undefined) ?? "anonymous";
  const buLock = ROLE_BU_LOCK[role] ?? null;
  return { email: token.email as string, role, buLock };
}

export function unauthorized(reason = "Não autenticado"): NextResponse {
  return NextResponse.json({ error: reason }, { status: 401 });
}

/**
 * Valida um secret enviado por Bearer Authorization. Usado por endpoints
 * "probe" chamados por GitHub Actions / Vercel Cron de IPs fora da app
 * (não passam por NextAuth).
 *
 * Falha-fechado: se o env var não estiver setado em produção, NÃO permite
 * passagem (em dev, NODE_ENV !== "production", libera para facilitar testes
 * locais).
 */
export function verifyProbeSecret(req: NextRequest, envVar = "PROBE_SECRET"): NextResponse | null {
  const expected = process.env[envVar];
  const auth     = req.headers.get("authorization") ?? "";
  const isProd   = process.env.NODE_ENV === "production";

  if (!expected) {
    if (isProd) {
      return NextResponse.json(
        { error: `${envVar} não configurado em produção. Endpoint desabilitado.` },
        { status: 503 },
      );
    }
    return null; // dev: libera
  }

  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return null;
}
