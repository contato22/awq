// ─── ENRD · Pós-venda — Premissas ESTIMADAS (tipo A) ─────────────────────────
// Regra de dados ausentes:
//   A) PREMISSA DE MODELO ausente (veículo, R$/km combustível, tempo por tipo,
//      encargos) → PODE ser estimada, com método explícito e conservadora.
//   B) FATO TRANSACIONAL ausente (valor da OS, cliente, data, NF) → NUNCA
//      estimar; fica vazio e reduz a completude.
//
// Toda premissa tipo A estimada por nós vive AQUI (única fonte), com as 4 colunas
// obrigatórias: Parâmetro · Valor estimado · Base do cálculo · Confiança.
// Estimativas são CONSERVADORAS (assumir custo MAIOR, não menor).

import type { PosVendaConfig, CidadeCombustivel } from "@/lib/enrd-posvenda-config";

export type Confianca = "alta" | "média" | "baixa" | "sem-base";

export type PremissaEstimada = {
  key: string; // casa com o campo de config que a premissa preenche
  parametro: string;
  valorEstimado: string; // o número exato usado, formatado
  base: string; // fonte / raciocínio explícito
  confianca: Confianca;
  semBase?: boolean; // true → "SEM BASE — requer input do Miguel"
};

// ── Método do combustível ────────────────────────────────────────────────────
// custo = (km ida-volta ÷ consumo) × preço_diesel. Conservador: consumo baixo
// (mais litros), preço corrente arredondado pra cima.
const DIESEL_RS_L = 6.2; // R$/L — premissa de preço (RJ, ~2026). EDITÁVEL.
const CONSUMO_KM_L = 8; // km/L de veículo de trabalho (conservador: baixo).

// Distâncias ida-volta a partir da base (Teresópolis), aproximadas e conservadoras.
const ROTAS: { cidade: string; kmIdaVolta: number }[] = [
  { cidade: "Teresópolis", kmIdaVolta: 25 },
  { cidade: "Magé/Guapimirim", kmIdaVolta: 85 },
  { cidade: "Nova Iguaçu/Caxias", kmIdaVolta: 145 },
  { cidade: "Rio", kmIdaVolta: 185 },
];

function custoRota(kmIdaVolta: number): number {
  // arredonda pra cima em múltiplos de R$5 (conservador)
  const bruto = (kmIdaVolta / CONSUMO_KM_L) * DIESEL_RS_L;
  return Math.ceil(bruto / 5) * 5;
}

export function combustivelEstimadoPorCidade(): CidadeCombustivel[] {
  return ROTAS.map((r) => ({ cidade: r.cidade, combustivel: custoRota(r.kmIdaVolta) }));
}

// ── Tempo médio por tipo de serviço (premissa p/ Seção 3 — capacidade) ───────
// Estimativa rotulada — NÃO é medição. Horas por OS por tipo.
export const TEMPO_MEDIO_POR_TIPO: Record<string, number> = {
  Limpeza: 2.5,
  Montagem: 8,
  Serviço: 3,
};
export const HORAS_UTEIS_MES = 176; // 22 dias × 8h — premissa de capacidade do técnico.

