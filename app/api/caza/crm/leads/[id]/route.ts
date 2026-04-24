// PATCH /api/caza/crm/leads/[id] — editar lead
// DELETE /api/caza/crm/leads/[id] — remover lead

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaCrmDB, updateLead, deleteLead } from "@/lib/caza-crm-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "caza_vision", "CRM Lead Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaCrmDB();

  const body = await req.json() as Record<string, unknown>;
  const updated = await updateLead(params.id, {
    nome:              body.nome              != null ? String(body.nome).trim()              : undefined,
    empresa:           body.empresa           != null ? String(body.empresa).trim()           : undefined,
    contato_principal: body.contato_principal != null ? String(body.contato_principal).trim() : undefined,
    telefone:          body.telefone          != null ? String(body.telefone).trim()          : undefined,
    email:             body.email             != null ? String(body.email).trim()             : undefined,
    origem:            body.origem            != null ? String(body.origem)                   : undefined,
    tipo_servico:      body.tipo_servico      != null ? String(body.tipo_servico)             : undefined,
    interesse:         body.interesse         != null ? String(body.interesse).trim()         : undefined,
    status:            body.status            != null ? String(body.status)                   : undefined,
    owner:             body.owner             != null ? String(body.owner).trim()             : undefined,
    observacoes:       body.observacoes       != null ? String(body.observacoes).trim()       : undefined,
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "caza_vision", "CRM Lead Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaCrmDB();
  await deleteLead(params.id);
  return NextResponse.json({ ok: true });
}
