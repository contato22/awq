// ─── Seed inicial JACQES — one-shot idempotente ──────────────────────────────
// GET /api/jacqes/seed-initial-batch
//
// Lança 4 clientes iniciais (CEM, Tatiana Simões, André Vieira, Dermo Ativo)
// no CRM JACQES e cria os retainers correspondentes no PPM (BU=JACQES).
//
// Acesso restrito ao owner da BU (awqmac@gmail.com). Idempotente: pula
// inserts se o cliente já existir pelo nome.
//
// Pode ser executado simplesmente abrindo a URL no navegador (Danilo logado).
//
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createCrmClient, listCrmClients } from "@/lib/jacqes-crm-db";
import { createProject, listProjects } from "@/lib/ppm-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OWNER_EMAIL = "awqmac@gmail.com";
const OWNER_NAME  = "Danilo Jaques Jacinto";

type SeedEntry = { nome: string; ticket: number; segmento: string };

const ENTRIES: SeedEntry[] = [
  { nome: "Escola Centro de Ensino Moderno (CEM)", ticket: 3200, segmento: "Educação" },
  { nome: "Tatiana Simões",                         ticket: 1790, segmento: "Pessoa Física" },
  { nome: "André Vieira",                           ticket: 2300, segmento: "Pessoa Física" },
  { nome: "Dermo Ativo",                            ticket: 1790, segmento: "Saúde / Estética" },
];

function isoToday() { return new Date().toISOString().slice(0, 10); }
function isoPlusYear() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || token.email !== OWNER_EMAIL) {
    return NextResponse.json(
      { error: "Forbidden — only the JACQES BU owner can run this seed" },
      { status: 403 },
    );
  }

  const today    = isoToday();
  const yearOut  = isoPlusYear();
  const results: Array<Record<string, unknown>> = [];

  // ── 1. Snapshot atual para idempotência ────────────────────────────────
  const existingClients = await listCrmClients();
  const existingClientNames = new Set(existingClients.map((c) => c.nome.toLowerCase().trim()));

  const existingProjectsResp = await listProjects({ bu_code: "JACQES" });
  const existingProjectNames = new Set(existingProjectsResp.map((p) => p.project_name.toLowerCase().trim()));

  // ── 2. Inserts ─────────────────────────────────────────────────────────
  for (const e of ENTRIES) {
    const entryResult: Record<string, unknown> = { nome: e.nome };

    // CRM
    if (existingClientNames.has(e.nome.toLowerCase().trim())) {
      entryResult.crm = "skipped (já existe)";
    } else {
      try {
        const client = await createCrmClient({
          nome:               e.nome,
          razao_social:       "",
          cnpj:               "",
          segmento:           e.segmento,
          produto_ativo:      "Retainer mensal",
          ticket_mensal:      e.ticket,
          inicio_relacao:     today,
          owner:              OWNER_NAME,
          status_conta:       "Ativo",
          health_score:       80,
          churn_risk:         "Baixo",
          potencial_expansao: 0,
          observacoes:        `Lançado por ${OWNER_NAME} em ${today}`,
        });
        entryResult.crm = { id: client.id, ticket_mensal: client.ticket_mensal };
      } catch (err) {
        entryResult.crm = { error: String(err) };
      }
    }

    // PPM
    const projectName = `JACQES — Retainer: ${e.nome}`;
    if (existingProjectNames.has(projectName.toLowerCase().trim())) {
      entryResult.ppm = "skipped (já existe)";
    } else {
      try {
        const annualRevenue = e.ticket * 12;
        const annualCost    = Math.round(annualRevenue * 0.40 * 100) / 100;
        const project = await createProject({
          project_name:      projectName,
          customer_name:     e.nome,
          bu_code:           "JACQES",
          project_type:      "retainer",
          service_category:  "consulting",
          contract_type:     "retainer",
          start_date:        today,
          planned_end_date:  yearOut,
          budget_revenue:    annualRevenue,
          budget_cost:       annualCost,
          billing_frequency: "monthly",
          project_manager:   OWNER_NAME,
          description:       `Contrato de retainer mensal de R$ ${e.ticket.toFixed(2)}. Lançado por ${OWNER_NAME} em ${today}.`,
          phase:             "execution",
          status:            "active",
          health_status:     "green",
          priority:          "medium",
        });
        entryResult.ppm = { project_id: project.project_id, budget_revenue: project.budget_revenue };
      } catch (err) {
        entryResult.ppm = { error: String(err) };
      }
    }

    results.push(entryResult);
  }

  return NextResponse.json({
    ok:        true,
    runBy:     token.email,
    runAt:     new Date().toISOString(),
    summary:   `${results.length} entradas processadas`,
    results,
  });
}
