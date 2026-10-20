// Movimento de etapa no pipeline do CRM.
// O quadro atualiza na hora e confirma com POST /api/crm/opportunities.
// Resposta sem success desfaz a mudança.

import { STAGE_PROBABILITY, type PipelineStage } from "@/lib/crm-types";

export type StageMoveBody = {
  action: "update";
  opportunity_id: string;
  stage: string;
  probability: number;
};

type Movable = {
  opportunity_id: string;
  stage: string;
  probability: number;
};

export function planStageMove<T extends Movable>(
  opps: T[],
  id: string,
  toStage: string,
): { previous: T[]; next: T[]; body: StageMoveBody } | null {
  const current = opps.find((row) => row.opportunity_id === id);
  if (!current || current.stage === toStage) return null;
  const probability = STAGE_PROBABILITY[toStage as PipelineStage] ?? current.probability;
  const next = opps.map((row) =>
    row.opportunity_id === id
      ? { ...row, stage: toStage as T["stage"], probability }
      : row,
  );
  return {
    previous: opps,
    next,
    body: { action: "update", opportunity_id: id, stage: toStage, probability },
  };
}

export function persistOutcome(
  responseOk: boolean,
  body: { success?: boolean } | null,
): "keep" | "rollback" {
  if (!responseOk || !body?.success) return "rollback";
  return "keep";
}

/** Repõe um único card. `prior` null remove o id; ausente na lista, reinsere. */
export function rollbackItem<T extends { opportunity_id: string }>(
  current: T[],
  id: string,
  prior: T | null,
  index?: number,
): T[] {
  const found = current.findIndex((row) => row.opportunity_id === id);
  if (prior == null) {
    return found === -1 ? current : current.filter((row) => row.opportunity_id !== id);
  }
  if (found !== -1) {
    return current.map((row) => (row.opportunity_id === id ? prior : row));
  }
  const at = index == null ? current.length : Math.max(0, Math.min(index, current.length));
  const next = current.slice();
  next.splice(at, 0, prior);
  return next;
}

export type NamedAccount = { account_id: string; account_name: string };

export type AccountLinkDecision =
  | { kind: "already-linked"; account_id: string }
  | { kind: "reuse"; account_id: string; account_name: string }
  | { kind: "create"; account_name: string }
  | { kind: "invalid" };

function normalizeAccountName(name: string): string {
  return name.trim().toLowerCase();
}

/** Conta já ligada ou nome idêntico (ignorando caixa) reaproveita. Parecido não basta. */
export function resolveAccountLink(input: {
  existingAccountId: string | null;
  requestedName: string;
  accounts: NamedAccount[];
}): AccountLinkDecision {
  if (input.existingAccountId) {
    return { kind: "already-linked", account_id: input.existingAccountId };
  }
  const needle = normalizeAccountName(input.requestedName);
  if (!needle) return { kind: "invalid" };
  const match = input.accounts.find((account) => normalizeAccountName(account.account_name) === needle);
  if (match) {
    return { kind: "reuse", account_id: match.account_id, account_name: match.account_name };
  }
  return { kind: "create", account_name: input.requestedName.trim() };
}

export function applyAccountLink<
  T extends { opportunity_id: string; account_id: string | null; account_name?: string },
>(opps: T[], id: string, account: NamedAccount): T[] {
  return opps.map((row) =>
    row.opportunity_id === id
      ? { ...row, account_id: account.account_id, account_name: account.account_name }
      : row,
  );
}

export function rowsFromPipeline<T>(json: {
  success: boolean;
  data?: { byStage?: Record<string, T[]>; closedWon?: T[]; closedLost?: T[] };
  error?: string;
}): { rows: T[]; error: string | null } {
  if (!json.success || !json.data) {
    return { rows: [], error: json.error ?? "API error" };
  }
  const byStage = json.data.byStage ?? {};
  return {
    rows: [
      ...Object.values(byStage).flat(),
      ...(json.data.closedWon ?? []),
      ...(json.data.closedLost ?? []),
    ],
    error: null,
  };
}
