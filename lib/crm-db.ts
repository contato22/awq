// ─── AWQ CRM — Database Layer (Neon Postgres) ────────────────────────────────
// Mirrors pattern of jacqes-crm-db.ts.
// Uses sql from lib/db.ts — falls back to seed arrays when DATABASE_URL unset.

import { sql } from "@/lib/db";
import type {
  CrmAccount, CrmContact, CrmLead, CrmOpportunity,
  CrmActivity, CrmDashboardMetrics, CrmPipelineMetrics,
  EmailTemplate, EmailSequence, EmailEnrollment, EmailLog,
} from "@/lib/crm-types";

// ─── Schema Bootstrap ─────────────────────────────────────────────────────────
export async function initCrmDB(): Promise<void> {
  if (!sql) return;
  // Tables are created via awq_crm_full_schema.sql run once in Neon.
  // This function is a no-op placeholder kept for API route parity.
}

// ─── Seed Data (static/no-DB fallback) ───────────────────────────────────────
export const SEED_ACCOUNTS: CrmAccount[] = [
  { account_id:"a1", account_code:"ACC-001", account_name:"XP Investimentos S.A.", trade_name:"XP Investimentos", document_number:"02.332.886/0001-04", industry:"finance", company_size:"500+", annual_revenue_estimate:null, website:"https://xpi.com.br", linkedin_url:null, address_street:null, address_city:"São Paulo", address_state:"SP", address_zip:null, account_type:"customer", bu:"CAZA", owner:"Miguel", health_score:88, churn_risk:"low", renewal_date:null, epm_customer_id:null, created_at:"2026-01-01T00:00:00Z", updated_at:"2026-04-01T00:00:00Z", created_by:"Miguel", open_opportunities:2, last_activity_at:"2026-04-25T00:00:00Z" },
  { account_id:"a2", account_code:"ACC-002", account_name:"Nu Pagamentos S.A.", trade_name:"Nubank", document_number:"18.236.120/0001-58", industry:"finance", company_size:"500+", annual_revenue_estimate:null, website:"https://nubank.com.br", linkedin_url:null, address_street:null, address_city:"São Paulo", address_state:"SP", address_zip:null, account_type:"customer", bu:"CAZA", owner:"Danilo", health_score:82, churn_risk:"low", renewal_date:null, epm_customer_id:null, created_at:"2026-01-15T00:00:00Z", updated_at:"2026-04-01T00:00:00Z", created_by:"Danilo", open_opportunities:1, last_activity_at:"2026-04-23T00:00:00Z" },
  { account_id:"a3", account_code:"ACC-003", account_name:"Colégio CEM", trade_name:"Colégio CEM", document_number:"60.621.457/0001-99", industry:"education", company_size:"51-200", annual_revenue_estimate:null, website:null, linkedin_url:null, address_street:null, address_city:"São Paulo", address_state:"SP", address_zip:null, account_type:"customer", bu:"CAZA", owner:"Miguel", health_score:75, churn_risk:"medium", renewal_date:"2026-12-31", epm_customer_id:null, created_at:"2026-02-01T00:00:00Z", updated_at:"2026-04-01T00:00:00Z", created_by:"Miguel", open_opportunities:1, last_activity_at:"2026-04-20T00:00:00Z" },
  { account_id:"a4", account_code:"ACC-004", account_name:"Reabilicor Clínica Cardíaca", trade_name:"Reabilicor", document_number:"12.345.678/0001-00", industry:"health", company_size:"11-50", annual_revenue_estimate:null, website:null, linkedin_url:null, address_street:null, address_city:"Rio de Janeiro", address_state:"RJ", address_zip:null, account_type:"prospect", bu:"ADVISOR", owner:"Danilo", health_score:60, churn_risk:"medium", renewal_date:null, epm_customer_id:null, created_at:"2026-03-01T00:00:00Z", updated_at:"2026-04-01T00:00:00Z", created_by:"Danilo", open_opportunities:1, last_activity_at:"2026-04-22T00:00:00Z" },
  { account_id:"a5", account_code:"ACC-005", account_name:"Clínica Teresópolis", trade_name:"Clínica Teresópolis", document_number:"98.765.432/0001-11", industry:"health", company_size:"11-50", annual_revenue_estimate:null, website:null, linkedin_url:null, address_street:null, address_city:"Teresópolis", address_state:"RJ", address_zip:null, account_type:"customer", bu:"ADVISOR", owner:"Danilo", health_score:72, churn_risk:"low", renewal_date:null, epm_customer_id:null, created_at:"2026-02-15T00:00:00Z", updated_at:"2026-04-01T00:00:00Z", created_by:"Danilo", open_opportunities:0, last_activity_at:null },
  { account_id:"a6", account_code:"ACC-006", account_name:"Carol Bertolini", trade_name:"Carol Bertolini", document_number:"11.111.111/0001-22", industry:"media", company_size:"1-10", annual_revenue_estimate:null, website:null, linkedin_url:null, address_street:null, address_city:"São Paulo", address_state:"SP", address_zip:null, account_type:"customer", bu:"JACQES", owner:"Miguel", health_score:91, churn_risk:"low", renewal_date:null, epm_customer_id:null, created_at:"2026-01-10T00:00:00Z", updated_at:"2026-04-15T00:00:00Z", created_by:"Miguel", open_opportunities:0, last_activity_at:"2026-04-15T00:00:00Z" },
];

export const SEED_CONTACTS: CrmContact[] = [
  { contact_id:"c1", account_id:"a1", account_name:"XP Investimentos", full_name:"João Silva", email:"joao.silva@xpi.com.br", phone:"11 3456-7890", mobile:null, job_title:"Head of Marketing", department:"Marketing", seniority:"director", linkedin_url:null, is_primary_contact:true, contact_preferences:["email","phone"], created_at:"2026-01-01T00:00:00Z", updated_at:"2026-01-01T00:00:00Z" },
  { contact_id:"c2", account_id:"a2", account_name:"Nubank", full_name:"Carlos Mendes", email:"carlos.mendes@nubank.com.br", phone:"11 4567-8901", mobile:null, job_title:"VP Marketing", department:"Marketing", seniority:"director", linkedin_url:null, is_primary_contact:true, contact_preferences:["email"], created_at:"2026-01-15T00:00:00Z", updated_at:"2026-01-15T00:00:00Z" },
  { contact_id:"c3", account_id:"a3", account_name:"Colégio CEM", full_name:"Fernanda Costa", email:"fernanda@colegiocm.com.br", phone:"11 5678-9012", mobile:null, job_title:"Diretora Pedagógica", department:"Diretoria", seniority:"c_level", linkedin_url:null, is_primary_contact:true, contact_preferences:["phone","whatsapp"], created_at:"2026-02-01T00:00:00Z", updated_at:"2026-02-01T00:00:00Z" },
  { contact_id:"c4", account_id:"a4", account_name:"Reabilicor", full_name:"Dr. Roberto Silva", email:"roberto@reabilicor.com.br", phone:"21 6789-0123", mobile:null, job_title:"Diretor Médico", department:"Diretoria", seniority:"c_level", linkedin_url:null, is_primary_contact:true, contact_preferences:["phone"], created_at:"2026-03-01T00:00:00Z", updated_at:"2026-03-01T00:00:00Z" },
  { contact_id:"c5", account_id:"a5", account_name:"Clínica Teresópolis", full_name:"Dra. Aline Duarte", email:"aline@clinicateresopolis.com.br", phone:"24 7890-1234", mobile:null, job_title:"Sócia Fundadora", department:"Diretoria", seniority:"c_level", linkedin_url:null, is_primary_contact:true, contact_preferences:["whatsapp"], created_at:"2026-02-15T00:00:00Z", updated_at:"2026-02-15T00:00:00Z" },
  { contact_id:"c6", account_id:"a6", account_name:"Carol Bertolini", full_name:"Carol Bertolini", email:"carol@carolbertolini.com.br", phone:"11 9999-0000", mobile:null, job_title:"Artista", department:"Pessoal", seniority:"c_level", linkedin_url:null, is_primary_contact:true, contact_preferences:["whatsapp","email"], created_at:"2026-01-10T00:00:00Z", updated_at:"2026-01-10T00:00:00Z" },
];

