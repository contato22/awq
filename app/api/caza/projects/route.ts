// ─── GET /api/caza/projects  — list all projects
// ─── POST /api/caza/projects — create a new project

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaDB, listProjects, upsertProject, newProjectId } from "@/lib/caza-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "caza_vision", "Projetos Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json([], { status: 200 });
  await initCazaDB();
  const projects = await listProjects();
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "caza_vision", "Projetos Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaDB();

  const body = await req.json() as Record<string, unknown>;
  const now  = new Date().toISOString();

  const project = await upsertProject({
    id:                   newProjectId(),
    titulo:               String(body.titulo ?? ""),
    cliente:              String(body.cliente ?? ""),
    tipo:                 String(body.tipo ?? ""),
    status:               String(body.status ?? "Em Produção"),
    prioridade:           String(body.prioridade ?? ""),
    diretor:              String(body.diretor ?? ""),
    prazo:                String(body.prazo ?? ""),
    inicio:               String(body.inicio ?? now.slice(0, 10)),
    valor:                Number(body.valor ?? 0),
    alimentacao:          Number(body.alimentacao ?? 0),
    gasolina:             Number(body.gasolina ?? 0),
    despesas:             Number(body.despesas ?? 0),
    lucro:                Number(body.lucro ?? 0),
    recebido:             Boolean(body.recebido ?? false),
    recebimento:          String(body.recebimento ?? ""),
    imported_from_notion: false,
    notion_page_id:       null,
    imported_at:          null,
    sync_status:          "internal",
  });

  return NextResponse.json(project, { status: 201 });
}
