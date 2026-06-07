import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

/**
 * GET /api/erp/setup/schema
 * Retorna o conteúdo de awq_erp_full_schema.sql para ser colado no SQL Editor
 * do Supabase ERP quando o workflow automático estiver indisponível.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const filePath = path.join(process.cwd(), "awq_erp_full_schema.sql");
    const sql = await readFile(filePath, "utf-8");
    return new NextResponse(sql, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'inline; filename="awq_erp_full_schema.sql"',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro ao ler schema" }, { status: 500 });
  }
}
