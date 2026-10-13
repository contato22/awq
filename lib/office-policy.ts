/**
 * Políticas de autonomia por agente e ação. Hoje os agentes só geram texto, então os modos
 * que mudam o comportamento são três: bloqueado, recomendar e preparar. Os modos de execução
 * (reversível e sob limites) dependem de ferramentas externas conectadas e ficam indisponíveis.
 */
import type { EntregaKind } from "./office-analysis";
import type { PapelAgente } from "./office-scenarios";

export type ModoAutonomia = "bloqueado" | "recomendar" | "preparar";

export const MODOS: { modo: ModoAutonomia; rotulo: string; descricao: string }[] = [
  { modo: "bloqueado", rotulo: "Bloqueado", descricao: "A ação não roda; o motivo fica registrado." },
  { modo: "recomendar", rotulo: "Recomendar", descricao: "O agente só sugere opções e riscos, sem produzir o material final." },
  { modo: "preparar", rotulo: "Preparar", descricao: "Produz o material como rascunho e aguarda a decisão do gestor." },
];

export const MODOS_INDISPONIVEIS = ["Executar reversível", "Executar sob limites"];

/** Ações governáveis por papel. */
export const ACOES_POR_PAPEL: Record<PapelAgente, { kind: EntregaKind; rotulo: string }[]> = {
  cs: [
    { kind: "triagem", rotulo: "Triagem da demanda" },
    { kind: "aprovacao", rotulo: "Pacote de aprovação" },
    { kind: "livre", rotulo: "Respostas e conversas" },
  ],
  ref: [
    { kind: "briefing", rotulo: "Briefing e referências" },
    { kind: "livre", rotulo: "Respostas e conversas" },
  ],
  criativo: [
    { kind: "peca", rotulo: "Produção de peças" },
    { kind: "livre", rotulo: "Respostas e conversas" },
  ],
  midia: [
    { kind: "execucao", rotulo: "Plano de publicação" },
    { kind: "livre", rotulo: "Respostas e conversas" },
  ],
};

export type Politicas = Record<string, ModoAutonomia>;

export const chavePolitica = (bu: string, role: PapelAgente, kind: EntregaKind) => `${bu}|${role}|${kind}`;

export function modoDe(p: Politicas, bu: string, role: PapelAgente, kind: EntregaKind): ModoAutonomia {
  return p[chavePolitica(bu, role, kind)] ?? "preparar";
}

/** Instrução acrescentada à tarefa conforme o modo. */
export function instrucaoDoModo(modo: ModoAutonomia): string {
  if (modo === "recomendar") {
    return "MODO DE AUTONOMIA: RECOMENDAR. Apenas sugira opções, riscos e o caminho que você recomenda. NÃO produza o material final (texto da peça, roteiro completo, plano fechado); diga o que o gestor precisa decidir.\n\n";
  }
  return "";
}
