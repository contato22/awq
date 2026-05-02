"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import {
  GitBranch,
  Clock,
  ChevronRight,
  Plus,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  FileText,
  Briefcase,
  LayoutGrid,
} from "lucide-react";
import {
  localCreateInstance,
  localCreateTask,
  localAddHistory,
  localCreateNotification,
} from "@/lib/bpm-local";
import {
  PROCESS_DEFINITIONS,
  getFirstEligibleStep,
  ROLE_TO_USER,
  USER_NAMES,
  generateId,
  generateInstanceCode,
  addHours,
} from "@/lib/bpm-process-definitions";
import type { ProcessDefinition, ProcessInstance, ProcessTask, BpmNotification } from "@/lib/bpm-types";

const CURRENT_USER = "miguel";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  procurement:        <DollarSign size={16} />,
  finance:            <DollarSign size={16} />,
  legal:              <FileText size={16} />,
  project_management: <Briefcase size={16} />,
};

const CATEGORY_LABELS: Record<string, string> = {
  procurement:        "Procurement",
  finance:            "Finanças",
  legal:              "Jurídico",
  project_management: "Gestão de Projetos",
};

const CATEGORY_COLORS: Record<string, string> = {
  procurement:        "text-orange-600 bg-orange-50 border-orange-200",
  finance:            "text-blue-600 bg-blue-50 border-blue-200",
  legal:              "text-purple-600 bg-purple-50 border-purple-200",
  project_management: "text-green-600 bg-green-50 border-green-200",
};

interface StartModalState {
  process: ProcessDefinition;
  formData: Record<string, string>;
}

const FORM_FIELDS: Record<string, Array<{ key: string; label: string; type: string; required?: boolean; placeholder?: string }>> = {
  PO_APPROVAL: [
    { key: "description",   label: "Descrição do item",  type: "text",   required: true },
    { key: "supplier_name", label: "Fornecedor",          type: "text",   required: true },
    { key: "amount",        label: "Valor (R$)",          type: "number", required: true },
    { key: "bu",            label: "Business Unit",       type: "select" },
    { key: "due_date",      label: "Data de entrega",     type: "date" },
  ],
  EXPENSE_APPROVAL: [
    { key: "description",   label: "Descrição da despesa", type: "text",   required: true },
    { key: "amount",        label: "Valor (R$)",           type: "number", required: true },
    { key: "category",      label: "Categoria",            type: "text" },
    { key: "bu",            label: "Business Unit",        type: "select" },
  ],
  AP_APPROVAL: [
    { key: "supplier_name", label: "Fornecedor",       type: "text",   required: true },
    { key: "description",   label: "Serviço / Item",   type: "text",   required: true },
    { key: "amount",        label: "Valor (R$)",       type: "number", required: true },
    { key: "due_date",      label: "Vencimento",       type: "date",   required: true },
    { key: "bu",            label: "Business Unit",    type: "select" },
  ],
  BUDGET_APPROVAL: [
    { key: "budget_name",   label: "Nome do orçamento",  type: "text",   required: true },
    { key: "period",        label: "Período",             type: "text",   placeholder: "ex: 2026-Q2" },
    { key: "total_budget",  label: "Valor total (R$)",   type: "number", required: true },
    { key: "bu",            label: "Business Unit",       type: "select" },
    { key: "description",   label: "Observações",         type: "text" },
  ],
  CONTRACT_APPROVAL: [
    { key: "contract_name", label: "Nome do contrato",  type: "text",   required: true },
    { key: "entity_name",   label: "Contraparte",       type: "text",   required: true },
    { key: "contract_value",label: "Valor (R$)",        type: "number" },
    { key: "description",   label: "Objeto do contrato",type: "text",   required: true },
    { key: "bu",            label: "Business Unit",     type: "select" },
  ],
  PROJECT_KICKOFF: [
    { key: "project_name",  label: "Nome do projeto",   type: "text",   required: true },
    { key: "client_name",   label: "Cliente",           type: "text",   required: true },
    { key: "budget",        label: "Budget (R$)",       type: "number" },
    { key: "description",   label: "Objetivo",          type: "text",   required: true },
    { key: "bu",            label: "Business Unit",     type: "select" },
  ],
};

const BU_OPTIONS = ["awq", "jacqes", "caza", "venture", "advisor"];

