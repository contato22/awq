// ─── /api/venture/deals — Custom Deals CRUD ──────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { sql, initDB } from "@/lib/db";

async function ensureTable() {
  await initDB();
}

export async function GET() {
  if (!sql) return NextResponse.json([], { status: 200 });
  await ensureTable();
  const rows = await sql`
    SELECT
      id, company_name AS "companyName", cnpj, sector, location,
      deal_type AS "dealType", stage, ticket::float,
      assignee, risk_level AS "riskLevel", priority, send_status AS "sendStatus",
      tese, structura, fee, earnin, conditions,
      next_steps AS "nextSteps", notes,
      contact_name AS "contactName", contact_email AS "contactEmail",
      contact_phone AS "contactPhone", website,
      created_at::text AS "createdAt", updated_at::text AS "updatedAt"
    FROM awq_custom_deals
    ORDER BY created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  await ensureTable();
  const d = await req.json();
  const [row] = await sql`
    INSERT INTO awq_custom_deals
      (id, company_name, cnpj, sector, location, deal_type, stage, ticket,
       assignee, risk_level, priority, send_status, tese, structura, fee,
       earnin, conditions, next_steps, notes, contact_name, contact_email,
       contact_phone, website)
    VALUES
      (${d.id}, ${d.companyName}, ${d.cnpj ?? ""}, ${d.sector ?? ""},
       ${d.location ?? ""}, ${d.dealType ?? ""}, ${d.stage ?? "Prospecção"},
       ${d.ticket ?? 0}, ${d.assignee ?? ""}, ${d.riskLevel ?? "Médio"},
       ${d.priority ?? "Média"}, ${d.sendStatus ?? "Não Enviado"},
       ${d.tese ?? ""}, ${d.structura ?? ""}, ${d.fee ?? ""},
       ${d.earnin ?? ""}, ${d.conditions ?? ""}, ${d.nextSteps ?? ""},
       ${d.notes ?? ""}, ${d.contactName ?? ""}, ${d.contactEmail ?? ""},
       ${d.contactPhone ?? ""}, ${d.website ?? ""})
    RETURNING
      id, company_name AS "companyName", cnpj, sector, location,
      deal_type AS "dealType", stage, ticket::float,
      assignee, risk_level AS "riskLevel", priority, send_status AS "sendStatus",
      tese, structura, fee, earnin, conditions,
      next_steps AS "nextSteps", notes,
      contact_name AS "contactName", contact_email AS "contactEmail",
      contact_phone AS "contactPhone", website,
      created_at::text AS "createdAt", updated_at::text AS "updatedAt"
  `;
  return NextResponse.json(row, { status: 201 });
}
