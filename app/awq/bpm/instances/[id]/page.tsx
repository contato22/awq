"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  GitBranch,
  User,
  Building2,
  FileText,
  Trash2,
} from "lucide-react";
import {
  localGetInstance,
  localGetHistory,
  localListTasksForInstance,
  localUpdateInstance,
  localUpdateTask,
  localAddHistory,
} from "@/lib/bpm-local";
import { USER_NAMES, getProcessDef, generateId } from "@/lib/bpm-process-definitions";
import type { ProcessInstance, ProcessHistoryEntry, ProcessTask } from "@/lib/bpm-types";

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

const ACTION_ICON: Record<string, React.ReactNode> = {
  started:      <GitBranch size={14} className="text-blue-500" />,
  approved:     <CheckCircle2 size={14} className="text-green-500" />,
  rejected:     <XCircle size={14} className="text-red-500" />,
  step_advanced: <Clock size={14} className="text-purple-500" />,
  cancelled:    <XCircle size={14} className="text-gray-400" />,
  escalated:    <AlertTriangle size={14} className="text-orange-500" />,
};

const STATUS_CONFIG = {
  approved:    { label: "Aprovado",     cls: "bg-green-100 text-green-800",  border: "border-green-200" },
  rejected:    { label: "Rejeitado",    cls: "bg-red-100 text-red-800",      border: "border-red-200" },
  in_progress: { label: "Em andamento", cls: "bg-blue-100 text-blue-800",    border: "border-blue-200" },
  pending:     { label: "Pendente",     cls: "bg-yellow-100 text-yellow-800", border: "border-yellow-200" },
  cancelled:   { label: "Cancelado",    cls: "bg-gray-100 text-gray-600",    border: "border-gray-200" },
} as const;