// ── Lista das premissas estimadas (alimenta o painel "PREMISSAS ESTIMADAS") ──
export function premissasEstimadas(config: PosVendaConfig): PremissaEstimada[] {
  const fuel = config.combustivelPorCidade;
  const lista: PremissaEstimada[] = [
    {
      key: "dedWilliam",
      parametro: "% dedicação pós-venda — William",
      valorEstimado: `${(config.dedWilliam * 100).toFixed(0)}%`,
      base: "William é majoritariamente montagem (Felipe). Estimativa até o Miguel confirmar a fração real de homem-hora dele no pós-venda.",
      confianca: "baixa",
    },
    {
      key: "dedTamara",
      parametro: "% dedicação pós-venda — Tamara",
      valorEstimado: `${(config.dedTamara * 100).toFixed(0)}%`,
      base: "Tamara faz outras funções além do pós-venda. Estimativa até confirmação do Miguel.",
      confianca: "baixa",
    },
    {
      key: "horasProdutivasMes",
      parametro: "Horas produtivas/mês por pessoa",
      valorEstimado: `${config.horasProdutivasMes} h`,
      base: "22 dias úteis × 8h. Usada para capacidade e para expressar a dedicação em horas.",
      confianca: "média",
    },
    {
      key: "pctTempoVendasOM",
      parametro: "% tempo O&M em vendas (vs operação)",
      valorEstimado: `${(config.pctTempoVendasOM * 100).toFixed(0)}% vendas / ${((1 - config.pctTempoVendasOM) * 100).toFixed(0)}% operação`,
      base: "Sem apontamento real de horas. William/Tamara são majoritariamente técnicos de campo — estimativa até o Miguel confirmar. Usado para separar Capital Empregado (operação) de esforço comercial (vendas) no ROCE.",
      confianca: "baixa",
    },
    ...fuel.map((f) => ({
      key: `combustivel:${f.cidade}`,
      parametro: `Combustível — ${f.cidade}`,
      valorEstimado: `R$ ${f.combustivel.toFixed(2)}`,
      base:
        `diesel R$${DIESEL_RS_L.toFixed(2)}/L × ` +
        `${ROTAS.find((r) => r.cidade === f.cidade)?.kmIdaVolta ?? "?"} km ida-volta ` +
        `(base Teresópolis) ÷ ${CONSUMO_KM_L} km/L, arred. ↑`,
      confianca: "média" as Confianca,
    })),
    {
      key: "veiculoFixoMes",
      parametro: "Veículo fixo/mês (manut./seguro/deprec.)",
      valorEstimado: config.veiculoPendente ? "R$ 0,00 (pendente)" : `R$ ${config.veiculoFixoMes.toFixed(2)}`,
      base: "SEM BASE — requer input do Miguel. Em 0, SUBESTIMA o custo fixo → break-even otimista.",
      confianca: "sem-base",
      semBase: true,
    },
    {
      key: "taxaContribuicaoDefault",
      parametro: "Taxa de contribuição (enquanto sem OS lançadas)",
      valorEstimado: `${(config.taxaContribuicaoDefault * 100).toFixed(1)}%`,
      base: "ancorada na tese apurada (5 meses): material+combustível ≈ 32% da receita. Substituída pela taxa REAL assim que houver OS.",
      confianca: "média",
    },
    {
      key: "tempoMedioTipo",
      parametro: "Tempo médio por OS (Limpeza 2,5h / Serviço 3h / Montagem 8h)",
      valorEstimado: "2,5–8 h",
      base: "estimativa operacional (NÃO medição). Usada só no diagnóstico de capacidade ociosa.",
      confianca: "baixa",
    },
  ];
  return lista;
}

// ── Modo "só dados reais" ────────────────────────────────────────────────────
// Zera as premissas estimadas tipo A (combustível e veículo) para mostrar o
// resultado sem o efeito das estimativas. NÃO mexe em fatos (valor, material).
export function configSoReais(config: PosVendaConfig): PosVendaConfig {
  return {
    ...config,
    veiculoFixoMes: 0,
    combustivelPorCidade: config.combustivelPorCidade.map((c) => ({ ...c, combustivel: 0 })),
  };
}

// % do resultado que depende de premissas estimadas.
// = |resultado_com_estimativas − resultado_só_reais| / base, onde base é o maior
// entre |resultado_com| e um piso (faturamento×1%) para evitar explosão perto de 0.
export function pctDependenteDeEstimativas(
  resultadoComEstimativas: number,
  resultadoSoReais: number,
  faturamento: number
): number {
  const delta = Math.abs(resultadoComEstimativas - resultadoSoReais);
  const base = Math.max(Math.abs(resultadoComEstimativas), faturamento * 0.01, 1);
  return delta / base;
}
