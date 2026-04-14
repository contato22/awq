// ─── GET    /api/caza/clients/[id]
// ─── PUT    /api/caza/clients/[id]
// ─── DELETE /api/caza/clients/[id]

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaDB, getClient, updateClient, deleteClient } from "@/lib/caza-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "caza_vision", "Cliente Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaDB();
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "caza_vision", "Cliente Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaDB();
  const body = await req.json() as Record<string, unknown>;

  const updated = await updateClient(params.id, {
    name:         body.name         != null ? String(body.name)         : undefined,
    email:        body.email        != null ? String(body.email)        : undefined,
    phone:        body.phone        != null ? String(body.phone)        : undefined,
    type:         body.type         != null ? String(body.type)         : undefined,
    budget_anual: body.budget_anual != null ? Number(body.budget_anual) : undefined,
    status:       body.status       != null ? String(body.status)       : undefined,
    segmento:     body.segmento     != null ? String(body.segmento)     : undefined,
    since:        body.since        != null ? String(body.since)        : undefined,
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "caza_vision", "Cliente Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaDB();
  await deleteClient(params.id);
  return NextResponse.json({ ok: true });
}
