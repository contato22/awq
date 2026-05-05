// PATCH /api/caza/crm/interacoes/[id]  — atualiza interação
// DELETE /api/caza/crm/interacoes/[id] — remove interação
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaCrmDB, updateInteraction, deleteInteraction } from "@/lib/caza-crm-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "caza_vision", "CRM Interações Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  try {
    await initCazaCrmDB();
    const body = await req.json() as Record<string, unknown>;
    const interaction = await updateInteraction(params.id, {
      tipo:        body.tipo        != null ? String(body.tipo)        : undefined,
      descricao:   body.descricao   != null ? String(body.descricao)   : undefined,
      owner:       body.owner       != null ? String(body.owner)       : undefined,
      data:        body.data        != null ? String(body.data)        : undefined,
      observacoes: body.observacoes != null ? String(body.observacoes) : undefined,
    });
    if (!interaction) {
      return NextResponse.json({ error: "Interação não encontrada" }, { status: 404 });
    }
    return NextResponse.json(interaction);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "caza_vision", "CRM Interações Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  try {
    await initCazaCrmDB();
    const removed = await deleteInteraction(params.id);
    if (!removed) {
      return NextResponse.json({ error: "Interação não encontrada" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
