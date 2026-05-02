"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Clock,
  User,
  Building2,
  AlertTriangle,
  FileText,
  GitBranch,
} from "lucide-react";
import {
  localGetTask,
  localCreateTask,
  localUpdateTask,
  localUpdateInstance,
  localAddHistory,
  localCreateNotification,
  localGetInstance,
} from "@/lib/bpm-local";
import {
  getProcessDef,
  getNextEligibleStep,
  ROLE_TO_USER,
  USER_NAMES,
  generateId,
  addHours,
} from "@/lib/bpm-process-definitions";
import type { ProcessTask, ProcessInstance } from "@/lib/bpm-types";

const CURRENT_USER = "miguel";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fmtCurrency(v: unknown) {
  const n = Number(v);
  if (!n) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function RequestDataCard({ data }: { data: Record<string, unknown> }) {
  const fields: Array<{ label: string; value: string | null }> = [
    { label: "Fornecedor / Entidade", value: String(data.supplier_name ?? data.entity_name ?? data.client_name ?? data.project_name ?? data.budget_name ?? data.contract_name ?? "") || null },
    { label: "Valor", value: fmtCurrency(data.amount ?? data.total_budget ?? data.contract_value) },
    { label: "Descrição", value: String(data.description ?? data.objective ?? "") || null },
    { label: "BU", value: String(data.bu ?? "") || null },
    { label: "Vencimento", value: data.due_date ? String(data.due_date) : null },
    { label: "Categoria", value: String(data.category ?? "") || null },
    { label: "Observações", value: String(data.notes ?? data.observacoes ?? "") || null },
  ].filter((f) => f.value);

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
      {fields.map(({ label, value }) => (
        <div key={label} className="flex gap-3 text-sm">
          <span className="text-gray-500 w-36 shrink-0">{label}:</span>
          <span className="text-gray-800 font-medium">{value}</span>
        </div>
      ))}
      {fields.length === 0 && (
        <pre className="text-xs text-gray-500 overflow-auto max-h-40">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [task, setTask] = useState<ProcessTask | null>(null);
  const [instance, setInstance] = useState<ProcessInstance | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = localGetTask(id);
    if (!t) return;
    setTask(t);
    const inst = localGetInstance(t.instance_id);
    setInstance(inst);
  }, [id]);

  async function submit(decision: "approved" | "rejected") {
    if (!task || !instance) return;
    if (decision === "rejected" && !notes.trim()) {
      setError("Justificativa obrigatória para rejeição.");
      return;
    }
    if (!confirm(decision === "approved" ? "Confirmar aprovação?" : "Confirmar rejeição?")) return;

    setSubmitting(true);
    setError("");

    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Complete task locally
    localUpdateTask(task.task_id, {
      status:        "completed",
      decision,
      decision_notes: notes.trim() || undefined,
      decided_by:    CURRENT_USER,
      decided_at:    nowIso,
    });

    // 2. History entry
    localAddHistory({
      history_id:        generateId("hist"),
      instance_id:       task.instance_id,
      action:            decision,
      action_description: `Step "${task.step_name}" ${decision === "approved" ? "aprovado" : "rejeitado"} por ${USER_NAMES[CURRENT_USER] ?? CURRENT_USER}${notes ? `. Nota: ${notes}` : ""}`,
      step_id:           task.step_id,
      step_name:         task.step_name,
      performed_by:      CURRENT_USER,
      performed_at:      nowIso,
      action_data:       { decision, notes },
    });

    if (decision === "rejected") {
      // Close instance
      localUpdateInstance(task.instance_id, {
        status:           "rejected",
        final_decision:   "rejected",
        rejection_reason: notes,
        completed_at:     nowIso,
      });

      localCreateNotification({
        notification_id:    generateId("notif"),
        user_id:            instance.initiated_by,
        notification_type:  "rejected",
        related_entity_type: "process_instance",
        related_entity_id:  task.instance_id,
        title:              `Reprovado: ${instance.process_name}`,
        message:            `Pedido rejeitado em "${task.step_name}". Motivo: ${notes}`,
        is_read:            false,
        priority:           "high",
        created_at:         nowIso,
      });

      router.push("/awq/bpm/tasks");
      return;
    }

    // Approved → find next step
    const processDef = getProcessDef(instance.process_code);
    const nextStep = processDef
      ? getNextEligibleStep(processDef, task.step_id, instance.request_data)
      : null;

    if (!nextStep) {
      // Workflow complete
      localUpdateInstance(task.instance_id, {
        status:         "approved",
        final_decision: "approved",
        completed_at:   nowIso,
      });

      localCreateNotification({
        notification_id:    generateId("notif"),
        user_id:            instance.initiated_by,
        notification_type:  "approved",
        related_entity_type: "process_instance",
        related_entity_id:  task.instance_id,
        title:              `Aprovado: ${instance.process_name}`,
        message:            "Seu pedido foi aprovado com sucesso!",
        is_read:            false,
        priority:           "high",
        created_at:         nowIso,
      });
    } else {
      // Create next task
      const nextAssignee = ROLE_TO_USER[nextStep.approver_role] ?? "miguel";
      const nextTaskId = generateId("task");
      const nextSlaDue = addHours(now, nextStep.sla_hours);

      localCreateTask({
        task_id:      nextTaskId,
        instance_id:  task.instance_id,
        step_id:      nextStep.step_id,
        step_name:    nextStep.step_name,
        task_type:    nextStep.step_type,
        assigned_to:  nextAssignee,
        assigned_at:  nowIso,
        status:       "pending",
        sla_hours:    nextStep.sla_hours,
        sla_due_date: nextSlaDue.toISOString(),
        sla_breached: false,
        escalated:    false,
        task_data:    instance.request_data,
        created_at:   nowIso,
        updated_at:   nowIso,
      });

      localUpdateInstance(task.instance_id, {
        current_step_id:   nextStep.step_id,
        current_step_name: nextStep.step_name,
      });

      localAddHistory({
        history_id:        generateId("hist"),
        instance_id:       task.instance_id,
        action:            "step_advanced",
        action_description: `Avançou para: ${nextStep.step_name} (${USER_NAMES[nextAssignee] ?? nextAssignee})`,
        step_id:           nextStep.step_id,
        step_name:         nextStep.step_name,
        performed_by:      CURRENT_USER,
        performed_at:      nowIso,
      });

      localCreateNotification({
        notification_id:    generateId("notif"),
        user_id:            nextAssignee,
        notification_type:  "task_assigned",
        related_entity_type: "process_task",
        related_entity_id:  nextTaskId,
        title:              `Nova aprovação: ${instance.process_name}`,
        message:            `Nova tarefa: ${nextStep.step_name}`,
        action_url:         `/awq/bpm/tasks/${nextTaskId}`,
        is_read:            false,
        priority:           instance.priority,
        created_at:         nowIso,
      });
    }

    router.push("/awq/bpm/tasks");
  }

  if (!task) {
    return (
      <>
        <Header title="Aprovação de Tarefa" />
        <div className="page-container">
          <div className="text-center py-16 text-gray-400">
            <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
            <p>Tarefa não encontrada.</p>
            <Link href="/awq/bpm/tasks" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
              ← Voltar à fila
            </Link>
          </div>
        </div>
      </>
    );
  }

  const slaBreached = task.sla_breached;
  const hoursLeft = task.sla_due_date
    ? (new Date(task.sla_due_date).getTime() - Date.now()) / 3600000
    : null;

  return (
    <>
      <Header
        title="Revisar e Aprovar"
        subtitle={`${task.step_name} — ${instance?.process_name}`}
      />
      <div className="page-container max-w-3xl space-y-6">

        <Link href="/awq/bpm/tasks" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Voltar à fila
        </Link>

        {/* ── Task header ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-blue-600" />
                <h2 className="text-base font-bold text-gray-900">{instance?.process_name}</h2>
              </div>
              <div className="text-xs text-gray-400 mt-1 font-mono">{instance?.instance_code}</div>
            </div>
            {slaBreached ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                <AlertTriangle size={12} /> SLA Vencido
              </span>
            ) : hoursLeft !== null && hoursLeft < 24 ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                <Clock size={12} /> {Math.round(hoursLeft)}h restantes
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <User size={14} className="text-gray-400" />
              <span>Step: <strong>{task.step_name}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 size={14} className="text-gray-400" />
              <span>Tipo: <strong>{instance?.related_entity_type}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock size={14} className="text-gray-400" />
              <span>SLA: <strong>{fmtDate(task.sla_due_date)}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <User size={14} className="text-gray-400" />
              <span>Solicitante: <strong>{USER_NAMES[instance?.initiated_by ?? ""] ?? instance?.initiated_by}</strong></span>
            </div>
          </div>
        </div>

        {/* ── Request details ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-gray-400" />
            <h3 className="text-sm font-bold text-gray-800">Detalhes do Pedido</h3>
          </div>
          <RequestDataCard data={instance?.request_data ?? {}} />
        </div>

        {/* ── Workflow steps overview ──────────────────────────────────────── */}
        {instance && (() => {
          const pd = getProcessDef(instance.process_code);
          if (!pd) return null;
          return (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Fluxo de Aprovação</h3>
              <div className="flex items-center gap-1 flex-wrap">
                {pd.workflow_steps.map((step, i) => {
                  const isCurrent = step.step_id === task.step_id;
                  const isDone = parseInt(step.step_id) < parseInt(task.step_id);
                  return (
                    <div key={step.step_id} className="flex items-center gap-1">
                      <div className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                        isCurrent ? "bg-blue-600 text-white" :
                        isDone    ? "bg-green-100 text-green-700" :
                                    "bg-gray-100 text-gray-500"
                      }`}>
                        {step.step_name}
                      </div>
                      {i < pd.workflow_steps.length - 1 && (
                        <div className="text-gray-300 text-xs">→</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Decision form ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Sua Decisão</h3>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Notas / Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Adicione observações sobre esta decisão (obrigatório para rejeição)..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => submit("approved")}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 size={18} />
              Aprovar
            </button>
            <button
              onClick={() => submit("rejected")}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <XCircle size={18} />
              Rejeitar
            </button>
            <Link
              href="/awq/bpm/tasks"
              className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </div>

      </div>
    </>
  );
}
