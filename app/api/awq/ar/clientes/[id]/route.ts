// GET    /api/awq/ar/clientes/[id]
// PATCH  /api/awq/ar/clientes/[id]
// DELETE /api/awq/ar/clientes/[id]  (soft-delete → status inactive)

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { getARCustomer, updateARCustomer, deleteARCustomer } from "@/lib/ar-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "awq_holding", "AR — Cliente");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB não disponível" }, { status: 503 });

  const customer = await getARCustomer(params.id);
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(customer);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "awq_holding", "AR — Cliente");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB não disponível" }, { status: 503 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const updated = await updateARCustomer(params.id, body as never);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "awq_holding", "AR — Cliente");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB não disponível" }, { status: 503 });

  await deleteARCustomer(params.id);
  return NextResponse.json({ ok: true });
}
