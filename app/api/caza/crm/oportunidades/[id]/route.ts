// PATCH /api/caza/crm/oportunidades/[id] — editar oportunidade
// DELETE /api/caza/crm/oportunidades/[id] — remover oportunidade

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaCrmDB, updateOpportunity, deleteOpportunity } from "@/lib/caza-crm-db";
import { initPpmDB, createProject } from "@/lib/ppm-db";
import type { ServiceCategory } from "@/lib/ppm-types";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

function mapServiceCategory(tipo: string): ServiceCategory {
  const t = tipo.toLowerCase();
  if (t.includes("vídeo") || t.includes("video") || t.includes("filme")) return "video_production";
  if (t.includes("digital") || t.includes("social") || t.includes("conteúdo")) return "social_media";
  return "other";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "caza_vision", "CRM Oportunidade Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaCrmDB();

  const body = await req.json() as Record<string, unknown>;
  const updated = await updateOpportunity(params.id, {
    nome_oportunidade: body.nome_oportunidade != null ? String(body.nome_oportunidade).trim() : undefined,
    empresa:           body.empresa           != null ? String(body.empresa).trim()           : undefined,
    tipo_servico:      body.tipo_servico      != null ? String(body.tipo_servico)             : undefined,
    valor_estimado:    body.valor_estimado    != null ? Number(body.valor_estimado)           : undefined,
    stage:             body.stage             != null ? String(body.stage)                    : undefined,
    probabilidade:     body.probabilidade     != null ? Number(body.probabilidade)            : undefined,
    owner:             body.owner             != null ? String(body.owner).trim()             : undefined,
    prazo_estimado:    body.prazo_estimado    != null ? (String(body.prazo_estimado) || null) : undefined,
    proxima_acao:      body.proxima_acao      != null ? String(body.proxima_acao).trim()      : undefined,
    data_proxima_acao: body.data_proxima_acao != null ? (String(body.data_proxima_acao) || null) : undefined,
    risco:             body.risco             != null ? String(body.risco)                    : undefined,
    motivo_perda:      body.motivo_perda      != null ? String(body.motivo_perda).trim()      : undefined,
    observacoes:       body.observacoes       != null ? String(body.observacoes).trim()       : undefined,
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

      const linked = await updateOpportunity(updated.id, { ppm_project_id: project.project_id });
      return NextResponse.json({ ...linked, ppm_project_created: true });
    } catch {
      // PPM sync failed — return opportunity as-is without blocking the update
      return NextResponse.json({ ...updated, ppm_sync_error: true });
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "caza_vision", "CRM Oportunidade Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaCrmDB();
  await deleteOpportunity(params.id);
  return NextResponse.json({ ok: true });
}
