// ─── Seed PPM ENRD: Coral Home — one-shot idempotente ───────────────────────
// GET /api/enrd/seed-coral-home-project
//
// Cria o projeto PPM da Coral Home como retainer mensal R$1.500 (BU=ENRD)
// com o escopo completo (12 vídeos/mês, captação + edição, 1 reunião de
// alinhamento). PM = Gabriel Cazadem. Acesso restrito a Gabriel ou Miguel.
// Idempotente por nome do projeto.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createProject, listProjects } from "@/lib/ppm-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EMAILS = new Set([
  "kazadem2@gmail.com",   // Gabriel Cazadem (ENRD)
  "contato@awq.com.br",   // Miguel (owner global)
]);
const OWNER_NAME  = "Gabriel Cazadem";

const PROJECT_NAME = "Coral Home — Retainer Social Media";
const MRR          = 1500;     // valor com desconto fechado (tabela R$1.790)
const MONTHLY_COST = 600;      // estimativa de custo interno de entrega (≈40% do MRR)
const MONTHLY_HOURS = 26;      // média declarada no escopo (23h-30h)

const TODAY = new Date();
const START = TODAY.toISOString().slice(0, 10);
const END   = (() => {
  const d = new Date(TODAY);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
})();

const SCOPE_DESCRIPTION = `Retainer de social media — 12 vídeos/mês (3 por semana). Produção end-to-end por Gabriel Cazadem: roteiro, captação, edição, legenda, correção de cor e finalização de áudio.

Rotina:
• 1 dia fixo/semana presencial no cliente
• Manhã — captação dos 3 vídeos da semana (2-3h)
• Tarde — edição completa (3h30-4h)
• 1x/mês — reunião de alinhamento (1-2h)

Tempo total mensal: ~23h-30h dedicadas (gravação 8-12h + edição 14-16h + alinhamento 1-2h).

Comercial: R$1.500/mês (tabela cheia R$1.790, desconto R$290 negociado no fechamento). Tráfego pago, câmera profissional para eventos, atendimento no Direct, SDR, apresentador e carrosséis não inclusos — contratáveis em separado.`;

const SCOPE_OBJECTIVES = "12 vídeos por mês (3 por semana), produção completa do roteiro à entrega. Posicionamento consistente da marca Coral Home em social media.";

const SCOPE_NOTES = "MRR R$1.500 · tabela R$1.790 · desconto R$290 · 1 dia/semana presencial · 23-30h/mês · ~12 vídeos/mês.";

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

  // Idempotência
  let existingNames = new Set<string>();
  let listErr: string | undefined;
  try {
    const existing = await listProjects({ bu_code: "ENRD" });
    existingNames = new Set(existing.map(p => p.project_name.toLowerCase().trim()));
  } catch (err) { listErr = String(err); }

  const key = PROJECT_NAME.toLowerCase().trim();
  if (existingNames.has(key)) {
    return NextResponse.json({
      ok: true,
      runBy,
      runAt: new Date().toISOString(),
      result: "skipped (projeto já existe)",
      diagnostics: listErr ? { listProjects: listErr } : undefined,
    });
  }

  try {
    const project = await createProject({
      project_name:      PROJECT_NAME,
      customer_name:     "Coral Home",
      bu_code:           "ENRD",
      project_type:      "retainer",
      service_category:  "social_media",
      contract_type:     "retainer",
      start_date:        START,
      planned_end_date:  END,
      budget_revenue:    MRR,          // MRR — multiplicado por meses em contractValue()
      budget_cost:       MONTHLY_COST,
      budget_hours:      MONTHLY_HOURS,
      billing_frequency: "monthly",
      project_manager:   OWNER_NAME,
      description:       SCOPE_DESCRIPTION,
      objectives:        SCOPE_OBJECTIVES,
      notes:             SCOPE_NOTES,
      phase:             "execution",
      status:            "active",
      health_status:     "green",
      priority:          "medium",
    });

    return NextResponse.json({
      ok: true,
      runBy,
      runAt: new Date().toISOString(),
      result: {
        project_id:    project.project_id,
        project_code:  project.project_code,
        bu_code:       project.bu_code,
        project_name:  project.project_name,
        mrr:           project.budget_revenue,
        contract_total_estimate: MRR * 12,
        start_date:    project.start_date,
        planned_end_date: project.planned_end_date,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
