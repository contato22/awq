// Próxima atividade obrigatória — capturada assim que um card (lead ou caso)
// muda de etapa no kanban, para garantir que toda movimentação tenha um
// próximo passo definido.
export interface NextActivity {
  descricao: string;
  data: string; // YYYY-MM-DD
}

export function isActivityOverdue(activity: NextActivity | null): boolean {
  if (!activity) return false;
  return activity.data < new Date().toISOString().slice(0, 10);
}
