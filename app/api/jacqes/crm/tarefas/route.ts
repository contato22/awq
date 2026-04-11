// GET /api/jacqes/crm/tarefas   — lista tarefas
// POST /api/jacqes/crm/tarefas  — cria tarefa
import { NextRequest, NextResponse } from "next/server";
import { listTasks, createTask } from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const tasks = await listTasks();
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    if (!body.titulo?.trim()) {
      return NextResponse.json({ error: "titulo é obrigatório" }, { status: 400 });
    }
    if (!body.prazo) {
      return NextResponse.json({ error: "prazo é obrigatório" }, { status: 400 });
    }
    const task = await createTask({
      cliente_id:     body.cliente_id     ?? null,
      opportunity_id: body.opportunity_id ?? null,
      lead_id:        body.lead_id        ?? null,
      titulo:         body.titulo.trim(),
      categoria:      body.categoria?.trim()   ?? "Follow-up",
      prioridade:     body.prioridade?.trim()  ?? "Média",
      status:         body.status?.trim()      ?? "Aberta",
      responsavel:    body.responsavel?.trim() ?? "",
      data_criacao:   body.data_criacao        ?? new Date().toISOString().slice(0, 10),
      prazo:          body.prazo,
      sla_horas:      Number(body.sla_horas)   || 24,
      data_conclusao: body.data_conclusao      ?? null,
      bloqueio:       body.bloqueio?.trim()    ?? "",
      retrabalho:     Boolean(body.retrabalho),
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
