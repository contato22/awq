// ─── AWQ BPM — Workflow Engine ────────────────────────────────────────────────
//
// Core routing logic: determines which steps to execute, which users to assign,
// and whether a step's conditions are met given the request data.
//
// ROLE → USER ID mapping (from lib/auth-users.ts):
//   "1" = Alex Whitmore  (owner)
//   "2" = Sam Chen       (admin / manager / bu_lead / pm)
//   "3" = Priya Nair     (analyst)
//   "4" = Danilo         (cs-ops / finance_manager)
//   "5" = Miguel         (owner / cfo / ceo / legal)

import type { WorkflowStep, ApproverRole } from "@/lib/bpm-types";

// ─── Role → User ID mapping ───────────────────────────────────────────────────

const ROLE_MAP: Record<ApproverRole, string> = {
  manager:         "2",   // Sam Chen
  bu_lead:         "2",   // Sam Chen
  pm:              "2",   // Sam Chen
  finance_manager: "4",   // Danilo
  cfo:             "5",   // Miguel
  ceo:             "5",   // Miguel
  legal:           "5",   // Miguel (no dedicated legal user in lean org)
};

export function resolveApprover(role: ApproverRole): string {
  return ROLE_MAP[role] ?? "5";
}

// ─── Condition evaluation ─────────────────────────────────────────────────────

export function evaluateCondition(
  condition: { operator: string; value: number },
  actual: number
): boolean {
  switch (condition.operator) {
    case "<":  return actual < condition.value;
    case "<=": return actual <= condition.value;
    case ">":  return actual > condition.value;
    case ">=": return actual >= condition.value;
    case "==": return actual === condition.value;
    default:   return true;
  }
}

export function shouldExecuteStep(
  step: WorkflowStep,
  requestData: Record<string, unknown>
): boolean {
  if (!step.conditions) return true;

  for (const [key, cond] of Object.entries(step.conditions)) {
    if (!cond) continue;
    const actual = Number(requestData[key] ?? 0);
    if (!evaluateCondition(cond, actual)) return false;
  }
  return true;
}

// ─── Step navigation ──────────────────────────────────────────────────────────

export function findNextExecutableStep(
  steps: WorkflowStep[],
  currentStepId: string,
  requestData: Record<string, unknown>
): WorkflowStep | null {
  const currentIndex = steps.findIndex((s) => s.step_id === currentStepId);
  for (let i = currentIndex + 1; i < steps.length; i++) {
    if (shouldExecuteStep(steps[i], requestData)) {
      return steps[i];
    }
  }
  return null;
}

export function findFirstExecutableStep(
  steps: WorkflowStep[],
  requestData: Record<string, unknown>
): WorkflowStep | null {
  return steps.find((s) => shouldExecuteStep(s, requestData)) ?? null;
}

// ─── SLA helpers ─────────────────────────────────────────────────────────────

export function computeSlaDeadline(slaHours: number, from = new Date()): Date {
  return new Date(from.getTime() + slaHours * 60 * 60 * 1000);
}

export function isSlaBreached(slaDueDate: string | null): boolean {
  if (!slaDueDate) return false;
  return new Date(slaDueDate) < new Date();
}

export function slaHoursRemaining(slaDueDate: string | null): number | null {
  if (!slaDueDate) return null;
  return (new Date(slaDueDate).getTime() - Date.now()) / 3_600_000;
}

// ─── Priority helpers ─────────────────────────────────────────────────────────

export function derivePriority(
  amount: number | undefined
): "low" | "normal" | "high" | "urgent" {
  if (!amount) return "normal";
  if (amount >= 50_000) return "urgent";
  if (amount >= 10_000) return "high";
  if (amount >= 5_000)  return "normal";
  return "low";
}
