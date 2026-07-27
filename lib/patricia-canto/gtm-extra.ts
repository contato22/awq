// Duas sub-seções de GTM além de "Canais de aquisição":
// - Comunicação: calendário simples de ações de comunicação/campanha
// - TAM/SAM/SOM: dimensionamento de mercado (entrada manual + comparação
//   com o que já foi capturado, usando dados reais do funil)
import type { Channel, Lead } from "./leads";

export type StatusComunicacao = "planejado" | "publicado" | "pausado";

export const STATUS_COMUNICACAO_LABEL: Record<StatusComunicacao, string> = {
  planejado: "Planejado",
  publicado: "Publicado",
  pausado: "Pausado",
};

export interface ComunicacaoItem {
  id: string;
  titulo: string;
  tipo: string;
  canal: Channel | null;
  dataPlanejada: string;
  status: StatusComunicacao;
  notas: string | null;
}

export type NewComunicacaoInput = Omit<ComunicacaoItem, "id">;

export type MarketUnit = "R$" | "processos";

export interface MarketSizing {
  unidade: MarketUnit;
  tam: number | null;
  sam: number | null;
  som: number | null;
  tamDescricao: string | null;
  samDescricao: string | null;
  somDescricao: string | null;
}

export const EMPTY_MARKET_SIZING: MarketSizing = {
  unidade: "R$",
  tam: null,
  sam: null,
  som: null,
  tamDescricao: null,
  samDescricao: null,
  somDescricao: null,
};

// Quanto do SOM já foi capturado, usando dado real do funil comercial —
// honorários fechados (unidade R$) ou nº de leads "ganho" (unidade processos).
export function computeSomCapture(leads: Lead[], market: MarketSizing): { captured: number; pct: number | null } {
  const ganhos = leads.filter((l) => l.stage === "ganho");
  const captured =
    market.unidade === "R$" ? ganhos.reduce((sum, l) => sum + (l.honorarios ?? 0), 0) : ganhos.length;
  const pct = market.som != null && market.som > 0 ? (captured / market.som) * 100 : null;
  return { captured, pct };
}
