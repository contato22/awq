import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "awq_ai_key";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 365 * 24 * 60 * 60,
  path: "/",
};

function ownerOnly(token: Awaited<ReturnType<typeof getToken>>) {
  return (token?.role as string) === "owner";
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!ownerOnly(token)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  return NextResponse.json({ configured: !!req.cookies.get(COOKIE_NAME)?.value });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!ownerOnly(token)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { key } = await req.json();
  if (!key || typeof key !== "string" || !key.trim().startsWith("sk-ant-")) {
    return NextResponse.json({ error: "Chave inválida — deve começar com sk-ant-" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, key.trim(), COOKIE_OPTS);
  return res;
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!ownerOnly(token)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
