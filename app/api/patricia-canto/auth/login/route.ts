import { NextRequest, NextResponse } from "next/server";
import { PC_SESSION_COOKIE, checkCredentials, createSessionToken } from "@/lib/patricia-canto/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json({ error: "Usuário e senha são obrigatórios" }, { status: 400 });
  }

  const role = checkCredentials(username, password);
  if (!role) {
    return NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(PC_SESSION_COOKIE, createSessionToken(role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
