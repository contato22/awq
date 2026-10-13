"use client";

import { AlertTriangle, CheckCircle2, Loader2, Play, Send, XCircle } from "lucide-react";
import { ROTULO_TAREFA, limiteDoDia, type ConfigHead, type EstadoHead, type StatusTarefa } from "@/lib/office-head";

interface Props {
  head: EstadoHead;
  busy: boolean;
  entregando: boolean;
  erro: string | null;
  temSquads: boolean;
  onAtivar: () => void;
  onEntregar: () => void;
  onAprovacao: (id: string, decisao: "aprovada" | "recusada") => void;
  onValidar: (tarefaId: string, ok: boolean) => void;
  onConfig: (p: Partial<ConfigHead>) => void;
}

const COR_TAREFA: Record<StatusTarefa, string> = {
  solicitado: "bg-gray-100 text-gray-700", aceito: "bg-gray-100 text-gray-700", atribuido: "bg-blue-100 text-blue-800", iniciado: "bg-indigo-100 text-indigo-800",
  bloqueado: "bg-red-100 text-red-800", aguardando_aprovacao: "bg-amber-100 text-amber-800", concluido: "bg-teal-100 text-teal-800",
  validado: "bg-green-100 text-green-800", falhou: "bg-red-100 text-red-800", cancelado: "bg-gray-100 text-gray-500",
};
const COR_NIVEL: Record<string, string> = { P0: "bg-red-600 text-white", P1: "bg-orange-500 text-white", P2: "bg-amber-400 text-gray-900", P3: "bg-gray-200 text-gray-700" };

const quando = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }) : "—");
const texto = (v: unknown): string => (typeof v === "string" ? v : JSON.stringify(v));

