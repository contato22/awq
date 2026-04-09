// ─── Deal Workspace — Canonical Types ────────────────────────────────────────
// SOURCE OF TRUTH: AWQ Venture (via /awq-venture/deals/[id])
// HOLDING: read-only DealHoldingSummary consumer at /awq/portfolio

export type DealStage =
  | "Triagem"
  | "Prospecção"
  | "Due Diligence"
  | "Term Sheet"
  | "Negociação"
  | "Fechado"
  | "Cancelado";

export type DealRisk = "Baixo" | "Médio" | "Alto" | "Crítico";

export type DealSendStatus =
  | "Rascunho"
  | "Pronto para Envio"
  | "Enviado"
  | "Em Negociação"
  | "Aprovado"
  | "Rejeitado";

export type DealOperationType =
  | "Aquisição Total"
  | "Aquisição Parcial"
  | "Fusão"
  | "Joint Venture"
  | "Investimento Minoritário";

export type DealPriority = "Alta" | "Média" | "Baixa";
export type DealConfidence = "confirmed" | "probable" | "estimated";
export type MaturityLevel = 1 | 2 | 3 | 4 | 5;

// ─── Section 3: Identificação ────────────────────────────────────────────────

export interface DealIdentification {
  companyName:      string;
  sector:           string;
  location:         string;
  mainContact:      string;
  mainContactRole:  string;
  mainContactEmail: string | null;
  mainContactPhone: string | null;
  dealStage:        DealStage;
  dealOrigin:       string;
  website:          string | null;
}

// ─── Section 4: Tese Estratégica ─────────────────────────────────────────────

export interface DealStrategicThesis {
  strategicRationale:  string;
  whyNow:              string;
  synergies:           string;
  valueCreationThesis: string;
  awqVentureFit:       string;
}

// ─── Section 5: Diagnóstico do Ativo ─────────────────────────────────────────

export interface DealAssetDiagnosis {
  summary:              string;
  strengths:            string[];
  weaknesses:           string[];
  operationalMaturity:  MaturityLevel;
  commercialMaturity:   MaturityLevel;
  risks:                string[];
}

// ─── Section 6: Econômico-Financeiro ─────────────────────────────────────────

export interface DealFinancials {
  estimatedRevenue:   number | null;
  estimatedEbitda:    number | null;
  ebitdaMargin:       number | null;
  askValuation:       number;
  proposedValuation:  number;
  impliedMultiple:    number | null;
  offerStructure:     string;
  dealType:           DealOperationType;
  targetOwnership:    number;            // %
  estimatedInvestment: number;
  expectedUpside:     number | null;     // %
  financialNotes:     string;
  revenueConfidence:  DealConfidence;
}

// ─── Section 7: Risco e Diligência ───────────────────────────────────────────

export interface DealRiskDiligence {
  legalRisks:        string;
  financialRisks:    string;
  operationalRisks:  string;
  integrationRisks:  string;
  diligencePending:  string[];
  blockers:          string[];
}

// ─── Section 8: Estrutura da Proposta ────────────────────────────────────────

export interface DealProposalStage {
  label:       string;
  description: string;
  targetDate:  string;
}

export interface DealProposalStructure {
  economicProposal:  string;
  paymentStructure:  string;
  stages:            DealProposalStage[];
  conditions:        string[];
  timeline:          string;
  nextSteps:         string[];
}

// ─── Section 9: Governança ───────────────────────────────────────────────────

export interface DealAuditEntry {
  date:   string;
  by:     string;
  action: string;
}

export interface DealGovernance {
  createdBy:     string;
  createdAt:     string;
  updatedBy:     string;
  updatedAt:     string;
  sourceOfTruth: "AWQ_Venture";
  status:        DealSendStatus;
  version:       number;
  internalOnly:  boolean;
  clientVisible: boolean;
  auditTrail:    DealAuditEntry[];
}

// ─── Full Deal Workspace ─────────────────────────────────────────────────────

export interface DealWorkspace {
  // Cabeçalho executivo
  id:             string;
  companyName:    string;
  stage:          DealStage;
  assignee:       string;
  lastUpdated:    string;
  sendStatus:     DealSendStatus;
  operationType:  DealOperationType;
  valuationRange: string;
  proposedValue:  number;
  dealScore:      number;    // 0–10
  riskLevel:      DealRisk;
  priority:       DealPriority;

