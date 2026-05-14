// ─── POST /api/bpm/complete-task ─────────────────────────────────────────────
// Approve or reject a pending task, advance the workflow to the next step,
// or finalize the instance if no more steps remain.
// Body: CompleteTaskInput
// Response: { success, data: { status, workflow_completed, next_step? } }

import { NextRequest, NextResponse } from "next/server";
import {
  initBpmDB,
  getProcessTask,
  updateProcessTask,
  updateProcessInstance,
  getProcessInstance,
  createProcessTask,
  addHistoryEntry,
  createNotification,
  getProcessDefinitionByCode,
} from "@/lib/bpm-db";
import {
  findNextExecutableStep,
  resolveApprover,
  computeSlaDeadline,
} from "@/lib/bpm-workflow-engine";
import type { CompleteTaskInput } from "@/lib/bpm-types";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initBpmDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body: CompleteTaskInput = await req.json();

    if (!body.task_id || !body.decision || !body.decided_by) {
      return err("Missing required fields: task_id, decision, decided_by");
    }
    if (!["approved", "rejected"].includes(body.decision)) {
      return err("decision must be 'approved' or 'rejected'");
    }
    if (body.decision === "rejected" && !body.decision_notes?.trim()) {
      return err("decision_notes required when rejecting");
    }

    // 1. Load task and instance
    const task = await getProcessTask(body.task_id);
    if (!task) return err("Task not found", 404);
    if (task.status !== "pending") return err(`Task is already ${task.status}`);

    const instance = await getProcessInstance(task.instance_id);
    if (!instance) return err("Process instance not found", 404);
    if (instance.status !== "in_progress") return err(`Instance is already ${instance.status}`);

    const now = new Date().toISOString();

    // 2. Mark task complete
    await updateProcessTask(body.task_id, {
      status: body.decision === "approved" ? "completed" : "rejected",
      decision: body.decision,
      decision_notes: body.decision_notes ?? null,
      decided_by: body.decided_by,
      decided_at: now,
    });

    // 3. Log history
    await addHistoryEntry({
      instance_id: instance.instance_id,
      action: body.decision,
      action_description: `Step "${task.step_name}" ${body.decision === "approved" ? "aprovado" : "rejeitado"} por ${body.decided_by}`,
      step_id: task.step_id,
      step_name: task.step_name,
      performed_by: body.decided_by,
      performed_at: now,
      action_data: { decision: body.decision, notes: body.decision_notes },
    });

    // 4. REJECTED → close instance
    if (body.decision === "rejected") {
      await updateProcessInstance(instance.instance_id, {
        status: "rejected",
        final_decision: "rejected",
        rejection_reason: body.decision_notes,
        completed_at: now,
      });

      await createNotification({
        user_id: instance.initiated_by,
        notification_type: "rejected",
        related_entity_type: "process_instance",
        related_entity_id: instance.instance_id,
        title: `Aprovação rejeitada: ${instance.process_name}`,
        message: `Seu pedido (${instance.instance_code}) foi rejeitado em "${task.step_name}". Motivo: ${body.decision_notes ?? "Não informado"}.`,
        action_url: `/awq/bpm/instances/${instance.instance_id}`,
        is_read: false, read_at: null,
        send_email: true, email_sent: false, email_sent_at: null,
        priority: instance.priority,
      });

      return ok({ status: "rejected", workflow_completed: true });
    }

    // 5. APPROVED → find next executable step
    const processDef = await getProcessDefinitionByCode(instance.process_code);
    if (!processDef) return err("Process definition not found", 500);

    const nextStep = findNextExecutableStep(processDef.workflow_steps, task.step_id, instance.request_data);

    if (!nextStep) {
      // No more steps → workflow fully approved
      await updateProcessInstance(instance.instance_id, {
        status: "approved",
        final_decision: "approved",
        completed_at: now,
      });

      await createNotification({
        user_id: instance.initiated_by,
        notification_type: "approved",
        related_entity_type: "process_instance",
        related_entity_id: instance.instance_id,
        title: `Aprovação concluída: ${instance.process_name}`,
        message: `Seu pedido (${instance.instance_code}) foi aprovado com sucesso! Todos os steps concluídos.`,
        action_url: `/awq/bpm/instances/${instance.instance_id}`,
        is_read: false, read_at: null,
        send_email: true, email_sent: false, email_sent_at: null,
        priority: instance.priority,
      });

      await addHistoryEntry({
        instance_id: instance.instance_id,
        action: "approved",
        action_description: "Workflow concluído — todos os steps aprovados",
        step_id: null,
        step_name: null,
        performed_by: null,
        performed_at: now,
        action_data: { final: true },
      });

      return ok({ status: "approved", workflow_completed: true });
    }

    // 6. Advance to next step
    const taskSlaDue = computeSlaDeadline(nextStep.sla_hours);
    const assignee = resolveApprover(nextStep.approver_role);

    const newTask = await createProcessTask({
      instance_id: instance.instance_id,
      step_id: nextStep.step_id,
      step_name: nextStep.step_name,
      assigned_to: assignee,
      assigned_at: now,
      task_type: nextStep.step_type,
      status: "pending",
      decision: null,
      decision_notes: null,
      decided_by: null,
      decided_at: null,
      sla_hours: nextStep.sla_hours,
      sla_due_date: taskSlaDue.toISOString(),
      sla_breached: false,
      escalated: false,
      escalated_to: null,
      escalated_at: null,
      task_data: instance.request_data,
    });

    await updateProcessInstance(instance.instance_id, {
      current_step_id: nextStep.step_id,
      current_step_name: nextStep.step_name,
    });

    await addHistoryEntry({
      instance_id: instance.instance_id,
      action: "step_completed",
      action_description: `Avançado para step "${nextStep.step_name}"`,
      step_id: nextStep.step_id,
      step_name: nextStep.step_name,
      performed_by: null,
      performed_at: now,
      action_data: { next_assignee: assignee },
    });

    await createNotification({
      user_id: assignee,
      notification_type: "task_assigned",
      related_entity_type: "process_task",
      related_entity_id: newTask.task_id,
      title: `Nova aprovação: ${instance.process_name}`,
      message: `Você tem uma nova tarefa de aprovação: "${nextStep.step_name}". Processo: ${instance.instance_code}.`,
      action_url: `/awq/bpm/tasks/${newTask.task_id}`,
      is_read: false, read_at: null,
      send_email: true, email_sent: false, email_sent_at: null,
      priority: instance.priority,
    });

    return ok({
      status: "approved",
      workflow_completed: false,
      next_step: nextStep.step_name,
      next_task_id: newTask.task_id,
    });
  } catch (e) {
    console.error("[bpm/complete-task]", e);
    return err(String(e), 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