export const SEED_LEADS: CrmLead[] = [
  { lead_id:"l1", lead_source:"inbound", company_name:"Tech Solutions BR", contact_name:"Rafael Moura", email:"rafael@techsolutions.com.br", phone:"11 9999-0001", job_title:"CEO", bu:"JACQES", lead_score:75, status:"qualified", qualification_notes:"Grande interesse em gestão de mídias sociais", bant_budget:25000, bant_authority:true, bant_need:"high", bant_timeline:"2026-05-30", assigned_to:"Miguel", converted_to_opportunity_id:null, converted_at:null, created_at:"2026-04-01T10:00:00Z", updated_at:"2026-04-10T10:00:00Z", created_by:"Miguel" },
  { lead_id:"l2", lead_source:"referral", company_name:"HealthFirst Clínicas", contact_name:"Dra. Sandra Lima", email:"sandra@healthfirst.com.br", phone:"21 9888-0002", job_title:"Sócia", bu:"ADVISOR", lead_score:60, status:"contacted", qualification_notes:"Interesse em consultoria estratégica", bant_budget:40000, bant_authority:true, bant_need:"medium", bant_timeline:"2026-06-15", assigned_to:"Danilo", converted_to_opportunity_id:null, converted_at:null, created_at:"2026-04-05T10:00:00Z", updated_at:"2026-04-12T10:00:00Z", created_by:"Danilo" },
  { lead_id:"l3", lead_source:"organic", company_name:"Esporte Clube Nacional", contact_name:"Lucas Ferreira", email:"lucas@ecnacional.com.br", phone:"11 9777-0003", job_title:"Dir. de Marketing", bu:"CAZA", lead_score:40, status:"new", qualification_notes:null, bant_budget:15000, bant_authority:false, bant_need:"low", bant_timeline:null, assigned_to:"Miguel", converted_to_opportunity_id:null, converted_at:null, created_at:"2026-04-15T10:00:00Z", updated_at:"2026-04-15T10:00:00Z", created_by:"Miguel" },
  { lead_id:"l4", lead_source:"manual", company_name:"Fintechx", contact_name:"Ana Rocha", email:"ana@fintechx.io", phone:"11 9666-0004", job_title:"CMO", bu:"JACQES", lead_score:85, status:"qualified", qualification_notes:"Quer escalar social media para campanha de lançamento", bant_budget:60000, bant_authority:true, bant_need:"high", bant_timeline:"2026-05-15", assigned_to:"Miguel", converted_to_opportunity_id:null, converted_at:null, created_at:"2026-04-18T10:00:00Z", updated_at:"2026-04-20T10:00:00Z", created_by:"Miguel" },
  { lead_id:"l5", lead_source:"paid", company_name:"Construtora Viva", contact_name:"Pedro Andrade", email:"pedro@construtoraviva.com.br", phone:"31 9555-0005", job_title:"Gerente", bu:"CAZA", lead_score:30, status:"unqualified", qualification_notes:"Orçamento muito abaixo do escopo", bant_budget:5000, bant_authority:false, bant_need:"low", bant_timeline:null, assigned_to:"Danilo", converted_to_opportunity_id:null, converted_at:null, created_at:"2026-04-10T10:00:00Z", updated_at:"2026-04-14T10:00:00Z", created_by:"Danilo" },
];

