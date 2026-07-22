// Board de CS / Acompanhamento Jurídico — pós-fechamento do Comercial.
import type { Lead } from "./leads";

export type CaseStage = "onboarding" | "administrativo" | "judicial" | "decisao" | "pos_caso";

export const CASE_STAGES: { id: CaseStage; label: string; hint: string; cadenceDays: number; canal: string }[] = [
  {
    id: "onboarding",
    label: "Onboarding",
    hint: "Documentação completa, procuração assinada, abertura formal",
    cadenceDays: 2,
    canal: "WhatsApp (imediato + confirmação em 48h)",
  },
  {
    id: "administrativo",
    label: "Em Andamento — Administrativo (INSS)",
    hint: "Protocolado, aguardando análise/perícia",
    cadenceDays: 21,
    canal: "WhatsApp a cada 15–30 dias",
  },
  {
    id: "judicial",
    label: "Em Andamento — Judicial",
    hint: "Distribuído, aguardando trâmite",
    cadenceDays: 21,
    canal: "WhatsApp a cada 15–30 dias",
  },
  {
    id: "decisao",
    label: "Decisão",
    hint: "Resultado saiu (deferido/indeferido)",
    cadenceDays: 0,
    canal: "WhatsApp + ligação imediata se indeferido",
  },
  {
    id: "pos_caso",
    label: "Pós-caso",
    hint: "Honorário de êxito, encerramento, pedido de indicação",
    cadenceDays: 30,
    canal: "WhatsApp — contato de encerramento",
  },
];

export const STATUS_INSS = ["Protocolado", "Em exigência", "Em perícia", "Aguardando decisão"] as const;
export const STATUS_JUDICIAL = ["Distribuído", "Contestado", "Instrução", "Sentença"] as const;
export type Resultado = "Deferido" | "Indeferido";

export interface CaseItem {
  id: string;
  leadId: string | null;
  nomeCliente: string;
  telefone: string;
  tipoProcesso: string;
  stage: CaseStage;
  documentosPendentes: string | null;
  dataAberturaProcesso: string | null;
  numeroProtocolo: string | null;
  statusInss: (typeof STATUS_INSS)[number] | null;
  numeroProcessoJudicial: string | null;
  vara: string | null;
  statusJudicial: (typeof STATUS_JUDICIAL)[number] | null;
  resultado: Resultado | null;
  recursoNecessario: boolean | null;
  dataDecisao: string | null;
  honorarioExitoRecebido: boolean;
  pedidoIndicacaoEnviado: boolean;
  depoimentoColetado: boolean;
  dataUltimaAtualizacao: string;
  dataCriacao: string;
}

export function createCaseFromLead(lead: Lead): CaseItem {
  const now = new Date().toISOString();
  return {
    id: `case-${lead.id}`,
    leadId: lead.id,
    nomeCliente: lead.nomeCliente,
    telefone: lead.telefone,
    tipoProcesso: lead.tipoProcesso,
    stage: "onboarding",
    documentosPendentes: null,
    dataAberturaProcesso: null,
    numeroProtocolo: null,
    statusInss: null,
    numeroProcessoJudicial: null,
    vara: null,
    statusJudicial: null,
    resultado: null,
    recursoNecessario: null,
    dataDecisao: null,
    honorarioExitoRecebido: false,
    pedidoIndicacaoEnviado: false,
    depoimentoColetado: false,
    dataUltimaAtualizacao: now,
    dataCriacao: now,
  };
}

export function daysSinceUpdate(item: CaseItem): number {
  return Math.floor((Date.now() - new Date(item.dataUltimaAtualizacao).getTime()) / 86_400_000);
}

export function isCommunicationLate(item: CaseItem): boolean {
  const stageDef = CASE_STAGES.find((s) => s.id === item.stage);
  if (!stageDef || stageDef.cadenceDays === 0) return false;
  return daysSinceUpdate(item) > stageDef.cadenceDays;
}
