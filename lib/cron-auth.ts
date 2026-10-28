// Autenticação das rotas chamadas pelo Vercel Cron (Authorization: Bearer <CRON_SECRET>).
// Em produção falha fechada: sem CRON_SECRET configurado, nenhuma chamada passa.
// Só em desenvolvimento local (NODE_ENV !== "production") a ausência do segredo libera.
import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const given = req.headers.get("authorization") ?? "";
  const a = Buffer.from(`Bearer ${secret}`);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Retorna 401 se a chamada não for autorizada; null se puder prosseguir. */
export function requireCronSecret(req: NextRequest): NextResponse | null {
  if (isCronAuthorized(req)) return null;
  return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
}
