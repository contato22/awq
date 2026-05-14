// GET /api/caza/crm/interacoes  — lista interações da Caza Vision
// POST /api/caza/crm/interacoes — registra nova interação

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaCrmDB, listInteractions, createInteraction } from "@/lib/caza-crm-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "caza_vision", "CRM Interações Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json([]);
  await initCazaCrmDB();

  const { searchParams } = new URL(req.url);
  const entidadeId = searchParams.get("entidade_id") ?? undefined;
  return NextResponse.json(await listInteractions(entidadeId));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "caza_vision", "CRM Interações Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!String(body.entidade_id ?? "").trim()) {
      return NextResponse.json({ error: "entidade_id é obrigatório" }, { status: 400 });
    }
    if (!String(body.descricao ?? "").trim()) {
      return NextResponse.json({ error: "descricao é obrigatória" }, { status: 400 });
    }

    await initCazaCrmDB();
    const today = new Date().toISOString().slice(0, 10);
    const interaction = await createInteraction({
      entidade_tipo: String(body.entidade_tipo ?? "lead"),
      entidade_id:   String(body.entidade_id ?? ""),
      tipo:          String(body.tipo ?? "Observação"),
      descricao:     String(body.descricao ?? "").trim(),
      owner:         String(body.owner ?? "").trim(),
      data:          String(body.data ?? today),
      observacoes:   String(body.observacoes ?? "").trim(),
    });
    return NextResponse.json(interaction, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
