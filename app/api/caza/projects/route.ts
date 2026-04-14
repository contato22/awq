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

  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }

  const now = new Date().toISOString();
  const toNum = (v: unknown, fallback = 0) => { const n = Number(v ?? fallback); return isNaN(n) ? fallback : n; };

  try {
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
      valor:                toNum(body.valor),
      alimentacao:          toNum(body.alimentacao),
      gasolina:             toNum(body.gasolina),
      despesas:             toNum(body.despesas),
      lucro:                toNum(body.lucro),
      recebido:             Boolean(body.recebido ?? false),
      recebimento:          String(body.recebimento ?? ""),
      imported_from_notion: false,
      notion_page_id:       null,
      imported_at:          null,
      sync_status:          "internal",
    });
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro ao salvar projeto." }, { status: 500 });
  }
}
