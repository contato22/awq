// ─── /api/venture/deals/[id] — Update / Delete ───────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { sql, initDB } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sql) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  await initDB();
  const { id } = await params;
  const d = await req.json();
  const rows = await sql`
    UPDATE awq_custom_deals SET
      company_name  = COALESCE(${d.companyName  ?? null}, company_name),
      cnpj          = COALESCE(${d.cnpj         ?? null}, cnpj),
      sector        = COALESCE(${d.sector        ?? null}, sector),
      location      = COALESCE(${d.location      ?? null}, location),
      deal_type     = COALESCE(${d.dealType      ?? null}, deal_type),
      stage         = COALESCE(${d.stage         ?? null}, stage),
      ticket        = COALESCE(${d.ticket        ?? null}, ticket),
      assignee      = COALESCE(${d.assignee      ?? null}, assignee),
      risk_level    = COALESCE(${d.riskLevel     ?? null}, risk_level),
      priority      = COALESCE(${d.priority      ?? null}, priority),
      send_status   = COALESCE(${d.sendStatus    ?? null}, send_status),
      tese          = COALESCE(${d.tese          ?? null}, tese),
      structura     = COALESCE(${d.structura     ?? null}, structura),
      fee           = COALESCE(${d.fee           ?? null}, fee),
      earnin        = COALESCE(${d.earnin        ?? null}, earnin),
      conditions    = COALESCE(${d.conditions    ?? null}, conditions),
      next_steps    = COALESCE(${d.nextSteps     ?? null}, next_steps),
      notes         = COALESCE(${d.notes         ?? null}, notes),
      contact_name  = COALESCE(${d.contactName   ?? null}, contact_name),
      contact_email = COALESCE(${d.contactEmail  ?? null}, contact_email),
      contact_phone = COALESCE(${d.contactPhone  ?? null}, contact_phone),
      website       = COALESCE(${d.website       ?? null}, website),
      updated_at    = NOW()
    WHERE id = ${id}
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
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sql) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  await initDB();
  const { id } = await params;
  await sql`DELETE FROM awq_custom_deals WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