export default function BpmProcessesPage() {
  const router = useRouter();
  const [modal, setModal] = useState<StartModalState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  function openModal(process: ProcessDefinition) {
    const fields = FORM_FIELDS[process.process_code] ?? [];
    const formData: Record<string, string> = {};
    fields.forEach((f) => { formData[f.key] = ""; });
    setModal({ process, formData });
  }

  async function startWorkflow() {
    if (!modal) return;
    const fields = FORM_FIELDS[modal.process.process_code] ?? [];
    const required = fields.filter((f) => f.required);
    for (const f of required) {
      if (!modal.formData[f.key]?.trim()) {
        alert(`Campo obrigatório: ${f.label}`);
        return;
      }
    }

    setSubmitting(true);

    const requestData: Record<string, unknown> = {};
    Object.entries(modal.formData).forEach(([k, v]) => {
      if (v) requestData[k] = k === "amount" || k === "total_budget" || k === "budget" || k === "contract_value" ? Number(v) : v;
    });

    const now = new Date();
    const nowIso = now.toISOString();
    const instanceId = generateId("inst");
    const instanceCode = generateInstanceCode();
    const slaDue = addHours(now, modal.process.default_sla_hours);

    const firstStep = getFirstEligibleStep(modal.process, requestData);
    if (!firstStep) {
      alert("Nenhum step elegível para os dados fornecidos.");
      setSubmitting(false);
      return;
    }

    const instance: ProcessInstance = {
      instance_id:         instanceId,
      instance_code:       instanceCode,
      process_def_id:      modal.process.process_def_id,
      process_code:        modal.process.process_code,
      process_name:        modal.process.process_name,
      related_entity_type: modal.process.process_code,
      related_entity_id:   generateId("ent"),
      request_data:        requestData,
      initiated_by:        CURRENT_USER,
      current_step_id:     firstStep.step_id,
      current_step_name:   firstStep.step_name,
      status:              "in_progress",
      priority:            "normal",
      started_at:          nowIso,
      sla_due_date:        slaDue.toISOString(),
      sla_breached:        false,
      created_at:          nowIso,
      updated_at:          nowIso,
    };

    const assignee = ROLE_TO_USER[firstStep.approver_role] ?? "miguel";
    const taskSlaDue = addHours(now, firstStep.sla_hours);
    const taskId = generateId("task");

    const task: ProcessTask = {
      task_id:      taskId,
      instance_id:  instanceId,
      step_id:      firstStep.step_id,
      step_name:    firstStep.step_name,
      task_type:    firstStep.step_type,
      assigned_to:  assignee,
      assigned_at:  nowIso,
      status:       "pending",
      sla_hours:    firstStep.sla_hours,
      sla_due_date: taskSlaDue.toISOString(),
      sla_breached: false,
      escalated:    false,
      task_data:    requestData,
      created_at:   nowIso,
      updated_at:   nowIso,
    };

    localCreateInstance(instance);
    localCreateTask(task);

    localAddHistory({
      history_id:        generateId("hist"),
      instance_id:       instanceId,
      action:            "started",
      action_description: `Workflow iniciado por ${USER_NAMES[CURRENT_USER] ?? CURRENT_USER}`,
      step_id:           firstStep.step_id,
      step_name:         firstStep.step_name,
      performed_by:      CURRENT_USER,
      performed_at:      nowIso,
    });

    localCreateNotification({
      notification_id:    generateId("notif"),
      user_id:            assignee,
      notification_type:  "task_assigned",
      related_entity_type: "process_task",
      related_entity_id:  taskId,
      title:              `Nova aprovação: ${modal.process.process_name}`,
      message:            `Nova tarefa: ${firstStep.step_name}`,
      action_url:         `/awq/bpm/tasks/${taskId}`,
      is_read:            false,
      priority:           "normal",
      created_at:         nowIso,
    });

    setModal(null);
    setSubmitting(false);
    setSuccess(instanceCode);
    setTimeout(() => router.push("/awq/bpm/tasks"), 2000);
  }

  return (
    <>
      <Header
        title="Catálogo de Processos"
        subtitle="6 workflows de aprovação configurados e prontos para uso"
      />
      <div className="page-container space-y-6">

        {success && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-800">
            <CheckCircle2 size={18} className="text-green-600 shrink-0" />
            <div>
              <div className="font-semibold text-sm">Workflow iniciado com sucesso!</div>
              <div className="text-xs mt-0.5">Instância <strong>{success}</strong> criada. Redirecionando para sua fila...</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROCESS_DEFINITIONS.map((pd) => (
            <div
              key={pd.process_code}
              className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold border ${CATEGORY_COLORS[pd.process_category]}`}>
                  {CATEGORY_ICONS[pd.process_category]}
                  {CATEGORY_LABELS[pd.process_category]}
                </div>
                <span className="text-[11px] text-gray-400 font-mono">{pd.process_code}</span>
              </div>

              <div>
                <h3 className="font-bold text-gray-900">{pd.process_name}</h3>
                <p className="text-xs text-gray-500 mt-1">{pd.description}</p>
              </div>

              {/* Steps */}
              <div className="space-y-1.5">
                {pd.workflow_steps.map((step, i) => (
                  <div key={step.step_id} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                      {i + 1}
                    </div>
                    <div className="text-xs text-gray-600 flex-1">{step.step_name}</div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <Clock size={10} /> {step.sla_hours}h
                    </div>
                    {step.conditions && (
                      <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                        condicional
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
                <span>SLA total: <strong className="text-gray-600">{pd.default_sla_hours}h</strong></span>
                <span>{pd.workflow_steps.length} step{pd.workflow_steps.length > 1 ? "s" : ""}</span>
              </div>

              <button
                onClick={() => openModal(pd)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus size={15} /> Iniciar workflow
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* ── Start workflow modal ─────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{modal.process.process_name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{modal.process.description}</p>
              </div>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
            </div>

            <div className="p-6 space-y-4">
              {(FORM_FIELDS[modal.process.process_code] ?? []).map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === "select" ? (
                    <select
                      value={modal.formData[field.key] ?? ""}
                      onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, [field.key]: e.target.value } })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {BU_OPTIONS.map((bu) => <option key={bu} value={bu}>{bu.toUpperCase()}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={modal.formData[field.key] ?? ""}
                      onChange={(e) => setModal({ ...modal, formData: { ...modal.formData, [field.key]: e.target.value } })}
                      placeholder={field.placeholder}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={startWorkflow}
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Iniciando..." : "Iniciar Workflow"}
              </button>
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
