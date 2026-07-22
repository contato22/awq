// ─── ENRD · Reconciliação canônica do mês (fonte única da verdade) ───────────
// Antes cada página calculava "faturamento" da sua própria fonte e davam
// números diferentes (CRM projetos ~R$1k · montagem estimada ~R$16k · Cora
// ~R$12k). Aqui reconciliamos UMA vez, ancorado no CAIXA REAL (Cora), e todas
// as telas leem daqui — garantindo consistência COM a página de conciliação.
//
// IMPORTANTE (bug corrigido): no bank_transactions o `amount` é MAGNITUDE
// positiva + campo `direction` (credit/debit). E "recebido" (AR realizado) é só
// crédito com managerialCategory de RECEITA — não todo crédito. É exatamente a
// classificação de components/EnrdFlowChart.tsx (a conciliação /enrd/conciliacao):
//   AR realizado = credit ∧ categoria ∈ (REVENUE_CATEGORIES ∪ recebimento_ambiguo)
//   Pagamentos   = debit (magnitude)
//   Saldo líquido (caixa real) = AR realizado − Pagamentos
//
// Camadas (funil), da operacional à verdadeira:
//   EXECUTADO — nº de O&M feitos (montagem). Volume, sem valor na fonte.
//   LOGADO    — OS com valor no CRM projetos. Subnotificado.
//   RECEBIDO  — AR realizado na Cora (dinheiro real que entrou · âncora).
//   PAGO      — pagamentos reais na Cora (despesa real do mês).

import { getLiveMontagem } from "@/lib/enrd-montagem-live";
import { getInstallations } from "@/lib/enrd-montagem-db";
import { getLiveProjetosFull } from "@/lib/enerdy-projetos";
import { getConfig, normalizeDate } from "@/lib/enrd-posvenda-db";
import { getTransactionsByEntity } from "@/lib/financial-db";
import { REVENUE_CATEGORIES } from "@/lib/financial-classifier";
import { custoFixoSemBonus, custoFixoComBonus } from "@/lib/enrd-posvenda-costing";

// Mesma regra da conciliação: receita = categorias de receita + PIX ambíguo.
const AR_REALIZED_SET = new Set<string>([...REVENUE_CATEGORIES, "recebimento_ambiguo"]);

export type ReconciliacaoMes = {
  mes: string; // AAAA-MM
  // Camada EXECUTADO (montagem)
  nExecutados: number;
  // Camada LOGADO (CRM projetos)
  nLogados: number;
  valorLogado: number;
  // Camada CORA (real — igual à conciliação)
  recebidoCora: number; // AR realizado (crédito de receita) — receita O&M real
  outrosCreditos: number; // demais créditos (transferências/resgates)
  pagamentosCora: number; // débitos reais na conta ENRD
  saldoCaixa: number; // recebidoCora − pagamentosCora (movimento REAL da conta)
  nCoraTx: number;
  coraDisponivel: boolean;
  // PERÍMETRO: os pagamentos da conta ENRD foram para TERCEIRIZADOS DA INTEGRAÇÃO
  // (lado do Felipe), não para a equipe de O&M. Então NÃO são custo do pós-venda —
  // são a pós-venda BANCANDO o caixa da integração. Ficam fora do resultado O&M.
  suporteIntegracao: number; // = pagamentosCora (dinheiro do O&M que saiu p/ integração)
  // Custo do O&M (folha) é premissa — não aparece na Cora (não há folha lançada lá).
  custoFixoPremissa: number;
  // Resultado do PERÍMETRO O&M (Miguel): receita real − custo de folha (premissa).
  // NÃO desconta o suporte à integração (isso é fronteira do Felipe).
  resultadoOM: number;
  comBonus: boolean;
  // Diagnóstico de rastreio
  gapCobranca: number; // nExecutados − nLogados
  gapRastreioValor: number; // recebidoCora − valorLogado (receita sem rastro no CRM)
  // Rateio calibrado: distribui (recebidoCora − valorLogado) entre os executados
  // não-logados, para o total por-serviço BATER com o caixa real.
  valorRateioPorServico: number;
  // Qualidade
  materialLancado: boolean;
  fonteStale: boolean;
};

export async function getReconciliacaoMes(mesOpt?: string): Promise<ReconciliacaoMes> {
  const mes = mesOpt ?? new Date().toISOString().slice(0, 7);
  const config = await getConfig();

  // EXECUTADO — montagem (Serviço/Limpeza do mês = escopo O&M: limpeza, disjuntor,
  // padrão, análise técnica etc — não integração)
  let nExecutados = 0;
  let fonteStale = false;
  try {
    const snap = await getLiveMontagem();
    const inst = snap ? snap.installations : await getInstallations();
    fonteStale = !!snap?.stale;
    nExecutados = inst.filter(
      (i) => /servi|limpez/i.test(i.tipo ?? "") && (normalizeDate(i.raw?.data_int) ?? "").startsWith(mes)
    ).length;
  } catch {
    /* vazio */
  }

  // LOGADO — CRM projetos (pos_venda_servicos do mês, valor lançado)
  let nLogados = 0;
  let valorLogado = 0;
  let materialLancado = false;
  try {
    const pv = await getLiveProjetosFull();
    const servicos = (pv?.servicos ?? []).filter((s) => (s.data ?? "").startsWith(mes));
    const comValor = servicos.filter((s) => s.valor > 0);
    nLogados = comValor.length;
    valorLogado = comValor.reduce((s, x) => s + x.valor, 0);
    materialLancado = servicos.some((s) => s.custoMaterial > 0);
  } catch {
    /* vazio */
  }

  // CORA — classificação IDÊNTICA à conciliação (direction + categoria)
  let recebidoCora = 0;
  let outrosCreditos = 0;
  let pagamentosCora = 0;
  let nCoraTx = 0;
  let coraDisponivel = false;
  try {
    const tx = await getTransactionsByEntity("ENERDY");
    coraDisponivel = tx.length > 0;
    const doMes = tx.filter((t) => !t.excludedFromConsolidated && (t.transactionDate ?? "").startsWith(mes));
    nCoraTx = doMes.length;
    for (const t of doMes) {
      const mag = Math.abs(Number(t.amount) || 0);
      if (t.direction === "credit") {
        if (AR_REALIZED_SET.has(String(t.managerialCategory ?? ""))) recebidoCora += mag;
        else outrosCreditos += mag;
      } else if (t.direction === "debit") {
        pagamentosCora += mag;
      }
    }
  } catch {
    /* sem Cora */
  }

  const comBonus = recebidoCora > config.gatilhoBonus;
  const custoFixoPremissa = comBonus ? custoFixoComBonus(config) : custoFixoSemBonus(config);

  const execNaoLogados = Math.max(1, nExecutados - nLogados);
  const valorRateioPorServico = Math.max(0, (recebidoCora - valorLogado) / execNaoLogados);

  return {
    mes,
    nExecutados,
    nLogados,
    valorLogado,
    recebidoCora,
    outrosCreditos,
    pagamentosCora,
    saldoCaixa: recebidoCora - pagamentosCora,
    nCoraTx,
    coraDisponivel,
    suporteIntegracao: pagamentosCora,
    custoFixoPremissa,
    resultadoOM: recebidoCora - custoFixoPremissa,
    comBonus,
    gapCobranca: Math.max(0, nExecutados - nLogados),
    gapRastreioValor: Math.max(0, recebidoCora - valorLogado),
    valorRateioPorServico,
    materialLancado,
    fonteStale,
  };
}
