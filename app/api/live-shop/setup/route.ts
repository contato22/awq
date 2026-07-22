// /api/live-shop/setup — bootstrap das tabelas ls_* (migrations 006–010)
//
//   GET  → devolve o SQL combinado (idempotente) p/ colar no Supabase SQL Editor.
//   POST → aplica o SQL se houver connection string direta ao Postgres do ERP
//          (LIVE_SHOP_DB_URL / ERP_DATABASE_URL / SUPABASE_DB_URL / DATABASE_URL).
//
// Owner/admin (role injetada pelo middleware em x-user-role). Idempotente.

import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { LIVE_SHOP_SETUP_SQL } from "@/lib/live-shop/setup-sql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED = new Set(["owner", "admin"]);

function dbUrl(): string | null {
  return (
    process.env.LIVE_SHOP_DB_URL ||
    process.env.ERP_DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    null
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const role = req.headers.get("x-user-role") ?? "";
  if (!ALLOWED.has(role)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  return NextResponse.json({
    instructions:
      "Cole este SQL no Supabase (projeto ERP) → SQL Editor → Run. Idempotente. " +
      "Ou configure LIVE_SHOP_DB_URL e use POST para aplicar automaticamente.",
    canApplyDirectly: !!dbUrl(),
    sql: LIVE_SHOP_SETUP_SQL,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const role = req.headers.get("x-user-role") ?? "";
  if (!ALLOWED.has(role)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const url = dbUrl();
  if (!url) {
    return NextResponse.json(
      {
        error: "Sem connection string direta ao Postgres do ERP.",
        hint: "Configure LIVE_SHOP_DB_URL (Settings → Database → URI do projeto ERP) ou use GET e cole o SQL no SQL Editor.",
      },
      { status: 501 },
    );
  }

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = postgres(url, { ssl: "require", max: 1 });
    await sql.unsafe(LIVE_SHOP_SETUP_SQL);
    return NextResponse.json({ ok: true, message: "Migrations 006–010 aplicadas/verificadas." });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Falha ao aplicar: ${detail}` }, { status: 500 });
  } finally {
    if (sql) await sql.end({ timeout: 5 });
  }
}
