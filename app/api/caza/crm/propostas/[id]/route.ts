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
  await initCazaCrmDB();

  const body = await req.json() as Record<string, unknown>;
  const updated = await updateProposal(params.id, {
    versao:         body.versao         != null ? Number(body.versao)                   : undefined,
    valor_proposto: body.valor_proposto != null ? Number(body.valor_proposto)           : undefined,
    escopo:         body.escopo         != null ? String(body.escopo).trim()            : undefined,
    status:         body.status         != null ? String(body.status)                   : undefined,
    data_envio:     body.data_envio     != null ? (String(body.data_envio) || null)     : undefined,
    data_resposta:  body.data_resposta  != null ? (String(body.data_resposta) || null)  : undefined,
    validade:       body.validade       != null ? (String(body.validade) || null)       : undefined,
    objecoes:       body.objecoes       != null ? String(body.objecoes).trim()          : undefined,
    observacoes:    body.observacoes    != null ? String(body.observacoes).trim()       : undefined,
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "caza_vision", "CRM Proposta Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaCrmDB();
  await deleteProposal(params.id);
  return NextResponse.json({ ok: true });
}
