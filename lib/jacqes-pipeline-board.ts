// Quadro do pipeline JACQES no CRM.
// Leitura: API (quando responde com linhas) → localStorage → JSON estático → demo.
// Escrita de etapa: só localStorage (crmUpdate/crmWrite). Sem gravar no Supabase.

export function applyStageOverlay<T extends { id: string; stage: string }>(
  remote: T[],
  local: T[] | null,
): T[] {
  if (!local?.length) return remote;
  const stageOf = new Map(local.map((row) => [row.id, row.stage]));
  return remote.map((row) => {
    const stage = stageOf.get(row.id);
    return stage ? { ...row, stage } : row;
  });
}

export function moveCard<T extends { id: string; stage: string }>(
  rows: T[],
  id: string,
  stage: string,
): T[] | null {
  const current = rows.find((row) => row.id === id);
  if (!current || current.stage === stage) return null;
  return rows.map((row) => (row.id === id ? { ...row, stage } : row));
}

export type BoardSource = "api" | "local" | "json" | "demo";

export function resolveBoardRows<T extends { id: string; stage: string }>(input: {
  fromApi: T[] | null;
  local: T[] | null;
  fromJson: T[];
  fallback: T[];
}): { rows: T[]; source: BoardSource } {
  const { fromApi, local, fromJson, fallback } = input;
  if (fromApi && fromApi.length > 0) {
    return { rows: applyStageOverlay(fromApi, local), source: "api" };
  }
  if (local && local.length > 0) return { rows: local, source: "local" };
  if (fromJson.length > 0) return { rows: fromJson, source: "json" };
  return { rows: fallback, source: "demo" };
}
