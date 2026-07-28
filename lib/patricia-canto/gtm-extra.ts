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

// Formato do conteúdo — usado para bater com as metas recorrentes de entrega
// (ver comunicacao-quotas.ts). "outro" cobre ações que não entram em meta
// (e-mail, anúncio pago avulso, etc.).
export type ComunicacaoFormato = "video" | "arte" | "planejamento" | "outro";

export const COMUNICACAO_FORMATO_LABEL: Record<ComunicacaoFormato, string> = {
  video: "Vídeo",
  arte: "Arte",
  planejamento: "Planejamento de conteúdos",
  outro: "Outro",
};

// Plataforma social onde o conteúdo é publicado — separado do "canal" de
// aquisição (Anúncio/Indicação/Orgânico/Boca a boca) usado no funil de GTM.
export type Plataforma = "Instagram" | "TikTok" | "Outro";

export const PLATAFORMAS: Plataforma[] = ["Instagram", "TikTok", "Outro"];

// Resultados de uma publicação — hoje preenchidos manualmente (sem
// integração automática com Instagram/TikTok configurada). Estrutura pronta
// para, no futuro, ser sincronizada via API quando houver credenciais.
export interface ComunicacaoResultados {
  visualizacoes: number | null;
  curtidas: number | null;
  comentarios: number | null;
  alcance: number | null;
}

export interface ComunicacaoItem {
  id: string;
  titulo: string;
  tipo: string;
  formato: ComunicacaoFormato;
  plataforma: Plataforma | null;
  responsavel: string | null;
  canal: Channel | null;
  dataPlanejada: string;
  status: StatusComunicacao;
  notas: string | null;
  resultados: ComunicacaoResultados | null;
}

export type NewComunicacaoInput = Omit<ComunicacaoItem, "id">;

// Registros salvos antes desses campos existirem não os têm — normaliza ao
// ler para que o resto do app possa tratar os campos como sempre presentes.
export function normalizeComunicacao(raw: Partial<ComunicacaoItem> & { id: string }): ComunicacaoItem {
  return {
    id: raw.id,
    titulo: raw.titulo ?? "",
    tipo: raw.tipo ?? "Outro",
    formato: raw.formato ?? "outro",
    plataforma: raw.plataforma ?? null,
    responsavel: raw.responsavel ?? null,
    canal: raw.canal ?? null,
    dataPlanejada: raw.dataPlanejada ?? new Date().toISOString(),
    status: raw.status ?? "planejado",
    notas: raw.notas ?? null,
    resultados: raw.resultados ?? null,
  };
}

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