export default function HeadCSPanel({ head, busy, entregando, erro, temSquads, onAtivar, onEntregar, onAprovacao, onValidar, onConfig }: Props) {
  const ult = head.ativacoes[head.ativacoes.length - 1];
  const saida = ult?.saida ?? null;
  const limite = limiteDoDia(head);
  const prontas = head.tarefas.filter((t) => t.status === "atribuido").length;
  const pendentes = head.aprovacoes.filter((a) => a.estado === "pendente");
  const tarefas = head.tarefas.slice().reverse().slice(0, 30);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        O Head de CS lidera por ciclos: lê o estado de todas as contas, prioriza, delega com prazo e critérios de aceite e programa a continuidade. O motor valida autoridade, limites e duplicidade antes de criar cada tarefa.
        Ele só age quando ativado (agora, por evento ou pelo heartbeat) e <strong>apenas enquanto esta página estiver aberta</strong>: não há monitoramento em segundo plano. Ele enxerga o estado operacional das contas, nunca o conteúdo das entregas.
      </p>

      <div className="rounded-xl border border-gray-200 p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onAtivar} disabled={busy || !temSquads || !!limite} className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium disabled:opacity-40 flex items-center gap-1.5">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Ativar Head agora
          </button>
          <button onClick={onEntregar} disabled={entregando || prontas === 0} className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium disabled:opacity-40 flex items-center gap-1.5">
            {entregando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Entregar tarefas atribuídas ({prontas})
          </button>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-gray-700">
          <input type="checkbox" checked={head.config.autonomo} onChange={(e) => onConfig({ autonomo: e.target.checked })} />
          Modo autônomo: heartbeat a cada
          <select value={head.config.heartbeatMin} onChange={(e) => onConfig({ heartbeatMin: Number(e.target.value) })} className="border border-gray-200 rounded px-1 py-0.5">
            {[10, 15, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
          (ativa o Head, programa wakeups e entrega tarefas sozinho; gasta créditos da API)
        </label>
        <div className="text-[11px] text-gray-500">
          Hoje: {head.uso.ativacoes}/{head.config.maxAtivacoesDia} ativações · {head.uso.tokensSaida.toLocaleString("pt-BR")}/{head.config.maxTokensSaidaDia.toLocaleString("pt-BR")} tokens de saída ·
          até {head.config.maxConcorrencia} tarefas simultâneas e {head.config.maxTentativasTarefa} tentativas por tarefa. {limite && <span className="text-red-600 font-medium">{limite}.</span>}
        </div>
        {!temSquads && <div className="text-[11px] text-amber-700">Nenhum CS carregado ainda.</div>}
        {erro && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> <span>{erro}</span></div>}
      </div>

      {pendentes.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div className="text-xs font-semibold text-amber-900">Aprovações pendentes ({pendentes.length})</div>
          {pendentes.map((a) => (
            <div key={a.id} className="rounded-lg bg-white border border-amber-100 p-2 space-y-1">
              <div className="text-xs text-gray-800">{a.pedido}</div>
              <div className="text-[11px] text-gray-500">Motivo: {a.motivo}</div>
              <div className="flex gap-2">
                <button onClick={() => onAprovacao(a.id, "aprovada")} className="px-2 py-1 rounded bg-green-600 text-white text-[11px] flex items-center gap-1"><CheckCircle2 size={12} /> Aprovar</button>
                <button onClick={() => onAprovacao(a.id, "recusada")} className="px-2 py-1 rounded bg-red-600 text-white text-[11px] flex items-center gap-1"><XCircle size={12} /> Recusar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {ult && (
        <div className="rounded-xl border border-gray-200 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-gray-800">Última ativação · {quando(ult.ts)}</div>
            {saida?.leader_state && <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-gray-100 text-gray-700">{saida.leader_state}</span>}
          </div>
          <div className="text-[11px] text-gray-500">Motivo: {ult.motivo}{ult.tokens ? ` · ${ult.tokens.input} entrada / ${ult.tokens.output} saída (tokens)` : ""}</div>
          {ult.erro && <div className="text-xs text-red-700">{ult.erro}</div>}
          {saida?.human_update && <div className="text-sm text-gray-900 whitespace-pre-wrap rounded-lg bg-gray-50 p-2">{saida.human_update}</div>}
          {saida?.situation_summary && <div className="text-[11px] text-gray-600">Síntese: {saida.situation_summary}</div>}
          {(saida?.priorities ?? []).length > 0 && (
            <ul className="space-y-1">
              {(saida?.priorities ?? []).map((p, i) => (
                <li key={i} className="text-[11px] text-gray-700 flex gap-2">
                  <span className={`shrink-0 h-4 px-1.5 rounded text-[10px] font-bold flex items-center ${COR_NIVEL[p.level ?? "P3"] ?? COR_NIVEL.P3}`}>{p.level ?? "P3"}</span>
                  <span><strong>{p.account_id}</strong>: {p.reason} <span className="text-gray-500">→ {p.decision}</span></span>
                </li>
              ))}
            </ul>
          )}
          {ult.criadas.length > 0 && <div className="text-[11px] text-green-700">{ult.criadas.length} tarefa(s) criada(s) pelo motor.</div>}
          {ult.rejeitadas.length > 0 && (
            <div className="text-[11px] rounded-lg bg-red-50 border border-red-100 p-2 space-y-0.5">
              <div className="font-semibold text-red-800">Despachos recusados pelo motor</div>
              {ult.rejeitadas.map((r, i) => <div key={i} className="text-red-700">{r.chave}: {r.motivo}</div>)}
            </div>
          )}
          {(saida?.runtime_requirements ?? []).length > 0 && (
            <details className="text-[11px]">
              <summary className="cursor-pointer text-brand-600">O que falta no ambiente ({saida?.runtime_requirements?.length})</summary>
              <ul className="mt-1 space-y-1 text-gray-700">{(saida?.runtime_requirements ?? []).map((r, i) => <li key={i} className="rounded bg-gray-50 p-1.5 break-words">{texto(r)}</li>)}</ul>
            </details>
          )}
          {((saida?.escalations ?? []).length > 0 || (saida?.followups ?? []).length > 0) && (
            <details className="text-[11px]">
              <summary className="cursor-pointer text-brand-600">Escalações e acompanhamentos</summary>
              <ul className="mt-1 space-y-1 text-gray-700">
                {[...(saida?.escalations ?? []), ...(saida?.followups ?? [])].map((r, i) => <li key={i} className="rounded bg-gray-50 p-1.5 break-words">{texto(r)}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      {head.checkpoint && (
        <div className="rounded-xl border border-gray-200 p-3 text-[11px] text-gray-700 space-y-0.5">
          <div className="text-xs font-semibold text-gray-800">Checkpoint · {quando(head.checkpoint.ts)}</div>
          <div>{head.checkpoint.resumo || "sem resumo"}</div>
          <div>Próximo wakeup: {head.checkpoint.wakeup.at ? quando(head.checkpoint.wakeup.at) : "sem horário (heartbeat e eventos)"}{head.checkpoint.wakeup.on.length ? ` · ou ao ocorrer: ${head.checkpoint.wakeup.on.join(", ")}` : ""}</div>
          {head.checkpoint.wakeup.reason && <div className="text-gray-500">Motivo: {head.checkpoint.wakeup.reason}</div>}
          {head.eventosPendentes.length > 0 && <div className="text-amber-700">{head.eventosPendentes.length} evento(s) aguardando a próxima ativação.</div>}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 p-3 space-y-2">
        <div className="text-xs font-semibold text-gray-800">Fila de tarefas ({head.tarefas.length})</div>
        {tarefas.length === 0 && <div className="text-[11px] text-gray-400">Nenhuma tarefa ainda. Ative o Head para ele priorizar e delegar.</div>}
        {tarefas.map((t) => (
          <div key={t.id} className="rounded-lg border border-gray-100 p-2 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs text-gray-800">{t.resultado}</div>
              <span className={`shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 ${COR_TAREFA[t.status]}`}>{ROTULO_TAREFA[t.status]}</span>
            </div>
            <div className="text-[11px] text-gray-500">{t.prioridade} · {t.bu} · {t.role} · prazo {quando(t.prazo)} · checkpoint {quando(t.checkpoint)} · tentativas {t.tentativas}</div>
            {t.evidenciasColetadas && <div className="text-[11px] text-teal-800">Evidência do motor: {t.evidenciasColetadas}</div>}
            {t.bloqueio && <div className="text-[11px] text-red-700">{t.bloqueio}</div>}
            <details className="text-[11px]">
              <summary className="cursor-pointer text-brand-600">Aceite, evidência exigida e limites</summary>
              <div className="mt-1 space-y-0.5 text-gray-700">
                <div>Aceite: {t.aceite.join("; ")}</div>
                <div>Evidência exigida: {t.evidencia.join("; ")}</div>
                <div>Proibido: {t.proibidas.join("; ")}</div>
                {t.escalar.length > 0 && <div>Escalar quando: {t.escalar.join("; ")}</div>}
                <div className="text-gray-400">Chave de idempotência: {t.chave}</div>
              </div>
            </details>
            {t.status === "concluido" && (
              <div className="flex gap-2">
                <button onClick={() => onValidar(t.id, true)} className="px-2 py-0.5 rounded bg-green-600 text-white text-[11px]">Validar</button>
                <button onClick={() => onValidar(t.id, false)} className="px-2 py-0.5 rounded bg-gray-200 text-gray-800 text-[11px]">Reabrir</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {(Object.keys(head.contas).length > 0 || head.mensagens.length > 0) && (
        <div className="rounded-xl border border-gray-200 p-3 space-y-2 text-[11px] text-gray-700">
          {Object.values(head.contas).map((c) => (
            <div key={c.bu}><strong>{c.bu}</strong> · risco {c.risco ?? "—"} · responsável {c.responsavel || "—"} · prazo {c.prazo || "—"}<div className="text-gray-500">{c.plano} {c.nota}</div></div>
          ))}
          {head.mensagens.slice(-5).reverse().map((m) => <div key={m.id} className="text-gray-500">{quando(m.ts)} · {m.de} → {m.para}: {m.texto}</div>)}
        </div>
      )}
    </div>
  );
}
