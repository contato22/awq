// ─── Venture Commercial Types ─────────────────────────────────────────────────
// SOURCE OF TRUTH: AWQ Venture · /awq-venture/comercial
// ISOLAMENTO: exclusivo da AWQ Venture. Não exportar para outras BUs.
// PAPEL: frente comercial da Venture (advisory, M4E, fee+upside, parceria)
// SEPARADO DE: deal-types.ts (M&A/investimento) · awq-group-data.ts (holding)
//
// ⚠ DISCIPLINA DE DADOS:
//   Todo campo financeiro DEVE ter um campo *Quality correspondente.
//   Nunca exibir um campo com quality "sem_dado" como se fosse fato.
//   Nunca omitir o campo *Quality em dados novos.

// ─── Tipologia do deal comercial ─────────────────────────────────────────────
// Distingue entre o papel da AWQ Venture em cada relação comercial.

export type CommercialDealType =
  | "Aquisição"                  // M&A — workspace canônico em /deals
  | "Participação/M4E"           // Management for Equity — AWQ Venture como gestor
  | "Fee + Upside"               // fee fixo + equity/revenue share contingente
  | "Consultoria Estratégica"    // advisory puro, sem participação patrimonial
  | "Operação Recorrente"        // contrato de serviço recorrente (ex: ENERDY)
  | "Parceria"                   // parceria estratégica sem fee ou equity definidos
  | "Oportunidade em Diligência" // em avaliação, sem estrutura definida
  | "Oportunidade Descartada"    // descartada formalmente
  | "Contrato Ativo";            // contrato assinado e em vigor

// ─── Estágio comercial ────────────────────────────────────────────────────────
// Estágio da relação comercial (diferente de DealStage que é M&A).

export type CommercialStage =
  | "Oportunidade"       // identificada, sem proposta enviada
  | "Proposta Enviada"   // proposta formal enviada ao cliente
  | "Negociação"         // em negociação de termos
  | "Contrato Ativo"     // contrato assinado
  | "Fee Recorrente"     // em execução com fee recorrente
  | "Upside Potencial"   // equity/upside contingente a evento futuro
  | "Investimento/M4E"   // M4E em curso
  | "Receita Operacional"// receita reconhecida operacionalmente
  | "Encerrado";         // encerrado (concluído ou cancelado)

// ─── Qualidade do dado ────────────────────────────────────────────────────────
// ⚠ OBRIGATÓRIO em qualquer campo financeiro.
// Nunca omitir. Nunca exibir "sem_dado" como fato confirmado.

export type DataQuality =
  | "real"       // confirmado com documentação ou evidência externa
  | "estimado"   // calculado/projetado sem documento formal
  | "manual"     // inserido manualmente sem verificação externa
  | "sem_dado";  // sem informação confiável — exibir como "–" com aviso

// ─── Econômico do deal ────────────────────────────────────────────────────────

export interface CommercialEconomics {
  monthlyFee:                         number | null;
  monthlyFeeQuality:                  DataQuality;
  arr:                                number | null;
  arrQuality:                         DataQuality;
  contractValue:                      number | null;
  contractValueQuality:               DataQuality;
  upsidePct:                          number | null; // % equity ou revenue share
  upsideType:                         "equity" | "revenue_share" | "earnout" | null;
  upsideQuality:                      DataQuality;
  estimatedPatrimonialValue:          number | null;
  estimatedPatrimonialValueQuality:   DataQuality;
}

// ─── Cronograma da proposta ───────────────────────────────────────────────────

export interface CommercialProposalSchedule {
  phase:       string;
  description: string;
  targetDate:  string;
}

// ─── Proposta comercial (documento enviável ao cliente) ───────────────────────
// Separação explícita: visão interna (CommercialOpportunity) vs. visão cliente.
// clientVisible = true → pronto para geração de preview externo.
// ⚠ Nunca marcar clientVisible = true sem revisar todos os campos.

