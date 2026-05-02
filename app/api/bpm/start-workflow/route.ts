// POST /api/bpm/start-workflow — Inicia uma instância de workflow de aprovação

import { NextRequest, NextResponse } from "next/server";
import { USE_DB, sql } from "@/lib/db";
import {
  initBpmDB,
  dbCreateInstance,
  dbCreateTask,
  dbAddHistory,
  dbCreateNotification,
  dbUpdateInstance,
} from "@/lib/bpm-db";
import {
  getProcessDef,
  getFirstEligibleStep,
  ROLE_TO_USER,
  USER_NAMES,
  generateId,
  generateInstanceCode,
  addHours,
} from "@/lib/bpm-process-definitions";
import type { StartWorkflowPayload, ProcessInstance, ProcessTask, BpmNotification } from "@/lib/bpm-types";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as StartWorkflowPayload;

    if (!body.process_code || !body.related_entity_type || !body.related_entity_id || !body.initiated_by) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const processDef = getProcessDef(body.process_code);
    if (!processDef) {
      return NextResponse.json({ success: false, error: "Process definition not found" }, { status: 404 });
    }

    const now = new Date();
    const instanceId = generateId("inst");
    const instanceCode = generateInstanceCode();
    const slaDueDate = addHours(now, processDef.default_sla_hours);

    const firstStep = getFirstEligibleStep(processDef, body.request_data);
    if (!firstStep) {
      return NextResponse.json({ success: false, error: "No eligible step found for this request" }, { status: 400 });
    }

    const instance: Omit<ProcessInstance, "created_at" | "updated_at"> = {
      instance_id:         instanceId,
      instance_code:       instanceCode,
      process_def_id:      processDef.process_def_id,
      process_code:        body.process_code,
      process_name:        processDef.process_name,
      related_entity_type: body.related_entity_type,
      related_entity_id:   body.related_entity_id,
      request_data:        body.request_data,
      initiated_by:        body.initiated_by,
      current_step_id:     firstStep.step_id,
      current_step_name:   firstStep.step_name,
      status:              "in_progress",
      priority:            body.priority ?? "normal",
      started_at:          now.toISOString(),
      sla_due_date:        slaDueDate.toISOString(),
      sla_breached:        false,
    };

    const assignee = ROLE_TO_USER[firstStep.approver_role] ?? "miguel";
    const taskSlaDue = addHours(now, firstStep.sla_hours);
    const taskId = generateId("task");

    const task: Omit<ProcessTask, "created_at" | "updated_at"> = {
      task_id:      taskId,
      instance_id:  instanceId,
      step_id:      firstStep.step_id,
      step_name:    firstStep.step_name,
      task_type:    firstStep.step_type,
      assigned_to:  assignee,
      assigned_at:  now.toISOString(),
      status:       "pending",
      sla_hours:    firstStep.sla_hours,
      sla_due_date: taskSlaDue.toISOString(),
      sla_breached: false,
      escalated:    false,
      task_data:    body.request_data,
    };

    const historyEntry = {
      history_id:        generateId("hist"),
      instance_id:       instanceId,
      action:            "started",
      action_description: `Workflow iniciado por ${USER_NAMES[body.initiated_by] ?? body.initiated_by}. Step atual: ${firstStep.step_name}`,
      step_id:           firstStep.step_id,
      step_name:         firstStep.step_name,
      performed_by:      body.initiated_by,
      performed_at:      now.toISOString(),
      action_data:       { step_id: firstStep.step_id, approver_role: firstStep.approver_role },
    };

    const notification: BpmNotification = {
      notification_id:    generateId("notif"),
      user_id:            assignee,
      notification_type:  "task_assigned",
      related_entity_type: "process_task",
      related_entity_id:  taskId,
      title:              `Nova aprovação: ${processDef.process_name}`,
      message:            `Você tem uma nova tarefa de aprovação: ${firstStep.step_name}`,
      action_url:         `/awq/bpm/tasks/${taskId}`,
      is_read:            false,
      priority:           body.priority ?? "normal",
      created_at:         now.toISOString(),
    };

    if (USE_DB && sql) {
      await initBpmDB();
      await dbCreateInstance(instance as ProcessInstance);
      await dbCreateTask(task as ProcessTask);
      await dbAddHistory(historyEntry);
      await dbCreateNotification(notification);
    }

    return NextResponse.json({
      success: true,
      data: {
        instance_id:   instanceId,
        instance_code: instanceCode,
        current_step:  firstStep.step_name,
        task_id:       taskId,
        assignee,
        // Also return full objects so the client can persist to localStorage
        instance: { ...instance, created_at: now.toISOString(), updated_at: now.toISOString() },
        task:     { ...task, created_at: now.toISOString(), updated_at: now.toISOString() },
        history:  historyEntry,
        notification,
      },
    });
  } catch (err) {
    console.error("[bpm/start-workflow]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
