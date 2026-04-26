// PATCH /api/caza/crm/propostas/[id] — editar proposta
// DELETE /api/caza/crm/propostas/[id] — remover proposta

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaCrmDB, updateProposal, deleteProposal } from "@/lib/caza-crm-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "caza_vision", "CRM Proposta Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    await initCazaCrmDB();
    const updated = await updateProposal(params.id, {
      valor_proposto: body.valor_proposto != null ? Number(body.valor_proposto)           : undefined,
      escopo:         body.escopo         != null ? String(body.escopo).trim()            : undefined,
      status:         body.status         != null ? String(body.status)                   : undefined,
      data_envio:     body.data_envio     != null ? (String(body.data_envio) || null)     : undefined,
      data_resposta:  body.data_resposta  != null ? (String(body.data_resposta) || null)  : undefined,
      observacoes:    body.observacoes    != null ? String(body.observacoes).trim()       : undefined,
      versao:         body.versao         != null ? Number(body.versao)                   : undefined,
    });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "caza_vision", "CRM Proposta Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  try {
    await initCazaCrmDB();
    await deleteProposal(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