export interface CommercialProposal {
  proposalId:         string;
  version:            number;
  status:             "Rascunho" | "Pronto para Envio" | "Enviado" | "Em Negociação" | "Aprovado" | "Rejeitado";
  clientVisible:      boolean;
  // ── Conteúdo enviável ────────────────────────────────────────────────────
  title:              string;
  executiveSummary:   string;
  context:            string;
  diagnosis:          string;
  operationStructure: string;
  economicProposal:   string;
  monthlyFee:         number | null;
  feeQuality:         DataQuality;
  contractDuration:   string;
  upsideDescription:  string;
  premises:           string[];
  risks:              string[];
  advanceCriteria:    string[];
  governance:         string;
  schedule:           CommercialProposalSchedule[];
  nextSteps:          string[];
  observations:       string;
  // ── Metadados ─────────────────────────────────────────────────────────────
  createdAt:          string;
  updatedAt:          string;
  sentAt:             string | null;
}

// ─── Interação do cliente (comentário / negociação / contraproposta) ──────────

export type ClientInteractionType =
  | "comentario"
  | "sugestao"
  | "contraproposta"
  | "confirmacao"
  | "rejeicao"
  | "solicitacao";

export interface ClientInteraction {
  id:         string;
  type:       ClientInteractionType;
  author:     "cliente" | "awq_venture";
  content:    string;
  createdAt:  string;
  attachedTo: string; // proposalId
}

// ─── Status de confirmação do cliente ────────────────────────────────────────
// Fluxo: aguardando → em_analise → (negociando | interesse) → confirmado/rejeitado

export type ClientConfirmationStatus =
  | "aguardando"   // proposta enviada, sem resposta
  | "em_analise"   // cliente está avaliando
  | "interesse"    // cliente demonstrou interesse formal
  | "negociando"   // contrapropostas em andamento
  | "confirmado"   // cliente aprovou / contrato assinado
  | "rejeitado"    // cliente rejeitou
  | "expirado";    // prazo encerrado sem resposta

export interface ClientConfirmation {
  opportunityId:     string;
  proposalId:        string;
  status:            ClientConfirmationStatus;
  clientName:        string | null;
  confirmedAt:       string | null;
  interactions:      ClientInteraction[];
  pipelineEntryDate: string | null; // quando entrou no pipeline ativo
  baseEntryDate:     string | null; // quando foi registrado na base
}

// ─── Oportunidade comercial (entidade central) ────────────────────────────────
// Entidade raiz da frente comercial da AWQ Venture.
// dealRef: se derivada de um DealWorkspace M&A, referenciar o ID (ex: "P001").

export interface CommercialOpportunity {
  id:            string;
  company:       string;
  sector:        string;
  origin:        string;
  dealType:      CommercialDealType;
  stage:         CommercialStage;
  economics:     CommercialEconomics;
  probability:   number;           // 0–100
  priority:      "Alta" | "Média" | "Baixa";
  responsible:   string;
  nextAction:    string;
  lastUpdated:   string;
  internalNotes: string;
  proposal:      CommercialProposal | null;
  confirmation:  ClientConfirmation | null;
  dealRef:       string | null;    // ref a DealWorkspace.id, se aplicável
}

// ─── KPIs executivos (derivados das oportunidades) ───────────────────────────
// Calculados em runtime via getCommercialKPIs().
// Qualidade de cada KPI reflete a qualidade dos dados que o compõem.

export interface CommercialKPIs {
  totalOpportunities:       number;
  activeProposals:          number;
  activeNegotiations:       number;
  activeContracts:          number;
  mrr:                      number;
  mrrQuality:               DataQuality;
  arr:                      number;
  arrQuality:               DataQuality;
  pipelinePotential:        number;
  pipelinePotentialQuality: DataQuality;
  upsidePotential:          number | null;
  lastActivityDate:         string;
}
