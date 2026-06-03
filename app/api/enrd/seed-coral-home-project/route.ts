// ─── Seed PPM ENRD: Coral Home — one-shot, atualiza se já existir ────────────
// GET /api/enrd/seed-coral-home-project
//
// Cria (ou atualiza) o projeto PPM da Coral Home como retainer mensal R$1.790
// (BU=ENRD) com o escopo completo da proposta: 12 vídeos/mês, captação +
// edição, 1 reunião de alinhamento. PM = Gabriel Cazadem.
// Acesso restrito a Gabriel ou Miguel. Idempotente por nome — se já existir,
// faz PATCH com os valores canônicos atuais.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createProject, listProjects, updateProject } from "@/lib/ppm-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EMAILS = new Set([
  "kazadem2@gmail.com",   // Gabriel Cazadem (ENRD)
  "contato@awq.com.br",   // Miguel (owner global)
]);
const OWNER_NAME  = "Gabriel Cazadem";

const PROJECT_NAME = "Coral Home — Retainer Social Media";
const MRR          = 1790;     // valor mensal da proposta vigente
const MONTHLY_COST = 720;      // ≈40% do MRR — placeholder, editável pelo /awq/ppm/[id]
const MONTHLY_HOURS = 26;      // média declarada no escopo (23h-30h)

const TODAY = new Date();
const START = TODAY.toISOString().slice(0, 10);
const END   = (() => {
  const d = new Date(TODAY);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
})();

const SCOPE_DESCRIPTION = `Retainer de social media — 12 vídeos/mês (3 por semana). Produção end-to-end por Gabriel Cazadem: roteiro, captação, edição, legenda, correção de cor e finalização de áudio.

O que entregamos:
• 12 vídeos completos por mês (3 por semana)
• Roteiro desenvolvido pela agência
• Captação de conteúdo
• Edição completa, legenda, correção de cor, finalização de áudio
• Produção com câmera profissional para eventos especiais — alinhar valor com a agência

Como funciona — 1 dia fixo/semana presencial no cliente:
• Manhã (2-3h) — captação dos 3 vídeos da semana no espaço da empresa
• Tarde (3h30-4h) — edição completa (corte, legenda, cor, áudio)
• 1x/mês (1-2h) — reunião de alinhamento: metas, calendário comercial, promoções, lançamentos e direcionamento

Tempo mensal dedicado ao cliente: 23h-30h
• Gravação semanal (4x/mês) — 8-12h
• Edição completa (4x/mês) — 14-16h
• Alinhamento mensal — 1-2h

Não incluso (contratável em separado): produção com câmera profissional, atendimento no Direct, SDR, tráfego pago, apresentador nos vídeos, carrosséis.`;

const SCOPE_OBJECTIVES = "12 vídeos por mês (3 por semana), produção completa do roteiro à entrega. Posicionamento consistente da marca Coral Home em social media. Alinhamento, estratégia e consistência para construir o posicionamento mês a mês.";

const SCOPE_NOTES = "MRR R$1.790/mês · 12 vídeos/mês · 1 dia/semana presencial · 23-30h/mês dedicadas · tráfego pago e câmera profissional não inclusos.";

const PROJECT_PATCH = {
  project_name:      PROJECT_NAME,
  customer_name:     "Coral Home",
  bu_code:           "ENRD" as const,
  project_type:      "retainer" as const,
  service_category:  "social_media" as const,
  contract_type:     "retainer" as const,
  budget_revenue:    MRR,
  budget_cost:       MONTHLY_COST,
  budget_hours:      MONTHLY_HOURS,
  billing_frequency: "monthly" as const,
  project_manager:   OWNER_NAME,
  description:       SCOPE_DESCRIPTION,
  objectives:        SCOPE_OBJECTIVES,
  notes:             SCOPE_NOTES,
  phase:             "execution" as const,
  status:            "active" as const,
  health_status:     "green" as const,
  priority:          "medium" as const,
};

export async function GET(req: NextRequest) {
  try {
    return await runSeed(req);
  } catch (err) {
    return NextResponse.json(
      { ok: false, fatal: String(err), stack: err instanceof Error ? err.stack : undefined },
      { status: 500 },
    );
  }
}

async function runSeed(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.email || !ALLOWED_EMAILS.has(token.email.toLowerCase())) {
    return NextResponse.json(
      { error: "Forbidden — only the ENRD BU owner or the AWQ owner can run this seed" },
      { status: 403 },
    );
  }
  const runBy = token.email;

  // Localiza por nome (case-insensitive) para decidir create vs update
  let existing: Awaited<ReturnType<typeof listProjects>>[number] | undefined;
  let listErr: string | undefined;
  try {
    const rows = await listProjects({ bu_code: "ENRD" });
    existing = rows.find(p => p.project_name.toLowerCase().trim() === PROJECT_NAME.toLowerCase().trim());
  } catch (err) { listErr = String(err); }

  try {
    if (existing) {
      const updated = await updateProject(existing.project_id, PROJECT_PATCH);
      if (!updated) throw new Error("updateProject returned null");
      return NextResponse.json({
        ok: true,
        runBy,
        runAt: new Date().toISOString(),
        action: "updated",
        result: {
          project_id:       updated.project_id,
          project_code:     updated.project_code,
          project_name:     updated.project_name,
          bu_code:          updated.bu_code,
          mrr:              updated.budget_revenue,
          budget_cost:      updated.budget_cost,
          start_date:       updated.start_date,
          planned_end_date: updated.planned_end_date,
          contract_total_estimate_12mo: MRR * 12,
        },
        diagnostics: listErr ? { listProjects: listErr } : undefined,
      });
    }

    const project = await createProject({
      ...PROJECT_PATCH,
      start_date:       START,
      planned_end_date: END,
    });
    return NextResponse.json({
      ok: true,
      runBy,
      runAt: new Date().toISOString(),
      action: "created",
      result: {
        project_id:       project.project_id,
        project_code:     project.project_code,
        project_name:     project.project_name,
        bu_code:          project.bu_code,
        mrr:              project.budget_revenue,
        budget_cost:      project.budget_cost,
        start_date:       project.start_date,
        planned_end_date: project.planned_end_date,
        contract_total_estimate_12mo: MRR * 12,
      },
      diagnostics: listErr ? { listProjects: listErr } : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
