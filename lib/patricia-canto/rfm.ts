// Matriz de Comunicação: segmentação RFM (Recência, Frequência, Valor
// Monetário) usada como motor pra decidir a ação de comunicação de cada
// segmento — não só "como está" o relacionamento, mas "o que fazer" com
// ele (ligar, aquecer, resgatar, etc.), cobrindo toda a base, não só quem
// já é cliente.
import type { Channel, Lead } from "./leads";
import { CHANNELS } from "./leads";
import type { BusinessUnit } from "./business-units";

export interface RfmEntry {
  lead: Lead;
  recenciaDias: number;
  frequencia: number;
  valorMonetario: number;
  scoreR: 1 | 2 | 3;
  scoreF: 1 | 2 | 3;
  scoreM: 1 | 2 | 3;
  segmentoId: SegmentoId;
}

export interface RfmUnitEntry {
  unit: BusinessUnit;
  recenciaDias: number;
  frequencia: number;
  valorMonetario: number;
  scoreR: 1 | 2 | 3;
  scoreF: 1 | 2 | 3;
  scoreM: 1 | 2 | 3;
  segmentoId: SegmentoId;
}

export interface RfmChannelEntry {
  channel: Channel;
  tipo: "Pago" | "Orgânico";
  recenciaDias: number;
  frequencia: number;
  valorMonetario: number;
  scoreR: 1 | 2 | 3;
  scoreF: 1 | 2 | 3;
  scoreM: 1 | 2 | 3;
  segmentoId: SegmentoId;
}

export type SegmentoId =
  | "campeoes"
  | "fieis_recentes"
  | "novos_leads"
  | "alto_valor_atencao"
  | "estaveis"
  | "em_desenvolvimento"
  | "resgatar"
  | "em_risco"
  | "inativos";

export type Urgencia = "alta" | "media" | "baixa";

export interface SegmentoInfo {
  id: SegmentoId;
  label: string;
  hint: string;
  color: string;
  acao: string;
  urgencia: Urgencia;
}

export const URGENCIA_LABEL: Record<Urgencia, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

// Grade 3x3: linha = score de Recência (3 = mais recente), coluna = média
// arredondada de Frequência+Valor (3 = maior). Nomes e ações adaptados ao
// contexto de captação/atendimento jurídico — cada segmento indica também
// a ação de comunicação recomendada e a urgência de contato.
export const SEGMENTOS: Record<SegmentoId, SegmentoInfo> = {
  campeoes: {
    id: "campeoes",
    label: "Campeões",
    hint: "Recentes, recorrentes e de alto valor — prioridade máxima",
    color: "#6B5B3E",
    acao: "Cultivar — agradecer, pedir indicação de novos casos",
    urgencia: "baixa",
  },
  fieis_recentes: {
    id: "fieis_recentes",
    label: "Fiéis recentes",
    hint: "Contato recente, bom histórico",
    color: "#4F7A54",
    acao: "Manter contato de rotina, sem urgência especial",
    urgencia: "baixa",
  },
  novos_leads: {
    id: "novos_leads",
    label: "Novos leads",
    hint: "Chegaram há pouco, ainda sem histórico",
    color: "#4C5F87",
    acao: "Boas-vindas — primeiro contato de qualificação",
    urgencia: "media",
  },
  alto_valor_atencao: {
    id: "alto_valor_atencao",
    label: "Alto valor — atenção",
    hint: "Valiosos, mas o contato está esfriando",
    color: "#A67A2E",
    acao: "Contato prioritário — ligar essa semana pra não perder o caso",
    urgencia: "alta",
  },
  estaveis: {
    id: "estaveis",
    label: "Estáveis",
    hint: "Sem urgência, acompanhamento de rotina",
    color: "#7A6F52",
    acao: "Acompanhamento de rotina — sem ação especial",
    urgencia: "baixa",
  },
  em_desenvolvimento: {
    id: "em_desenvolvimento",
    label: "Em desenvolvimento",
    hint: "Recentes, mas ainda com pouco valor/histórico",
    color: "#4F707A",
    acao: "Aquecer — enviar conteúdo/atualização, seguir qualificando",
    urgencia: "media",
  },
  resgatar: {
    id: "resgatar",
    label: "Resgatar — não perder",
    hint: "Alto valor no passado, contato esfriou de vez",
    color: "#93342C",
    acao: "Contato urgente — ligar hoje, risco real de perda",
    urgencia: "alta",
  },
  em_risco: {
    id: "em_risco",
    label: "Em risco",
    hint: "Contato antigo, valor mediano — risco de perder",
    color: "#A65A2A",
    acao: "Retomar contato essa semana antes de esfriar de vez",
    urgencia: "alta",
  },
  inativos: {
    id: "inativos",
    label: "Inativos",
    hint: "Sem contato há muito tempo, baixo valor/frequência",
    color: "#6E655C",
    acao: "Campanha de reativação (ou arquivar se não houver retorno)",
    urgencia: "media",
  },
};

function lastMovementIso(lead: Lead): string {
  const last = lead.stageHistory[lead.stageHistory.length - 1];
  return last ? last.enteredAt : lead.dataEntrada;
}

function clientKey(lead: Lead): string {
  return lead.nomeCliente.trim().toLowerCase();
}

