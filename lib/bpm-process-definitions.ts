// ─── BPM Process Definitions — 6 Critical Approval Workflows ─────────────────
//
// Shared between server (bpm-db.ts) and client (bpm-local.ts).
// Hardcoded catalogue — no DB needed to read process configs.

import type { ProcessDefinition } from "./bpm-types";

export const PROCESS_DEFINITIONS: ProcessDefinition[] = [
  {
    process_def_id: "pd-po-approval",
    process_code: "PO_APPROVAL",
    process_name: "Purchase Order Approval",
    process_category: "procurement",
    description: "Aprovação de ordens de compra com valor acima de R$1.000",
    default_sla_hours: 72,
    escalation_enabled: true,
    is_active: true,
    workflow_steps: [
      {
        step_id: "1",
        step_name: "Manager Review",
        step_type: "approval",
        approver_role: "manager",
        conditions: { amount: { operator: ">=", value: 1000 } },
        sla_hours: 24,
      },
      {
        step_id: "2",
        step_name: "Finance Approval",
        step_type: "approval",
        approver_role: "finance_manager",
        conditions: { amount: { operator: ">=", value: 5000 } },
        sla_hours: 48,
      },
      {
        step_id: "3",
        step_name: "CEO Approval",
        step_type: "approval",
        approver_role: "ceo",
        conditions: { amount: { operator: ">=", value: 10000 } },
        sla_hours: 72,
      },
    ],
  },
  {
    process_def_id: "pd-expense-approval",
    process_code: "EXPENSE_APPROVAL",
    process_name: "Expense Approval",
    process_category: "finance",
    description: "Aprovação de despesas operacionais",
    default_sla_hours: 48,
    escalation_enabled: true,
    is_active: true,
    workflow_steps: [
      {
        step_id: "1",
        step_name: "Manager Approval",
        step_type: "approval",
        approver_role: "manager",
        conditions: { amount: { operator: "<", value: 1000 } },
        sla_hours: 24,
      },
      {
        step_id: "2",
        step_name: "CFO Approval",
        step_type: "approval",
        approver_role: "cfo",
        conditions: { amount: { operator: ">=", value: 1000 } },
        sla_hours: 48,
      },
    ],
  },
  {
    process_def_id: "pd-ap-approval",
    process_code: "AP_APPROVAL",
    process_name: "Accounts Payable Approval",
    process_category: "finance",
    description: "Aprovação de contas a pagar antes do pagamento",
    default_sla_hours: 48,
    escalation_enabled: true,
    is_active: true,
    workflow_steps: [
      {
        step_id: "1",
        step_name: "Finance Manager Review",
        step_type: "approval",
        approver_role: "finance_manager",
        sla_hours: 48,
      },
      {
        step_id: "2",
        step_name: "CFO Approval",
        step_type: "approval",
        approver_role: "cfo",
        conditions: { amount: { operator: ">=", value: 5000 } },
        sla_hours: 48,
      },
    ],
  },
  {
    process_def_id: "pd-budget-approval",
    process_code: "BUDGET_APPROVAL",
    process_name: "Budget Approval",
    process_category: "finance",
    description: "Aprovação de orçamento anual/trimestral",
    default_sla_hours: 240,
    escalation_enabled: true,
    is_active: true,
    workflow_steps: [
      {
        step_id: "1",
        step_name: "BU Lead Review",
        step_type: "approval",
        approver_role: "bu_lead",
        sla_hours: 72,
      },
      {
        step_id: "2",
        step_name: "CFO Review",
        step_type: "approval",
        approver_role: "cfo",
        sla_hours: 96,
      },
      {
        step_id: "3",
        step_name: "CEO Final Approval",
        step_type: "approval",
        approver_role: "ceo",
        sla_hours: 120,
      },
    ],
  },
  {
    process_def_id: "pd-contract-approval",
    process_code: "CONTRACT_APPROVAL",
    process_name: "Contract Approval",
    process_category: "legal",
    description: "Aprovação de contratos antes da assinatura",
    default_sla_hours: 168,
    escalation_enabled: true,
    is_active: true,
    workflow_steps: [
      {
        step_id: "1",
        step_name: "Legal Review",
        step_type: "review",
        approver_role: "legal",
        sla_hours: 96,
      },
      {
        step_id: "2",
        step_name: "Finance Review",
        step_type: "approval",
        approver_role: "finance_manager",
        sla_hours: 48,
      },
      {
        step_id: "3",
        step_name: "CEO Signature",
        step_type: "sign",
        approver_role: "ceo",
        sla_hours: 72,
      },
    ],
  },
  {
    process_def_id: "pd-project-kickoff",
    process_code: "PROJECT_KICKOFF",
    process_name: "Project Kickoff Approval",
    process_category: "project_management",
    description: "Aprovação para iniciar novo projeto",
    default_sla_hours: 72,
    escalation_enabled: true,
    is_active: true,
    workflow_steps: [
      {
        step_id: "1",
        step_name: "PM Review",
        step_type: "approval",
        approver_role: "pm",
        sla_hours: 24,
      },
      {
        step_id: "2",
        step_name: "CFO Budget Approval",
        step_type: "approval",
        approver_role: "cfo",
        conditions: { budget: { operator: ">=", value: 50000 } },
        sla_hours: 48,
      },
    ],
  },
];

