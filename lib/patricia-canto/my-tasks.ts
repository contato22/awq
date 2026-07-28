// Lembretes de tarefas por pessoa de acesso — cada role vê, na sua tela
// inicial, o que precisa fazer: admin/master (leads/casos com atividade
// atrasada, contas vencidas) e Ana/mkt (metas de conteúdo em aberto,
// comunicações atrasadas).
import type { Lead } from "./leads";
import { isActivityOverdue } from "./activity";
import type { CaseItem } from "./cases";
import type { Lancamento } from "./financeiro";
import { isOverdue as isLancamentoOverdue } from "./financeiro";
import type { ComunicacaoItem } from "./gtm-extra";
import { computeQuotaProgress } from "./comunicacao-quotas";

export type TaskSeverity = "overdue" | "today" | "upcoming";

export interface TaskItem {
  id: string;
  label: string;
  detail: string;
  severity: TaskSeverity;
}

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const SEVERITY_RANK: Record<TaskSeverity, number> = { overdue: 0, today: 1, upcoming: 2 };

function sortTasks(tasks: TaskItem[]): TaskItem[] {
  return [...tasks].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// admin/master: acompanham leads, casos e financeiro — a tela inicial (BI)
// lembra o que está atrasado ou vence hoje.
export function computeAdminTasks(leads: Lead[], cases: CaseItem[], lancamentos: Lancamento[]): TaskItem[] {
  const today = todayStr();
  const tasks: TaskItem[] = [];

  for (const l of leads) {
    if (!l.proximaAtividade) continue;
    if (isActivityOverdue(l.proximaAtividade)) {
      tasks.push({ id: `lead-${l.id}`, label: l.proximaAtividade.descricao, detail: `${l.nomeCliente} · Lead`, severity: "overdue" });
    } else if (l.proximaAtividade.data === today) {
      tasks.push({ id: `lead-${l.id}`, label: l.proximaAtividade.descricao, detail: `${l.nomeCliente} · Lead`, severity: "today" });
    }
  }

  for (const c of cases) {
    if (!c.proximaAtividade) continue;
    if (isActivityOverdue(c.proximaAtividade)) {
      tasks.push({ id: `case-${c.id}`, label: c.proximaAtividade.descricao, detail: `${c.nomeCliente} · Caso`, severity: "overdue" });
    } else if (c.proximaAtividade.data === today) {
      tasks.push({ id: `case-${c.id}`, label: c.proximaAtividade.descricao, detail: `${c.nomeCliente} · Caso`, severity: "today" });
    }
  }

  for (const l of lancamentos) {
    if (l.status === "pendente" && isLancamentoOverdue(l)) {
      tasks.push({
        id: `lanc-${l.id}`,
        label: `${l.tipo === "receita" ? "Cobrar" : "Pagar"}: ${l.contraparte}`,
        detail: currency(l.valor),
        severity: "overdue",
      });
    }
  }

  return sortTasks(tasks);
}

// Ana/mkt: dona das metas de conteúdo — a tela inicial (GTM) lembra o que
// falta entregar na semana/mês e o que está planejado/atrasado.
export function computeAnaTasks(comunicacoes: ComunicacaoItem[]): TaskItem[] {
  const tasks: TaskItem[] = [];

  for (const { quota, entregues, rangeLabel } of computeQuotaProgress(comunicacoes)) {
    const falta = quota.quantidade - entregues;
    if (falta > 0) {
      tasks.push({
        id: `quota-${quota.id}`,
        label: `Faltam ${falta} de ${quota.label.toLowerCase()}`,
        detail: rangeLabel,
        severity: "upcoming",
      });
    }
  }

  const today = todayStr();
  for (const c of comunicacoes) {
    if (c.status !== "planejado") continue;
    const date = c.dataPlanejada.slice(0, 10);
    if (date < today) {
      tasks.push({ id: `com-${c.id}`, label: c.titulo, detail: "Atrasado", severity: "overdue" });
    } else if (date === today) {
      tasks.push({ id: `com-${c.id}`, label: c.titulo, detail: "Hoje", severity: "today" });
    }
  }

  return sortTasks(tasks);
}
