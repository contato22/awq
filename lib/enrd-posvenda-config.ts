// ─── ENRD · Pós-venda/O&M — Parâmetros de custeio (editáveis) ────────────────
// Modelo de custeio RÍGIDO (não violar):
//  - Variáveis por OS (e só estes): material + combustível do deslocamento.
//  - Contribuição da OS = valor − material − combustível.
//  - Fixos (nível operação, NUNCA rateados por OS no número principal):
//      folha (William + Tamara + bônus condicional) × encargos + veículo fixo.
//  - O salário/tempo do técnico é FIXO: não vira custo de OS.
//  - Resultado = Σ contribuição − fixos do mês.
//
// FATO ANCORADO (defaults reproduzem a tese): break-even ≈ R$11,4k sem bônus e
// ≈ R$16,5k com bônus; gatilho do bônus (R$10k) ABAIXO do break-even com bônus
// → "zona morta" onde faturar mais ativa o bônus mas a operação ainda dá prejuízo.

export type CidadeCombustivel = { cidade: string; combustivel: number };

export type PosVendaConfig = {
  // Folha (R$/mês)
  salarioWilliam: number;
  salarioTamaraFixo: number;
  bonus: number; // bônus da Tamara — 100% pós-venda (NÃO ratear)
  gatilhoBonus: number; // faturamento/mês que ATIVA o bônus
  encargos: number; // multiplicador (1,40)
  // ── Custo de pessoal por DEDICAÇÃO (perímetro pós-venda do Miguel) ──────────
  // William é majoritariamente montagem (Felipe); Tamara faz outras funções.
  // O pós-venda absorve só a fração de homem-hora que consome.
  dedWilliam: number; // % dedicação pós-venda do William (0..1)
  dedTamara: number; // % dedicação pós-venda da Tamara (0..1)
  horasProdutivasMes: number; // horas produtivas/mês por pessoa
  // % de originação que o pós-venda recebe sobre venda de integração que gerou.
  // A DEFINIR pelo Miguel — default 0 (sem comissão).
  pctOriginacao: number;
  // Veículo fixo/mês (manutenção/seguro/depreciação). Pendente → 0 (subestima).
  veiculoFixoMes: number;
  veiculoPendente: boolean;
  // Combustível por cidade (deslocamento) — custo variável da OS.
  combustivelPorCidade: CidadeCombustivel[];
  // Taxa de contribuição assumida ENQUANTO não há OS lançadas (para break-even).
  // Com OS reais, o painel usa a taxa REAL e marca a fonte.
  taxaContribuicaoDefault: number;
  // Piso de contribuição por OS (flag vermelha abaixo disto).
  pisoContribuicao: number;
};

// Defaults ancorados na tese apurada (5 meses).
export const DEFAULT_POSVENDA_CONFIG: PosVendaConfig = {
  salarioWilliam: 3000,
  salarioTamaraFixo: 2500,
  bonus: 2500,
  gatilhoBonus: 10000,
  encargos: 1.4,
  // ESTIMADO (confiança baixa) até o Miguel confirmar a dedicação real.
  dedWilliam: 0.35,
  dedTamara: 0.45,
  horasProdutivasMes: 176,
  pctOriginacao: 0,
  veiculoFixoMes: 0,
  veiculoPendente: true,
  // Valores derivados por método em lib/enrd-posvenda-premissas.ts
  // (diesel R$6,20/L ÷ 8 km/L × km ida-volta, arred. ↑). Mantidos inline aqui
  // para a config ser self-contained e editável.
  combustivelPorCidade: [
    { cidade: "Teresópolis", combustivel: 20 },
    { cidade: "Magé/Guapimirim", combustivel: 70 },
    { cidade: "Nova Iguaçu/Caxias", combustivel: 115 },
    { cidade: "Rio", combustivel: 145 },
  ],
  // 0,677 → reproduz break-even ≈ 11,4k (sem bônus) e ≈ 16,5k (com bônus).
  taxaContribuicaoDefault: 0.677,
  pisoContribuicao: 0,
};

// Normalização de cidade para casar com a tabela de combustível.
export function normalizeCidade(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Resolve o combustível de uma cidade (match por palavra-chave normalizada).
// Retorna { combustivel, matched } — matched=false quando cai num default.
export function combustivelDaCidade(
  cidade: string | null | undefined,
  tabela: CidadeCombustivel[]
): { combustivel: number; matched: boolean; cidadeTabela: string | null } {
  const n = normalizeCidade(cidade);
  if (!n) return { combustivel: 0, matched: false, cidadeTabela: null };
  for (const row of tabela) {
    // Cada entrada pode listar várias cidades separadas por "/".
    const alvos = row.cidade.split("/").map(normalizeCidade);
    if (alvos.some((a) => a && (n.includes(a) || a.includes(n)))) {
      return { combustivel: row.combustivel, matched: true, cidadeTabela: row.cidade };
    }
  }
  return { combustivel: 0, matched: false, cidadeTabela: null };
}
