// ─── ownerOnly — guard auxiliar para rotas restritas ao owner ─────────────────
// Uso: const denied = await ownerOnly(req); if (denied) return denied;
// Retorna 403 para qualquer role que não seja "owner".
// Combina com apiGuard: chamar ownerOnly DEPOIS do apiGuard (que já loga o acesso).

import { NextRequest, NextResponse } from "next/server";
import { getToken }                  from "next-auth/jwt";
import { normalizeRole }             from "./security-access";

export async function ownerOnly(req: NextRequest): Promise<NextResponse | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null; // sem secret = build estático, não bloqueia

  const token   = await getToken({ req, secret });
  const rawRole = (token?.role as string | undefined) ?? "anonymous";
  const role    = normalizeRole(rawRole);

  if (role !== "owner") {
    return NextResponse.json(
      {
        error:  "Acesso restrito",
        code:   "OWNER_ONLY",
        reason: `Role '${rawRole}' não tem acesso a este recurso.`,
      },
      { status: 403 }
    );
  }

  return null; // permitido — continua
}
