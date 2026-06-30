// ─── ENRD · Pós-venda/O&M — Engine de custeio (puro, testável) ───────────────
// Regras (não violar): folha NUNCA rateada por OS no número principal;
// deslocamento entra só como COMBUSTÍVEL (variável), nunca como hora de M.O.;
// break-even em DEGRAU (bônus = descontinuidade, não linear).

import {
  type PosVendaConfig,
  combustivelDaCidade,
} from "@/lib/enrd-posvenda-config";

// ── OS (uma ordem de serviço — fonte: planilha Tamara) ───────────────────────
export type OS = {
  id: string;
  data: string | null; // AAAA-MM-DD (já normalizada)
  cliente: string | null;
  cidade: string | null;
  tipoServico: string | null;
  valor: number;
  custoMaterial: number;
  tecnico: string | null;
};

export type OSContribuicao = OS & {
  combustivel: number;
  combustivelMatched: boolean;
  contribuicao: number; // valor − material − combustível
  contribuicaoPct: number; // contribuição / valor
  flagNegativa: boolean; // contribuição < piso (não cobre nem o variável)
  flagDistante: boolean; // ticket baixo + cidade distante (combustível come a contribuição)
};

// Contribuição de UMA OS (variáveis = material + combustível). Sem folha.
export function contribuicaoOS(os: OS, config: PosVendaConfig): OSContribuicao {
  const { combustivel, matched } = combustivelDaCidade(os.cidade, config.combustivelPorCidade);
  const contribuicao = os.valor - os.custoMaterial - combustivel;
  const contribuicaoPct = os.valor > 0 ? contribuicao / os.valor : 0;
  // "ticket baixo + cidade distante": combustível >= 25% do valor da OS.
  const flagDistante = os.valor > 0 && combustivel > 0 && combustivel / os.valor >= 0.25;
  return {
    ...os,
    combustivel,
    combustivelMatched: matched,
    contribuicao,
    contribuicaoPct,
    flagNegativa: contribuicao < config.pisoContribuicao,
    flagDistante,
  };
}

// ── Custo de pessoal por DEDICAÇÃO (perímetro pós-venda) ─────────────────────
// O pós-venda absorve só a fração de homem-hora consumida. William é
// majoritariamente montagem (Felipe); Tamara faz outras funções. O bônus da
// Tamara é 100% pós-venda (NÃO ratear).
export function custoPessoalSemBonus(config: PosVendaConfig): number {
  return (
    config.salarioWilliam * config.encargos * config.dedWilliam +
    config.salarioTamaraFixo * config.encargos * config.dedTamara
  );
}
export function custoPessoalComBonus(config: PosVendaConfig): number {
  return custoPessoalSemBonus(config) + config.bonus * config.encargos;
}

// Fixo SEM bônus (faturamento ≤ gatilho) = pessoal rateado + veículo.
export function custoFixoSemBonus(config: PosVendaConfig): number {
  return custoPessoalSemBonus(config) + config.veiculoFixoMes;
}

// Fixo COM bônus (faturamento > gatilho).
export function custoFixoComBonus(config: PosVendaConfig): number {
  return custoPessoalComBonus(config) + config.veiculoFixoMes;
}

