// ─── AWQ Security — API Guard Helper ─────────────────────────────────────────
//
// Wrapper para uso em App Router route handlers.
// Extrai JWT do cookie de sessão, chama guard(), retorna 403 NextResponse
// se bloqueado ou null se permitido.
//
// USO EM HANDLER:
//   import { apiGuard } from "@/lib/api-guard";
//
//   export async function POST(req: NextRequest) {
//     const denied = await apiGuard(req, "import", "dados_infra", "Extrato bancário");
//     if (denied) return denied;   // 403 com reason
//     // ... lógica do handler
//   }
//
// IMPORTANTE:
//   - Nunca logar senha, token ou body completo
//   - user_id no audit é sempre email ou "anonymous" — nunca o JWT em si
//   - Compatível com Edge Runtime e Node.js runtime

import { NextRequest, NextResponse } from "next/server";
import { getToken }                  from "next-auth/jwt";
import { guard }                     from "./security-guard";
import type { SecurityLayer, SecurityAction } from "./security-types";

/**
 * Verifica acesso à API e retorna 403 NextResponse se bloqueado.
 * Retorna null se permitido (o handler deve continuar normalmente).
 *
 * @param req      NextRequest da rota
 * @param action   ação tentada (import, view, create, etc.)
 * @param layer    camada de segurança do recurso
 * @param resource descrição legível do recurso (sem dados sensíveis)
 */
export async function apiGuard(
  req: NextRequest,
  action: SecurityAction,
  layer: SecurityLayer,
  resource: string
): Promise<NextResponse | null> {
  const token   = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const user_id = (token?.email   as string | undefined) ?? "anonymous";
  const rawRole = (token?.role    as string | undefined) ?? "anonymous";
  const path    = new URL(req.url).pathname;

  const { result, reason } = guard(user_id, rawRole, path, layer, action, resource);

  if (result === "blocked") {
    return NextResponse.json(
      {
        error:    "Acesso negado",
        code:     "RBAC_DENIED",
        reason,
        path,
        action,
        layer,
      },
      { status: 403 }
    );
  }

  return null; // permitido — handler continua
}