export const SEED_OPPORTUNITIES: CrmOpportunity[] = [
  { opportunity_id:"o1", opportunity_code:"OPP-001", opportunity_name:"XP Q2 — Campanha Performance", account_id:"a1", account_name:"XP Investimentos", contact_id:"c1", contact_name:"João Silva", bu:"CAZA", stage:"discovery", deal_value:120000, probability:25, expected_close_date:"2026-06-30", actual_close_date:null, lost_reason:null, lost_to_competitor:null, win_reason:null, owner:"Miguel", proposal_sent_date:null, proposal_viewed:false, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-04-01T10:00:00Z", updated_at:"2026-04-10T10:00:00Z", created_by:"Miguel" },
  { opportunity_id:"o2", opportunity_code:"OPP-002", opportunity_name:"Nubank — Vídeo Institucional", account_id:"a2", account_name:"Nubank", contact_id:"c2", contact_name:"Carlos Mendes", bu:"CAZA", stage:"qualification", deal_value:85000, probability:40, expected_close_date:"2026-05-31", actual_close_date:null, lost_reason:null, lost_to_competitor:null, win_reason:null, owner:"Danilo", proposal_sent_date:null, proposal_viewed:false, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-04-03T10:00:00Z", updated_at:"2026-04-12T10:00:00Z", created_by:"Danilo" },
  { opportunity_id:"o3", opportunity_code:"OPP-003", opportunity_name:"CEM — Produção Anual 2026", account_id:"a3", account_name:"Colégio CEM", contact_id:"c3", contact_name:"Fernanda Costa", bu:"CAZA", stage:"proposal", deal_value:35000, probability:60, expected_close_date:"2026-05-15", actual_close_date:null, lost_reason:null, lost_to_competitor:null, win_reason:null, owner:"Miguel", proposal_sent_date:"2026-04-20", proposal_viewed:true, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-04-05T10:00:00Z", updated_at:"2026-04-20T10:00:00Z", created_by:"Miguel" },
  { opportunity_id:"o4", opportunity_code:"OPP-004", opportunity_name:"Reabilicor — Consultoria Estratégica", account_id:"a4", account_name:"Reabilicor", contact_id:"c4", contact_name:"Dr. Roberto Silva", bu:"ADVISOR", stage:"negotiation", deal_value:95000, probability:75, expected_close_date:"2026-05-10", actual_close_date:null, lost_reason:null, lost_to_competitor:null, win_reason:null, owner:"Danilo", proposal_sent_date:"2026-04-10", proposal_viewed:true, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-04-02T10:00:00Z", updated_at:"2026-04-22T10:00:00Z", created_by:"Danilo" },
  { opportunity_id:"o5", opportunity_code:"OPP-005", opportunity_name:"Carol Bertolini — Pacote Social", account_id:"a6", account_name:"Carol Bertolini", contact_id:"c6", contact_name:"Carol Bertolini", bu:"JACQES", stage:"closed_won", deal_value:18000, probability:100, expected_close_date:"2026-04-15", actual_close_date:"2026-04-15", lost_reason:null, lost_to_competitor:null, win_reason:"Relationship,Price competitive", owner:"Miguel", proposal_sent_date:"2026-04-08", proposal_viewed:true, proposal_accepted:true, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-03-25T10:00:00Z", updated_at:"2026-04-15T10:00:00Z", created_by:"Miguel" },
  { opportunity_id:"o6", opportunity_code:"OPP-006", opportunity_name:"Clínica Teresópolis — Estratégia Digital", account_id:"a5", account_name:"Clínica Teresópolis", contact_id:"c5", contact_name:"Dra. Aline Duarte", bu:"ADVISOR", stage:"closed_lost", deal_value:50000, probability:0, expected_close_date:"2026-04-20", actual_close_date:"2026-04-20", lost_reason:"Preço elevado", lost_to_competitor:null, win_reason:null, owner:"Danilo", proposal_sent_date:"2026-04-05", proposal_viewed:true, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-03-20T10:00:00Z", updated_at:"2026-04-20T10:00:00Z", created_by:"Danilo" },
  { opportunity_id:"o7", opportunity_code:"OPP-007", opportunity_name:"Fintechx — Social Media Growth", account_id:null, account_name:"Fintechx (Prospect)", contact_id:null, contact_name:null, bu:"JACQES", stage:"discovery", deal_value:60000, probability:25, expected_close_date:"2026-06-15", actual_close_date:null, lost_reason:null, lost_to_competitor:null, win_reason:null, owner:"Miguel", proposal_sent_date:null, proposal_viewed:false, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-04-21T10:00:00Z", updated_at:"2026-04-21T10:00:00Z", created_by:"Miguel" },
  { opportunity_id:"o8", opportunity_code:"OPP-008", opportunity_name:"XP — Brand Refresh Q3", account_id:"a1", account_name:"XP Investimentos", contact_id:"c1", contact_name:"João Silva", bu:"CAZA", stage:"qualification", deal_value:45000, probability:40, expected_close_date:"2026-07-31", actual_close_date:null, lost_reason:null, lost_to_competitor:null, win_reason:null, owner:"Miguel", proposal_sent_date:null, proposal_viewed:false, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-04-22T10:00:00Z", updated_at:"2026-04-22T10:00:00Z", created_by:"Miguel" },
];

export const SEED_ACTIVITIES: CrmActivity[] = [
  { activity_id:"act1", activity_type:"call", related_to_type:"opportunity", related_to_id:"o1", related_name:"XP Q2 — Campanha Performance", subject:"Discovery call — XP Q2", description:"Entendimento inicial do escopo da campanha Q2", outcome:"successful", duration_minutes:45, scheduled_at:"2026-04-25T10:00:00Z", completed_at:"2026-04-25T10:45:00Z", status:"completed", created_by:"Miguel", created_at:"2026-04-25T10:00:00Z", updated_at:"2026-04-25T10:45:00Z" },
  { activity_id:"act2", activity_type:"meeting", related_to_type:"opportunity", related_to_id:"o2", related_name:"Nubank — Vídeo Institucional", subject:"Reunião de qualificação Nubank", description:"Demo do portfólio de produção audiovisual", outcome:"successful", duration_minutes:90, scheduled_at:"2026-04-27T14:00:00Z", completed_at:"2026-04-27T15:30:00Z", status:"completed", created_by:"Danilo", created_at:"2026-04-27T14:00:00Z", updated_at:"2026-04-27T15:30:00Z" },
  { activity_id:"act3", activity_type:"email", related_to_type:"opportunity", related_to_id:"o3", related_name:"CEM — Produção Anual 2026", subject:"Proposta enviada — CEM Produção Anual", description:"Proposta completa com cronograma e valores enviada por e-mail", outcome:"successful", duration_minutes:null, scheduled_at:"2026-04-20T09:00:00Z", completed_at:"2026-04-20T09:00:00Z", status:"completed", created_by:"Miguel", created_at:"2026-04-20T09:00:00Z", updated_at:"2026-04-20T09:00:00Z" },
  { activity_id:"act4", activity_type:"call", related_to_type:"opportunity", related_to_id:"o4", related_name:"Reabilicor — Consultoria Estratégica", subject:"Negociação comercial Reabilicor", description:"Discussão de condições de pagamento e detalhamento do escopo", outcome:"successful", duration_minutes:60, scheduled_at:"2026-04-29T11:00:00Z", completed_at:"2026-04-29T12:00:00Z", status:"completed", created_by:"Danilo", created_at:"2026-04-29T11:00:00Z", updated_at:"2026-04-29T12:00:00Z" },
  { activity_id:"act5", activity_type:"task", related_to_type:"lead", related_to_id:"l4", related_name:"Fintechx — Ana Rocha", subject:"Follow-up Fintechx — enviar cases JACQES", description:"Enviar material de cases e portfólio do JACQES para Ana Rocha", outcome:null, duration_minutes:null, scheduled_at:"2026-05-02T14:00:00Z", completed_at:null, status:"scheduled", created_by:"Miguel", created_at:"2026-04-28T10:00:00Z", updated_at:"2026-04-28T10:00:00Z" },
  { activity_id:"act6", activity_type:"task", related_to_type:"opportunity", related_to_id:"o2", related_name:"Nubank — Vídeo Institucional", subject:"Preparar proposta Nubank — prazo 3 dias", description:"Elaborar proposta detalhada incluindo cronograma de produção e orçamento", outcome:null, duration_minutes:null, scheduled_at:"2026-05-03T09:00:00Z", completed_at:null, status:"scheduled", created_by:"Danilo", created_at:"2026-04-28T08:00:00Z", updated_at:"2026-04-28T08:00:00Z" },
];

// ─── Account CRUD ─────────────────────────────────────────────────────────────

export async function listAccounts(filters?: { search?: string; account_type?: string; bu?: string; owner?: string }): Promise<CrmAccount[]> {
  if (!sql) {
    let rows = [...SEED_ACCOUNTS];
    if (filters?.account_type) rows = rows.filter(r => r.account_type === filters.account_type);
    if (filters?.bu) rows = rows.filter(r => r.bu === filters.bu);
    if (filters?.owner) rows = rows.filter(r => r.owner === filters.owner);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      rows = rows.filter(r => r.account_name.toLowerCase().includes(s) || (r.trade_name ?? "").toLowerCase().includes(s));
    }
    return rows;
  }
  const rows = await sql`
    SELECT a.*,
      COUNT(DISTINCT o.opportunity_id) FILTER (WHERE o.stage NOT IN ('closed_won','closed_lost')) AS open_opportunities,
      MAX(act.created_at) AS last_activity_at
    FROM crm_accounts a
    LEFT JOIN crm_opportunities o   ON o.account_id = a.account_id
    LEFT JOIN crm_activities   act  ON act.related_to_type = 'account' AND act.related_to_id = a.account_id
    WHERE (${filters?.account_type ?? null}::text IS NULL OR a.account_type = ${filters?.account_type ?? null})
      AND (${filters?.bu ?? null}::text IS NULL OR a.bu = ${filters?.bu ?? null})
      AND (${filters?.owner ?? null}::text IS NULL OR a.owner = ${filters?.owner ?? null})
      AND (${filters?.search ?? null}::text IS NULL
           OR a.account_name ILIKE ${'%' + (filters?.search ?? '') + '%'}
           OR a.trade_name   ILIKE ${'%' + (filters?.search ?? '') + '%'})
    GROUP BY a.account_id
    ORDER BY a.account_name
  `;
  return rows as CrmAccount[];
}

export async function getAccount(id: string): Promise<CrmAccount | null> {
  if (!sql) return SEED_ACCOUNTS.find(a => a.account_id === id) ?? null;
  const rows = await sql`SELECT * FROM crm_accounts WHERE account_id = ${id}`;
  return (rows[0] as CrmAccount) ?? null;
}

export async function createAccount(data: Partial<CrmAccount>): Promise<CrmAccount> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_accounts (account_name, trade_name, document_number, industry, company_size,
      annual_revenue_estimate, website, linkedin_url, address_street, address_city, address_state,
      address_zip, account_type, owner, health_score, churn_risk, renewal_date, created_by)
    VALUES (${data.account_name!}, ${data.trade_name ?? null}, ${data.document_number ?? null},
      ${data.industry ?? null}, ${data.company_size ?? null}, ${data.annual_revenue_estimate ?? null},
      ${data.website ?? null}, ${data.linkedin_url ?? null}, ${data.address_street ?? null},
      ${data.address_city ?? null}, ${data.address_state ?? null}, ${data.address_zip ?? null},
      ${data.account_type ?? 'prospect'}, ${data.owner ?? 'Miguel'},
      ${data.health_score ?? 70}, ${data.churn_risk ?? 'low'}, ${data.renewal_date ?? null},
      ${data.created_by ?? null})
    RETURNING *
  `;
  return rows[0] as CrmAccount;
}

export async function updateAccount(id: string, data: Partial<CrmAccount>): Promise<CrmAccount> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE crm_accounts SET
      account_name = COALESCE(${data.account_name ?? null}, account_name),
      trade_name   = COALESCE(${data.trade_name ?? null}, trade_name),
      industry     = COALESCE(${data.industry ?? null}, industry),
      company_size = COALESCE(${data.company_size ?? null}, company_size),
      account_type = COALESCE(${data.account_type ?? null}, account_type),
      owner        = COALESCE(${data.owner ?? null}, owner),
      health_score = COALESCE(${data.health_score ?? null}, health_score),
      churn_risk   = COALESCE(${data.churn_risk ?? null}, churn_risk),
      website      = COALESCE(${data.website ?? null}, website),
      address_city = COALESCE(${data.address_city ?? null}, address_city),
      address_state= COALESCE(${data.address_state ?? null}, address_state),
      renewal_date = COALESCE(${data.renewal_date ?? null}, renewal_date),
      updated_at   = NOW()
    WHERE account_id = ${id}
    RETURNING *
  `;
  return rows[0] as CrmAccount;
}

// ─── Contact CRUD ─────────────────────────────────────────────────────────────

export async function listContacts(filters?: { account_id?: string; search?: string }): Promise<CrmContact[]> {
  if (!sql) {
    let rows = [...SEED_CONTACTS];
    if (filters?.account_id) rows = rows.filter(r => r.account_id === filters.account_id);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      rows = rows.filter(r => r.full_name.toLowerCase().includes(s) || (r.email ?? "").toLowerCase().includes(s));
    }
    return rows;
  }
  const rows = await sql`
    SELECT c.*, a.account_name FROM crm_contacts c
    LEFT JOIN crm_accounts a ON a.account_id = c.account_id
    WHERE (${filters?.account_id ?? null}::uuid IS NULL OR c.account_id = ${filters?.account_id ?? null}::uuid)
      AND (${filters?.search ?? null}::text IS NULL
           OR c.full_name ILIKE ${'%' + (filters?.search ?? '') + '%'}
           OR c.email     ILIKE ${'%' + (filters?.search ?? '') + '%'})
    ORDER BY c.full_name
  `;
  return rows as CrmContact[];
}

export async function createContact(data: Partial<CrmContact>): Promise<CrmContact> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_contacts (account_id, full_name, email, phone, mobile, job_title, department,
      seniority, linkedin_url, is_primary_contact, contact_preferences)
    VALUES (${data.account_id ?? null}, ${data.full_name!}, ${data.email ?? null},
      ${data.phone ?? null}, ${data.mobile ?? null}, ${data.job_title ?? null},
      ${data.department ?? null}, ${data.seniority ?? 'manager'}, ${data.linkedin_url ?? null},
      ${data.is_primary_contact ?? false}, ${data.contact_preferences ?? []})
    RETURNING *
  `;
  return rows[0] as CrmContact;
}

// ─── Lead CRUD ────────────────────────────────────────────────────────────────

export async function listLeads(filters?: { status?: string; bu?: string; assigned_to?: string }): Promise<CrmLead[]> {
  if (!sql) {
    let rows = [...SEED_LEADS];
    if (filters?.status) rows = rows.filter(r => r.status === filters.status);
    if (filters?.bu) rows = rows.filter(r => r.bu === filters.bu);
    if (filters?.assigned_to) rows = rows.filter(r => r.assigned_to === filters.assigned_to);
    return rows;
  }
  const rows = await sql`
    SELECT * FROM crm_leads
    WHERE (${filters?.status ?? null}::text IS NULL OR status = ${filters?.status ?? null})
      AND (${filters?.bu ?? null}::text IS NULL OR bu = ${filters?.bu ?? null})
      AND (${filters?.assigned_to ?? null}::text IS NULL OR assigned_to = ${filters?.assigned_to ?? null})
    ORDER BY created_at DESC
  `;
  return rows as CrmLead[];
}

export async function getLead(id: string): Promise<CrmLead | null> {
  if (!sql) return SEED_LEADS.find(l => l.lead_id === id) ?? null;
  const rows = await sql`SELECT * FROM crm_leads WHERE lead_id = ${id}`;
  return (rows[0] as CrmLead) ?? null;
}

export async function createLead(data: Partial<CrmLead>): Promise<CrmLead> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_leads (lead_source, company_name, contact_name, email, phone, job_title,
      bu, lead_score, status, qualification_notes, bant_budget, bant_authority, bant_need,
      bant_timeline, assigned_to, created_by)
    VALUES (${data.lead_source ?? 'manual'}, ${data.company_name!}, ${data.contact_name!},
      ${data.email ?? null}, ${data.phone ?? null}, ${data.job_title ?? null},
      ${data.bu ?? 'JACQES'}, ${data.lead_score ?? 0}, ${data.status ?? 'new'},
      ${data.qualification_notes ?? null}, ${data.bant_budget ?? null},
      ${data.bant_authority ?? false}, ${data.bant_need ?? null}, ${data.bant_timeline ?? null},
      ${data.assigned_to ?? 'Miguel'}, ${data.created_by ?? null})
    RETURNING *
  `;
  return rows[0] as CrmLead;
}

export async function updateLead(id: string, data: Partial<CrmLead>): Promise<CrmLead> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE crm_leads SET
      status              = COALESCE(${data.status ?? null}, status),
      lead_score          = COALESCE(${data.lead_score ?? null}, lead_score),
      qualification_notes = COALESCE(${data.qualification_notes ?? null}, qualification_notes),
      bant_budget         = COALESCE(${data.bant_budget ?? null}, bant_budget),
      bant_authority      = COALESCE(${data.bant_authority ?? null}, bant_authority),
      bant_need           = COALESCE(${data.bant_need ?? null}, bant_need),
      bant_timeline       = COALESCE(${data.bant_timeline ?? null}, bant_timeline),
      assigned_to         = COALESCE(${data.assigned_to ?? null}, assigned_to),
      updated_at          = NOW()
    WHERE lead_id = ${id}
    RETURNING *
  `;
  return rows[0] as CrmLead;
}

export async function getContact(id: string): Promise<CrmContact | null> {
  if (!sql) return SEED_CONTACTS.find(c => c.contact_id === id) ?? null;
  const rows = await sql`
    SELECT c.*, a.account_name FROM crm_contacts c
    LEFT JOIN crm_accounts a ON a.account_id = c.account_id
    WHERE c.contact_id = ${id}
  `;
  return (rows[0] as CrmContact) ?? null;
}

export async function convertLead(leadId: string, oppData: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  if (!sql) {
    const newOpp: CrmOpportunity = {
      opportunity_id: `opp-${leadId}-${Date.now()}`,
      opportunity_code: `OPP-${String(SEED_OPPORTUNITIES.length + 1).padStart(3, "0")}`,
      opportunity_name: oppData.opportunity_name ?? "Nova Oportunidade",
      account_id: null, account_name: undefined, contact_id: null, contact_name: null,
      bu: oppData.bu ?? "JACQES",
      stage: "discovery", deal_value: oppData.deal_value ?? 0, probability: 25,
      expected_close_date: null, actual_close_date: null,
      lost_reason: null, lost_to_competitor: null, win_reason: null,
      owner: oppData.owner ?? "Miguel",
      proposal_sent_date: null, proposal_viewed: false, proposal_accepted: false,
      synced_to_epm: false, epm_customer_id: null, epm_ar_id: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      created_by: oppData.owner ?? "Miguel",
    };
    return newOpp;
  }
  const opp = await sql`
    INSERT INTO crm_opportunities (opportunity_name, bu, stage, deal_value, probability,
      expected_close_date, owner, created_by)
    VALUES (${oppData.opportunity_name!}, ${oppData.bu ?? 'JACQES'}, 'discovery',
      ${oppData.deal_value ?? 0}, 25, ${oppData.expected_close_date ?? null},
      ${oppData.owner ?? 'Miguel'}, ${oppData.owner ?? 'Miguel'})
    RETURNING *
  `;
  await sql`
    UPDATE crm_leads SET
      status = 'converted',
      converted_to_opportunity_id = ${opp[0].opportunity_id},
      converted_at = NOW(),
      updated_at   = NOW()
    WHERE lead_id = ${leadId}
  `;
  return opp[0] as CrmOpportunity;
}

// ─── Opportunity CRUD ─────────────────────────────────────────────────────────

export async function listOpportunities(filters?: { stage?: string; bu?: string; owner?: string; account_id?: string }): Promise<CrmOpportunity[]> {
  if (!sql) {
    let rows = [...SEED_OPPORTUNITIES];
    if (filters?.stage) rows = rows.filter(r => r.stage === filters.stage);
    if (filters?.bu) rows = rows.filter(r => r.bu === filters.bu);
    if (filters?.owner) rows = rows.filter(r => r.owner === filters.owner);
    if (filters?.account_id) rows = rows.filter(r => r.account_id === filters.account_id);
    return rows;
  }
  const rows = await sql`
    SELECT o.*, a.account_name,
      CONCAT(c.full_name) AS contact_name
    FROM crm_opportunities o
    LEFT JOIN crm_accounts a ON a.account_id = o.account_id
    LEFT JOIN crm_contacts c ON c.contact_id = o.contact_id
    WHERE (${filters?.stage ?? null}::text IS NULL OR o.stage = ${filters?.stage ?? null})
      AND (${filters?.bu ?? null}::text IS NULL OR o.bu = ${filters?.bu ?? null})
      AND (${filters?.owner ?? null}::text IS NULL OR o.owner = ${filters?.owner ?? null})
      AND (${filters?.account_id ?? null}::uuid IS NULL OR o.account_id = ${filters?.account_id ?? null}::uuid)
    ORDER BY o.created_at DESC
  `;
  return rows as CrmOpportunity[];
}

export async function getOpportunity(id: string): Promise<CrmOpportunity | null> {
  if (!sql) return SEED_OPPORTUNITIES.find(o => o.opportunity_id === id) ?? null;
  const rows = await sql`
    SELECT o.*, a.account_name, c.full_name AS contact_name
    FROM crm_opportunities o
    LEFT JOIN crm_accounts a ON a.account_id = o.account_id
    LEFT JOIN crm_contacts c ON c.contact_id = o.contact_id
    WHERE o.opportunity_id = ${id}
  `;
  return (rows[0] as CrmOpportunity) ?? null;
}

export async function createOpportunity(data: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_opportunities (opportunity_name, account_id, contact_id, bu, stage,
      deal_value, expected_close_date, owner, proposal_sent_date, created_by)
    VALUES (${data.opportunity_name!}, ${data.account_id ?? null}, ${data.contact_id ?? null},
      ${data.bu!}, ${data.stage ?? 'discovery'}, ${data.deal_value ?? 0},
      ${data.expected_close_date ?? null}, ${data.owner ?? 'Miguel'},
      ${data.proposal_sent_date ?? null}, ${data.owner ?? 'Miguel'})
    RETURNING *
  `;
  return rows[0] as CrmOpportunity;
}

export async function updateOpportunity(id: string, data: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE crm_opportunities SET
      stage               = COALESCE(${data.stage ?? null}, stage),
      deal_value          = COALESCE(${data.deal_value ?? null}, deal_value),
      expected_close_date = COALESCE(${data.expected_close_date ?? null}, expected_close_date),
      lost_reason         = COALESCE(${data.lost_reason ?? null}, lost_reason),
      win_reason          = COALESCE(${data.win_reason ?? null}, win_reason),
      owner               = COALESCE(${data.owner ?? null}, owner),
      proposal_sent_date  = COALESCE(${data.proposal_sent_date ?? null}, proposal_sent_date),
      synced_to_epm       = COALESCE(${data.synced_to_epm ?? null}, synced_to_epm),
      updated_at          = NOW()
    WHERE opportunity_id = ${id}
    RETURNING *
  `;
  return rows[0] as CrmOpportunity;
}

// ─── Activity CRUD ────────────────────────────────────────────────────────────

export async function listActivities(filters?: { related_to_type?: string; related_to_id?: string; created_by?: string }): Promise<CrmActivity[]> {
  if (!sql) {
    let rows = [...SEED_ACTIVITIES];
    if (filters?.related_to_type) rows = rows.filter(r => r.related_to_type === filters.related_to_type);
    if (filters?.related_to_id)   rows = rows.filter(r => r.related_to_id === filters.related_to_id);
    if (filters?.created_by)      rows = rows.filter(r => r.created_by === filters.created_by);
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const rows = await sql`
    SELECT * FROM crm_activities
    WHERE (${filters?.related_to_type ?? null}::text IS NULL OR related_to_type = ${filters?.related_to_type ?? null})
      AND (${filters?.related_to_id ?? null}::uuid IS NULL OR related_to_id = ${filters?.related_to_id ?? null}::uuid)
      AND (${filters?.created_by ?? null}::text IS NULL OR created_by = ${filters?.created_by ?? null})
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return rows as CrmActivity[];
}

export async function createActivity(data: Partial<CrmActivity>): Promise<CrmActivity> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_activities (activity_type, related_to_type, related_to_id, subject,
      description, outcome, duration_minutes, scheduled_at, status, created_by)
    VALUES (${data.activity_type!}, ${data.related_to_type!}, ${data.related_to_id!},
      ${data.subject!}, ${data.description ?? null}, ${data.outcome ?? null},
      ${data.duration_minutes ?? null}, ${data.scheduled_at ?? null},
      ${data.status ?? 'scheduled'}, ${data.created_by ?? 'Miguel'})
    RETURNING *
  `;
  return rows[0] as CrmActivity;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getPipelineMetrics(): Promise<CrmPipelineMetrics> {
  const opps = await listOpportunities();
  const open = opps.filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost');
  const stages = ['discovery','qualification','proposal','negotiation'];
  const byStage: CrmPipelineMetrics['byStage'] = {};
  for (const stage of stages) {
    const s = open.filter(o => o.stage === stage);
    byStage[stage] = {
      count: s.length,
      value: s.reduce((sum, o) => sum + o.deal_value, 0),
      weighted: s.reduce((sum, o) => sum + o.deal_value * o.probability / 100, 0),
    };
  }
  return {
    byStage,
    totalPipeline: open.reduce((sum, o) => sum + o.deal_value, 0),
    weightedForecast: open.reduce((sum, o) => sum + o.deal_value * o.probability / 100, 0),
    openDeals: open.length,
  };
}

export async function getDashboardMetrics(): Promise<CrmDashboardMetrics> {
  const [leads, opps, activities] = await Promise.all([
    listLeads(),
    listOpportunities(),
    listActivities(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const open = opps.filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost');
  const wonThisMonth = opps.filter(o => o.stage === 'closed_won' && (o.actual_close_date ?? '') >= monthStart);
  const closedAll = opps.filter(o => o.stage === 'closed_won' || o.stage === 'closed_lost');
  const tasksToday = activities.filter(a => a.status === 'scheduled' && a.scheduled_at && a.scheduled_at.slice(0, 10) === today);
  return {
    leadsNew: leads.filter(l => l.status === 'new').length,
    openOpportunities: open.length,
    pipelineValue: open.reduce((s, o) => s + o.deal_value, 0),
    weightedForecast: open.reduce((s, o) => s + o.deal_value * o.probability / 100, 0),
    closedWonThisMonth: wonThisMonth.length,
    revenueThisMonth: wonThisMonth.reduce((s, o) => s + o.deal_value, 0),
    winRate: closedAll.length > 0 ? Math.round(opps.filter(o => o.stage === 'closed_won').length / closedAll.length * 100) : 0,
    tasksToday,
  };
}

// =============================================================================
// EMAIL — Templates
// =============================================================================

export const SEED_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    template_id: "tpl-1", template_code: "TPL-001", name: "Primeiro contato — Prospecção",
    category: "prospecting", bu: "ALL",
    subject: "{{empresa}} + AWQ Group — Oportunidade de crescimento",
    body_text: `Olá {{nome}},\n\nMeu nome é {{remetente}} e faço parte do time da AWQ Group.\n\nIdentifiquei que a {{empresa}} pode se beneficiar das nossas soluções de {{servico}}. Temos ajudado empresas como a sua a alcançar resultados expressivos em pouco tempo.\n\nGostaria de agendar uma conversa de 20 minutos para entender melhor seus objetivos. Você teria disponibilidade essa semana?\n\n{{link_agendamento}}\n\nAtenciosamente,\n{{remetente}}`,
    variables: ["{{nome}}", "{{empresa}}", "{{remetente}}", "{{servico}}", "{{link_agendamento}}"],
    is_active: true, times_used: 12,
    created_by: "Miguel", created_at: "2026-01-10T10:00:00Z", updated_at: "2026-03-15T10:00:00Z",
  },
  {
    template_id: "tpl-2", template_code: "TPL-002", name: "Follow-up pós reunião",
    category: "follow_up", bu: "ALL",
    subject: "Próximos passos — {{empresa}}",
    body_text: `Olá {{nome}},\n\nFoi um prazer conversar com você hoje!\n\nComo combinamos, segue um resumo dos próximos passos:\n\n{{proximos_passos}}\n\nQualquer dúvida, estou à disposição.\n\nAbraços,\n{{remetente}}`,
    variables: ["{{nome}}", "{{empresa}}", "{{remetente}}", "{{proximos_passos}}"],
    is_active: true, times_used: 28,
    created_by: "Danilo", created_at: "2026-01-15T10:00:00Z", updated_at: "2026-04-01T10:00:00Z",
  },
  {
    template_id: "tpl-3", template_code: "TPL-003", name: "Envio de proposta",
    category: "proposal", bu: "ALL",
    subject: "Proposta comercial — {{nome_proposta}}",
    body_text: `Olá {{nome}},\n\nSegue em anexo a proposta comercial que preparamos especialmente para a {{empresa}}.\n\nA proposta contempla:\n{{itens_proposta}}\n\nValor total: {{valor}}\nValidade: {{validade}}\n\nEstou disponível para tirar dúvidas e discutir os detalhes. Podemos agendar uma call para a semana que vem?\n\n{{link_agendamento}}\n\nAtenciosamente,\n{{remetente}}`,
    variables: ["{{nome}}", "{{empresa}}", "{{nome_proposta}}", "{{itens_proposta}}", "{{valor}}", "{{validade}}", "{{link_agendamento}}", "{{remetente}}"],
    is_active: true, times_used: 9,
    created_by: "Miguel", created_at: "2026-02-01T10:00:00Z", updated_at: "2026-04-10T10:00:00Z",
  },
  {
    template_id: "tpl-4", template_code: "TPL-004", name: "Nurturing — Conteúdo de valor",
    category: "nurturing", bu: "JACQES",
    subject: "{{empresa}}: Como marcas como a sua crescem {{porcentagem}}% em 90 dias",
    body_text: `Olá {{nome}},\n\nSeparei um conteúdo que pode ser muito útil para a {{empresa}}:\n\n{{titulo_conteudo}}\n{{link_conteudo}}\n\nEsse é o tipo de estratégia que temos aplicado com nossos clientes. Caso queira saber como adaptamos isso ao seu contexto, é só responder esse e-mail.\n\nAbraços,\n{{remetente}}`,
    variables: ["{{nome}}", "{{empresa}}", "{{porcentagem}}", "{{titulo_conteudo}}", "{{link_conteudo}}", "{{remetente}}"],
    is_active: true, times_used: 5,
    created_by: "Miguel", created_at: "2026-03-01T10:00:00Z", updated_at: "2026-03-20T10:00:00Z",
  },
  {
    template_id: "tpl-5", template_code: "TPL-005", name: "Reativação — Lead sem resposta",
    category: "follow_up", bu: "ALL",
    subject: "Ainda faz sentido conversar, {{nome}}?",
    body_text: `Olá {{nome}},\n\nTentei entrar em contato algumas vezes mas não consegui retorno.\n\nEntendo que as prioridades mudam — mas caso a {{empresa}} ainda tenha interesse em {{servico}}, adoraria ter uma conversa rápida.\n\nSe não for mais o momento certo, sem problemas! Só me avise e retiro você da lista.\n\nAbraços,\n{{remetente}}`,
    variables: ["{{nome}}", "{{empresa}}", "{{servico}}", "{{remetente}}"],
    is_active: true, times_used: 7,
    created_by: "Danilo", created_at: "2026-02-20T10:00:00Z", updated_at: "2026-04-05T10:00:00Z",
  },
];

export const SEED_EMAIL_SEQUENCES: EmailSequence[] = [
  {
    sequence_id: "seq-1", name: "Prospecção Fria — 5 Passos",
    description: "Cadência de prospecção para leads novos sem contato prévio",
    bu: "ALL", trigger: "lead_created", is_active: true,
    enrolled_count: 14, created_by: "Miguel",
    created_at: "2026-02-01T00:00:00Z", updated_at: "2026-04-01T00:00:00Z",
    steps: [
      { step_id: "s1-1", sequence_id: "seq-1", step_order: 1, delay_days: 0,  template_id: "tpl-1", template_name: "Primeiro contato — Prospecção",   template_subject: "{{empresa}} + AWQ Group — Oportunidade de crescimento" },
      { step_id: "s1-2", sequence_id: "seq-1", step_order: 2, delay_days: 3,  template_id: "tpl-4", template_name: "Nurturing — Conteúdo de valor",    template_subject: "{{empresa}}: Como marcas como a sua crescem {{porcentagem}}% em 90 dias" },
      { step_id: "s1-3", sequence_id: "seq-1", step_order: 3, delay_days: 7,  template_id: "tpl-5", template_name: "Reativação — Lead sem resposta",   template_subject: "Ainda faz sentido conversar, {{nome}}?" },
    ],
  },
  {
    sequence_id: "seq-2", name: "Pós-Proposta — Nurturing",
    description: "Sequência para manter engajamento após envio de proposta",
    bu: "ALL", trigger: "opp_proposal", is_active: true,
    enrolled_count: 6, created_by: "Danilo",
    created_at: "2026-03-01T00:00:00Z", updated_at: "2026-04-10T00:00:00Z",
    steps: [
      { step_id: "s2-1", sequence_id: "seq-2", step_order: 1, delay_days: 1,  template_id: "tpl-2", template_name: "Follow-up pós reunião",  template_subject: "Próximos passos — {{empresa}}" },
      { step_id: "s2-2", sequence_id: "seq-2", step_order: 2, delay_days: 5,  template_id: "tpl-4", template_name: "Nurturing — Conteúdo de valor", template_subject: "{{empresa}}: Como marcas como a sua crescem {{porcentagem}}% em 90 dias" },
      { step_id: "s2-3", sequence_id: "seq-2", step_order: 3, delay_days: 10, template_id: "tpl-5", template_name: "Reativação — Lead sem resposta", template_subject: "Ainda faz sentido conversar, {{nome}}?" },
    ],
  },
];

export const SEED_EMAIL_LOG: EmailLog[] = [
  { log_id: "log-1", template_id: "tpl-1", template_name: "Primeiro contato — Prospecção", enrollment_id: null, sequence_name: null, related_to_type: "lead", related_to_id: "l1", related_name: "Tech Solutions BR", to_email: "rafael@techsolutions.com.br", to_name: "Rafael Moura", subject: "Tech Solutions + AWQ Group — Oportunidade de crescimento", sent_by: "Miguel", sent_at: "2026-04-20T09:00:00Z", opened_at: "2026-04-20T11:30:00Z", clicked_at: null, replied_at: null, bounced: false, status: "opened" },
  { log_id: "log-2", template_id: "tpl-3", template_name: "Envio de proposta", enrollment_id: null, sequence_name: null, related_to_type: "opportunity", related_to_id: "o3", related_name: "CEM — Produção Anual", to_email: "fernanda@colegiocm.com.br", to_name: "Fernanda Costa", subject: "Proposta comercial — CEM Produção 2026", sent_by: "Miguel", sent_at: "2026-04-21T10:05:00Z", opened_at: "2026-04-21T14:00:00Z", clicked_at: "2026-04-21T14:02:00Z", replied_at: null, bounced: false, status: "clicked" },
  { log_id: "log-3", template_id: "tpl-2", template_name: "Follow-up pós reunião", enrollment_id: "enr-1", sequence_name: "Pós-Proposta — Nurturing", related_to_type: "opportunity", related_to_id: "o4", related_name: "Reabilicor — Consultoria", to_email: "roberto@reabilicor.com.br", to_name: "Dr. Roberto Silva", subject: "Próximos passos — Reabilicor", sent_by: "Danilo", sent_at: "2026-04-22T08:00:00Z", opened_at: null, clicked_at: null, replied_at: null, bounced: false, status: "sent" },
  { log_id: "log-4", template_id: "tpl-1", template_name: "Primeiro contato — Prospecção", enrollment_id: "enr-2", sequence_name: "Prospecção Fria — 5 Passos", related_to_type: "lead", related_to_id: "l2", related_name: "HealthFirst Clínicas", to_email: "sandra@healthfirst.com.br", to_name: "Dra. Sandra Lima", subject: "HealthFirst + AWQ Group — Oportunidade de crescimento", sent_by: "Danilo", sent_at: "2026-04-18T10:00:00Z", opened_at: "2026-04-18T16:00:00Z", clicked_at: null, replied_at: "2026-04-19T09:00:00Z", bounced: false, status: "replied" },
  { log_id: "log-5", template_id: "tpl-5", template_name: "Reativação — Lead sem resposta", enrollment_id: null, sequence_name: null, related_to_type: "lead", related_to_id: "l3", related_name: "Esporte Clube Nac.", to_email: "lucas@ecnacional.com.br", to_name: "Lucas Ferreira", subject: "Ainda faz sentido conversar, Lucas?", sent_by: "Miguel", sent_at: "2026-04-15T11:00:00Z", opened_at: null, clicked_at: null, replied_at: null, bounced: true, status: "bounced" },
];

// ─── Email Template CRUD ──────────────────────────────────────────────────────

export async function listEmailTemplates(filters?: { bu?: string; category?: string; is_active?: boolean }): Promise<EmailTemplate[]> {
  if (!sql) return SEED_EMAIL_TEMPLATES;
  try {
    const rows = await sql`
      SELECT * FROM crm_email_templates
      WHERE (${filters?.bu ?? null} IS NULL OR bu IN ('ALL', ${filters?.bu ?? ''}))
        AND (${filters?.category ?? null} IS NULL OR category = ${filters?.category ?? ''})
        AND (${filters?.is_active ?? null} IS NULL OR is_active = ${filters?.is_active ?? true})
      ORDER BY created_at DESC
    `;
    return rows as EmailTemplate[];
  } catch { return SEED_EMAIL_TEMPLATES; }
}

export async function createEmailTemplate(data: Partial<EmailTemplate>): Promise<EmailTemplate> {
  if (!sql) throw new Error("DB not available");
  const code = `TPL-${String(Date.now()).slice(-4)}`;
  const rows = await sql`
    INSERT INTO crm_email_templates (template_code, name, category, bu, subject, body_text, variables, is_active, created_by)
    VALUES (${code}, ${data.name!}, ${data.category ?? 'other'}, ${data.bu ?? 'ALL'},
            ${data.subject!}, ${data.body_text!}, ${JSON.stringify(data.variables ?? [])},
            ${data.is_active ?? true}, ${data.created_by ?? 'system'})
    RETURNING *
  `;
  return rows[0] as EmailTemplate;
}

export async function updateEmailTemplate(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE crm_email_templates SET
      name       = COALESCE(${data.name ?? null}, name),
      category   = COALESCE(${data.category ?? null}, category),
      bu         = COALESCE(${data.bu ?? null}, bu),
      subject    = COALESCE(${data.subject ?? null}, subject),
      body_text  = COALESCE(${data.body_text ?? null}, body_text),
      variables  = COALESCE(${data.variables ? JSON.stringify(data.variables) : null}::jsonb, variables),
      is_active  = COALESCE(${data.is_active ?? null}, is_active),
      updated_at = NOW()
    WHERE template_id = ${id}
    RETURNING *
  `;
  return rows[0] as EmailTemplate;
}

// ─── Email Sequences ──────────────────────────────────────────────────────────

export async function listEmailSequences(filters?: { bu?: string }): Promise<EmailSequence[]> {
  if (!sql) return SEED_EMAIL_SEQUENCES;
  try {
    const seqs = await sql`
      SELECT s.*, COUNT(e.enrollment_id) as enrolled_count
      FROM crm_email_sequences s
      LEFT JOIN crm_email_enrollments e ON e.sequence_id = s.sequence_id
      WHERE (${filters?.bu ?? null} IS NULL OR s.bu IN ('ALL', ${filters?.bu ?? ''}))
      GROUP BY s.sequence_id
      ORDER BY s.created_at DESC
    ` as EmailSequence[];
    for (const seq of seqs) {
      const steps = await sql`
        SELECT ss.*, t.name as template_name, t.subject as template_subject
        FROM crm_email_sequence_steps ss
        LEFT JOIN crm_email_templates t ON t.template_id = ss.template_id
        WHERE ss.sequence_id = ${seq.sequence_id}
        ORDER BY ss.step_order
      `;
      seq.steps = steps as EmailSequenceStep[];
    }
    return seqs;
  } catch { return SEED_EMAIL_SEQUENCES; }
}

export async function createEmailSequence(data: Partial<EmailSequence> & { steps?: Partial<EmailSequenceStep>[] }): Promise<EmailSequence> {
  if (!sql) throw new Error("DB not available");
  const [seq] = await sql`
    INSERT INTO crm_email_sequences (name, description, bu, trigger, is_active, created_by)
    VALUES (${data.name!}, ${data.description ?? null}, ${data.bu ?? 'ALL'},
            ${data.trigger ?? 'manual'}, ${data.is_active ?? true}, ${data.created_by ?? 'system'})
    RETURNING *
  ` as EmailSequence[];
  if (data.steps?.length) {
    for (const step of data.steps) {
      await sql`
        INSERT INTO crm_email_sequence_steps (sequence_id, step_order, delay_days, template_id)
        VALUES (${seq.sequence_id}, ${step.step_order ?? 1}, ${step.delay_days ?? 0}, ${step.template_id!})
      `;
    }
  }
  return seq;
}

// ─── Email Log ────────────────────────────────────────────────────────────────

export async function listEmailLog(filters?: { related_to_id?: string; sent_by?: string; limit?: number }): Promise<EmailLog[]> {
  if (!sql) return SEED_EMAIL_LOG;
  try {
    const rows = await sql`
      SELECT l.*, t.name as template_name, s.name as sequence_name
      FROM crm_email_log l
      LEFT JOIN crm_email_templates t ON t.template_id = l.template_id
      LEFT JOIN crm_email_enrollments e ON e.enrollment_id = l.enrollment_id
      LEFT JOIN crm_email_sequences s ON s.sequence_id = e.sequence_id
      WHERE (${filters?.related_to_id ?? null} IS NULL OR l.related_to_id = ${filters?.related_to_id ?? ''})
        AND (${filters?.sent_by ?? null} IS NULL OR l.sent_by = ${filters?.sent_by ?? ''})
      ORDER BY l.sent_at DESC
      LIMIT ${filters?.limit ?? 100}
    `;
    return rows as EmailLog[];
  } catch { return SEED_EMAIL_LOG; }
}

export async function logEmail(data: Partial<EmailLog>): Promise<EmailLog> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_email_log (template_id, enrollment_id, related_to_type, related_to_id,
      to_email, to_name, subject, sent_by)
    VALUES (${data.template_id ?? null}, ${data.enrollment_id ?? null},
            ${data.related_to_type!}, ${data.related_to_id!},
            ${data.to_email!}, ${data.to_name!}, ${data.subject!}, ${data.sent_by ?? 'system'})
    RETURNING *
  `;
  if (data.template_id) {
    await sql`UPDATE crm_email_templates SET times_used = times_used + 1 WHERE template_id = ${data.template_id}`;
  }
  return rows[0] as EmailLog;
}
