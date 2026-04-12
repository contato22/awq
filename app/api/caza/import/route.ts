// ─── POST /api/caza/import ─────────────────────────────────────────────────────
//
// Triggers a one-shot import from Notion into the internal Neon DB.
// Notion is used ONLY here — never queried by UI pages at runtime.
//
// Body (JSON):
//   { dryRun?: boolean }   // dry-run: audit only, no writes
//
// Returns ImportSummary with counts, skipped, conflicts, errors.
//
// Security:
//   - NOTION_TOKEN read from process.env — never from request body
//   - Token never echoed in response
//   - Middleware enforces JWT auth

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { apiGuard } from "@/lib/api-guard";
import { initCazaDB, upsertProject, upsertClient, type CazaProject } from "@/lib/caza-db";
import { fetchFromNotion, type RawNotionProject } from "@/lib/notion-import";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

/** Derives a stable CV-XXXXXXXX ID from a Notion page ID so re-imports upsert correctly. */
function notionProjectId(notionPageId: string): string {
  return `CV-${notionPageId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function rawToProject(r: RawNotionProject): Omit<CazaProject, "last_internal_update"> {
  return {
    id:                   notionProjectId(r.notion_page_id),
    titulo:               r.titulo,
    cliente:              r.cliente,
    tipo:                 r.tipo,
    status:               r.status,
    prioridade:           r.prioridade,
    diretor:              r.diretor,
    prazo:                r.prazo,
    inicio:               r.inicio || r.prazo,
    valor:                r.valor,
    alimentacao:          r.alimentacao,
    gasolina:             r.gasolina,
    despesas:             r.despesas,
    lucro:                r.lucro,
    recebido:             r.recebido,
    recebimento:          r.recebimento,
    imported_from_notion: true,
    notion_page_id:       r.notion_page_id,
    imported_at:          new Date().toISOString(),
    sync_status:          "imported",
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── RBAC guard: somente owner/admin podem importar dados do Notion ──
  const denied = await apiGuard(req, "import", "caza_vision", "Importação Notion → Caza Vision DB");
  if (denied) return denied;

  if (!sql) {
    return NextResponse.json(
      { error: "DB não disponível. Configure DATABASE_URL no ambiente Vercel." },
      { status: 503 }
    );
  }

  const notionToken = process.env.NOTION_TOKEN ?? process.env.NOTION_API_KEY ?? "";
  if (!notionToken) {
    return NextResponse.json(
      { error: "NOTION_TOKEN não configurado. Adicione a variável de ambiente no Vercel." },
      { status: 503 }
    );
  }

  let dryRun = false;
  try {
    const body = await req.json() as { dryRun?: boolean };
    dryRun = Boolean(body.dryRun);
  } catch { /* body optional */ }

  // Hardcoded fallback IDs — real Caza Vision databases (same as fetch-notion-static.mjs)
  const projectsDbId = process.env.NOTION_DATABASE_ID_CAZA_PROPERTIES ?? "308e2d13-dfa9-433e-a0f6-8439b5181845";
  const clientsDbId  = process.env.NOTION_DATABASE_ID_CAZA_CLIENTS    ?? "ca1ba0fe-3d47-4356-8643-23a223a4e710";

  // ── Fetch from Notion ──────────────────────────────────────────────────────
  const { projects: rawProjects, clients: rawClients, errors } = await fetchFromNotion({
    projectsDbId,
    clientsDbId,
  });

  const summary = {
    projects_imported: 0,
    projects_skipped:  0,
    projects_conflicts: [] as string[],
    clients_imported:  0,
    clients_skipped:   0,
    clients_conflicts: [] as string[],
    errors,
    imported_at: new Date().toISOString(),
    dry_run: dryRun,
  };

  if (!dryRun) {
    await initCazaDB();

    // ── Persist projects ───────────────────────────────────────────────────
    for (const raw of rawProjects) {
      if (!raw.titulo) { summary.projects_skipped++; continue; }
      try {
        await upsertProject(rawToProject(raw));
        summary.projects_imported++;
      } catch (e) {
        summary.projects_conflicts.push(raw.titulo);
        errors.push(`Projeto "${raw.titulo}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // ── Persist clients ────────────────────────────────────────────────────
    for (const c of rawClients) {
      if (!c.name) { summary.clients_skipped++; continue; }
      try {
        await upsertClient(c);
        summary.clients_imported++;
      } catch (e) {
        summary.clients_conflicts.push(c.name);
        errors.push(`Cliente "${c.name}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } else {
    // Dry run — just count
    summary.projects_imported = rawProjects.filter(p => p.titulo).length;
    summary.projects_skipped  = rawProjects.filter(p => !p.titulo).length;
    summary.clients_imported  = rawClients.filter(c => c.name).length;
    summary.clients_skipped   = rawClients.filter(c => !c.name).length;
  }

  return NextResponse.json(summary);
}
