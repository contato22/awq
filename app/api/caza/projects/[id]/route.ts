// ─── GET    /api/caza/projects/[id]
// ─── PUT    /api/caza/projects/[id]
// ─── DELETE /api/caza/projects/[id]

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaDB, getProject, updateProject, deleteProject } from "@/lib/caza-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "caza_vision", "Projeto Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaDB();
  const project = await getProject(params.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "caza_vision", "Projeto Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaDB();
  const body = await req.json() as Record<string, unknown>;

  const updated = await updateProject(params.id, {
    titulo:      body.titulo      != null ? String(body.titulo)      : undefined,
    cliente:     body.cliente     != null ? String(body.cliente)     : undefined,
    tipo:        body.tipo        != null ? String(body.tipo)        : undefined,
    status:      body.status      != null ? String(body.status)      : undefined,
    prioridade:  body.prioridade  != null ? String(body.prioridade)  : undefined,
    diretor:     body.diretor     != null ? String(body.diretor)     : undefined,
    prazo:       body.prazo       != null ? String(body.prazo)       : undefined,
    inicio:      body.inicio      != null ? String(body.inicio)      : undefined,
    valor:       body.valor       != null ? Number(body.valor)       : undefined,
    alimentacao: body.alimentacao != null ? Number(body.alimentacao) : undefined,
    gasolina:    body.gasolina    != null ? Number(body.gasolina)    : undefined,
    despesas:    body.despesas    != null ? Number(body.despesas)    : undefined,
    lucro:       body.lucro       != null ? Number(body.lucro)       : undefined,
    recebido:    body.recebido    != null ? Boolean(body.recebido)   : undefined,
    recebimento: body.recebimento != null ? String(body.recebimento) : undefined,
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "caza_vision", "Projeto Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaDB();
  await deleteProject(params.id);
  return NextResponse.json({ ok: true });
}
