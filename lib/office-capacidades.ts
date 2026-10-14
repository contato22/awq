/**
 * Capacidades reais de uma execução do simulador, escritas pelo orquestrador no contrato de cada
 * agente. Evita o diagnóstico fixo ("sem memória, sem delegação") quando o ambiente já oferece
 * estado persistente, delegação registrada pelo motor e checkpoint, e mantém honesto o que
 * continua inexistente (plataformas, arquivos, web, contato com o cliente).
 */
import type { EstadoHead, TarefaHead } from "./office-head";
import type { PapelAgente } from "./office-scenarios";

const ABERTAS = ["atribuido", "iniciado", "aceito", "aguardando_aprovacao", "bloqueado", "concluido"];

const linhaTarefa = (t: TarefaHead) =>
  `- ${t.id} (${t.role}, ${t.prioridade}, ${t.status}${t.bloqueio ? `: ${t.bloqueio.slice(0, 80)}` : ""}): ${t.resultado.slice(0, 90)}`;

export function capacidadesDaExecucao(e: EstadoHead, bu: string, role: PapelAgente, nome: string, agentes: { role: PapelAgente; nome: string }[]): string {
  const daConta = e.tarefas.filter((t) => t.bu === bu);
  const abertas = daConta.filter((t) => ABERTAS.includes(t.status));
  const minhas = role === "cs" ? abertas : abertas.filter((t) => t.role === role);
  const conta = e.contas[bu];
  const aprov = e.aprovacoes.filter((a) => a.estado === "pendente" && daConta.some((t) => t.id === a.tarefaId)).length;
  const equipe = agentes.filter((a) => a.role !== "cs").map((a) => `${a.nome} (${a.role})`).join(", ") || "nenhum";
  const msgs = e.mensagens.filter((m) => m.de === nome).slice(-3).map((m) => `- ${m.texto.slice(0, 220)}`);
  const linhas = [
    "CAPACIDADES DESTA EXECUÇÃO (fornecidas pelo orquestrador; valem no lugar de qualquer diagnóstico de execuções anteriores)",
    "DISPONÍVEL AGORA:",
    `- Estado persistente: o orquestrador guarda o estado da conta e o injeta abaixo a cada ativação${conta ? "" : " (ainda sem registro desta conta: crie o primeiro checkpoint)"}. Use-o; não diga que começa do zero.`,
    ...(role === "cs"
      ? [
          `- Delegação real: devolva dispatch_requests no estado estruturado (JSON final); o motor valida e registra cada um como tarefa real e confirma ou recusa, com o motivo, na próxima ativação. Agentes da conta: ${equipe}. Só considere delegado o que aparecer abaixo como registrado.`,
          "- Checkpoint e próxima ativação: o estado estruturado (checkpoint, wakeup, runtime_requirements) é gravado pelo orquestrador. A reativação por horário só ocorre com o Head de CS em modo autônomo e a página aberta (ou o tick do servidor, se habilitado); fora disso a próxima ativação é manual.",
        ]
      : ["- Tarefas atribuídas a você pelo CS aparecem abaixo; responda a cada uma com estado, evidência e conferência dos critérios de aceite."]),
    "NÃO DISPONÍVEL (declare só se alterar o resultado, junto de impacto, alternativa e próximo passo): acesso a redes sociais, plataformas de anúncio, arquivos, web e contato direto com o cliente; tudo o que você produz é texto, nada é publicado ou enviado.",
    "ESTADO PERSISTENTE DA CONTA:",
    conta ? `- Risco: ${conta.risco ?? "nenhum registrado"} | Responsável: ${conta.responsavel || "-"} | Plano: ${conta.plano || "-"} | Nota: ${conta.nota || "-"}` : "- Sem registro anterior desta conta.",
    `- Tarefas ${role === "cs" ? "abertas da conta" : "suas abertas"} (${minhas.length}):${minhas.length ? "\n" + minhas.slice(-8).map(linhaTarefa).join("\n") : " nenhuma"}`,
    ...(role === "cs" ? [`- Aprovações pendentes do gestor para tarefas desta conta: ${aprov}`] : []),
    ...(role === "cs" && msgs.length ? ["- Seus últimos registros ao orquestrador (inclui despachos recusados):", ...msgs] : []),
    e.checkpoint ? `- Último checkpoint do Head de CS (${e.checkpoint.ts.slice(0, 16).replace("T", " ")}): ${e.checkpoint.resumo.slice(0, 200) || "sem resumo"}` : "- Head de CS ainda sem checkpoint.",
  ];
  return linhas.join("\n");
}
