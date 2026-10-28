// Autenticação por segredo compartilhado para rotas que não passam pelo
// middleware do NextAuth (chamadas por GitHub Actions). Falha fechada:
// sem SEED_SECRET configurado no servidor, nenhuma chamada é aceita.
import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

export function hasValidSeedSecret(req: NextRequest): boolean {
  const expected = process.env.SEED_SECRET;
  const given = req.headers.get("x-seed-secret");
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Retorna uma resposta 401 se o segredo for inválido; null se puder prosseguir. */
export function requireSeedSecret(req: NextRequest): NextResponse | null {
  if (hasValidSeedSecret(req)) return null;
  return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
}
