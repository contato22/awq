// ─── POST /api/bpm/start-workflow ─────────────────────────────────────────────
// Starts a new workflow instance for the given process_code and entity.
// Body: StartWorkflowInput
// Response: { success, data: { instance_id, instance_code, current_step } }

import { NextRequest, NextResponse } from "next/server";
import {
  initBpmDB,
  getProcessDefinitionByCode,
  createProcessInstance,
  createProcessTask,
  addHistoryEntry,
  createNotification,
  generateInstanceCode,
} from "@/lib/bpm-db";
import {
  findFirstExecutableStep,
  resolveApprover,
  computeSlaDeadline,
  derivePriority,
} from "@/lib/bpm-workflow-engine";
import type { StartWorkflowInput } from "@/lib/bpm-types";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initBpmDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body: StartWorkflowInput = await req.json();

    if (!body.process_code || !body.related_entity_type || !body.related_entity_id || !body.initiated_by) {
      return err("Missing required fields: process_code, related_entity_type, related_entity_id, initiated_by");
    }

    // 1. Load process definition
    const processDef = await getProcessDefinitionByCode(body.process_code);
    if (!processDef) return err(`Process definition not found: ${body.process_code}`, 404);

    const steps = processDef.workflow_steps;
    const firstStep = findFirstExecutableStep(steps, body.request_data);
    if (!firstStep) return err("No executable steps found for the given request data");

    // 2. Determine priority
    const amount = Number(body.request_data?.amount ?? body.request_data?.budget ?? 0);
    const priority = body.priority ?? derivePriority(amount);

    // 3. Create process instance
    const instanceCode = await generateInstanceCode();
    const slaDue = computeSlaDeadline(processDef.default_sla_hours);

    const instance = await createProcessInstance({
      instance_code: instanceCode,
      process_def_id: processDef.process_def_id,
      process_code: processDef.process_code,
      process_name: processDef.process_name,
      related_entity_type: body.related_entity_type,
      related_entity_id: body.related_entity_id,
      request_data: body.request_data,
      initiated_by: body.initiated_by,
      initiated_at: new Date().toISOString(),
      current_step_id: firstStep.step_id,
      current_step_name: firstStep.step_name,
      status: "in_progress",
      started_at: new Date().toISOString(),
      completed_at: null,
      sla_due_date: slaDue.toISOString(),
      sla_breached: false,
      final_decision: null,
      rejection_reason: null,
      priority,
    });

    // 4. Create first task
    const taskSlaDue = computeSlaDeadline(firstStep.sla_hours);
    const assignee = resolveApprover(firstStep.approver_role);

    const task = await createProcessTask({
      instance_id: instance.instance_id,
      step_id: firstStep.step_id,
      step_name: firstStep.step_name,
      assigned_to: assignee,
      assigned_at: new Date().toISOString(),
      task_type: firstStep.step_type,
      status: "pending",
      decision: null,
      decision_notes: null,
      decided_by: null,
      decided_at: null,
      sla_hours: firstStep.sla_hours,
      sla_due_date: taskSlaDue.toISOString(),
      sla_breached: false,
      escalated: false,
      escalated_to: null,
      escalated_at: null,
      task_data: body.request_data,
    });

    // 5. Log history
    await addHistoryEntry({
      instance_id: instance.instance_id,
      action: "started",
      action_description: `Workflow iniciado por usuário ${body.initiated_by}`,
      step_id: firstStep.step_id,
      step_name: firstStep.step_name,
      performed_by: body.initiated_by,
      performed_at: new Date().toISOString(),
      action_data: { instance_code: instanceCode, first_step: firstStep.step_name },
    });

    // 6. Notify assignee
    await createNotification({
      user_id: assignee,
      notification_type: "task_assigned",
      related_entity_type: "process_task",
      related_entity_id: task.task_id,
      title: `Nova aprovação: ${processDef.process_name}`,
      message: `Você tem uma nova tarefa de aprovação: "${firstStep.step_name}". Processo: ${instanceCode}.`,
      action_url: `/awq/bpm/tasks/${task.task_id}`,
      is_read: false,
      read_at: null,
      send_email: true,
      email_sent: false,
      email_sent_at: null,
      priority,
    });

    return ok({
      instance_id: instance.instance_id,
      instance_code: instanceCode,
      current_step: firstStep.step_name,
      assigned_to: assignee,
      task_id: task.task_id,
    });
  } catch (e) {
    console.error("[bpm/start-workflow]", e);
    return err(String(e), 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
