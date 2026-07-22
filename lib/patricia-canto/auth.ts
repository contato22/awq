// Autenticação própria e independente do NextAuth do AWQ — só vale para as
// rotas /patricia-canto e /api/patricia-canto (ambas fora do middleware
// principal). Duas contas fixas, credenciais em env vars (Vercel):
//   PATRICIA_CANTO_ADMIN_USER / PATRICIA_CANTO_ADMIN_PASSWORD
//   PATRICIA_CANTO_MASTER_USER / PATRICIA_CANTO_MASTER_PASSWORD
import { createHmac, timingSafeEqual } from "crypto";

export type PcRole = "admin" | "master";

export const PC_SESSION_COOKIE = "pc_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 dias

// Sem PATRICIA_CANTO_AUTH_SECRET/NEXTAUTH_SECRET configurados, cai num valor
// fixo — funciona, mas qualquer um que leia o código consegue forjar sessão.
// Configure um dos dois em produção.
const SECRET =
  process.env.PATRICIA_CANTO_AUTH_SECRET || process.env.NEXTAUTH_SECRET || "pc-dev-only-insecure-secret";

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function checkCredentials(username: string, password: string): PcRole | null {
  const adminUser = process.env.PATRICIA_CANTO_ADMIN_USER;
  const adminPass = process.env.PATRICIA_CANTO_ADMIN_PASSWORD;
  const masterUser = process.env.PATRICIA_CANTO_MASTER_USER;
  const masterPass = process.env.PATRICIA_CANTO_MASTER_PASSWORD;

  if (adminUser && adminPass && username === adminUser && password === adminPass) return "admin";
  if (masterUser && masterPass && username === masterUser && password === masterPass) return "master";
  return null;
}

export function createSessionToken(role: PcRole): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${role}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): PcRole | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [role, expiresStr, sig] = parts;
  if (role !== "admin" && role !== "master") return null;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return null;
  const expected = sign(`${role}.${expiresStr}`);
  if (!safeEqual(sig, expected)) return null;
  return role;
}

// Helper para rotas de API: extrai e valida a sessão a partir do cookie da request.
export function requireSession(req: { cookies: { get(name: string): { value: string } | undefined } }): PcRole | null {
  return verifySessionToken(req.cookies.get(PC_SESSION_COOKIE)?.value);
}
