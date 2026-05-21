// POST /api/admin/migrate-db
//
// Triggers the one-time schema bootstrap (CREATE TABLE IF NOT EXISTS + GRANT).
// Uses DATABASE_URL (direct postgres) — idempotent, safe to call multiple times.
// Protected: requires a valid NextAuth session.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { initDB, USE_DB } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!authToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!USE_DB) {
    return NextResponse.json(
      {
        error: "DATABASE_URL não configurado.",
        hint: "Configure DATABASE_URL no Vercel com a connection string do Supabase (Settings → Database → URI).",
      },
      { status: 501 },
    );
  }

  try {
    await initDB();
    return NextResponse.json({ ok: true, message: "Tabelas financeiras criadas/verificadas com sucesso." });
  } catch (err) {
    const detail = err instanceof Error ? err.message : JSON.stringify(err);
    return NextResponse.json({ error: `Migração falhou: ${detail}` }, { status: 500 });
  }
}