function terciles(values: number[]): [number, number] {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return [0, 0];
  const q1 = sorted[Math.floor(sorted.length / 3)] ?? sorted[0];
  const q2 = sorted[Math.floor((2 * sorted.length) / 3)] ?? sorted[sorted.length - 1];
  return [q1, q2];
}

// value maior = melhor (usado em Frequência e Valor Monetário)
function scoreAsc(value: number, [q1, q2]: [number, number]): 1 | 2 | 3 {
  if (value <= q1) return 1;
  if (value <= q2) return 2;
  return 3;
}

// value maior = pior (usado em Recência: mais dias parado = pior)
function scoreDesc(value: number, [q1, q2]: [number, number]): 1 | 2 | 3 {
  if (value <= q1) return 3;
  if (value <= q2) return 2;
  return 1;
}

// Grade 3x3 compartilhada com a UI (RfmMatrixView) — uma única fonte de
// verdade pro mapeamento score -> segmento.
export const RFM_GRID: Record<1 | 2 | 3, Record<1 | 2 | 3, SegmentoId>> = {
  3: { 1: "novos_leads", 2: "fieis_recentes", 3: "campeoes" },
  2: { 1: "em_desenvolvimento", 2: "estaveis", 3: "alto_valor_atencao" },
  1: { 1: "inativos", 2: "em_risco", 3: "resgatar" },
};

export function segmentoFor(scoreR: 1 | 2 | 3, scoreF: 1 | 2 | 3, scoreM: 1 | 2 | 3): SegmentoId {
  const fm = Math.round((scoreF + scoreM) / 2) as 1 | 2 | 3;
  return RFM_GRID[scoreR][fm];
}

function daysSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
}

// Pontua e segmenta qualquer lista de entidades já reduzidas a R/F/M — os
// tercis são calculados sobre a própria lista, então cada matriz (leads,
// unidades, canais) se compara só contra seus pares, não uns com os outros.
function scoreEntries<T extends { recenciaDias: number; frequencia: number; valorMonetario: number }>(
  raw: T[],
): (T & { scoreR: 1 | 2 | 3; scoreF: 1 | 2 | 3; scoreM: 1 | 2 | 3; segmentoId: SegmentoId })[] {
  const rTerciles = terciles(raw.map((r) => r.recenciaDias));
  const fTerciles = terciles(raw.map((r) => r.frequencia));
  const mTerciles = terciles(raw.map((r) => r.valorMonetario));

  return raw.map((r) => {
    const scoreR = scoreDesc(r.recenciaDias, rTerciles);
    const scoreF = scoreAsc(r.frequencia, fTerciles);
    const scoreM = scoreAsc(r.valorMonetario, mTerciles);
    return { ...r, scoreR, scoreF, scoreM, segmentoId: segmentoFor(scoreR, scoreF, scoreM) };
  });
}

export function computeRfm(leads: Lead[], now: Date = new Date()): RfmEntry[] {
  if (leads.length === 0) return [];

  const frequencyByClient = new Map<string, number>();
  for (const l of leads) frequencyByClient.set(clientKey(l), (frequencyByClient.get(clientKey(l)) ?? 0) + 1);

  const raw = leads.map((lead) => ({
    lead,
    recenciaDias: daysSince(lastMovementIso(lead), now),
    frequencia: frequencyByClient.get(clientKey(lead)) ?? 1,
    valorMonetario: lead.honorarios ?? lead.valorAcao ?? 0,
  }));

  return scoreEntries(raw);
}

// Mesma lógica de RFM, mas agrupando os leads por unidade de negócio
// parceira em vez de por lead individual — dá controle de quais parcerias
// estão trazendo volume/valor e quais esfriaram.
export function computeRfmForUnits(leads: Lead[], units: BusinessUnit[], now: Date = new Date()): RfmUnitEntry[] {
  if (units.length === 0) return [];

  const raw = units.map((unit) => {
    const unitLeads = leads.filter((l) => l.unidadeId === unit.id);
    const recenciaDias =
      unitLeads.length > 0
        ? Math.min(...unitLeads.map((l) => daysSince(lastMovementIso(l), now)))
        : daysSince(unit.dataCriacao, now);
    return {
      unit,
      recenciaDias,
      frequencia: unitLeads.length,
      valorMonetario: unitLeads.reduce((sum, l) => sum + (l.honorarios ?? l.valorAcao ?? 0), 0),
    };
  });

  return scoreEntries(raw);
}

// Mesma lógica, agrupando por canal de aquisição (origem do lead) — só
// entram canais com pelo menos um lead, já que sem histórico não há como
// calcular recência. Canais sem nenhum lead ainda simplesmente não aparecem.
export function computeRfmForChannels(leads: Lead[], now: Date = new Date()): RfmChannelEntry[] {
  const comLeads = CHANNELS.map((c) => ({ channel: c, channelLeads: leads.filter((l) => l.origem === c.id) })).filter(
    (c) => c.channelLeads.length > 0,
  );
  if (comLeads.length === 0) return [];

  const raw = comLeads.map(({ channel, channelLeads }) => ({
    channel: channel.id,
    tipo: channel.tipo,
    recenciaDias: Math.min(...channelLeads.map((l) => daysSince(lastMovementIso(l), now))),
    frequencia: channelLeads.length,
    valorMonetario: channelLeads.reduce((sum, l) => sum + (l.honorarios ?? l.valorAcao ?? 0), 0),
  }));

  return scoreEntries(raw);
}
