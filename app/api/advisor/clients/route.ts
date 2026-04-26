// ─── GET /api/advisor/clients  — list all clients
// ─── POST /api/advisor/clients — create a new client

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initAdvisorDB, listAdvisorClients, upsertAdvisorClient, newAdvisorClientId } from "@/lib/advisor-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "advisor", "Clientes Advisor");
  if (denied) return denied;

  if (!sql) return NextResponse.json([], { status: 200 });
  try {
    await initAdvisorDB();
    const clients = await listAdvisorClients();
    return NextResponse.json(clients);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "advisor", "Clientes Advisor");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    await initAdvisorDB();
    const client = await upsertAdvisorClient({
      id:                   newAdvisorClientId(),
      name:                 String(body.name ?? ""),
      segmento:             String(body.segmento ?? ""),
      tipo_servico:         String(body.tipo_servico ?? ""),
      aum:                  Number(body.aum ?? 0),
      fee_mensal:           Number(body.fee_mensal ?? 0),
      status:               String(body.status ?? "Ativo"),
      since:                String(body.since ?? new Date().toISOString().slice(0, 10)),
      responsavel:          String(body.responsavel ?? ""),
      contato_email:        String(body.contato_email ?? ""),
      contato_phone:        String(body.contato_phone ?? ""),
      nps:                  body.nps != null ? Number(body.nps) : null,
      imported_from_notion: false,
      notion_page_id:       null,
      imported_at:          null,
      sync_status:          "internal",
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
