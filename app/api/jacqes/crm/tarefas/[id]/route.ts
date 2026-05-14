// PATCH /api/jacqes/crm/tarefas/[id]  — atualiza tarefa
// DELETE /api/jacqes/crm/tarefas/[id] — remove tarefa
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { updateTask, deleteTask } from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "jacqes", "CRM JACQES — Tarefas");
  if (denied) return denied;

  try {
    const body = await req.json();
    const task = await updateTask(params.id, body);
    if (!task) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "jacqes", "CRM JACQES — Tarefas");
  if (denied) return denied;

  try {
    const removed = await deleteTask(params.id);
    if (!removed) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