// ─── Role → User ID mapping ───────────────────────────────────────────────────
// In a real system, this would come from a users table.
// For AWQ lean structure: Miguel = CEO/CFO, Danilo = Finance Manager.

export const ROLE_TO_USER: Record<string, string> = {
  ceo:             "miguel",
  cfo:             "miguel",
  legal:           "miguel",
  manager:         "danilo",
  finance_manager: "danilo",
  bu_lead:         "miguel",
  pm:              "danilo",
};

export const USER_NAMES: Record<string, string> = {
  miguel: "Miguel (CEO)",
  danilo: "Danilo (CS/Finance)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getProcessDef(code: string): ProcessDefinition | undefined {
  return PROCESS_DEFINITIONS.find((p) => p.process_code === code);
}

export function shouldExecuteStep(
  step: ProcessDefinition["workflow_steps"][number],
  requestData: Record<string, unknown>
): boolean {
  if (!step.conditions) return true;

  const check = (cond: { operator: string; value: number }, actual: number) => {
    switch (cond.operator) {
      case "<":  return actual < cond.value;
      case "<=": return actual <= cond.value;
      case ">":  return actual > cond.value;
      case ">=": return actual >= cond.value;
      case "==": return actual === cond.value;
      default:   return true;
    }
  };

  if (step.conditions.amount) {
    const amount = Number(requestData.amount ?? 0);
    return check(step.conditions.amount, amount);
  }

  if (step.conditions.budget) {
    const budget = Number(requestData.budget ?? requestData.total_budget ?? 0);
    return check(step.conditions.budget, budget);
  }

  return true;
}

export function getFirstEligibleStep(
  processDef: ProcessDefinition,
  requestData: Record<string, unknown>
): ProcessDefinition["workflow_steps"][number] | null {
  return processDef.workflow_steps.find((s) => shouldExecuteStep(s, requestData)) ?? null;
}

export function getNextEligibleStep(
  processDef: ProcessDefinition,
  currentStepId: string,
  requestData: Record<string, unknown>
): ProcessDefinition["workflow_steps"][number] | null {
  const currentIndex = processDef.workflow_steps.findIndex((s) => s.step_id === currentStepId);
  const remaining = processDef.workflow_steps.slice(currentIndex + 1);
  return remaining.find((s) => shouldExecuteStep(s, requestData)) ?? null;
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateInstanceCode(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9999 + 1)).padStart(4, "0");
  return `PI-${year}-${seq}`;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
