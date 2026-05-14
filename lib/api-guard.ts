// ─── AWQ Security — API Guard Helper ─────────────────────────────────────────
//
// Wrapper para uso em App Router route handlers.
// Extrai sessão do cookie Supabase, chama guard(), retorna 403 NextResponse
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
import { getSupabaseToken }          from "./supabase/server";
import { guard }                     from "./security-guard";
import type { SecurityLayer, SecurityAction } from "./security-types";

/**
 * Verifica acesso à API e retorna 403 NextResponse se bloqueado.
 * Retorna null se permitido (o handler deve continuar normalmente).
 */
export async function apiGuard(
  req: NextRequest,
  action: SecurityAction,
  layer: SecurityLayer,
  resource: string
): Promise<NextResponse | null> {
  // In static export builds Supabase env vars are not set — API routes are not
  // served in static exports anyway, so skip auth entirely.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const token    = await getSupabaseToken(req);
  const user_id  = token?.email  ?? "anonymous";
  const rawRole  = token?.role   ?? "anonymous";
  const path     = new URL(req.url).pathname;

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

// Mapa de role → BU forçado (isolamento de dados por BU)
const BU_FOR_ROLE: Record<string, string> = { caza: "CAZA" };

/**
 * Retorna o BU forçado para o usuário autenticado, ou null se não houver restrição.
 */
export async function getForcedBu(req: NextRequest): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  const token = await getSupabaseToken(req);
  const role  = token?.role ?? "";
  return BU_FOR_ROLE[role] ?? null;
}
