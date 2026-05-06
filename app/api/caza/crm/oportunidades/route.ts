// GET /api/caza/crm/oportunidades  — lista oportunidades da Caza Vision
// POST /api/caza/crm/oportunidades — cria nova oportunidade

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaCrmDB, listOpportunities, createOpportunity, updateOpportunity } from "@/lib/caza-crm-db";
import { initPpmDB, createProject } from "@/lib/ppm-db";
import type { ServiceCategory } from "@/lib/ppm-types";
import { sql } from "@/lib/db";

function mapServiceCategory(tipo: string): ServiceCategory {
  const t = tipo.toLowerCase();
  if (t.includes("vídeo") || t.includes("video") || t.includes("filme")) return "video_production";
  if (t.includes("digital") || t.includes("social") || t.includes("conteúdo")) return "social_media";
  return "other";
}

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "caza_vision", "CRM Oportunidades Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json([]);
  await initCazaCrmDB();
  return NextResponse.json(await listOpportunities());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "caza_vision", "CRM Oportunidades Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!String(body.nome_oportunidade ?? "").trim()) {
      return NextResponse.json({ error: "nome_oportunidade é obrigatório" }, { status: 400 });
    }

    await initCazaCrmDB();
    const today = new Date().toISOString().slice(0, 10);
    const opp = await createOpportunity({
      lead_id:           String(body.lead_id ?? "") || null,
      nome_oportunidade: String(body.nome_oportunidade ?? "").trim(),
      empresa:           String(body.empresa ?? "").trim(),
      tipo_servico:      String(body.tipo_servico ?? ""),
      valor_estimado:    Number(body.valor_estimado ?? 0),
      stage:             String(body.stage ?? "Lead Captado"),
      probabilidade:     Number(body.probabilidade ?? 10),
      owner:             String(body.owner ?? "").trim(),
      data_abertura:     String(body.data_abertura ?? today),
      prazo_estimado:    String(body.prazo_estimado ?? "") || null,
      proxima_acao:      String(body.proxima_acao ?? "").trim(),
      data_proxima_acao: String(body.data_proxima_acao ?? "") || null,
      risco:             String(body.risco ?? "Baixo"),
      motivo_perda:      String(body.motivo_perda ?? "").trim(),
      observacoes:       String(body.observacoes ?? "").trim(),
    });
    return NextResponse.json(opp, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "caza_vision", "CRM Oportunidades Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    await initCazaCrmDB();
    const updated = await updateOpportunity(id, {
      stage:             body.stage != null ? String(body.stage) : undefined,
      probabilidade:     body.probabilidade != null ? Number(body.probabilidade) : undefined,
      risco:             body.risco != null ? String(body.risco) : undefined,
      proxima_acao:      body.proxima_acao != null ? String(body.proxima_acao) : undefined,
      data_proxima_acao: body.data_proxima_acao != null ? (String(body.data_proxima_acao) || null) : undefined,
      motivo_perda:      body.motivo_perda != null ? String(body.motivo_perda) : undefined,
      observacoes:       body.observacoes != null ? String(body.observacoes) : undefined,
    });
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

    // Auto-sync to PPM when opportunity is closed/won
    if (updated.stage === "Fechado Ganho" && !updated.ppm_project_id) {
      try {
        await initPpmDB();
        const today = new Date().toISOString().slice(0, 10);
        const endDate = updated.prazo_estimado ||
          new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

        const project = await createProject({
          project_name:    `${updated.empresa} — ${updated.nome_oportunidade}`,
          customer_name:   updated.empresa,
          bu_code:         "CAZA",
          bu_name:         "Caza Vision",
          opportunity_id:  updated.id,
          project_type:    "one_off",
          service_category: mapServiceCategory(updated.tipo_servico),
          contract_type:   "fixed_price",
          start_date:      today,
          planned_end_date: endDate,
          budget_revenue:  updated.valor_estimado,
          budget_cost:     Math.round(updated.valor_estimado * 0.3),
          margin_target:   0.7,
          project_manager: updated.owner,
          description:     updated.observacoes || `Originado da oportunidade ${updated.id} no CRM`,
          phase:           "initiation",
          status:          "active",
          health_status:   "green",
          priority:        updated.risco === "Alto" ? "high" : updated.risco === "Médio" ? "medium" : "low",
          created_by:      updated.owner,
        });

        const linked = await updateOpportunity(id, { ppm_project_id: project.project_id });
        return NextResponse.json({ ...linked, ppm_project_created: true });
      } catch {
        return NextResponse.json({ ...updated, ppm_sync_error: true });
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
