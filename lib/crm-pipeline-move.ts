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
