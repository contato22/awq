// Módulo financeiro do CRM — contas a pagar/receber, DFC (caixa) e DRE
// (competência). Um único tipo de lançamento com discriminador `tipo`
// evita duplicar tabela/API/UI entre "pagar" e "receber", que têm a
// mesma forma de dado.
import type { Lead } from "./leads";

export type TipoLancamento = "receita" | "despesa";
export type StatusLancamento = "pendente" | "liquidado";

export const CATEGORIAS_RECEITA = ["Honorários", "Outros"] as const;
export const CATEGORIAS_DESPESA = [
  "Aluguel",
  "Salários/Pró-labore",
  "Softwares/Assinaturas",
  "Impostos/Taxas",
  "Marketing",
  "Custas Processuais",
  "Outros",
] as const;

export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  leadId: string | null;
  contraparte: string; // cliente (receita) ou fornecedor (despesa)
  descricao: string;
  categoria: string;
  valor: number;
  dataVencimento: string; // competência / previsão
  dataLiquidacao: string | null; // efetivamente pago/recebido (caixa)
  status: StatusLancamento;
  observacao: string | null;
  dataCriacao: string;
}

export function isOverdue(l: Lancamento): boolean {
  return l.status === "pendente" && new Date(l.dataVencimento).getTime() < Date.now();
}

export function createReceitaFromLead(lead: Lead): Lancamento {
  const now = new Date().toISOString();
  return {
    id: `lanc-${lead.id}`,
    tipo: "receita",
    leadId: lead.id,
    contraparte: lead.nomeCliente,
    descricao: lead.tipoProcesso,
    categoria: "Honorários",
    valor: lead.honorarios ?? 0,
    dataVencimento: lead.dataFechamento ?? now,
    dataLiquidacao: null,
    status: "pendente",
    observacao: null,
    dataCriacao: now,
  };
}

function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export interface DfcRow {
  month: string;
  label: string;
  entradas: number;
  saidas: number;
  saldoMes: number;
  saldoAcumulado: number;
}

// DFC — regime de caixa: só considera o que já foi efetivamente liquidado
// (dataLiquidacao preenchida), agrupado pelo mês da liquidação.
export function computeDfc(lancamentos: Lancamento[]): DfcRow[] {
  const liquidados = lancamentos.filter((l) => l.status === "liquidado" && l.dataLiquidacao);
  const months = new Set(liquidados.map((l) => monthKey(l.dataLiquidacao!)));
  const sorted = [...months].sort();

  let acumulado = 0;
  return sorted.map((month) => {
    const doMes = liquidados.filter((l) => monthKey(l.dataLiquidacao!) === month);
    const entradas = doMes.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
    const saidas = doMes.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
    const saldoMes = entradas - saidas;
    acumulado += saldoMes;
    return { month, label: monthLabel(month), entradas, saidas, saldoMes, saldoAcumulado: acumulado };
  });
}

export interface DreRow {
  month: string;
  label: string;
  receita: number;
  despesa: number;
  resultado: number;
  margem: number | null;
  despesasPorCategoria: [string, number][];
}

// DRE — regime de competência: considera todo lançamento pelo mês do
// vencimento, independente de já ter sido liquidado ou não.
export function computeDre(lancamentos: Lancamento[]): DreRow[] {
  const months = new Set(lancamentos.map((l) => monthKey(l.dataVencimento)));
  const sorted = [...months].sort();

  return sorted.map((month) => {
    const doMes = lancamentos.filter((l) => monthKey(l.dataVencimento) === month);
    const receita = doMes.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
    const despesasDoMes = doMes.filter((l) => l.tipo === "despesa");
    const despesa = despesasDoMes.reduce((s, l) => s + l.valor, 0);

    const porCategoria = new Map<string, number>();
    for (const l of despesasDoMes) porCategoria.set(l.categoria, (porCategoria.get(l.categoria) ?? 0) + l.valor);

    return {
      month,
      label: monthLabel(month),
      receita,
      despesa,
      resultado: receita - despesa,
      margem: receita > 0 ? ((receita - despesa) / receita) * 100 : null,
      despesasPorCategoria: [...porCategoria.entries()].sort((a, b) => b[1] - a[1]),
    };
  });
}
