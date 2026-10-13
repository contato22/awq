/**
 * Log de eventos do Office: fatos registrados pelo motor (não texto gerado por LLM).
 * Cada evento carrega a origem (por que aconteceu) e, nas falhas, uma causa estruturada
 * com a recuperação possível. Serve ao painel "Por quê?" e à auditoria.
 */

export type TipoEvento =
  | "ActionStarted" | "ActionCompleted" | "ActionFailed"
  | "ApprovalRequested" | "ApprovalDecided"
  | "MeetingStarted" | "MeetingReply";

export interface Causa {
  codigo: "MISSING_API_KEY" | "INVALID_API_KEY" | "UPSTREAM_ERROR" | "NETWORK" | "UNKNOWN";
  mensagem: string;
  recuperavel: boolean;
  proxima: string;
}

export interface EventoOffice {
  id: string;
  ts: string;
  tipo: TipoEvento;
  bu: string;
  /** Papel do agente (cs, ref, criativo, midia) ou "gestor". */
  ator: string;
  /** O que foi feito, em poucas palavras. */
  acao: string;
  /** Por que aconteceu (origem registrada pelo motor). */
  origem: string;
  ms?: number;
  tokens?: { input: number; output: number };
  causa?: Causa;
}

export const MAX_EVENTOS = 400;

export function novoEvento(e: Omit<EventoOffice, "id" | "ts">): EventoOffice {
  return { ...e, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ts: new Date().toISOString() };
}

/** Converte um erro bruto em causa estruturada com a próxima ação sugerida. */
export function classificarErro(msg: string): Causa {
  if (/invalid x-api-key|authentication_error/.test(msg)) {
    return { codigo: "INVALID_API_KEY", mensagem: "A Anthropic recusou a chave usada.", recuperavel: true, proxima: "Colar uma chave válida no campo da chave e repetir." };
  }
  if (msg.includes("API_KEY_REQUIRED")) {
    return { codigo: "MISSING_API_KEY", mensagem: "Não há chave da Anthropic no servidor nem neste navegador.", recuperavel: true, proxima: "Colar a chave no campo da chave e repetir." };
  }
  if (/HTTP 5\d\d|overloaded|rate_limit|529|429/.test(msg)) {
    return { codigo: "UPSTREAM_ERROR", mensagem: "O serviço do modelo está indisponível ou limitou as chamadas.", recuperavel: true, proxima: "Aguardar alguns instantes e repetir; conferir saldo e limites." };
  }
  if (/Failed to fetch|NetworkError|network/i.test(msg)) {
    return { codigo: "NETWORK", mensagem: "Falha de rede ao chamar o servidor.", recuperavel: true, proxima: "Verificar a conexão e repetir." };
  }
  return { codigo: "UNKNOWN", mensagem: msg.slice(0, 200), recuperavel: true, proxima: "Repetir; se persistir, ver o registro da execução." };
}

export const ROTULO_TIPO: Record<TipoEvento, string> = {
  ActionStarted: "Iniciou",
  ActionCompleted: "Concluiu",
  ActionFailed: "Falhou",
  ApprovalRequested: "Pediu aprovação",
  ApprovalDecided: "Decisão do gestor",
  MeetingStarted: "Reunião iniciada",
  MeetingReply: "Resposta na reunião",
};
