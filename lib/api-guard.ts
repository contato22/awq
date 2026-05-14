// ─── AWQ Security — API Guard Helper ─────────────────────────────────────────
//
// Wrapper para uso em App Router route handlers.
// Extrai a sessão Supabase do cookie, chama guard(), retorna 403 NextResponse
// se bloqueado ou null se permitido.
//
// USO EM HANDLER:
//   import { apiGuard } from "@/lib/api-guard";
//
//   export async function POST(req: NextRequest) {
//     const denied = await apiGuard(req, "import", "dados_infra", "Extrato bancário");
//     if (denied) return denied;
//     // ... lógica do handler
//   }
//
// IMPORTANTE:
//   - Nunca logar senha, token ou body completo
//   - user_id no audit é sempre email ou "anonymous" — nunca o JWT em si
//   - Compatível com Edge Runtime e Node.js runtime

import { NextRequest, NextResponse } from "next/server";
import { createRouteClient }         from "./supabase";
import { findUserByEmail }           from "./auth-users";
import { guard }                     from "./security-guard";
import type { SecurityLayer, SecurityAction } from "./security-types";

export async function apiGuard(
  req: NextRequest,
  action: SecurityAction,
  layer: SecurityLayer,
  resource: string
): Promise<NextResponse | null> {
  // In static export builds there is no Supabase URL — skip auth entirely.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  const { supabase } = createRouteClient(req);
  const { data: { user } } = await supabase.auth.getUser();

  const email   = user?.email ?? "anonymous";
  const appUser = user ? findUserByEmail(email) : undefined;
  const rawRole = appUser?.role ?? "anonymous";
  const path    = new URL(req.url).pathname;

  const { result, reason } = guard(email, rawRole, path, layer, action, resource);

  if (result === "blocked") {
    return NextResponse.json(
      { error: "Acesso negado", code: "RBAC_DENIED", reason, path, action, layer },
      { status: 403 }
    );
  }

  return null;
}

// Mapa de role → BU forçado (isolamento de dados por BU)
const BU_FOR_ROLE: Record<string, string> = { caza: "CAZA" };

export async function getForcedBu(req: NextRequest): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  const { supabase } = createRouteClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const appUser = findUserByEmail(user.email);
  const role    = appUser?.role ?? "";
  return BU_FOR_ROLE[role] ?? null;
}