  // Sections
  identification:    DealIdentification;
  strategicThesis:   DealStrategicThesis;
  assetDiagnosis:    DealAssetDiagnosis;
  financials:        DealFinancials;
  riskDiligence:     DealRiskDiligence;
  proposalStructure: DealProposalStructure;
  governance:        DealGovernance;

  // 10-Block Proposal (legacy, optional)
  proposal10Blocks?: Proposal10Blocks;

  // 13-Block Proposal (template-master, optional — takes precedence over 10-block)
  proposal13Blocks?: Proposal13Blocks;
}

// ─── 10-Block Proposal Architecture (legacy) ────────────────────────────────

export interface ProposalMetrica {
  nome:     string;
  formula:  string;
  baseline: string;
  meta:     string;
  auditavel: boolean;
}

export interface ProposalTrancheItem {
  label:      string;
  valor:      string;
  condicao:   string;
  prazo:      string;
}

export interface ProposalMarco {
  numero:     number;
  label:      string;
  descricao:  string;
  prazo:      string;
  dependencia?: string;
  revisao?:   string;
}

export interface ProposalCaminhoDecisao {
  opcao:      "aprovacao" | "ajuste" | "contraproposta";
  label:      string;
  descricao:  string;
  cta:        string;
}

// Legacy BLOCO 1: Contexto do Deal
export interface ProposalB1Contexto {
  diagnostico:     string;
  situacaoAtual:   string;
  problema:        string;
  ruptura:         string;
  oportunidade:    string;
  riscoNaoAgir:    string;
}

// Legacy BLOCO 2: Tese de Criação de Valor
export interface ProposalB2Tese {
  alavancasPrincipais: string[];
  assimetriaDeal:      string;
  papelAWQ:            string;
  resultadoEsperado:   string;
  horizonte:           string;
}

// Legacy BLOCO 3: Escopo da Atuação
export interface ProposalB3Escopo {
  oQueEntrega:    string[];
  oQueCoordena:   string[];
  foraDoCampo:    string[];
  dedicacao:      string;
}

// Legacy BLOCO 4: Objeto Econômico da Proposta
export interface ProposalB4Objeto {
  ativo:             string;
  veiculo:           string;
  naturezaDireito:   string;
  conversaoFutura:   string;
  valorReferencia:   string;
}

// Legacy BLOCO 5: Estrutura Econômica
export interface ProposalB5Estrutura {
  feeDescricao:     string;
  feeValor:         string;
  feePrazo:         string;
  upsideDescricao:  string;
  upsidePercentual: string;
  gates:            string[];
  tranches:         ProposalTrancheItem[];
  baseline:         string;
  earnin:           string;
}

// Legacy BLOCO 6: Scorecard e Métricas
export interface ProposalB6Scorecard {
  financeiras:     ProposalMetrica[];
  comerciais:      ProposalMetrica[];
  institucionais:  ProposalMetrica[];
  periodicidade:   string;
  auditor:         string;
}

// Legacy BLOCO 7: Governança e Alçadas
export interface ProposalB7Governanca {
  direitosAWQ:       string[];
  rotinasReporting:  string[];
  alcadasDecisao:    string;
  representacao:     string;
  conflito:          string;
}

// Legacy BLOCO 8: Proteções Contratuais
export interface ProposalB8Protecoes {
  goodLeaver:       string;
  badLeaver:        string;
  antiDiluicao:     string;
  changeOfControl:  string;
  tagDragAlong:     string;
  clausulasPenais:  string[];
  lockup:           string;
}

// Legacy BLOCO 9: Cronograma de Fechamento e Execução
export interface ProposalB9Cronograma {
  marcos:              ProposalMarco[];
  prazoTotal:          string;
  janelaRevisao:       string;
  condicoesAbertura:   string[];
  condicoesFechamento: string[];
}

// Legacy BLOCO 10: Decisão Solicitada
export interface ProposalB10Decisao {
  perguntasEstruturadas: string[];
  ctaLabel:              string;
  ctaDescricao:          string;
  caminhos:              ProposalCaminhoDecisao[];
  prazoResposta:         string;
  contatoNegociacao:     string;
}

export interface Proposal10Blocks {
  versao:     number;
  criadoEm:   string;
  atualizadoEm: string;
  b1:  ProposalB1Contexto;
  b2:  ProposalB2Tese;
  b3:  ProposalB3Escopo;
  b4:  ProposalB4Objeto;
  b5:  ProposalB5Estrutura;
  b6:  ProposalB6Scorecard;
  b7:  ProposalB7Governanca;
  b8:  ProposalB8Protecoes;
  b9:  ProposalB9Cronograma;
  b10: ProposalB10Decisao;
}