// ── Classificação por DONO (perímetro do vesting) ────────────────────────────
// POS_VENDA (Miguel): limpeza, manutenção, visita técnica, reconfiguração, troca
// disjuntor/DPS, monitoramento. MONTAGEM/INTEGRAÇÃO (Felipe, fora): instalação/
// inclusão de módulo, placas, trafos, reinstalação, montagem, venda de integração.
// HÍBRIDO: as duas naturezas na mesma OS.
export type DonoOS = "pos_venda" | "montagem" | "hibrido";
const RX_POS = /limpeza|manuten|visita|reconfig|disjuntor|\bdps\b|monitor/;
const RX_MONT = /instala|modulo|placa|trafo|reinstal|montag|integra/;
export function classificarDono(tipo: string | null | undefined): DonoOS {
  const t = (tipo ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  // "Limpeza" é SEMPRE pós-venda/O&M, mesmo citando placa/módulo
  // (ex.: "Limpeza de Placas") — senão "placa" cairia no RX_MONT e viraria híbrido.
  if (/limpeza/.test(t)) return "pos_venda";
  const pos = RX_POS.test(t);
  const mont = RX_MONT.test(t);
  if (pos && mont) return "hibrido";
  if (mont) return "montagem";
  return "pos_venda"; // padrão: fonte é o CRM de pós-venda
}

// ── Mitigação por OS (ação recomendada) ──────────────────────────────────────
// Transforma os flags em UMA ação concreta + severidade. Ordem importa: o
// problema mais grave domina a recomendação.
export type Severidade = "alta" | "media" | "ok";
export type Mitigacao = { acao: string; severidade: Severidade };

export function mitigacaoOS(o: OSContribuicao): Mitigacao {
  if (o.valor <= 0) return { acao: "Sem cobrança — lançar o valor da OS no CRM", severidade: "alta" };
  if (o.flagNegativa) return { acao: "Repactuar preço ou recusar — não cobre material+combustível", severidade: "alta" };
  if (o.flagDistante) return { acao: "Agrupar visitas na região ou repassar o deslocamento", severidade: "media" };
  if (o.valor > 0 && o.custoMaterial / o.valor >= 0.5)
    return { acao: "Material ≥50% do ticket — revisar fornecedor/repasse", severidade: "media" };
  if (o.contribuicaoPct < 0.3) return { acao: "Margem baixa (<30%) — revisar escopo/preço", severidade: "media" };
  return { acao: "OK — dentro da meta", severidade: "ok" };
}

// Resumo de mitigação: quantos problemas, contribuição negativa total e o
// GANHO POTENCIAL se cada OS problemática atingisse a taxa-alvo de contribuição.
export type MitigacaoResumo = {
  nProblemas: number; // severidade alta + media
  nAlta: number;
  contribNegativa: number; // Σ |contribuição| das OS com contribuição < 0
  taxaAlvo: number; // mediana da taxa de contribuição das OS saudáveis
  ganhoPotencial: number; // Σ recuperável levando as problemáticas à taxa-alvo
};

export function resumoMitigacao(osList: OSContribuicao[]): MitigacaoResumo {
  const saudaveis = osList.filter((o) => o.valor > 0 && o.contribuicao > 0);
  const taxas = saudaveis.map((o) => o.contribuicaoPct).sort((a, b) => a - b);
  const taxaAlvo = taxas.length ? taxas[Math.floor(taxas.length / 2)] : 0;

  let nProblemas = 0;
  let nAlta = 0;
  let contribNegativa = 0;
  let ganhoPotencial = 0;
  for (const o of osList) {
    const m = mitigacaoOS(o);
    if (m.severidade === "ok") continue;
    nProblemas++;
    if (m.severidade === "alta") nAlta++;
    if (o.contribuicao < 0) contribNegativa += -o.contribuicao;
    // recuperável: levar a OS à taxa-alvo (só conta o que falta, nunca negativo)
    const alvo = o.valor * taxaAlvo;
    if (alvo > o.contribuicao) ganhoPotencial += alvo - o.contribuicao;
  }
  return { nProblemas, nAlta, contribNegativa, taxaAlvo, ganhoPotencial };
}

// ── "Realizado" (serviço executado, entra no resultado) ──────────────────────
// fechado/concluído/pago/ganho/ativo. Pipeline (negociação/contato) NÃO realiza.
export function isRealizado(status: string | null | undefined): boolean {
  return !status || /fechad|conclu|pago|ganho|ativo/i.test(status);
}

// ── Pós-venda NÃO COBRADO (perda por não cobrar) ─────────────────────────────
// "Não cobrado" = OS de pós-venda com valor_fechado <= 0 (nenhum valor lançado).
// Subdividido em PERDA CERTA (realizado a R$0 — trabalho dado de graça) e em
// aberto (pipeline a R$0). A perda em R$ é uma ESTIMATIVA (tipo A): nº × ticket
// MEDIANO dos serviços cobrados (mediana é conservadora — ignora outlier alto).
// "Cotado a cobrar" = OS com valor>0 ainda NÃO realizada (receita não capturada).
export type OSNaoCobrada = {
  id: string;
  cliente: string | null;
  cidade: string | null;
  tipoServico: string | null;
  status: string | null;
  valor: number;
  realizado: boolean;
};

export type NaoCobradoKpi = {
  naoCobrados: OSNaoCobrada[]; // valor <= 0 (realizados grátis + pipeline)
  nRealizadosGratis: number; // realizado && valor<=0 (perda CERTA)
  ticketMediano: number; // mediana dos valores cobrados (>0)
  perdaCerta: number; // nRealizadosGratis × ticketMediano
  perdaEstimada: number; // naoCobrados.length × ticketMediano (perda CERTA + em aberto)
  cotadoACobrar: number; // Σ valor de OS valor>0 && !realizado
  nCotadoACobrar: number;
};

function mediana(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

type OSLike = {
  id: string;
  cliente: string | null;
  cidade: string | null;
  tipoServico: string | null;
  status: string | null;
  valor: number;
};

export function kpiNaoCobrados(osList: OSLike[]): NaoCobradoKpi {
  const ticketMediano = mediana(osList.filter((o) => o.valor > 0).map((o) => o.valor));
  const naoCobrados: OSNaoCobrada[] = osList
    .filter((o) => o.valor <= 0)
    .map((o) => ({ ...o, realizado: isRealizado(o.status) }));
  const nRealizadosGratis = naoCobrados.filter((o) => o.realizado).length;
  const aCobrar = osList.filter((o) => o.valor > 0 && !isRealizado(o.status));
  return {
    naoCobrados,
    nRealizadosGratis,
    ticketMediano,
    perdaCerta: nRealizadosGratis * ticketMediano,
    perdaEstimada: naoCobrados.length * ticketMediano,
    cotadoACobrar: aCobrar.reduce((s, o) => s + o.valor, 0),
    nCotadoACobrar: aCobrar.length,
  };
}

// ── Execução (montagem) × cobrança (projetos) ────────────────────────────────
// O app de montagem registra os O&M EXECUTADOS (tipo Serviço/Limpeza, com
// montador/data/status) mas SEM valor. A cobrança vive no CRM projetos
// (pos_venda_servicos, com valor). Cruzando por cliente: execução concluída
// cujo cliente NÃO aparece entre os cobrados = serviço feito e não faturado.
// Perda estimada = nº × ticket mediano (ESTIMATIVA conservadora).
export type ExecucaoOM = {
  id: string;
  cliente: string | null;
  tipo: string | null; // Serviço | Limpeza
  montador: string | null;
  data: string | null;
  status: string | null;
};
export type ExecNaoCobradoKpi = {
  totalExecutadas: number;
  naoCobradas: ExecucaoOM[];
  nNaoCobradas: number;
  perdaEstimada: number;
};

function normNome(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function kpiExecucaoNaoCobrada(
  execucoes: ExecucaoOM[],
  clientesCobradosRaw: (string | null)[],
  ticketMediano: number
): ExecNaoCobradoKpi {
  const cobrados = new Set(clientesCobradosRaw.map(normNome).filter(Boolean));
  const naoCobradas = execucoes.filter((e) => {
    const c = normNome(e.cliente);
    return !c || !cobrados.has(c);
  });
  return {
    totalExecutadas: execucoes.length,
    naoCobradas,
    nNaoCobradas: naoCobradas.length,
    perdaEstimada: naoCobradas.length * ticketMediano,
  };
}

// ── Break-even em DEGRAU ─────────────────────────────────────────────────────
// taxaContribuicao = Σcontribuição / Σvalor (real quando há OS; default senão).
export type BreakEven = {
  taxaContribuicao: number;
  taxaFonte: "real" | "estimativa";
  custoFixoSem: number;
  custoFixoCom: number;
  breakEvenSem: number; // faturamento que zera o resultado SEM bônus
  breakEvenCom: number; // faturamento que zera o resultado COM bônus
  gatilhoBonus: number;
  // "Zona morta": faturar > gatilho ATIVA o bônus, mas ainda < break-even com bônus.
  zonaMorta: { de: number; ate: number };
  gatilhoAbaixoDoBreakEven: boolean; // a distorção a destacar
};

export function calcBreakEven(
  config: PosVendaConfig,
  taxaContribuicaoReal: number | null
): BreakEven {
  const taxa =
    taxaContribuicaoReal != null && taxaContribuicaoReal > 0
      ? taxaContribuicaoReal
      : config.taxaContribuicaoDefault;
  const taxaFonte: "real" | "estimativa" =
    taxaContribuicaoReal != null && taxaContribuicaoReal > 0 ? "real" : "estimativa";

  const custoFixoSem = custoFixoSemBonus(config);
  const custoFixoCom = custoFixoComBonus(config);
  const breakEvenSem = taxa > 0 ? custoFixoSem / taxa : Infinity;
  const breakEvenCom = taxa > 0 ? custoFixoCom / taxa : Infinity;

  return {
    taxaContribuicao: taxa,
    taxaFonte,
    custoFixoSem,
    custoFixoCom,
    breakEvenSem,
    breakEvenCom,
    gatilhoBonus: config.gatilhoBonus,
    zonaMorta: { de: config.gatilhoBonus, ate: breakEvenCom },
    gatilhoAbaixoDoBreakEven: config.gatilhoBonus < breakEvenCom,
  };
}

// ── Resultado do mês (MTD) ───────────────────────────────────────────────────
export type ResultadoMes = {
  faturamento: number;
  somaContribuicao: number;
  taxaContribuicao: number; // real do mês
  comBonus: boolean; // faturamento > gatilho
  custoFixoAplicado: number; // A ou B conforme degrau
  resultado: number; // Σcontribuição − fixo
  resultadoPct: number;
  bonusDevido: boolean;
  emZonaMorta: boolean; // faturando ativa bônus mas ainda dá prejuízo
  nOS: number;
  breakEven: BreakEven;
};

export function resultadoMes(osList: OSContribuicao[], config: PosVendaConfig): ResultadoMes {
  const faturamento = osList.reduce((s, o) => s + o.valor, 0);
  const somaContribuicao = osList.reduce((s, o) => s + o.contribuicao, 0);
  const taxa = faturamento > 0 ? somaContribuicao / faturamento : 0;
  const comBonus = faturamento > config.gatilhoBonus;
  const custoFixoAplicado = comBonus ? custoFixoComBonus(config) : custoFixoSemBonus(config);
  const resultado = somaContribuicao - custoFixoAplicado;
  const breakEven = calcBreakEven(config, faturamento > 0 ? taxa : null);
  const emZonaMorta = faturamento > config.gatilhoBonus && faturamento < breakEven.breakEvenCom;

  return {
    faturamento,
    somaContribuicao,
    taxaContribuicao: taxa,
    comBonus,
    custoFixoAplicado,
    resultado,
    resultadoPct: faturamento > 0 ? resultado / faturamento : 0,
    bonusDevido: comBonus,
    emZonaMorta,
    nOS: osList.length,
    breakEven,
  };
}

// Agrupa OS por mês (AAAA-MM) e calcula resultado de cada — para a tendência.
export function resultadoPorMes(
  osList: OSContribuicao[],
  config: PosVendaConfig
): { mes: string; resultado: ResultadoMes }[] {
  const m = new Map<string, OSContribuicao[]>();
  for (const o of osList) {
    if (!o.data) continue;
    const mes = o.data.slice(0, 7);
    if (!m.has(mes)) m.set(mes, []);
    m.get(mes)!.push(o);
  }
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, list]) => ({ mes, resultado: resultadoMes(list, config) }));
}
