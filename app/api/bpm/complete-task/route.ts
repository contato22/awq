// POST /api/bpm/complete-task — Aprova ou rejeita uma tarefa de workflow

import { NextRequest, NextResponse } from "next/server";
import { USE_DB, sql } from "@/lib/db";
import {
  initBpmDB,
  dbGetTask,
  dbGetInstance,
  dbUpdateTask,
  dbUpdateInstance,
  dbAddHistory,
  dbCreateTask,
  dbCreateNotification,
} from "@/lib/bpm-db";
import {
  getProcessDef,
  getNextEligibleStep,
  ROLE_TO_USER,
  USER_NAMES,
  generateId,
  addHours,
} from "@/lib/bpm-process-definitions";
import type {
  CompleteTaskPayload,
  ProcessTask,
  BpmNotification,
} from "@/lib/bpm-types";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as CompleteTaskPayload;

    if (!body.task_id || !body.decision || !body.decided_by) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const now = new Date();

    if (USE_DB && sql) {
      await initBpmDB();
      return await handleDb(body, now);
    }

    // No-DB: return the mutations for the client to apply to localStorage
    return NextResponse.json({
      success: true,
      no_db: true,
      message: "Apply mutations to localStorage on client",
    });
  } catch (err) {
    console.error("[bpm/complete-task]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

async function handleDb(body: CompleteTaskPayload, now: Date): Promise<NextResponse> {
  const task = await dbGetTask(body.task_id);
  if (!task) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });

  const instance = await dbGetInstance(task.instance_id);
  if (!instance) return NextResponse.json({ success: false, error: "Instance not found" }, { status: 404 });

  // 1. Complete the task
  await dbUpdateTask(body.task_id, {
    status:        "completed",
    decision:      body.decision,
    decision_notes: body.decision_notes,
    decided_by:    body.decided_by,
    decided_at:    now.toISOString(),
  });

  // 2. Log history
  await dbAddHistory({
    history_id:        generateId("hist"),
    instance_id:       task.instance_id,
    action:            body.decision,
    action_description: `Step "${task.step_name}" ${body.decision === "approved" ? "aprovado" : "rejeitado"} por ${USER_NAMES[body.decided_by] ?? body.decided_by}${body.decision_notes ? `. Nota: ${body.decision_notes}` : ""}`,
    step_id:           task.step_id,
    step_name:         task.step_name,
    performed_by:      body.decided_by,
    performed_at:      now.toISOString(),
    action_data:       { decision: body.decision, notes: body.decision_notes },
  });

  // 3. Rejected → close instance
  if (body.decision === "rejected") {
    await dbUpdateInstance(task.instance_id, {
      status:           "rejected",
      final_decision:   "rejected",
      rejection_reason: body.decision_notes,
      completed_at:     now.toISOString(),
    });

    const notif: BpmNotification = {
      notification_id:    generateId("notif"),
      user_id:            instance.initiated_by,
      notification_type:  "rejected",
      related_entity_type: "process_instance",
      related_entity_id:  task.instance_id,
      title:              `Reprovado: ${instance.process_name}`,
      message:            `Seu pedido foi rejeitado em "${task.step_name}". Motivo: ${body.decision_notes ?? "Não informado"}`,
      is_read:            false,
      priority:           "high",
      created_at:         now.toISOString(),
    };
    await dbCreateNotification(notif);

    return NextResponse.json({ success: true, data: { status: "rejected", workflow_completed: true, notification: notif } });
  }

  // 4. Approved → check for next step
  const processDef = getProcessDef(instance.process_code);
  if (!processDef) {
    return NextResponse.json({ success: false, error: "Process definition not found" }, { status: 404 });
  }

  const nextStep = getNextEligibleStep(processDef, task.step_id, instance.request_data);

  if (!nextStep) {
    // All steps done → workflow approved
    await dbUpdateInstance(task.instance_id, {
      status:         "approved",
      final_decision: "approved",
      completed_at:   now.toISOString(),
    });

    const notif: BpmNotification = {
      notification_id:    generateId("notif"),
      user_id:            instance.initiated_by,
      notification_type:  "approved",
      related_entity_type: "process_instance",
      related_entity_id:  task.instance_id,
      title:              `Aprovado: ${instance.process_name}`,
      message:            "Seu pedido foi aprovado com sucesso!",
      is_read:            false,
      priority:           "high",
      created_at:         now.toISOString(),
    };
    await dbCreateNotification(notif);

    return NextResponse.json({ success: true, data: { status: "approved", workflow_completed: true, notification: notif } });
  }

  // 5. Create next task
  const nextAssignee = ROLE_TO_USER[nextStep.approver_role] ?? "miguel";
  const nextTaskId = generateId("task");
  const nextSlaDue = addHours(now, nextStep.sla_hours);

  const nextTask: Omit<ProcessTask, "created_at" | "updated_at"> = {
    task_id:      nextTaskId,
    instance_id:  task.instance_id,
    step_id:      nextStep.step_id,
    step_name:    nextStep.step_name,
    task_type:    nextStep.step_type,
    assigned_to:  nextAssignee,
    assigned_at:  now.toISOString(),
    status:       "pending",
    sla_hours:    nextStep.sla_hours,
    sla_due_date: nextSlaDue.toISOString(),
    sla_breached: false,
    escalated:    false,
    task_data:    instance.request_data,
  };

  await dbCreateTask(nextTask as ProcessTask);
  await dbUpdateInstance(task.instance_id, {
    current_step_id:   nextStep.step_id,
    current_step_name: nextStep.step_name,
  });

  await dbAddHistory({
    history_id:        generateId("hist"),
    instance_id:       task.instance_id,
    action:            "step_advanced",
    action_description: `Avançou para step: ${nextStep.step_name} (${nextAssignee})`,
    step_id:           nextStep.step_id,
    step_name:         nextStep.step_name,
    performed_by:      body.decided_by,
    performed_at:      now.toISOString(),
    action_data:       { next_step_id: nextStep.step_id, assignee: nextAssignee },
  });

  const notif: BpmNotification = {
    notification_id:    generateId("notif"),
    user_id:            nextAssignee,
    notification_type:  "task_assigned",
    related_entity_type: "process_task",
    related_entity_id:  nextTaskId,
    title:              `Nova aprovação: ${instance.process_name}`,
    message:            `Você tem uma nova tarefa: ${nextStep.step_name}`,
    action_url:         `/awq/bpm/tasks/${nextTaskId}`,
    is_read:            false,
    priority:           instance.priority,
    created_at:         now.toISOString(),
  };
  await dbCreateNotification(notif);

  return NextResponse.json({
    success: true,
    data: {
      status:             "approved",
      workflow_completed: false,
      next_step:          nextStep.step_name,
      next_task_id:       nextTaskId,
      next_task:          { ...nextTask, created_at: now.toISOString(), updated_at: now.toISOString() },
      notification:       notif,
    },
  });
}
