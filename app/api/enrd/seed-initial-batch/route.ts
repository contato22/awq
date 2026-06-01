// ─── Seed inicial ENRD — one-shot idempotente ────────────────────────────────
// GET /api/enrd/seed-initial-batch
//
// Lança a Coral Home como Lead converted + Account no CRM ENRD.
// O retainer R$1.500/mês no PPM virá em seguida quando o escopo for definido.
//
// Acesso restrito ao owner da BU (Kazadem2@gmail.com) ou ao owner global
// (contato@awq.com.br). Idempotente: pula inserts se o cliente já existir
// pelo nome (case-insensitive).

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createAccount, createLead, listAccounts, listLeads } from "@/lib/crm-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EMAILS = new Set([
  "kazadem2@gmail.com",   // Gabriel Cazadem (ENRD)
  "contato@awq.com.br",   // Miguel (owner)
]);
const OWNER_NAME = "Gabriel Cazadem";

type SeedEntry = {
  nome: string;
  contact: string;
  email: string | null;
  phone: string | null;
  segmento: string;
  mrr: number;
};

const ENTRIES: SeedEntry[] = [
  {
    nome:    "Coral Home",
    contact: "Coral Home — contato comercial",
    email:   null,
    phone:   null,
    segmento:"Casa & Decor",
    mrr:     1500,
  },
];

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
  const results: Array<Record<string, unknown>> = [];
  const diagnostics: Record<string, unknown> = {};

  // Idempotência
  let existingAccountNames = new Set<string>();
  try {
    const accs = await listAccounts({ bu: "ENRD" });
    existingAccountNames = new Set(accs.map(a => a.account_name.toLowerCase().trim()));
  } catch (err) { diagnostics.listAccounts = String(err); }

  let existingLeadCompanies = new Set<string>();
  try {
    const leads = await listLeads({ bu: "ENRD" });
    existingLeadCompanies = new Set(leads.map(l => l.company_name.toLowerCase().trim()));
  } catch (err) { diagnostics.listLeads = String(err); }

  for (const e of ENTRIES) {
    const entryResult: Record<string, unknown> = { nome: e.nome };
    const key = e.nome.toLowerCase().trim();
    const annualRevenue = e.mrr * 12;

    // CRM Account (crm_accounts) — aparece em /crm/accounts e dashboard CRM
    if (existingAccountNames.has(key)) {
      entryResult.account = "skipped (já existe)";
    } else {
      try {
        const account = await createAccount({
          account_name:            e.nome,
          industry:                e.segmento,
          account_type:            "customer",
          bu:                      "ENRD",
          owner:                   OWNER_NAME,
          annual_revenue_estimate: annualRevenue,
          health_score:            80,
          churn_risk:              "low",
          created_by:              runBy,
        });
        entryResult.account = { account_id: account.account_id, bu: account.bu };
      } catch (err) {
        entryResult.account = { error: String(err) };
      }
    }

    // CRM Lead (crm_leads) — aparece em /crm/leads?bu=ENRD
    if (existingLeadCompanies.has(key)) {
      entryResult.lead = "skipped (já existe)";
    } else {
      try {
        const lead = await createLead({
          lead_source:    "manual",
          company_name:   e.nome,
          contact_name:   e.contact,
          email:          e.email,
          phone:          e.phone,
          job_title:      null,
          bu:             "ENRD",
          lead_score:     85,
          status:         "converted",
          bant_budget:    annualRevenue,
          bant_authority: true,
          bant_need:      "high",
          bant_timeline:  "now",
          assigned_to:    OWNER_NAME,
          qualification_notes:
            `Cliente recorrente ENRD · MRR R$${e.mrr.toFixed(2)} · tabela R$1.750 · desconto R$250/mês. Lançado por ${runBy}.`,
          created_by:     runBy,
        });
        entryResult.lead = { lead_id: lead.lead_id, bu: lead.bu, status: lead.status };
      } catch (err) {
        entryResult.lead = { error: String(err) };
      }
    }

    results.push(entryResult);
  }

  return NextResponse.json({
    ok:        true,
    runBy,
    runAt:     new Date().toISOString(),
    summary:   `${results.length} entrada(s) processada(s)`,
    diagnostics,
    results,
  });
}