export default function InstanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [instance, setInstance] = useState<ProcessInstance | null>(null);
  const [history, setHistory] = useState<ProcessHistoryEntry[]>([]);
  const [tasks, setTasks] = useState<ProcessTask[]>([]);

  useEffect(() => {
    const inst = localGetInstance(id);
    setInstance(inst);
    setHistory(localGetHistory(id));
    setTasks(localListTasksForInstance(id));
  }, [id]);

  function cancelWorkflow() {
    if (!instance) return;
    if (!confirm("Cancelar este workflow?")) return;

    const nowIso = new Date().toISOString();
    localUpdateInstance(id, { status: "cancelled", completed_at: nowIso });
    tasks.filter((t) => t.status === "pending").forEach((t) =>
      localUpdateTask(t.task_id, { status: "cancelled" })
    );
    localAddHistory({
      history_id:        generateId("hist"),
      instance_id:       id,
      action:            "cancelled",
      action_description: `Workflow cancelado por ${USER_NAMES[CURRENT_USER] ?? CURRENT_USER}`,
      performed_by:      CURRENT_USER,
      performed_at:      nowIso,
    });

    router.push("/awq/bpm/instances");
  }

  if (!instance) {
    return (
      <>
        <Header title="Detalhe do Processo" />
        <div className="page-container text-center py-16 text-gray-400">
          <GitBranch size={40} className="mx-auto mb-3 opacity-30" />
          <p>Instância não encontrada.</p>
          <Link href="/awq/bpm/instances" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
            ← Voltar à lista
          </Link>
        </div>
      </>
    );
  }

  const sc = STATUS_CONFIG[instance.status] ?? STATUS_CONFIG.pending;
  const pd = getProcessDef(instance.process_code);
  const amount = fmtCurrency(instance.request_data.amount ?? instance.request_data.total_budget ?? instance.request_data.budget ?? instance.request_data.contract_value);
  const isActive = ["pending", "in_progress"].includes(instance.status);

  return (
    <>
      <Header
        title={instance.process_name}
        subtitle={`${instance.instance_code} · ${sc.label}`}
      />
      <div className="page-container max-w-4xl space-y-6">

        <div className="flex items-center justify-between">
          <Link href="/awq/bpm/instances" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={14} /> Voltar
          </Link>
          {isActive && (
            <button
              onClick={cancelWorkflow}
              className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-semibold border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} /> Cancelar workflow
            </button>
          )}
        </div>

        {/* ── Instance overview ────────────────────────────────────────────── */}
        <div className={`bg-white rounded-xl border ${sc.border} p-5`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${sc.cls}`}>{sc.label}</span>
                {instance.sla_breached && isActive && (
                  <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-lg font-semibold">
                    <AlertTriangle size={11} /> SLA Vencido
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-gray-900 mt-2">{instance.process_name}</h2>
              <div className="font-mono text-xs text-gray-400">{instance.instance_code}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {[
              { label: "Tipo",      value: instance.related_entity_type, icon: <Building2 size={13} /> },
              { label: "Iniciado por", value: USER_NAMES[instance.initiated_by] ?? instance.initiated_by, icon: <User size={13} /> },
              { label: "Iniciado em",  value: fmtDate(instance.started_at), icon: <Clock size={13} /> },
              { label: "SLA deadline", value: fmtDate(instance.sla_due_date), icon: <Clock size={13} /> },
              { label: "Concluído em", value: fmtDate(instance.completed_at), icon: <CheckCircle2 size={13} /> },
              ...(instance.rejection_reason ? [{ label: "Motivo rejeição", value: instance.rejection_reason, icon: <XCircle size={13} /> }] : []),
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-start gap-2 text-gray-600">
                <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
                <div>
                  <div className="text-[11px] text-gray-400 font-medium uppercase">{label}</div>
                  <div className="text-sm font-medium text-gray-800">{value ?? "—"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Request data ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FileText size={15} className="text-gray-400" /> Dados do Pedido
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(instance.request_data)
              .filter(([, v]) => v !== "" && v !== null && v !== undefined)
              .map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-gray-400 capitalize min-w-[100px]">{k.replace(/_/g, " ")}:</span>
                  <span className="text-gray-800 font-medium">
                    {k.includes("amount") || k.includes("budget") || k.includes("value")
                      ? (fmtCurrency(v) ?? String(v))
                      : String(v)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* ── Workflow steps progress ──────────────────────────────────────── */}
        {pd && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Fluxo de Aprovação</h3>
            <div className="relative">
              {pd.workflow_steps.map((step, i) => {
                const stepTask = tasks.find((t) => t.step_id === step.step_id);
                const isDone = stepTask?.status === "completed" && stepTask.decision === "approved";
                const isRejected = stepTask?.status === "completed" && stepTask.decision === "rejected";
                const isCurrent = instance.current_step_id === step.step_id && isActive;
                const isPending = !stepTask && !isCurrent;

                return (
                  <div key={step.step_id} className="flex gap-4 mb-4 last:mb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        isDone     ? "bg-green-100 border-green-400 text-green-700" :
                        isRejected ? "bg-red-100 border-red-400 text-red-700" :
                        isCurrent  ? "bg-blue-100 border-blue-500 text-blue-700" :
                                     "bg-gray-100 border-gray-300 text-gray-400"
                      }`}>
                        {isDone ? <CheckCircle2 size={14} /> : isRejected ? <XCircle size={14} /> : i + 1}
                      </div>
                      {i < pd.workflow_steps.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${isDone ? "bg-green-300" : "bg-gray-200"}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isCurrent ? "text-blue-700" : isDone ? "text-green-700" : "text-gray-700"}`}>
                          {step.step_name}
                        </span>
                        {isCurrent && <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold">Aguardando</span>}
                        {isDone    && <span className="text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-semibold">Aprovado</span>}
                        {isRejected && <span className="text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-semibold">Rejeitado</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {step.approver_role} · SLA {step.sla_hours}h
                        {stepTask?.decided_at && ` · Decidido em ${fmtDate(stepTask.decided_at)}`}
                        {stepTask?.decision_notes && ` · "${stepTask.decision_notes}"`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Audit history timeline ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Histórico de Ações</h3>
          {history.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhuma ação registrada.</p>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.history_id} className="flex gap-3">
                  <div className="mt-0.5 shrink-0">
                    {ACTION_ICON[h.action] ?? <Clock size={14} className="text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-700 font-medium">{h.action_description}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                      <User size={10} /> {USER_NAMES[h.performed_by] ?? h.performed_by}
                      <span>·</span>
                      {fmtDate(h.performed_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Active tasks ─────────────────────────────────────────────────── */}
        {tasks.filter((t) => t.status === "pending").length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Tarefa Pendente</h3>
            {tasks.filter((t) => t.status === "pending").map((t) => (
              <div key={t.task_id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <div className="text-sm font-semibold text-blue-900">{t.step_name}</div>
                  <div className="text-xs text-blue-600 mt-0.5">
                    Aguardando: {USER_NAMES[t.assigned_to] ?? t.assigned_to} · SLA: {fmtDate(t.sla_due_date)}
                  </div>
                </div>
                <Link
                  href={`/awq/bpm/tasks/${t.task_id}`}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Aprovar
                </Link>
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  );
}