// ─── 13-Block Proposal Architecture (Template-Master) ────────────────────────
// Disciplined M&A / Venture deal structuring with:
// - Binding vs non-binding clarity
// - Cliff/vesting/earn-in logic
// - Media for Equity (M4E) rationale
// - Fee vs upside separation
// - Phantom equity / instrument precision
// - Segregated client link architecture
// - Contractual protections with PE/MIP rigor

// BLOCO 0: Natureza do Documento
export interface P13B0NaturezaDocumento {
  tipoDocumento:         string;  // e.g. "Memorando de Entendimento Indicativo"
  objetivoAlinhamento:   string;  // what this document seeks to align
  caraterPreliminar:     string;  // what is preliminary / non-binding
  pontosIndicativos:     string;  // what is indicative only
  pontosVinculantes:     string;  // what may migrate to binding in next phase
  interpretacaoCliente:  string;  // how the counterparty should interpret
  confidencialidade:     string;  // confidentiality clause
  vigenciaDocumento:     string;  // document validity
}

// BLOCO 1: Contexto do Deal
export interface P13B1Contexto {
  leituraDoAtivo:    string;
  situacaoAtual:     string;
  rupturaPrincipal:  string;
  oportunidade:      string;
  riscoNaoAgir:      string;
}

// BLOCO 2: Tese de Criação de Valor
export interface P13B2Tese {
  qualValorCria:          string;
  alavancas:              string[];
  transformacaoPretendida: string;
  porQueAlemDeServico:     string;
  papelAWQvsOutros:        string;
  horizonte:               string;
}

// BLOCO 3: Racional de Captura M4E (Media for Equity)
export interface P13B3RacionalM4E {
  porQueNaoFeeOnly:        string;
  porQueNaoMAClassico:     string;
  logicaFeeUpside:         string;
  intervencaoOperacional:  string;
  feeRemuneraCamada:       string;
  upsideRemuneraRerating:  string;
}

// BLOCO 4: Objeto Econômico
export interface P13B4ObjetoEconomico {
  ativoObjeto:             string;
  unidadeVeiculo:          string;
  cnpjAfetado:             string;  // [LACUNA] when unknown
  incidenciaDireito:       string;
  camadaIncidencia:        string;
  formaLiquidacao:         string;
}

// BLOCO 5: Instrumento
export type TipoInstrumento =
  | "equity_real"
  | "phantom_equity"
  | "earn_in"
  | "opcao"
  | "direito_economico_contingente"
  | "profit_interest"
  | "hibrido";

export interface P13B5Instrumento {
  tipoInstrumento:       TipoInstrumento;
  descricaoInstrumento:  string;
  direitosEconomicos:    string;
  direitosPoliticos:     string;
  conversaoFutura:       string;
  estruturaSocietariaOuContratual: string; // "societária" | "contratual" | "híbrida"
}

// BLOCO 6: Estrutura Econômica (with vesting/cliff sub-section)
export interface P13VestingCliff {
  temCliff:              boolean;
  duracaoCliff:          string;
  tipoCliff:             string;  // "temporal" | "operacional" | "híbrido"
  vestingFrequencia:     string;  // "mensal" | "trimestral" | "por marcos"
  temAceleracao:         boolean;
  condicoesAceleracao:   string;
  temCongelamento:       boolean;
  condicoesCongelamento: string;
  valorCriadoCedo:       string;
  permanenciaLonga:      string;
}

export interface P13B6Estrutura {
  feeFixo:               string;
  feeDescricao:          string;
  feePrazo:              string;
  upsideTotalPotencial:  string;
  upsideDescricao:       string;
  prazoTotal:            string;
  gateInicial:           string;
  baseline:              string;
  tranches:              ProposalTrancheItem[];
  criteriosAquisicao:    string[];
  logicaEarnIn:          string;
  vestingCliff:          P13VestingCliff;
}

// BLOCO 7: Scorecard e Métricas (split into 7A, 7B, 7C)
export interface P13B7Scorecard {
  // 7A: Métricas de performance econômica
  performanceEconomica: ProposalMetrica[];
  // 7B: Métricas de institucionalização
  institucionalizacao:  ProposalMetrica[];
  // 7C: Regras de apuração
  regrasApuracao: {
    formulas:            string;
    periodicidade:       string;
    criterioApuracao:    string;
    fonteDado:           string;
    janelaMedicao:       string;
    tratamentoDisputa:   string;
  };
}

