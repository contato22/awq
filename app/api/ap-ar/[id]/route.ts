// PATCH  /api/ap-ar/[id]  — atualiza item (status, campos)
// DELETE /api/ap-ar/[id]  — remove item

import { NextRequest, NextResponse } from "next/server";
import { apiGuard }                  from "@/lib/api-guard";
import { initAPARDB, getAPARItem, updateAPARItem, deleteAPARItem } from "@/lib/ap-ar-db";
import type { APARStatus }                                          from "@/lib/ap-ar-db";

export const runtime = "nodejs";

function today() { return new Date().toISOString().slice(0, 10); }
function computeStatus(dueDate: string, current: APARStatus): APARStatus {
  if (current === "settled") return "settled";
  if (dueDate && dueDate < today()) return "overdue";
  return "pending";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "edit", "financeiro", "AP & AR — atualizar item");
  if (denied) return denied;

  await initAPARDB();

  const { id } = params;
  const existing = await getAPARItem(id);
  if (!existing) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  try {
    const body = await req.json();

    const patch: Parameters<typeof updateAPARItem>[1] = {};

    if (body.description !== undefined) patch.description = body.description.trim();
    if (body.entity       !== undefined) patch.entity      = body.entity.trim();
    if (body.amount       !== undefined) patch.amount      = parseFloat(body.amount) || 0;
    if (body.due_date     !== undefined) patch.due_date    = body.due_date;
    if (body.category     !== undefined) patch.category    = body.category;

    if (body.status !== undefined) {
      patch.status = body.status as APARStatus;
    } else if (patch.due_date) {
      patch.status = computeStatus(patch.due_date, existing.status);
    }

    const updated = await updateAPARItem(id, patch);
    if (!updated) return NextResponse.json({ error: "Falha ao atualizar" }, { status: 500 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "financeiro", "AP & AR — excluir item");
  if (denied) return denied;

  await initAPARDB();

  const { id } = params;
  const ok = await deleteAPARItem(id);
  if (!ok) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
