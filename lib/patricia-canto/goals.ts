// Metas mensais de vendas (regime de competência) e recebimento (regime de
// caixa), exibidas no dashboard inicial (BI · Visão Geral).
import type { Lancamento } from "./financeiro";

export interface SalesGoals {
  metaVendasMensal: number;
  metaRecebimentoMensal: number;
}

export const DEFAULT_SALES_GOALS: SalesGoals = {
  metaVendasMensal: 150_000,
  metaRecebimentoMensal: 90_000,
};

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

export interface GoalProgress {
  vendasDoMes: number;
  recebidoDoMes: number;
  pctVendas: number;
  pctRecebimento: number;
}

export function computeGoalProgress(lancamentos: Lancamento[], goals: SalesGoals, now: Date = new Date()): GoalProgress {
  const currentMonth = monthKey(now.toISOString());
  const receitas = lancamentos.filter((l) => l.tipo === "receita");

  // Vendas = regime de competência (vencimento no mês) — o negócio foi
  // fechado nesse mês, mesmo que o pagamento ainda não tenha caído.
  const vendasDoMes = receitas
    .filter((l) => monthKey(l.dataVencimento) === currentMonth)
    .reduce((sum, l) => sum + l.valor, 0);

  // Recebido = regime de caixa (liquidado no mês) — dinheiro que
  // efetivamente entrou na conta.
  const recebidoDoMes = receitas
    .filter((l) => l.status === "liquidado" && l.dataLiquidacao && monthKey(l.dataLiquidacao) === currentMonth)
    .reduce((sum, l) => sum + l.valor, 0);

  return {
    vendasDoMes,
    recebidoDoMes,
    pctVendas: goals.metaVendasMensal > 0 ? (vendasDoMes / goals.metaVendasMensal) * 100 : 0,
    pctRecebimento: goals.metaRecebimentoMensal > 0 ? (recebidoDoMes / goals.metaRecebimentoMensal) * 100 : 0,
  };
}