// BLOCO 8: Governança e Alçadas (enhanced)
export interface P13B8Governanca {
  poderExecucao:          string;
  acessoDados:            string;
  cadenciaReuniao:        string;
  sobreQueDecide:         string[];
  sobreQueInfluencia:     string[];
  aprovacaoConjunta:      string[];
  direitoInformacao:      string;
  reporting:              string[];
  rituaisAcompanhamento:  string[];
  fluxoDecisorio:         string;
  alcadasMinimas:         string;
  temasCriticos:          string[];
}

// BLOCO 9: Proteções Contratuais (6 sub-blocks)
export interface P13B9Protecoes {
  // 9A: Leaver provisions
  goodLeaver:            string;
  badLeaver:             string;
  // 9B: Change of control
  changeOfControl:       string;
  // 9C: Anti-diluição / preservação econômica
  antiDiluicao:          string;
  preservacaoEconomica:  string;
  // 9D: Recompra / fórmula de saída
  formulaRecompra:       string;
  formulaSaida:          string;
  // 9E: Reorganização societária
  reorganizacao:         string;
  // 9F: Não circunvenção / confidencialidade
  naoCircunvencao:       string;
  confidencialidade:     string;
  lockup:                string;
  clausulasPenais:       string[];
}

// BLOCO 10: Condições Precedentes
export interface P13B10CondicoesPrecedentes {
  baselineFechado:       string;
  acessoDados:           string;
  diligenciaMinima:      string;
  validacaoPassivos:     string;
  aceiteInstrumento:     string;
  alinhamentoJuridico:   string;
  alinhamentoContabil:   string;
  definicaoStack:        string;
  demaisCondicoes:       string[];
}

// BLOCO 11: Cronograma de Fechamento e Execução
export interface P13B11Cronograma {
  prazoRetorno:          string;
  prazoDiligencia:       string;
  prazoBaseline:         string;
  prazoAssinatura:       string;
  prazoKickoff:          string;
  checkpoints:           ProposalMarco[];
  marcosCriticos:        string[];
  dependencias:          string[];
  janelasRevisao:        string[];
  prazoTotal:            string;
}

// BLOCO 12: Decisão Solicitada ao Cliente
export interface P13B12Decisao {
  perguntasEstruturadas: string[];
  aprovacaoIntegral:     string;
  aprovacaoComAjustes:   string;
  contraproposta:        string;
  itensParaJuridico:     string[];
  itensParaFinanceiro:   string[];
  responsavel:           string;
  prazoRetorno:          string;
  contatoNegociacao:     string;
  caminhos:              ProposalCaminhoDecisao[];
}

// Full 13-Block Proposal
export interface Proposal13Blocks {
  versao:       number;
  criadoEm:     string;
  atualizadoEm: string;
  b0:  P13B0NaturezaDocumento;
  b1:  P13B1Contexto;
  b2:  P13B2Tese;
  b3:  P13B3RacionalM4E;
  b4:  P13B4ObjetoEconomico;
  b5:  P13B5Instrumento;
  b6:  P13B6Estrutura;
  b7:  P13B7Scorecard;
  b8:  P13B8Governanca;
  b9:  P13B9Protecoes;
  b10: P13B10CondicoesPrecedentes;
  b11: P13B11Cronograma;
  b12: P13B12Decisao;
}

// ─── Holding Summary (read-only — AWQ Holding consumes only this) ─────────────

export interface DealHoldingSummary {
  dealId:        string;
  companyName:   string;
  sector:        string;
  stage:         DealStage;
  proposedValue: number;
  valuationRange: string;
  operationType: DealOperationType;
  riskLevel:     DealRisk;
  expectedUpside: number | null;
  sendStatus:    DealSendStatus;
  lastUpdated:   string;
  assignee:      string;
  dealScore:     number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toDealHoldingSummary(d: DealWorkspace): DealHoldingSummary {
  return {
    dealId:         d.id,
    companyName:    d.companyName,
    sector:         d.identification.sector,
    stage:          d.stage,
    proposedValue:  d.proposedValue,
    valuationRange: d.valuationRange,
    operationType:  d.operationType,
    riskLevel:      d.riskLevel,
    expectedUpside: d.financials.expectedUpside,
    sendStatus:     d.sendStatus,
    lastUpdated:    d.lastUpdated,
    assignee:       d.assignee,
    dealScore:      d.dealScore,
  };
}
