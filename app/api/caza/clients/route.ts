// ─── GET /api/caza/clients  — list all clients
// ─── POST /api/caza/clients — create a new client

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaDB, listClients, upsertClient, newClientId } from "@/lib/caza-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "caza_vision", "Clientes Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json([], { status: 200 });
  try {
    await initCazaDB();
    const clients = await listClients();
    return NextResponse.json(clients);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "caza_vision", "Clientes Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    await initCazaDB();
    const client = await upsertClient({
      id:                   newClientId(),
      name:                 String(body.name ?? ""),
      email:                String(body.email ?? ""),
      phone:                String(body.phone ?? ""),
      type:                 String(body.type ?? "Marca"),
      budget_anual:         Number(body.budget_anual ?? 0),
      status:               String(body.status ?? "Ativo"),
      segmento:             String(body.segmento ?? ""),
      since:                String(body.since ?? new Date().toISOString().slice(0, 10)),
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
